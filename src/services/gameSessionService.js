import { db } from '../firebase';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    deleteDoc
} from 'firebase/firestore';
import { getLanguageCollection } from './firestoreService';

/**
 * Creates a new game session for matched players with comprehensive game state
 * @param {string} languageCode - Language code
 * @param {string} sessionId - Session ID
 * @param {string[]} playerIds - Array of player UIDs (2 for regular, 4 for tournament)
 * @param {string} gameMode - Game mode ('2player' or 'tournament')
 * @param {number} betAmount - Bet amount
 */
export const createGameSession = async (languageCode, sessionId, playerIds, gameMode, betAmount) => {
    const collectionName = getLanguageCollection(languageCode, 'game_sessions');
    const sessionRef = doc(db, collectionName, sessionId);

    // Initialize scores for all players
    const initialScores = {};
    playerIds.forEach(playerId => {
        initialScores[playerId] = 0;
    });

    const sessionData = {
        sessionId,
        playerIds,
        gameMode,
        betAmount,
        status: 'active',
        createdAt: serverTimestamp(),
        lastUpdate: serverTimestamp(),

        // Enhanced game state for synchronization
        gameState: {
            // Current stage of the game
            stage: 'waiting', // 'waiting', 'dice_roll', 'letter_selection', 'card_filling', 'comparison', 'round_end'

            // Round information
            currentRound: 1,

            // Dice results (null until rolled)
            player1Dice: null,
            player2Dice: null,
            player1Rolling: false,
            player2Rolling: false,

            // Chosen letter (null until selected)
            chosenLetter: null,

            // Card filling progress (counts only, not actual answers)
            player1CardsFilled: 0,
            player2CardsFilled: 0,

            // Round end state
            roundEnded: false,
            stoppedBy: null, // Player ID who pressed STOP

            // Scores
            player1Score: 0,
            player2Score: 0,

            // Round winners
            round1Winner: null,
            round2Winner: null,
            gameWinner: null,

            // Turm tracking for sequential dice rolling
            currentTurn: 1 // Player 1 rolls first
        },

        // Legacy fields for backward compatibility
        currentRound: 1,
        selectedLetter: null,
        diceRolls: {},
        answers: {},
        scores: initialScores,
        currentTurn: 1,
        turnDeadline: null
    };

    await setDoc(sessionRef, sessionData);
    console.log('✅ Game session created with enhanced state:', sessionId);
    return sessionData;
};

/**
 * Listens to game session updates in real-time
 * @param {string} languageCode - Language code
 * @param {string} sessionId - Session ID
 * @param {function} callback - Callback function to handle updates
 * @returns {function} Unsubscribe function
 */
export const listenToGameSession = (languageCode, sessionId, callback) => {
    const collectionName = getLanguageCollection(languageCode, 'game_sessions');
    const sessionRef = doc(db, collectionName, sessionId);

    return onSnapshot(sessionRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            console.warn('Game session not found:', sessionId);
        }
    });
};

/**
 * Updates game state (generic update function)
 * @param {string} languageCode - Language code
 * @param {string} sessionId - Session ID
 * @param {object} updates - Object with fields to update
 */
export const updateGameState = async (languageCode, sessionId, updates) => {
    const collectionName = getLanguageCollection(languageCode, 'game_sessions');
    const sessionRef = doc(db, collectionName, sessionId);

    await updateDoc(sessionRef, {
        ...updates,
        lastUpdated: serverTimestamp()
    });
};

/**
 * Submits a player action (dice roll, letter selection, answer, etc.)
 * @param {string} languageCode - Language code
 * @param {string} sessionId - Session ID
 * @param {string} playerId - Player UID
 * @param {object} action - Action object { type, value }
 */
