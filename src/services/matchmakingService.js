import { db } from '../firebase';
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    getDocs,
    getDoc,
    runTransaction
} from 'firebase/firestore';
import { getLanguageCollection } from './firestoreService';

/**
 * Joins the matchmaking queue and attempts to find a match.
 */
export const joinQueue = async (playerId, languageCode, gameMode, betAmount) => {
    const queueCollection = getLanguageCollection(languageCode, 'matchmaking_queue');
    const queueRef = collection(db, queueCollection);

    // 1. Create our queue entry
    const entry = {
        playerId,
        gameMode,
        betAmount,
        status: 'waiting',
        timestamp: serverTimestamp()
    };

    const docRef = await addDoc(queueRef, entry);
    const myEntryId = docRef.id;

    // 2. Try to find an opponent (Simplified orchestration)
    // Real production apps usually use Cloud Functions, but a Firestore transaction 
    // works for this peer-to-peer style setup.
    attemptMatch(languageCode, myEntryId, playerId, gameMode, betAmount);

    return myEntryId;
};

/**
 * Orchestrates the matching process using a transaction to avoid race conditions.
 * Retries every 2 seconds to handle players joining at similar times.
 */
const attemptMatch = async (languageCode, myEntryId, myPlayerId, gameMode, betAmount) => {
    const queueCollectionName = getLanguageCollection(languageCode, 'matchmaking_queue');
    const sessionsCollectionName = getLanguageCollection(languageCode, 'game_sessions');

    let attempts = 0;
    const maxAttempts = 5; // Try for ~10 seconds (5 attempts * 2 seconds)

    const tryMatch = async () => {
        attempts++;
        console.log(`🔍 Matchmaking attempt ${attempts}/${maxAttempts}`);

        try {
            const matched = await runTransaction(db, async (transaction) => {
                // Find oldest waiting player that isn't us
                const q = query(
                    collection(db, queueCollectionName),
                    where('status', '==', 'waiting'),
                    where('gameMode', '==', gameMode),
                    where('betAmount', '==', betAmount),
                    orderBy('timestamp', 'asc'),
                    limit(10)
                );

                // 1. Get potential opponents (not part of transaction lock yet)
                const snapshot = await getDocs(q);

                // 2. Find a candidate
                const candidateDoc = snapshot.docs.find(doc => doc.id !== myEntryId);

                if (candidateDoc) {
                    // 3. Transactional Read: Lock both documents
                    const myEntryRef = doc(db, queueCollectionName, myEntryId);
                    const opponentEntryRef = doc(db, queueCollectionName, candidateDoc.id);

                    const myEntrySnap = await transaction.get(myEntryRef);
                    const opponentEntrySnap = await transaction.get(opponentEntryRef);

                    if (!myEntrySnap.exists() || !opponentEntrySnap.exists()) {
                        return false; // Documents disappeared
                    }

                    const myData = myEntrySnap.data();
                    const opponentData = opponentEntrySnap.data();

                    // 4. Verification: Are they still waiting?
                    if (myData.status !== 'waiting') {
                        return true; // We are already matched! (by someone else)
                    }
                    if (opponentData.status !== 'waiting') {
                        return false; // Opponent got snatched, retry loop will find someone else
                    }

                    // 5. Proceed with Match
                    const sessionRef = doc(collection(db, sessionsCollectionName));
                    const sessionId = sessionRef.id;

                    // Create the session document with enhanced matching info
                    // We must determine pure IDs for stability
                    // Assuming playerId fields are stable strings
                    const sessionData = {
                        sessionId,
                        playerIds: [myPlayerId, opponentData.playerId],
                        gameMode,
                        betAmount,
                        status: 'active',
                        createdAt: serverTimestamp(),
                        lastUpdate: serverTimestamp(),

                        // Initialize game state immediately
                        gameState: {
                            stage: 'dice_roll',
                            currentRound: 1,
                            player1Dice: null,
                            player2Dice: null,
                            player1Score: 0,
                            player2Score: 0,
                            player1CardsFilled: 0,
                            player2CardsFilled: 0,
                            roundEnded: false,
                            chosenLetter: null
                        },

                        // Legacy support
                        turn: myPlayerId,
                        scores: {
                            [myPlayerId]: 0,
                            [opponentData.playerId]: 0
                        }
                    };

                    // Update both queue entries to matched
                    transaction.update(myEntryRef, {
                        status: 'matched',
                        sessionId: sessionId,
                        opponentId: opponentData.playerId
                    });
                    transaction.update(opponentEntryRef, {
                        status: 'matched',
                        sessionId: sessionId,
                        opponentId: myPlayerId
                    });

                    // Create the session
                    transaction.set(sessionRef, sessionData);
                    console.log("✅ Match created with session:", sessionId);
                    return true; // Match found and locked
                }
                return false; // No match yet
            });

            if (matched) {
                return; // Match successful, stop retrying
            }

            // No match found, retry if we haven't exceeded max attempts
            if (attempts < maxAttempts) {
                setTimeout(() => tryMatch(), 2000); // Retry after 2 seconds
            } else {
                console.log('⏱️ Matchmaking attempts exhausted');
            }
        } catch (error) {
            console.error("Matchmaking transaction failed: ", error);
            // Retry on error if we haven't exceeded max attempts
            if (attempts < maxAttempts) {
                setTimeout(() => tryMatch(), 2000);
            }
        }
    };

    // Start the matching process
    tryMatch();
};

