import React, { useState, useEffect } from 'react';
import './GameScreen.css';
import CardFillingScreen from './CardFillingScreen';

import GameCard from './GameCard';
import LetterSelectionScreen from './LetterSelectionScreen';
import LetterAnnounceOverlay from './LetterAnnounceOverlay';
import { CATEGORY_ICONS, CARD_SEQUENCE } from '../constants/gameConstants';
import { motion, AnimatePresence } from 'framer-motion';
import { validateAnswer, getAIAnswer, compareAnswers } from '../services/gameLogic';
import { listenToGameSession, submitPlayerAction, updateGameState, handlePlayerAction } from '../services/gameSessionService';
import winnerCrown from '../assets/game-icons/winner_crown.png';
import winnerCoins from '../assets/game-icons/winner_coins.png';

const ASSETS = {
    STOP_BTN: 'https://i.postimg.cc/CKFZcjxt/STOP.png',
    SCORE_ICON: 'https://i.postimg.cc/WzMF9Sg5/STOP-(1).png'
};

const DiceIcon = ({ value, isRolling, isActiveRoller }) => {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        let timeoutId;
        if (isRolling) {
            let count = 0;
            const maxShuffles = 10;
            const shuffle = () => {
                setDisplayValue(Math.floor(Math.random() * 6) + 1);
                count++;
                if (count < maxShuffles) {
                    const delay = 60 + (count * 15);
                    timeoutId = setTimeout(shuffle, delay);
                } else {
                    setDisplayValue(value);
                }
            };
            shuffle();
        } else {
            setDisplayValue(value);
        }
        return () => clearTimeout(timeoutId);
    }, [isRolling]);

    // Dice dot patterns for 1-6
    const patterns = {
        0: [], // Hidden/Empty
        1: [4],
        2: [0, 8],
        3: [0, 4, 8],
        4: [0, 2, 6, 8],
        5: [0, 2, 4, 6, 8],
        6: [0, 3, 6, 2, 5, 8] // Two columns of three
    };

    const dots = patterns[displayValue] || [];

    return (
        <motion.div
            className={`dice-icon-refined ${isRolling ? 'rolling-3d' : ''} ${isActiveRoller ? 'active-roller-3d' : ''}`}
            animate={isRolling ? {
                rotateX: [0, 360, 720],
                rotateY: [0, 360, 720],
                scale: [1, 1.1, 1],
                y: [0, -10, 0]
            } : {
                rotateX: 0,
                rotateY: 0,
                scale: 1,
                y: 0
            }}
            transition={{
                duration: isRolling ? 1.2 : 0.4,
                ease: isRolling ? "easeInOut" : "easeOut"
            }}
        >
            <div className="dice-face">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className={`dice-dot-realistic ${dots.includes(i) ? 'visible' : 'hidden'}`} />
                ))}
            </div>
            {/* 3D Sides */}
            <div className="dice-depth-effect"></div>
        </motion.div>
    );
};

const StopButton = ({ onClick, disabled }) => (
    <img
        src={ASSETS.STOP_BTN}
        alt="STOP"
        className={`stop-button-img ${disabled ? 'disabled' : ''}`}
        onClick={disabled ? undefined : onClick}
        style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    />
);

const PlayerBadge = ({ name, avatarUrl }) => (
    <div className="player-badge">
        <div className="avatar-circle-small">
            {avatarUrl ?
                <img src={avatarUrl} alt="Avatar" className="player-avatar-img" /> :
                <div className="avatar-initial-small">{name ? name.charAt(0).toUpperCase() : '?'}</div>
            }
        </div>
        <span className="player-name">{name}</span>
    </div>
);