export const submitPlayerAction = async (languageCode, sessionId, playerId, action) => {
    const collectionName = getLanguageCollection(languageCode, 'game_sessions');
    const sessionRef = doc(db, collectionName, sessionId);

    const updates = {};

    switch (action.type) {
        case 'DICE_ROLL':
            updates[`diceRolls.${playerId}`] = action.value;
            break;

        case 'LETTER_SELECT':
            updates.selectedLetter = action.value;
            updates.currentTurn = playerId;
            break;

        case 'ANSWERS_SUBMIT':
            updates[`answers.${playerId}`] = action.value;
            break;

        case 'SCORE_UPDATE':
            updates[`scores.${playerId}`] = action.value;
            break;

        default:
            console.warn('Unknown action type:', action.type);
            return;
    }

    updates.lastUpdated = serverTimestamp();
    await updateDoc(sessionRef, updates);
    console.log(`✅ Player action submitted: ${action.type}`, action.value);
};

/**
 * Ends a game session
 * @param {string} languageCode - Language code
 * @param {string} sessionId - Session ID
 * @param {string} winnerId - Winner's UID
 */
export const endGameSession = async (languageCode, sessionId, winnerId) => {
    const collectionName = getLanguageCollection(languageCode, 'game_sessions');
    const sessionRef = doc(db, collectionName, sessionId);

    await updateDoc(sessionRef, {
        status: 'completed',
        winnerId,
        completedAt: serverTimestamp()
    });

    console.log('✅ Game session ended. Winner:', winnerId);
};

/**
 * Handles player disconnection
 * @param {string} languageCode - Language code
 * @param {string} sessionId - Session ID
 * @param {string} playerId - Disconnected player's UID
 */
export const handlePlayerDisconnect = async (languageCode, sessionId, playerId) => {
    const collectionName = getLanguageCollection(languageCode, 'game_sessions');
    const sessionRef = doc(db, collectionName, sessionId);

    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) return;

    const sessionData = sessionSnap.data();
    const remainingPlayers = sessionData.playerIds.filter(id => id !== playerId);

    if (remainingPlayers.length === 1) {
        // Only one player left - they win by default
        await endGameSession(languageCode, sessionId, remainingPlayers[0]);
    } else {
        // Mark player as disconnected
        await updateDoc(sessionRef, {
            [`disconnected.${playerId}`]: true,
            lastUpdated: serverTimestamp()
        });
    }

    console.log('⚠️ Player disconnected:', playerId);
};

/**
 * Gets current game session data
 * @param {string} languageCode - Language code
 * @param {string} sessionId - Session ID
 * @returns {Promise<object|null>} Session data or null
 */