/**
 * Leaves the matchmaking queue.
 */
export const leaveQueue = async (languageCode, queueEntryId) => {
    const collectionName = getLanguageCollection(languageCode, 'matchmaking_queue');
    await deleteDoc(doc(db, collectionName, queueEntryId));
};

/**
 * Listens for matches in the queue.
 */
export const listenForMatch = (languageCode, queueEntryId, callback) => {
    const collectionName = getLanguageCollection(languageCode, 'matchmaking_queue');
    const entryRef = doc(db, collectionName, queueEntryId);

    return onSnapshot(entryRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.status === 'matched') {
                callback(data.sessionId);
            }
        }
    });
};

// Matchmaking timeout (10 seconds)
export const MATCHMAKING_TIMEOUT = 10000;

/**
 * Waits for a match with timeout. Returns sessionId if matched, null if timeout.
 * @param {string} languageCode - Language code
 * @param {string} queueEntryId - Queue entry ID
 * @param {number} timeout - Timeout in milliseconds (default 15000)
 * @returns {Promise<string|null>} - Session ID if matched, null if timeout
 */
export const waitForMatchWithTimeout = (languageCode, queueEntryId, timeout = MATCHMAKING_TIMEOUT) => {
    return new Promise((resolve) => {
        let unsubscribe = null;
        let timeoutTimer = null;
        let resolved = false;

        // Set up timeout
        timeoutTimer = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                if (unsubscribe) unsubscribe();
                console.log('⏱️ Matchmaking timeout - no match found');
                resolve(null); // Timeout - no match found
            }
        }, timeout);

        // Listen for match
        unsubscribe = listenForMatch(languageCode, queueEntryId, (sessionId) => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutTimer);
                if (unsubscribe) unsubscribe();
                console.log('✅ Match found! Session ID:', sessionId);
                resolve(sessionId); // Match found
            }
        });
    });
};

/**
 * Joins tournament queue and waits for other players (with timeout).
 * Returns array of matched player IDs (can be 0-3 players).
 * @param {string} playerId - Current player ID
 * @param {string} languageCode - Language code
 * @param {number} betAmount - Bet amount
 * @returns {Promise<{sessionId: string|null, playerIds: string[]}>}
 */
export const joinTournamentQueue = async (playerId, languageCode, betAmount) => {
    const queueCollection = getLanguageCollection(languageCode, 'tournament_queue');
    const queueRef = collection(db, queueCollection);

    // Create tournament queue entry
    const entry = {
        playerId,
        betAmount,
        status: 'waiting',
        timestamp: serverTimestamp(),
        playersNeeded: 3 // Looking for 3 other players (total 4)
    };

    const docRef = await addDoc(queueRef, entry);
    const myEntryId = docRef.id;

    console.log('🎮 Joined tournament queue:', myEntryId);

    // Try to match with other players
    const sessionId = await waitForMatchWithTimeout(languageCode, myEntryId, MATCHMAKING_TIMEOUT);

    if (sessionId) {
        // Match found - get all players in this session
        const sessionsCollectionName = getLanguageCollection(languageCode, 'game_sessions');
        const sessionRef = doc(db, sessionsCollectionName, sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (sessionSnap.exists()) {
            const sessionData = sessionSnap.data();
            const otherPlayerIds = sessionData.playerIds.filter(id => id !== playerId);

            // Clean up queue entry
            await deleteDoc(doc(db, queueCollection, myEntryId));

            return {
                sessionId,
                playerIds: otherPlayerIds
            };
        }
    }

    // Timeout - no match found
    await deleteDoc(doc(db, queueCollection, myEntryId));

    return {
        sessionId: null,
        playerIds: []
    };
};
