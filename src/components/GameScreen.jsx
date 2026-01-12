import React, { useState, useEffect } from 'react';
import './GameScreen.css';
import CardFillingScreen from './CardFillingScreen';

import GameCard from './GameCard';
import LetterSelectionScreen from './LetterSelectionScreen';
import LetterAnnounceOverlay from './LetterAnnounceOverlay';
import { CATEGORY_ICONS, CARD_SEQUENCE } from '../constants/gameConstants';
import { motion, AnimatePresence } from 'framer-motion';
import { validateAnswer, getAIAnswer, compareAnswers } from '../services/gameLogic';

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
        <img src={avatarUrl || 'https://via.placeholder.com/40'} alt="Avatar" className="player-avatar" />
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

const GameScreen = ({ user, opponent, sessionId, languageCode, onGameEnd, betAmount }) => {
    // Game State
    const [gamePhase, setGamePhase] = useState('round_announcement'); // round_announcement, dice_roll, letter_select, letter_announce, playing, comparison, round_winner, game_winner
    const [rolling, setRolling] = useState(false);
    const [diceResults, setDiceResults] = useState({ me: 1, opponent: 1 });
    const [rollWinner, setRollWinner] = useState(null);
    const [currentRoller, setCurrentRoller] = useState('none');
    const [selectedLetter, setSelectedLetter] = useState(null);
    const [announcing, setAnnouncing] = useState(false);

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
        setDiceResults({ me: 1, opponent: 1 });
        setRollWinner(null);
        setCurrentRoller('none');
        setSelectedLetter(null);
        setAnnouncing(false);
    };

    const finalizeRoll = (myVal, oppVal) => {
        if (myVal === oppVal) {
            setTimeout(handleRoll, 1000);
        } else {
            const winner = myVal > oppVal ? 'me' : 'opponent';
            setRollWinner(winner);
            setTimeout(() => {
                setGamePhase('letter_select');
                if (winner === 'opponent') {
                    setTimeout(() => {
                        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                        handleLetterChoice(alphabet[Math.floor(Math.random() * 26)]);
                    }, 2000);
                }
            }, 1200);
        }
    };

    const handleRoll = () => {
        if (rolling || gamePhase !== 'dice_roll' || currentRoller !== 'none') return;
        setRolling(true);
        setCurrentRoller('me');
        setTimeout(() => {
            const myVal = Math.floor(Math.random() * 6) + 1;
            setDiceResults(prev => ({ ...prev, me: myVal }));
            setRolling(false);
            setTimeout(() => {
                setCurrentRoller('opponent');
                setRolling(true);
                setTimeout(() => {
                    const oppVal = Math.floor(Math.random() * 6) + 1;
                    setDiceResults(prev => ({ ...prev, opponent: oppVal }));
                    setRolling(false);
                    setCurrentRoller('none');
                    finalizeRoll(myVal, oppVal);
                }, 1500);
            }, 600);
        }, 1500);
    };

    // AI logic for filling cards
    useEffect(() => {
        if (gamePhase === 'playing' && selectedLetter) {
            simulateAIFilling();
        }
    }, [gamePhase, selectedLetter]);

    const simulateAIFilling = () => {
        const totalTime = 60000;
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
                        if (gamePhase === 'playing') {
                            endRound(mockOpponent.displayName || 'Opponent');
                        }
                    }, 2500);
                }
            }, delay);
        });
    };

    const handleLetterChoice = (letter) => {
        setSelectedLetter(letter);
        setGamePhase('letter_announce');
        setAnnouncing(true);
        setTimeout(() => {
            setAnnouncing(false);
            setGamePhase('playing');
        }, 3500);
    };

    const endRound = (presserName) => {
        if (gamePhase !== 'playing') return;
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
        setGamePhase('round_winner');

        setTimeout(() => {
            setGamePhase('none'); // Transition
            checkGameStatus(newRoundWinners);
        }, 4000);
    };

    const checkGameStatus = (winners) => {
        const meWins = winners.filter(w => w === 'me').length;
        const oppWins = winners.filter(w => w === 'opponent').length;

        if (meWins === 2 || (winners.length === 3 && meWins > oppWins)) {
            setFinalGameWinner('me');
            setGamePhase('game_winner');
            // Add 1000 coins logic would go here if balance was mutable in this component
        } else if (oppWins === 2 || (winners.length === 3 && oppWins > meWins)) {
            setFinalGameWinner('opponent');
            setGamePhase('game_winner');
        } else {
            // Proceed to next round (Round 2 or Extra Round)
            const nextRoundNum = winners.length + 1;
            setCurrentRound(nextRoundNum);
            setAnnouncementText(nextRoundNum === 3 ? 'EXTRA ROUND' : `ROUND ${nextRoundNum}`);
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

    const handleSaveAnswer = (category, answer) => {
        setAnswers(prev => ({ ...prev, [category]: answer }));
        setFilledCards(prev => ({ ...prev, [category]: true }));
        setMyFilledStack(prev => [...prev, { category, answer }]);
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

            {/* Choose Letter Overlay */}
            <AnimatePresence>
                {gamePhase === 'letter_select' && rollWinner === 'me' && (
                    <LetterSelectionScreen onSelect={handleLetterChoice} />
                )}
            </AnimatePresence>

            {/* Announcement Overlay */}
            <LetterAnnounceOverlay letter={selectedLetter} isVisible={announcing} />

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
                            disabled={!allCardsFilled || gamePhase !== 'playing'}
                        />
                        <button
                            className={`dice-roll-trigger-btn ${gamePhase === 'dice_roll' && !rolling && currentRoller === 'none' ? 'attention' : ''}`}
                            onClick={handleRoll}
                            disabled={gamePhase !== 'dice_roll' || rolling || currentRoller !== 'none'}
                        >
                            <DiceIcon
                                value={diceResults.me}
                                isRolling={rolling && (currentRoller === 'me' || currentRoller === 'both')}
                                isActiveRoller={currentRoller === 'me' || currentRoller === 'both'}
                            />
                            {gamePhase === 'dice_roll' && !rolling && currentRoller === 'none' && <span className="roll-hint">TAP TO ROLL</span>}
                        </button>
                    </div>

                    <div className="card-area">
                        <div className="slot-container">
                            {gamePhase !== 'comparison' && gamePhase !== 'round_announcement' && gamePhase !== 'round_winner' && gamePhase !== 'game_winner' && filledCount < CARD_SEQUENCE.length ? (
                                <GameCard category={CARD_SEQUENCE[filledCount]} isActive={true} onClick={() => handleCardClick(CARD_SEQUENCE[filledCount])} />
                            ) : <div className="empty-slot"></div>}
                        </div>

                        <div className="slot-container">
                            {gamePhase === 'comparison' ? (
                                comparisonIndex + 1 < CARD_SEQUENCE.length ? (
                                    <GameCard category={CARD_SEQUENCE[comparisonIndex + 1]} answer={answers[CARD_SEQUENCE[comparisonIndex + 1]]} isActive={true} className="side-submitted-card" />
                                ) : <div className="empty-slot"></div>
                            ) : (
                                lastFilled ? (
                                    <GameCard category={lastFilled.category} answer={lastFilled.answer} isActive={true} className="side-submitted-card" />
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
                {showStopNotification && (
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
                                <img src="/src/assets/game-icons/winner_crown.png" className="crown-img-absolute" alt="Crown" />
                            </div>
                            <h2 className="final-winner-name">{finalGameWinner === 'me' ? (user?.displayName || 'player name') : mockOpponent.displayName}</h2>
                            <p className="final-win-label">win</p>
                            <div className="reward-section">
                                <img src="/src/assets/game-icons/winner_coins.png" className="coin-img-large" alt="Coins" />
                                <p className="reward-amount-text">{betAmount * 2}</p>
                            </div>
                            <button className="confirm-btn-winnings" onClick={() => onGameEnd(finalGameWinner)}>OK</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GameScreen;