export const getGameSession = async (languageCode, sessionId) => {
    const collectionName = getLanguageCollection(languageCode, 'game_sessions');
    const sessionRef = doc(db, collectionName, sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (sessionSnap.exists()) {
        return sessionSnap.data();
    }
    return null;
};

/**
 * Handles player actions and updates session state
 * This function processes various game actions and updates the session accordingly
 * Firebase listeners automatically broadcast updates to all connected clients
 * 
 * @param {string} languageCode - Language code
 * @param {string} sessionId - Session ID
 * @param {string} playerId - Player UID who performed the action
 * @param {object} action - Action object { type, value, ... }
 */
export const handlePlayerAction = async (languageCode, sessionId, playerId, action) => {
    const collectionName = getLanguageCollection(languageCode, 'game_sessions');
    const sessionRef = doc(db, collectionName, sessionId);

    // Get current session to determine player index
    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) {
        console.error('Session not found:', sessionId);
        return;
    }

    const sessionData = sessionSnap.data();
    const playerIndex = sessionData.playerIds.indexOf(playerId);

    if (playerIndex === -1) {
        console.error(`❌ CRITICAL: Player ${playerId} not found in session ${sessionId}!`, sessionData.playerIds);
        return;
    }

    const playerKey = playerIndex === 0 ? 'player1' : 'player2';

    const updates = {
        lastUpdate: serverTimestamp()
    };

    switch (action.type) {
        case 'START_ROLLING':
            updates[`gameState.${playerKey}Rolling`] = true;
            console.log(`🎲 ${playerId} started rolling`);
            break;

        case 'DICE_ROLLED':
            // Player rolled dice
            updates[`gameState.${playerKey}Dice`] = action.value;
            updates[`gameState.${playerKey}Rolling`] = false;
            updates[`diceRolls.${playerId}`] = action.value; // Legacy field
            console.log(`🎲 ${playerId} rolled: ${action.value}`);

            // Check if both players have rolled
            const otherPlayerKey = playerKey === 'player1' ? 'player2' : 'player1';
            const otherPlayerDice = sessionData.gameState?.[`${otherPlayerKey}Dice`];

            if (otherPlayerDice !== null && otherPlayerDice !== undefined) {
                // Both rolled - determine winner
                const myDice = action.value;
                const theirDice = otherPlayerDice;

                console.log(`🎲 Comparing dice: Player ${playerIndex + 1}=${myDice}, Other=${theirDice}`);

                if (myDice > theirDice) {
                    updates['gameState.diceWinner'] = playerId;
                    updates['gameState.stage'] = 'letter_selection';
                    console.log(`🏆 Dice winner: ${playerId}`);
                } else if (theirDice > myDice) {
                    const otherPlayerId = sessionData.playerIds[playerIndex === 0 ? 1 : 0];
                    updates['gameState.diceWinner'] = otherPlayerId;
                    updates['gameState.stage'] = 'letter_selection';
                    console.log(`🏆 Dice winner: ${otherPlayerId}`);
                } else {
                    // Tie - reset for re-roll
                    updates['gameState.player1Dice'] = null;
                    updates['gameState.player2Dice'] = null;
                    updates['gameState.currentTurn'] = 1; // Player 1 rolls first again
                    console.log(`🔄 Dice tie! Re-rolling...`);
                }
            } else {
                // Only one player has rolled - switch turn to other player
                const nextTurn = playerIndex === 0 ? 2 : 1;
                updates['gameState.currentTurn'] = nextTurn;
                console.log(`🔄 Turn switched to Player ${nextTurn}`);
            }
            break;

        case 'NEXT_ROUND_STARTED':
            updates['gameState.currentTurn'] = 1;
            updates['gameState.player1Dice'] = null;
            updates['gameState.player2Dice'] = null;
            updates['gameState.player1Rolling'] = false;
            updates['gameState.player2Rolling'] = false;
            updates['gameState.diceWinner'] = null;
            updates['gameState.chosenLetter'] = null;
            updates['gameState.stage'] = 'dice_roll';
            updates['gameState.roundEnded'] = false;
            updates['gameState.stoppedBy'] = null;
            updates['gameState.player1CardsFilled'] = 0;
            updates['gameState.player2CardsFilled'] = 0;
            updates['gameState.currentRound'] = action.roundNumber;
            // Clear answers for new round if needed, or handle separately
            console.log(`🔄 Next round started: Round ${action.roundNumber}`);
            break;

        case 'LETTER_CHOSEN':
            // Player chose letter
            updates['gameState.chosenLetter'] = action.letter;
            updates['gameState.stage'] = 'card_filling';
            updates['selectedLetter'] = action.letter; // Legacy field
            console.log(`🔤 Letter chosen: ${action.letter}`);
            break;

        case 'CARD_FILLED':
            // Player filled a card (update count only, not actual answer)
            const currentCount = sessionData.gameState?.[`${playerKey}CardsFilled`] || 0;
            updates[`gameState.${playerKey}CardsFilled`] = currentCount + 1;
            console.log(`📝 ${playerId} filled card ${currentCount + 1}/7`);

            // Store actual answer privately (not broadcast in gameState)
            if (action.category && action.answer) {
                updates[`answers.${playerId}.${action.category}`] = action.answer;
            }
            break;

        case 'STOP_PRESSED':
            // Player pressed STOP - end the round
            updates['gameState.roundEnded'] = true;
            updates['gameState.stoppedBy'] = playerId;
            updates['gameState.stage'] = 'comparison';
            console.log(`⏹️ ${playerId} pressed STOP - round ended`);
            break;

        case 'ROUND_WINNER':
            // Update round winner
            const roundNum = sessionData.gameState?.currentRound || 1;
            updates[`gameState.round${roundNum}Winner`] = action.winnerId;
            console.log(`🏆 Round ${roundNum} winner: ${action.winnerId}`);
            break;

        case 'SCORE_UPDATE':
            // Update player score
            updates[`gameState.${playerKey}Score`] = action.score;
            updates[`scores.${playerId}`] = action.score; // Legacy field
            console.log(`📊 ${playerId} score updated: ${action.score}`);
            break;

        case 'NEXT_ROUND':
            // Advance to next round
            const nextRound = (sessionData.gameState?.currentRound || 1) + 1;
            updates['gameState.currentRound'] = nextRound;
            updates['gameState.stage'] = 'dice_roll';
            updates['gameState.player1Dice'] = null;
            updates['gameState.player2Dice'] = null;
            updates['gameState.chosenLetter'] = null;
            updates['gameState.player1CardsFilled'] = 0;
            updates['gameState.player2CardsFilled'] = 0;
            updates['gameState.roundEnded'] = false;
            updates['gameState.stoppedBy'] = null;
            updates['currentRound'] = nextRound; // Legacy field
            console.log(`➡️ Advanced to round ${nextRound}`);
            break;

        case 'GAME_WINNER':
            // Set game winner
            updates['gameState.gameWinner'] = action.winnerId;
            updates['gameState.stage'] = 'game_end';
            updates['status'] = 'completed';
            updates['winnerId'] = action.winnerId;
            console.log(`👑 Game winner: ${action.winnerId}`);
            break;

        default:
            console.warn('Unknown action type:', action.type);
            return;
    }

    // Update session in Firestore
    // This automatically triggers onSnapshot listeners for all connected clients
    await updateDoc(sessionRef, updates);
    console.log(`✅ Session updated - action: ${action.type}`);
};

