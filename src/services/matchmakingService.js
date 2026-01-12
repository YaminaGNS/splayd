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
 */
const attemptMatch = async (languageCode, myEntryId, myPlayerId, gameMode, betAmount) => {
    const queueCollectionName = getLanguageCollection(languageCode, 'matchmaking_queue');
    const sessionsCollectionName = getLanguageCollection(languageCode, 'game_sessions');

    try {
        await runTransaction(db, async (transaction) => {
            // Find oldest waiting player that isn't us
            const q = query(
                collection(db, queueCollectionName),
                where('status', '==', 'waiting'),
                where('gameMode', '==', gameMode),
                where('betAmount', '==', betAmount),
                orderBy('timestamp', 'asc'),
                limit(10)
            );

            const snapshot = await getDocs(q);
            const opponentDoc = snapshot.docs.find(doc => doc.id !== myEntryId);

            if (opponentDoc) {
                const opponentData = opponentDoc.data();
                const sessionRef = doc(collection(db, sessionsCollectionName));
                const sessionId = sessionRef.id;

                // Create the session document
                const sessionData = {
                    sessionId,
                    playerIds: [myPlayerId, opponentData.playerId],
                    gameMode,
                    betAmount,
                    status: 'active',
                    createdAt: serverTimestamp(),
                    turn: myPlayerId, // Initial turn
                    scores: {
                        [myPlayerId]: 0,
                        [opponentData.playerId]: 0
                    }
                };

                // Update both queue entries to matched
                transaction.update(doc(db, queueCollectionName, myEntryId), {
                    status: 'matched',
                    sessionId: sessionId
                });
                transaction.update(doc(db, queueCollectionName, opponentDoc.id), {
                    status: 'matched',
                    sessionId: sessionId
                });

                // Create the session
                transaction.set(sessionRef, sessionData);
                console.log("Match created with session:", sessionId);
            }
        });
    } catch (error) {
        console.error("Matchmaking transaction failed: ", error);
    }
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