const ScoreDisplay = ({ score, addedPoints, keyPrefix }) => (
    <div className="score-display">
        <div className="score-badge">
            <span className="score-text">SCORE</span>
        </div>
        <div className="score-value-container">
            <span className="score-value-refined">{score}</span>
            <AnimatePresence>
                {addedPoints !== null && (
                    <motion.span
                        key={`${keyPrefix}-${addedPoints}-${Date.now()}`}
                        className={`points-float ${addedPoints > 0 ? 'plus-ten' : 'plus-zero'}`}
                        initial={{ opacity: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: 1, y: -30, scale: 1.2 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        {addedPoints >= 0 ? `+${addedPoints}` : addedPoints}
                    </motion.span>
                )}
            </AnimatePresence>
        </div>
    </div>
);

const GameScreen = ({ user, opponent, sessionId, languageCode, onGameEnd, betAmount, isTournament, isSpectator, playerId }) => {
    // Safety check for required props
    if (!user || (!opponent && !isSpectator)) {
        console.warn('⚠️ GameScreen missing required props:', { user: !!user, opponent: !!opponent, sessionId: !!sessionId });
        return (
            <div className="game-screen-loading" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                color: 'white'
            }}>
                <div className="loading-spinner"></div>
                <p>Initializing Game Session...</p>
            </div>
        );
    }

    // Detect if opponent is real (not AI)
    const isRealOpponent = opponent && !opponent.uid?.startsWith('bot-') && !isSpectator && sessionId;

    // Use passed playerId (session-specific) or fall back to user.uid
    const effectivePlayerId = playerId || user?.uid;

    // Game State
    const [gamePhase, setGamePhase] = useState('round_announcement'); // round_announcement, dice_roll, letter_select, letter_announce, playing, comparison, round_winner, game_winner
    const [rolling, setRolling] = useState(false);
    const [diceResults, setDiceResults] = useState({ me: 0, opponent: 0 });
    const [rollWinner, setRollWinner] = useState(null);
    const [currentRoller, setCurrentRoller] = useState('none');
    const [selectedLetter, setSelectedLetter] = useState(null);
    const [announcing, setAnnouncing] = useState(false);
    const [waitingForOpponent, setWaitingForOpponent] = useState(false);
    const [pendingOpponentRoll, setPendingOpponentRoll] = useState(null);

    // Sequential dice rolling states
    const [myPlayerNumber, setMyPlayerNumber] = useState(null); // 1 or 2
    const [currentTurn, setCurrentTurn] = useState(1); // Player 1 rolls first

    const [filledCards, setFilledCards] = useState({});
    const [answers, setAnswers] = useState({});
    const [opponentAnswers, setOpponentAnswers] = useState({});
    const [opponentFilled, setOpponentFilled] = useState({});

    const [isFillingScreenOpen, setIsFillingScreenOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState('NAME');
    const [myFilledStack, setMyFilledStack] = useState([]);
    const [opponentFilledStack, setOpponentFilledStack] = useState([]);

    const [myScore, setMyScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [comparisonIndex, setComparisonIndex] = useState(0);
    const [currentResults, setCurrentResults] = useState([]);
    const [showStopNotification, setShowStopNotification] = useState(false);
    const [stopperName, setStopperName] = useState('');

    // Round Tracking State
    const [currentRound, setCurrentRound] = useState(1);
    const [roundWinners, setRoundWinners] = useState([]); // List of winners ('me', 'opponent')
    const [announcementText, setAnnouncementText] = useState('ROUND 1');
    const [currentRoundWinner, setCurrentRoundWinner] = useState(null);
    const [finalGameWinner, setFinalGameWinner] = useState(null);

    // Animation States for Points
    const [addedPointsP1, setAddedPointsP1] = useState(null);
    const [addedPointsP2, setAddedPointsP2] = useState(null);

    // Track if round has ended to prevent double endRound calls
    const [roundEnded, setRoundEnded] = useState(false);

    // Mock opponent if not provided
    const mockOpponent = opponent || {
        displayName: 'player name',
        photoURL: 'https://i.postimg.cc/mD8T9nB4/avatar-placeholder.png'
    };

    // Initialize Round 1
    useEffect(() => {
        if (gamePhase === 'round_announcement') {
            const timer = setTimeout(() => {
                setGamePhase('dice_roll');
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [gamePhase]);

    // Listen to game session for real-time updates (multiplayer)
    useEffect(() => {
        if (!isRealOpponent || !sessionId || !languageCode) return;

        console.log('🔄 Setting up real-time game session listener');
        const unsubscribe = listenToGameSession(languageCode, sessionId, (sessionData) => {
            console.log('📡 Session update received:', sessionData);

            // Use enhanced gameState if available, fallback to legacy fields
            const gameState = sessionData.gameState || {};

            // Determine my player number (1 or 2)
            const playerIndex = sessionData.playerIds?.indexOf(effectivePlayerId);
            if (playerIndex !== -1 && myPlayerNumber === null) {
                const pNum = playerIndex + 1; // 1 or 2
                setMyPlayerNumber(pNum);
                console.log(`👤 I am Player ${pNum}`);
            }

            // Track current turn from session
            if (gameState.currentTurn !== undefined) {
                setCurrentTurn(gameState.currentTurn);
            }

            // Sync rolling state from server
            const p1Rolling = gameState.player1Rolling === true;
            const p2Rolling = gameState.player2Rolling === true;
            const meRolling = playerIndex === 0 ? p1Rolling : p2Rolling;
            const oppRolling = playerIndex === 0 ? p2Rolling : p1Rolling;

            if (p1Rolling || p2Rolling) {
                setRolling(true);
                if (meRolling && oppRolling) setCurrentRoller('both');
                else if (meRolling) setCurrentRoller('me');
                else if (oppRolling) setCurrentRoller('opponent');
            } else if (!rolling) { // Only clear if we're not manually rolling locally
                setCurrentRoller('none');
            }

            // Sync dice rolls from gameState
            const opponentPlayerNum = (playerIndex === 0) ? 2 : 1;
            const opponentDice = opponentPlayerNum === 1 ? gameState.player1Dice : gameState.player2Dice;
            const myDice = opponentPlayerNum === 1 ? gameState.player2Dice : gameState.player1Dice;

            // Updated local dice results from session
            setDiceResults(prev => ({
                me: myDice || prev.me,
                opponent: opponentDice || prev.opponent
            }));

            // If dice were reset by server (tie), clear local visuals
            if (gameState.player1Dice === null && gameState.player2Dice === null && (diceResults.me !== 0 || diceResults.opponent !== 0)) {
                setDiceResults({ me: 0, opponent: 0 });
            }

            // Check if both rolled - finalize
            if (gameState.player1Dice && gameState.player2Dice && gamePhase === 'dice_roll') {
                // Finalize logic...
                if (gameState.diceWinner) {
                    const iWon = gameState.diceWinner === effectivePlayerId;
                    setRollWinner(iWon ? 'me' : 'opponent');
                    setTimeout(() => {
                        setGamePhase('letter_select');
                    }, 1000); // Small delay to see the results
                    console.log(`🏆 Dice winner: ${iWon ? 'me' : 'opponent'}`);
                }
            }

            // Sync selected letter from gameState - closes letter selection for BOTH players
            const chosenLetter = gameState.chosenLetter || sessionData.selectedLetter;
            if (chosenLetter && chosenLetter !== selectedLetter) {
                console.log(`🔤 Letter chosen: ${chosenLetter} - closing letter screen for both players`);
                setSelectedLetter(chosenLetter);

                // Show letter announcement and move to playing phase
                setAnnouncing(true);
                setGamePhase('letter_announce');

                setTimeout(() => {
                    setAnnouncing(false);
                    setGamePhase('playing');
                }, 3000);
            }

            // Sync opponent card filling progress (count only)
            const opponentCardsFilled = playerIndex === 0 ? gameState.player2CardsFilled : gameState.player1CardsFilled;
            if (opponentCardsFilled !== undefined) {
                // Update opponent filled stack based on count
                const currentOpponentCount = opponentFilledStack.length;
                if (opponentCardsFilled > currentOpponentCount) {
                    // Opponent filled more cards - add placeholders
                    const newStack = [...opponentFilledStack];
                    for (let i = currentOpponentCount; i < opponentCardsFilled; i++) {
                        newStack.push({ category: CARD_SEQUENCE[i], answer: '' });
                    }
                    setOpponentFilledStack(newStack);
                }
            }

            // Sync opponent answers (actual answers for comparison)
            if (sessionData.answers && sessionData.answers[opponent.uid]) {
                setOpponentAnswers(sessionData.answers[opponent.uid]);
                // Update filled status
                const oppAnswers = sessionData.answers[opponent.uid];
                const newFilled = {};
                Object.keys(oppAnswers).forEach(cat => {
                    newFilled[cat] = true;
                });
                setOpponentFilled(newFilled);
            }

            // Sync STOP press
            if (gameState.roundEnded && gameState.stoppedBy && gameState.stoppedBy !== effectivePlayerId) {
                // Opponent pressed STOP
                if (gamePhase === 'playing' && !roundEnded) {
                    setRoundEnded(true);
                    endRound(opponent.displayName || 'Opponent');
                }
            }
        });

        return () => {
            console.log('🔌 Cleaning up game session listener');
            unsubscribe();
        };
    }, [isRealOpponent, sessionId, languageCode, opponent?.uid, effectivePlayerId, selectedLetter, gamePhase, roundEnded]);

    // Handle Opponent Roll Animation
    useEffect(() => {
        if (pendingOpponentRoll !== null && gamePhase === 'dice_roll' && isRealOpponent) {
            // Show opponent rolling animation
            console.log("🎲 Opponent rolled:", pendingOpponentRoll);
            setCurrentRoller('opponent');
            setRolling(true);

            setTimeout(() => {
                setDiceResults(prev => ({ ...prev, opponent: pendingOpponentRoll }));
                setRolling(false);
                setCurrentRoller('none');

                // If I have also rolled, finalize
                if (diceResults.me > 0) {
                    finalizeRoll(diceResults.me, pendingOpponentRoll);
                }
            }, 1500);
        }
    }, [pendingOpponentRoll, gamePhase, isRealOpponent, diceResults.me]);

    const resetForNextRound = () => {
        setFilledCards({});
        setAnswers({});
        setOpponentAnswers({});
        setOpponentFilled({});
        setIsFillingScreenOpen(false);
        setMyFilledStack([]);
        setOpponentFilledStack([]);
        setMyScore(0);
        setOpponentScore(0);
        setComparisonIndex(0);
        setCurrentResults([]);
        setDiceResults({ me: 0, opponent: 0 });
        setRollWinner(null);
        setCurrentRoller('none');
        setSelectedLetter(null);
        setAnnouncing(false);
        setRoundEnded(false); // Reset round ended flag
        setPendingOpponentRoll(null); // Clear pending roll
    };

    const finalizeRoll = (myVal, oppVal) => {
        if (myVal === oppVal) {
            // Tie - reset and roll again
            setTimeout(() => {
                setDiceResults({ me: 0, opponent: 0 }); // Reset visuals
                // Resetting handled by next roll
                handleRoll();
            }, 1000);
        } else {
            const winner = myVal > oppVal ? 'me' : 'opponent';
            setRollWinner(winner);
            setTimeout(() => {
                setGamePhase('letter_select');
                if (winner === 'opponent') {
                    // If Opponent wins roll, we just wait for their letter selection.
                    // AI logic handled elsewhere.
                    if (!isRealOpponent) {
                        setTimeout(() => {
                            const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                            handleLetterChoice(alphabet[Math.floor(Math.random() * 26)]);
                        }, 2000);
                    }
                }
            }, 1200);
        }
    };



    const handleRoll = React.useCallback(async () => {
        // Sequential rolling: Check if it's my turn
        if (rolling || gamePhase !== 'dice_roll' || diceResults.me !== 0) return;

        // For real opponents: Check if it's my turn
        if (isRealOpponent && myPlayerNumber !== null && currentTurn !== myPlayerNumber) {
            console.log(`⏳ Not my turn. Current turn: Player ${currentTurn}, I am Player ${myPlayerNumber}`);
            return;
        }

        console.log(`🎲 Rolling dice (I am Player ${myPlayerNumber}, Turn: ${currentTurn})`);
        setRolling(true);
        setCurrentRoller('me');

        // Sync START_ROLLING to Firebase if real opponent
        if (isRealOpponent && sessionId && languageCode) {
            handlePlayerAction(languageCode, sessionId, effectivePlayerId, {
                type: 'START_ROLLING'
            }).catch(err => console.error('Error syncing start rolling:', err));
        }

        const myVal = Math.floor(Math.random() * 6) + 1;

        // Visual roll duration
        setTimeout(() => {
            setDiceResults(prev => ({ ...prev, me: myVal }));
            setRolling(false);
            setCurrentRoller('none');

            // Sync DICE_ROLLED to Firebase if real opponent
            if (isRealOpponent && sessionId && languageCode) {
                handlePlayerAction(languageCode, sessionId, effectivePlayerId, {
                    type: 'DICE_ROLLED',
                    value: myVal
                }).catch(err => console.error('Error syncing dice roll:', err));
            }
        }, 1200);

        // AI Logic: Trigger their roll if playing against bot (simulated sequence)
        if (!isRealOpponent) {
            // If I am Player 1, AI (P2) rolls after me
            // For simple bot mode, user rolls, then bot rolls
            setTimeout(() => {
                const oppVal = Math.floor(Math.random() * 6) + 1;
                setDiceResults(prev => ({ ...prev, opponent: oppVal }));

                setTimeout(() => {
                    finalizeRoll(myVal, oppVal);
                }, 500);
            }, 1500);
        }
    }, [rolling, gamePhase, diceResults.me, finalizeRoll, isRealOpponent, sessionId, languageCode, effectivePlayerId, myPlayerNumber, currentTurn]);

    // Auto roll / re-roll logic
    useEffect(() => {
        if (!isRealOpponent || gamePhase !== 'dice_roll' || myPlayerNumber === null) return;

        if (currentTurn === myPlayerNumber && diceResults.me === 0 && !rolling) {
            console.log('🤖 Auto-triggering roll for turn:', currentTurn);
            const timer = setTimeout(() => {
                handleRoll();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [currentTurn, myPlayerNumber, diceResults.me, rolling, gamePhase, isRealOpponent, handleRoll]);

    // Automation for spectator mode - Letter selection
    useEffect(() => {
        if (isSpectator && gamePhase === 'letter_select') {
            const timer = setTimeout(() => {
                const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                handleLetterChoice(alphabet[Math.floor(Math.random() * 26)]);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isSpectator, gamePhase]);

    // AI logic for filling cards (Only if playing against bot)
    useEffect(() => {
        if (gamePhase === 'playing' && selectedLetter) {
            if (!isRealOpponent) {
                simulateAIFilling();
            }
            if (isSpectator) {
                simulatePlayer1AIFilling();
            }
        }
    }, [gamePhase, selectedLetter, isSpectator, isRealOpponent]);

    const simulatePlayer1AIFilling = () => {
        // Level-based difficulty: Higher level = Faster completion
        const playerLevel = user?.level || 1;
        let baseTime;

        if (playerLevel >= 7) {
            // High-level AI: Fast and competitive (40-50 seconds)
            baseTime = 40000 + (Math.random() * 10000);
        } else {
            // Low-level AI: Slower and easier to beat (55-70 seconds)
            baseTime = 55000 + (Math.random() * 15000);
        }

        const totalTime = baseTime;
        const avgTimePerCard = totalTime / CARD_SEQUENCE.length;
        CARD_SEQUENCE.forEach((category, index) => {
            const delay = (index * avgTimePerCard) + (Math.random() * 2000 - 1000);
            setTimeout(() => {
                if (gamePhase !== 'playing') return;
                const answer = getAIAnswer(selectedLetter, category);
                setAnswers(prev => ({ ...prev, [category]: answer }));
                setFilledCards(prev => ({ ...prev, [category]: true }));
                setMyFilledStack(prev => [...prev, { category, answer }]);

                if (index === CARD_SEQUENCE.length - 1) {
                    setTimeout(() => {
                        if (gamePhase === 'playing' && !roundEnded) {
                            setRoundEnded(true);
                            endRound(user?.displayName || 'Player 1');
                        }
                    }, 2500);
                }
            }, delay);
        });
    };

    const simulateAIFilling = () => {
        // Level-based difficulty: Higher level = Faster completion
        const opponentLevel = mockOpponent?.level || opponent?.level || 1;
        let baseTime;

        if (opponentLevel >= 7) {
            // High-level AI: Fast and competitive (40-50 seconds)
            baseTime = 40000 + (Math.random() * 10000);
        } else {
            // Low-level AI: Slower and easier to beat (55-70 seconds)
            baseTime = 55000 + (Math.random() * 15000);
        }

        const totalTime = baseTime;
        const avgTimePerCard = totalTime / CARD_SEQUENCE.length;
        CARD_SEQUENCE.forEach((category, index) => {
            const delay = (index * avgTimePerCard) + (Math.random() * 2000 - 1000);
            setTimeout(() => {
                const answer = getAIAnswer(selectedLetter, category);
                setOpponentAnswers(prev => ({ ...prev, [category]: answer }));
                setOpponentFilled(prev => ({ ...prev, [category]: true }));
                setOpponentFilledStack(prev => [...prev, { category, answer }]);
                if (index === CARD_SEQUENCE.length - 1) {
                    setTimeout(() => {
                        if (gamePhase === 'playing' && !roundEnded) {
                            setRoundEnded(true);
                            endRound(mockOpponent.displayName || 'Opponent');
                        }
                    }, 2500);
                }
            }, delay);
        });
    };

    const handleLetterChoice = async (letter) => {
        setSelectedLetter(letter);

        // Sync to Firebase if real opponent
        if (isRealOpponent && sessionId && languageCode) {
            try {
                await handlePlayerAction(languageCode, sessionId, effectivePlayerId, {
                    type: 'LETTER_CHOSEN',
                    letter: letter
                });
                console.log('🔤 Letter selection synced:', letter);
            } catch (error) {
                console.error('Error syncing letter selection:', error);
            }
        }

        setGamePhase('letter_announce');

        // Skip announcement overlay in spectator mode
        if (isSpectator) {
            setAnnouncing(false);
            setGamePhase('playing');
        } else {
            setAnnouncing(true);
            setTimeout(() => {
                setAnnouncing(false);
                setGamePhase('playing');
            }, 3500);
        }
    };

    const endRound = async (presserName) => {
        if (gamePhase !== 'playing') return;

        // Broadcast STOP press to session if real opponent
        if (isRealOpponent && sessionId && languageCode && !roundEnded) {
            try {
                await handlePlayerAction(languageCode, sessionId, effectivePlayerId, {
                    type: 'STOP_PRESSED'
                });
                console.log('⏹️ STOP press synced');
            } catch (error) {
                console.error('Error syncing STOP press:', error);
            }
        }

        setIsFillingScreenOpen(false);
        setStopperName(presserName);
        setShowStopNotification(true);
        setTimeout(() => {
            setShowStopNotification(false);
            setGamePhase('comparison');
        }, 2500);
    };

    const handleNextComparison = () => {
        const result = currentResults[comparisonIndex];
        if (result) {
            setAddedPointsP1(result.p1Points);
            setAddedPointsP2(result.p2Points);
            setMyScore(prev => prev + result.p1Points);
            setOpponentScore(prev => prev + result.p2Points);
            setTimeout(() => {
                setAddedPointsP1(null);
                setAddedPointsP2(null);
            }, 1500);
        }

        if (comparisonIndex < CARD_SEQUENCE.length - 1) {
            setComparisonIndex(prev => prev + 1);
        } else {
            // End of comparison - determine round winner
            setTimeout(() => {
                determineRoundWinner();
            }, 2000);
        }
    };

    const determineRoundWinner = () => {
        let winner = 'none';
        if (myScore > opponentScore) {
            winner = 'me';
        } else if (opponentScore > myScore) {
            winner = 'opponent';
        }

        const newRoundWinners = [...roundWinners, winner];
        setRoundWinners(newRoundWinners);
        setCurrentRoundWinner(winner);
        // If this is the first round, skip round_winner overlay and proceed directly to next round
        if (roundWinners.length === 0) {
            setTimeout(() => {
                checkGameStatus(newRoundWinners);
            }, 500);
        } else {
            setGamePhase('round_winner');
            setTimeout(() => {
                setGamePhase('none'); // Transition
                checkGameStatus(newRoundWinners);
            }, 4000);
        }
    };

    const checkGameStatus = (winners) => {
        const meWins = winners.filter(w => w === 'me').length;
        const oppWins = winners.filter(w => w === 'opponent').length;

        if (meWins === 2 || (winners.length === 3 && meWins > oppWins)) {
            setFinalGameWinner('me');
            if (isTournament) {
                // In tournament, skip internal popup, let parent handle flow
                onGameEnd('me');
            } else {
                setGamePhase('game_winner');
                // Add 1000 coins logic would go here if balance was mutable in this component
            }
        } else if (oppWins === 2 || (winners.length === 3 && oppWins > meWins)) {
            setFinalGameWinner('opponent');
            if (isTournament) {
                // In tournament, skip internal popup, let parent handle flow
                onGameEnd('opponent');
            } else {
                setGamePhase('game_winner');
            }
        } else {
            // Proceed to next round (Round 2 or Extra Round)
            const nextRoundNum = winners.length + 1;
            setCurrentRound(nextRoundNum);
            setAnnouncementText(nextRoundNum === 3 ? 'EXTRA ROUND' : `ROUND ${nextRoundNum}`);

            // Sync next round start to server
            if (isRealOpponent && sessionId && languageCode) {
                handlePlayerAction(languageCode, sessionId, effectivePlayerId, {
                    type: 'NEXT_ROUND_STARTED',
                    roundNumber: nextRoundNum
                }).catch(console.error);
            }

            resetForNextRound();
            setGamePhase('round_announcement');
        }
    };

    // Run comparison when phase changes to 'comparison'
    useEffect(() => {
        if (gamePhase === 'comparison' && currentResults.length === 0) {
            const results = CARD_SEQUENCE.map(cat => {
                return compareAnswers(answers[cat] || '', opponentAnswers[cat] || '', selectedLetter, cat);
            });
            setCurrentResults(results);
            setComparisonIndex(0);
        }
    }, [gamePhase, answers, opponentAnswers, selectedLetter]);

    // Auto-advance through comparisons
    useEffect(() => {
        if (gamePhase === 'comparison' && currentResults.length > 0) {
            const timer = setTimeout(() => {
                handleNextComparison();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [gamePhase, comparisonIndex, currentResults]);

    const handleCardClick = (category) => {
        if (gamePhase !== 'playing') return;
        setActiveCategory(category);
        setIsFillingScreenOpen(true);
    };

    const handleSaveAnswer = async (category, answer) => {
        setAnswers(prev => ({ ...prev, [category]: answer }));
        setFilledCards(prev => ({ ...prev, [category]: true }));
        setMyFilledStack(prev => [...prev, { category, answer }]);

        // Sync to Firebase if real opponent
        if (isRealOpponent && sessionId && languageCode) {
            try {
                // Broadcast card filled (count only) using handlePlayerAction
                await handlePlayerAction(languageCode, sessionId, effectivePlayerId, {
                    type: 'CARD_FILLED',
                    category: category,
                    answer: answer // Stored privately, not in gameState
                });
                console.log('📝 Card filled synced:', category);
            } catch (error) {
                console.error('Error syncing card fill:', error);
            }
        }

        const newFilled = { ...filledCards, [category]: true };
        const allFilled = CARD_SEQUENCE.every(cat => newFilled[cat]);
        if (allFilled) {
            setIsFillingScreenOpen(false);
        }
    };

    const closeFillingScreen = () => {
        setIsFillingScreenOpen(false);
    };

    const filledCount = CARD_SEQUENCE.filter(cat => filledCards[cat]).length;
    const lastFilled = myFilledStack.length > 0 ? myFilledStack[myFilledStack.length - 1] : null;
    const allCardsFilled = filledCount === CARD_SEQUENCE.length;

    return (
        <div className="game-screen">
            {/* Round Announcement Overlay */}
            <AnimatePresence>
                {gamePhase === 'round_announcement' && (
                    <motion.div
                        className="round-announcement-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <h1 className="round-text-vibrant">{announcementText}</h1>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* DEBUG: Session ID Overlay (Temporary) */}
            {sessionId && (
                <div style={{
                    position: 'absolute',
                    top: '5px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    padding: '2px 8px',
                    fontSize: '10px',
                    borderRadius: '4px',
                    pointerEvents: 'none',
                    zIndex: 9999
                }}>
                    Session: {sessionId.substring(0, 8)}... | {isRealOpponent ? 'REAL' : 'BOT'} | ID: {effectivePlayerId?.substring(0, 8)}
                </div>
            )}

            {/* Choose Letter Overlay - Show for BOTH players */}
            <AnimatePresence>
                {gamePhase === 'letter_select' && !isSpectator && (
                    <LetterSelectionScreen
                        onSelect={handleLetterChoice}
                        isChoosing={rollWinner === 'me'}
                        chooserName={mockOpponent.displayName || "Opponent"}
                    />
                )}
            </AnimatePresence>

            {/* Announcement Overlay */}
            <LetterAnnounceOverlay letter={selectedLetter} isVisible={announcing && !isSpectator} />

            {/* Top Header - Both Players */}
            <div className="top-header">
                <div className="player-info-block">
                    <PlayerBadge name={mockOpponent.displayName || 'player name'} avatarUrl={mockOpponent.photoURL} />
                    <ScoreDisplay score={opponentScore} addedPoints={addedPointsP2} keyPrefix="opp" />
                    <div className="round-win-dots">
                        {roundWinners.map((w, i) => <span key={i} className={`win-dot ${w === 'opponent' ? 'won' : ''}`}></span>)}
                    </div>
                </div>

                <div className="player-info-block">
                    <PlayerBadge name={user?.displayName || 'player name'} avatarUrl={user?.photoURL} />
                    <ScoreDisplay score={myScore} addedPoints={addedPointsP1} keyPrefix="me" />
                    <div className="round-win-dots">
                        {roundWinners.map((w, i) => <span key={i} className={`win-dot ${w === 'me' ? 'won' : ''}`}></span>)}
                    </div>
                </div>
            </div>

            {/* Comparison Header - Category Name (Top) */}
            <AnimatePresence>
                {gamePhase === 'comparison' && currentResults[comparisonIndex] && (
                    <motion.div
                        key={`header-${comparisonIndex}`}
                        className="comparison-header-fixed"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <p className="comparison-category">{CARD_SEQUENCE[comparisonIndex]}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Comparison Result - Text (Bottom) */}
            <AnimatePresence>
                {gamePhase === 'comparison' && currentResults[comparisonIndex] && (
                    <motion.div
                        key={`result-${comparisonIndex}`}
                        className="comparison-result-fixed"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Opponent Status (Left) */}
                        <div className="result-status-block">
                            <span className="result-icon">
                                {currentResults[comparisonIndex].p2Valid ?
                                    (currentResults[comparisonIndex].result === 'Same answer' ? '⚠️' : '✅')
                                    : '❌'}
                            </span>
                            <span className={`result-text ${currentResults[comparisonIndex].p2Valid ? 'valid' : 'invalid'}`}>
                                {currentResults[comparisonIndex].p2Valid ?
                                    (currentResults[comparisonIndex].result === 'Same answer' ? 'SAME!' : 'CORRECT!')
                                    : 'WRONG!'}
                            </span>
                        </div>

                        {/* Player Status (Right) */}
                        <div className="result-status-block">
                            <span className="result-icon">
                                {currentResults[comparisonIndex].p1Valid ?
                                    (currentResults[comparisonIndex].result === 'Same answer' ? '⚠️' : '✅')
                                    : '❌'}
                            </span>
                            <span className={`result-text ${currentResults[comparisonIndex].p1Valid ? 'valid' : 'invalid'}`}>
                                {currentResults[comparisonIndex].p1Valid ?
                                    (currentResults[comparisonIndex].result === 'Same answer' ? 'SAME!' : 'CORRECT!')
                                    : 'WRONG!'}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Game Area */}
            <div className="game-area">
                <div className="player-section opponent">
                    <div className="controls-column">
                        <DiceIcon
                            value={diceResults.opponent}
                            isRolling={rolling && (currentRoller === 'opponent' || currentRoller === 'both')}
                            isActiveRoller={currentRoller === 'opponent' || currentRoller === 'both'}
                        />
                        <StopButton onClick={() => { }} />
                    </div>

                    <div className="card-area">
                        <div className="slot-container">
                            {gamePhase !== 'comparison' && gamePhase !== 'round_announcement' && gamePhase !== 'round_winner' && gamePhase !== 'game_winner' && opponentFilledStack.length < CARD_SEQUENCE.length ? (
                                <GameCard category={CARD_SEQUENCE[opponentFilledStack.length]} isActive={true} />
                            ) : <div className="empty-slot"></div>}
                        </div>
                        <div className="slot-container">
                            {gamePhase === 'comparison' ? (
                                comparisonIndex + 1 < CARD_SEQUENCE.length ? (
                                    <GameCard category={CARD_SEQUENCE[comparisonIndex + 1]} answer={opponentAnswers[CARD_SEQUENCE[comparisonIndex + 1]]} isActive={true} />
                                ) : <div className="empty-slot"></div>
                            ) : (
                                opponentFilledStack.length > 0 ? (
                                    <GameCard category={opponentFilledStack[opponentFilledStack.length - 1].category} isActive={true} />
                                ) : <div className="empty-slot"></div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="comparison-zone">
                    <div className="comparison-slot">
                        {gamePhase === 'comparison' && currentResults[comparisonIndex] ? (
                            <motion.div
                                key={`p2-card-${comparisonIndex}`}
                                initial={{ opacity: 0, y: -150, scale: 0.8, rotateZ: -10 }}
                                animate={{ opacity: 1, y: 0, scale: 1, rotateZ: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut", type: "spring", stiffness: 100 }}
                                style={{ width: '100%', height: '100%' }}
                            >
                                <GameCard category={CARD_SEQUENCE[comparisonIndex]} answer={opponentAnswers[CARD_SEQUENCE[comparisonIndex]]} isActive={true} />
                            </motion.div>
                        ) : null}
                    </div>

                    <div className="comparison-slot">
                        {gamePhase === 'comparison' && currentResults[comparisonIndex] ? (
                            <motion.div
                                key={`p1-card-${comparisonIndex}`}
                                initial={{ opacity: 0, y: 150, scale: 0.8, rotateZ: 10 }}
                                animate={{ opacity: 1, y: 0, scale: 1, rotateZ: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut", type: "spring", stiffness: 100 }}
                                style={{ width: '100%', height: '100%' }}
                            >
                                <GameCard category={CARD_SEQUENCE[comparisonIndex]} answer={answers[CARD_SEQUENCE[comparisonIndex]]} isActive={true} />
                            </motion.div>
                        ) : null}
                    </div>
                </div>

                <div className="player-section me">
                    <div className="controls-column">
                        <StopButton
                            onClick={() => endRound(user?.displayName || 'You')}
                            disabled={!allCardsFilled || gamePhase !== 'playing' || isSpectator || roundEnded}
                        />
                        <button
                            className={`dice-roll-trigger-btn ${gamePhase === 'dice_roll' && !rolling && currentRoller === 'none' && !isSpectator ? 'attention' : ''}`}
                            onClick={handleRoll}
                            disabled={gamePhase !== 'dice_roll' || rolling || currentRoller !== 'none' || isSpectator || (isRealOpponent && myPlayerNumber !== null && currentTurn !== myPlayerNumber)}
                            style={{
                                opacity: (gamePhase === 'dice_roll' && isRealOpponent && myPlayerNumber !== null && currentTurn !== myPlayerNumber) ? 0.3 : 1,
                                filter: (gamePhase === 'dice_roll' && isRealOpponent && myPlayerNumber !== null && currentTurn !== myPlayerNumber) ? 'grayscale(100%)' : 'none',
                                position: 'relative' // For absolute positioning of waiting text if needed
                            }}
                        >
                            {(gamePhase === 'dice_roll' && isRealOpponent && myPlayerNumber !== null && currentTurn !== myPlayerNumber) && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-25px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    color: 'white',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                                }}>
                                    WAIT...
                                </div>
                            )}
                            <DiceIcon
                                value={diceResults.me}
                                isRolling={rolling && (currentRoller === 'me' || currentRoller === 'both')}
                                isActiveRoller={currentRoller === 'me' || currentRoller === 'both'}
                            />
                            {gamePhase === 'dice_roll' && !rolling && currentRoller === 'none' && !isSpectator && !(isRealOpponent && myPlayerNumber !== null && currentTurn !== myPlayerNumber) && <span className="roll-hint">TAP TO ROLL</span>}
                        </button>
                    </div>

                    <div className="card-area">
                        <div className="slot-container">
                            {gamePhase !== 'comparison' && gamePhase !== 'round_announcement' && gamePhase !== 'round_winner' && gamePhase !== 'game_winner' && filledCount < CARD_SEQUENCE.length ? (
                                <GameCard category={CARD_SEQUENCE[filledCount]} isActive={true} onClick={isSpectator ? undefined : () => handleCardClick(CARD_SEQUENCE[filledCount])} />
                            ) : <div className="empty-slot"></div>}
                        </div>

                        <div className="slot-container">
                            {gamePhase === 'comparison' ? (
                                comparisonIndex + 1 < CARD_SEQUENCE.length ? (
                                    <GameCard
                                        category={CARD_SEQUENCE[comparisonIndex + 1]}
                                        answer={isSpectator ? undefined : answers[CARD_SEQUENCE[comparisonIndex + 1]]}
                                        isActive={true}
                                        className="side-submitted-card"
                                    />
                                ) : <div className="empty-slot"></div>
                            ) : (
                                lastFilled ? (
                                    <GameCard
                                        category={lastFilled.category}
                                        answer={isSpectator ? undefined : lastFilled.answer}
                                        isActive={true}
                                        className="side-submitted-card"
                                    />
                                ) : <div className="empty-slot"></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isFillingScreenOpen && (
                <CardFillingScreen
                    initialCategory={activeCategory} filledCards={filledCards} answers={answers}
                    onSave={handleSaveAnswer} onNext={() => { }} onClose={closeFillingScreen} selectedLetter={selectedLetter}
                />
            )}

            {/* STOP Notification Popup */}
            <AnimatePresence>
                {showStopNotification && !isSpectator && (
                    <motion.div className="stop-notification-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="stop-notification-popup">
                            <motion.div className="stop-notification-content" initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                                <h2>{stopperName}</h2>
                                <p className="stop-message-hint">has ended the round!</p>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Round Winner Popup (Simple) */}
            <AnimatePresence>
                {gamePhase === 'round_winner' && currentRoundWinner !== 'none' && (
                    <motion.div className="round-winner-popup-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="round-winner-card">
                            <div className="winner-avatar-circle">
                                <img src={currentRoundWinner === 'me' ? user?.photoURL : mockOpponent.photoURL} alt="Winner" />
                            </div>
                            <h3 className="winner-name-text">{currentRoundWinner === 'me' ? (user?.displayName || 'You') : mockOpponent.displayName}</h3>
                            <p className="wins-round-text">wins Round {roundWinners.length}!</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Game Winner Popup (Final Victory) */}
            <AnimatePresence>
                {gamePhase === 'game_winner' && (
                    <motion.div className="round-winner-popup-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <motion.div
                            className="game-winner-vibrant-card"
                            initial={{ scale: 0.5, y: 100 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 100 }}
                        >
                            <div className="avatar-crown-wrapper">
                                <img src={finalGameWinner === 'me' ? user?.photoURL : mockOpponent.photoURL} className="final-winner-avatar" alt="Final Winner" />
                                <img src={winnerCrown} className="crown-img-absolute" alt="Crown" />
                            </div>
                            <h2 className="final-winner-name">{finalGameWinner === 'me' ? (user?.displayName || 'player name') : mockOpponent.displayName}</h2>
                            <p className="final-win-label">win</p>
                            <div className="reward-section">
                                <img src={winnerCoins} className="coin-img-large" alt="Coins" />
                                <p className="reward-amount-text">{betAmount * 2}</p>
                            </div>
                            <button className="confirm-btn-winnings" onClick={() => onGameEnd(finalGameWinner)}>OK</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Waiting for Opponent Indicator */}
            {isRealOpponent && waitingForOpponent && (
                <div className="waiting-opponent-overlay">
                    <div className="waiting-opponent-content">
                        <div className="loading-dots">
                            <span></span><span></span><span></span>
                        </div>
                        <div className="waiting-text">Waiting for opponent...</div>
                    </div>
                </div>
            )}

            {/* Spectator Badge */}
            {isSpectator && (
                <div className="spectator-badge-overlay">
                    <div className="spectator-label">SPECTATING</div>
                    <div className="spectator-subtext">AI MATCH IN PROGRESS</div>
                </div>
            )}
        </div>
    );
};

export default GameScreen;