/**
 * Broadcasts a session update to all players
 * Note: This is a convenience wrapper around updateGameState
 * Firebase listeners automatically notify all clients when the session updates
 * 
 * @param {string} languageCode - Language code
 * @param {string} sessionId - Session ID
 * @param {object} updates - Updates to apply to session
 */
export const broadcastSessionUpdate = async (languageCode, sessionId, updates) => {
    await updateGameState(languageCode, sessionId, updates);
    console.log('📡 Session update broadcast');
};

/**
 * Creates a tournament session with 4 players
 * @param {string} languageCode - Language code
 * @param {string} sessionId - Session ID
 * @param {string[]} playerIds - Array of 4 player UIDs
 * @param {number} betAmount - Bet amount per player
 */
export const createTournamentSession = async (languageCode, sessionId, playerIds, betAmount) => {
    if (playerIds.length !== 4) {
        throw new Error('Tournament requires exactly 4 players');
    }

    const collectionName = getLanguageCollection(languageCode, 'game_sessions');
    const sessionRef = doc(db, collectionName, sessionId);

    const sessionData = {
        sessionId,
        playerIds,
        gameMode: 'tournament',
        betAmount,
        prizePool: betAmount * 4,
        status: 'active',
        createdAt: serverTimestamp(),
        lastUpdate: serverTimestamp(),

        // Tournament state
        tournamentState: {
            stage: 'semifinals', // 'semifinals', 'finals', 'completed'

            // Semi-final matches
            semiAPlayers: [playerIds[0], playerIds[1]],
            semiBPlayers: [playerIds[2], playerIds[3]],

            // Winners (null until determined)
            semiAWinner: null,
            semiBWinner: null,
            champion: null,

            // Sub-session IDs for semi-finals
            semiASessionId: null,
            semiBSessionId: null,
            finalsSessionId: null
        }
    };

    await setDoc(sessionRef, sessionData);
    console.log('🏆 Tournament session created:', sessionId);
    return sessionData;
};

/**
 * Deletes a game session (cleanup)
 * @param {string} languageCode - Language code
 * @param {string} sessionId - Session ID
 */
export const deleteGameSession = async (languageCode, sessionId) => {
    const collectionName = getLanguageCollection(languageCode, 'game_sessions');
    const sessionRef = doc(db, collectionName, sessionId);
    await deleteDoc(sessionRef);
    console.log('🗑️ Game session deleted:', sessionId);
};
