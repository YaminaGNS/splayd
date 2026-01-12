import React, { useState, useEffect } from 'react';
import './GameScreen3P.css';
import CardFillingScreen from './CardFillingScreen';
import GameCard from './GameCard';
import LetterSelectionScreen from './LetterSelectionScreen';
import LetterAnnounceOverlay from './LetterAnnounceOverlay';
import { CATEGORY_ICONS, CARD_SEQUENCE } from '../constants/gameConstants';
import { motion, AnimatePresence } from 'framer-motion';
import { validateAnswer, getAIAnswer, compareAnswers3P } from '../services/gameLogic';
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

    const patterns = {
        1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 3, 6, 2, 5, 8]
    };
    const dots = patterns[displayValue] || [];

    return (
        <motion.div
            className={`dice-icon-refined ${isRolling ? 'rolling-3d' : ''} ${isActiveRoller ? 'active-roller-3d' : ''}`}
            animate={isRolling ? { rotateX: [0, 360, 720], rotateY: [0, 360, 720], scale: [1, 1.1, 1], y: [0, -10, 0] } : {}}
            transition={{ duration: isRolling ? 1.2 : 0.4, ease: isRolling ? "easeInOut" : "easeOut" }}
        >
            <div className="dice-face">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className={`dice-dot-realistic ${dots.includes(i) ? 'visible' : 'hidden'}`} />
                ))}
            </div>
            <div className="dice-depth-effect"></div>
        </motion.div>
    );
};

const StopButton = ({ onClick, disabled }) => (
    <img
        src={ASSETS.STOP_BTN} alt="STOP"
        className={`stop-button-img ${disabled ? 'disabled' : ''}`}
        onClick={disabled ? undefined : onClick}
        style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer', width: '70px', height: '70px' }}
    />
);

const PlayerBadge = ({ name, avatarUrl }) => (
    <div className="player-badge" style={{ minWidth: '110px', padding: '4px 8px' }}>
        <img src={avatarUrl || 'https://via.placeholder.com/40'} alt="Avatar" className="player-avatar" style={{ width: '26px', height: '26px' }} />
        <span className="player-name" style={{ fontSize: '0.8rem' }}>{name}</span>
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
                        transition={{ duration: 0.8 }}
                    >
                        {addedPoints >= 0 ? `+${addedPoints}` : addedPoints}
                    </motion.span>
                )}
            </AnimatePresence>
        </div>
    </div>
);

const GameScreen3P = ({ user, opponents = [], languageCode, onGameEnd, betAmount }) => {
    // Game State
    const [gamePhase, setGamePhase] = useState('round_announcement'); // round_announcement, dice_roll, letter_select, letter_announce, playing, comparison, round_winner, game_winner
    const [rolling, setRolling] = useState(false);
    const [diceResults, setDiceResults] = useState({ me: 1, p1: 1, p3: 1 });
    const [currentRoller, setCurrentRoller] = useState('none');
    const [rollWinner, setRollWinner] = useState(null);
    const [selectedLetter, setSelectedLetter] = useState(null);
    const [announcing, setAnnouncing] = useState(false);

    // Multi-Round State
    const [currentRound, setCurrentRound] = useState(1);
    const [roundWinners, setRoundWinners] = useState([]); // Array of strings: 'me', 'p1', 'p3'
    const [announcementText, setAnnouncementText] = useState('ROUND 1');
    const [currentRoundWinner, setCurrentRoundWinner] = useState(null);
    const [finalGameWinner, setFinalGameWinner] = useState(null);
    const [eliminatedPlayer, setEliminatedPlayer] = useState(null); // 'me', 'p1', or 'p3'
    const [showEliminationOverlay, setShowEliminationOverlay] = useState(true);




    const [answers, setAnswers] = useState({});
    const [p1Answers, setP1Answers] = useState({});
    const [p3Answers, setP3Answers] = useState({});

    const [filledCards, setFilledCards] = useState({});
    const [p1FilledStack, setP1FilledStack] = useState([]);
    const [p3FilledStack, setP3FilledStack] = useState([]);
    const [myFilledStack, setMyFilledStack] = useState([]);

    const [scores, setScores] = useState({ me: 0, p1: 0, p3: 0 });
    const [addedPoints, setAddedPoints] = useState({ me: null, p1: null, p3: null });

    const [comparisonIndex, setComparisonIndex] = useState(0);
    const [currentResults, setCurrentResults] = useState([]);
    const [isFillingScreenOpen, setIsFillingScreenOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState('NAME');

    const [showStopNotification, setShowStopNotification] = useState(false);
    const [stopperName, setStopperName] = useState('');

    const opponent1 = opponents[0] || { displayName: 'P1 AI', photoURL: '' };
    const opponent3 = opponents[1] || { displayName: 'P3 AI', photoURL: '' };

    // 1. Sequential Dice Roll Logic
    const handleRoll = () => {
        if (rolling || gamePhase !== 'dice_roll' || currentRoller !== 'none') return;

        if (eliminatedPlayer === 'me') {
            // Auto-start for AIs
            setDiceResults(prev => ({ ...prev, me: 0 }));
            startOpponent1Roll();
            return;
        }

        // Player (Me) Rolls First
        setRolling(true);
        setCurrentRoller('me');

        setTimeout(() => {
            const myVal = Math.floor(Math.random() * 6) + 1;
            setDiceResults(prev => ({ ...prev, me: myVal }));
            setRolling(false);
            startOpponent1Roll();
        }, 1200);
    };

    const startOpponent1Roll = () => {
        if (eliminatedPlayer === 'p1') {
            setDiceResults(prev => ({ ...prev, p1: 0 }));
            setTimeout(startOpponent3Roll, 500);
            return;
        }

        setTimeout(() => {
            setCurrentRoller('p1');
            setRolling(true);
            setTimeout(() => {
                const p1Val = Math.floor(Math.random() * 6) + 1;
                setDiceResults(prev => ({ ...prev, p1: p1Val }));
                setRolling(false);
                startOpponent3Roll();
            }, 1200);
        }, 500);
    };

    const startOpponent3Roll = () => {
        if (eliminatedPlayer === 'p3') {
            setDiceResults(prev => ({ ...prev, p3: 0 }));
            setCurrentRoller('none');
            // Use current state results
            setDiceResults(current => {
                finalizeRoll(current.me, current.p1, 0);
                return current;
            });
            return;
        }
        setTimeout(() => {
            setCurrentRoller('p3');
            setRolling(true);
            setTimeout(() => {
                const p3Val = Math.floor(Math.random() * 6) + 1;
                setDiceResults(prev => {
                    const next = { ...prev, p3: p3Val };
                    setCurrentRoller('none');
                    finalizeRoll(next.me, next.p1, next.p3);
                    return next;
                });
                setRolling(false);
            }, 1200);
        }, 500);
    };


    const finalizeRoll = (vMe, vP1, vP3) => {
        const maxVal = Math.max(vMe, vP1, vP3);
        const winners = [];
        if (vMe === maxVal) winners.push('me');
        if (vP1 === maxVal) winners.push('p1');
        if (vP3 === maxVal) winners.push('p3');

        if (winners.length > 1) {
            // Tie - re-roll
            setTimeout(handleRoll, 1000);
        } else {
            const winner = winners[0];
            setRollWinner(winner);
            setTimeout(() => {
                setGamePhase('letter_select');
                if (winner !== 'me') {
                    // AI chooses letter
                    setTimeout(() => {
                        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                        handleLetterChoice(alphabet[Math.floor(Math.random() * 26)]);
                    }, 1500);
                }
            }, 1000);
        }
    };

    const handleLetterChoice = (letter) => {
        setSelectedLetter(letter);
        setGamePhase('letter_announce');
        setAnnouncing(true);
        setTimeout(() => {
            setAnnouncing(false);
            setGamePhase('playing');
        }, 3000);
    };

    // Round Announcement Effect
    useEffect(() => {
        if (gamePhase === 'round_announcement') {
            const timer = setTimeout(() => {
                setGamePhase('dice_roll');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [gamePhase]);

    // Auto-trigger dice roll for eliminated player (Spectator Mode)
    useEffect(() => {
        if (gamePhase === 'dice_roll' && eliminatedPlayer === 'me' && !rolling && currentRoller === 'none') {
            const timer = setTimeout(handleRoll, 1000);
            return () => clearTimeout(timer);
        }
    }, [gamePhase, eliminatedPlayer, rolling, currentRoller]);



    // 2. AI Filling Logic (2 AIs)
    useEffect(() => {
        if (gamePhase === 'playing' && selectedLetter) {
            if (eliminatedPlayer !== 'p1') simulateAIFilling('p1', setP1Answers, setP1FilledStack);
            if (eliminatedPlayer !== 'p3') simulateAIFilling('p3', setP3Answers, setP3FilledStack);
        }
    }, [gamePhase, selectedLetter]);


    const simulateAIFilling = (playerKey, setAnswerFn, setStackFn) => {
        CARD_SEQUENCE.forEach((category, index) => {
            const delay = (index * 8000) + (Math.random() * 3000);
            setTimeout(() => {
                const answer = getAIAnswer(selectedLetter, category);
                setAnswerFn(prev => ({ ...prev, [category]: answer }));
                setStackFn(prev => [...prev, { category, answer }]);

                if (index === CARD_SEQUENCE.length - 1) {
                    setTimeout(() => {
                        if (gamePhase === 'playing') {
                            const name = playerKey === 'p1' ? opponent1.displayName : opponent3.displayName;
                            endRound(name);
                        }
                    }, 2000);
                }
            }, delay);
        });
    };

    const endRound = (name) => {
        if (gamePhase !== 'playing') return;
        setIsFillingScreenOpen(false);
        setStopperName(name);
        setShowStopNotification(true);
        setTimeout(() => {
            setShowStopNotification(false);
            setGamePhase('comparison');
        }, 2500);
    };

    // 3. Comparison Logic (3P)
    useEffect(() => {
        if (gamePhase === 'comparison' && currentResults.length === 0) {
            const results = CARD_SEQUENCE.map(cat => {
                // Mapping: P1=Opponent1, P2=You, P3=Opponent3
                return compareAnswers3P(p1Answers[cat] || '', answers[cat] || '', p3Answers[cat] || '', selectedLetter, cat);
            });
            setCurrentResults(results);
            setComparisonIndex(0);
        }
    }, [gamePhase]);

    useEffect(() => {
        if (gamePhase === 'comparison' && currentResults.length > 0) {
            const timer = setTimeout(() => {
                const res = currentResults[comparisonIndex];
                if (res) {
                    setAddedPoints({ me: res.p2Points, p1: res.p1Points, p3: res.p3Points });
                    setScores(prev => ({
                        me: prev.me + res.p2Points,
                        p1: prev.p1 + res.p1Points,
                        p3: prev.p3 + res.p3Points
                    }));
                    setTimeout(() => setAddedPoints({ me: null, p1: null, p3: null }), 1500);
                }

                if (comparisonIndex < CARD_SEQUENCE.length - 1) {
                    setComparisonIndex(prev => prev + 1);
                } else {
                    // All cards compared - determine round winner
                    setTimeout(determineRoundWinner, 2000);
                }
            }, 3500);
            return () => clearTimeout(timer);
        }
    }, [gamePhase, comparisonIndex, currentResults]);

    const determineRoundWinner = () => {
        // Round 1 Elimination Logic
        if (currentRound === 1) {
            const playerScores = [
                { id: 'me', score: scores.me },
                { id: 'p1', score: scores.p1 },
                { id: 'p3', score: scores.p3 }
            ];
            // Find lowest scorer
            playerScores.sort((a, b) => a.score - b.score);
            const lowestId = playerScores[0].id;
            setEliminatedPlayer(lowestId);
        }

        let winner = 'me';
        let maxScore = scores.me;

        if (scores.p1 > maxScore) {
            winner = 'p1';
            maxScore = scores.p1;
        }
        if (scores.p3 > maxScore) {
            winner = 'p3';
            maxScore = scores.p3;
        }

        const newRoundWinners = [...roundWinners, winner];
        setRoundWinners(newRoundWinners);
        setCurrentRoundWinner(winner);
        setGamePhase('round_winner');

        setTimeout(() => {
            checkGameStatus(newRoundWinners);
        }, 4000);
    };

    const checkGameStatus = (winners) => {
        if (winners.length === 1) {
            // End of Round 1 -> Move to Round 2
            setCurrentRound(2);
            setAnnouncementText('ROUND 2');
            resetForNextRound();
            setGamePhase('round_announcement');
            return;
        }

        // Round 2 completed - check for match winner or tie
        const r2Winner = winners[1];

        // If it's a tie in Round 2 between the survivors (optional extra round logic)
        // For simplicity: Highest points in Round 2 wins game
        // If Round 2 is tied:
        const survivorIds = ['me', 'p1', 'p3'].filter(id => id !== eliminatedPlayer);
        const s1Score = scores[survivorIds[0]];
        const s2Score = scores[survivorIds[1]];

        if (s1Score === s2Score && winners.length === 2) {
            // Tie in Round 2 -> Extra Round
            setCurrentRound(3);
            setAnnouncementText('EXTRA ROUND');
            resetForNextRound();
            setGamePhase('round_announcement');
        } else {
            // High score wins game
            setFinalGameWinner(r2Winner);
            setGamePhase('game_winner');
        }
    };


    const resetForNextRound = () => {
        setFilledCards({});
        setAnswers({});
        setP1Answers({});
        setP3Answers({});
        setP1FilledStack([]);
        setP3FilledStack([]);
        setMyFilledStack([]);
        setScores({ me: 0, p1: 0, p3: 0 });
        setComparisonIndex(0);
        setCurrentResults([]);
        setDiceResults({ me: 1, p1: 1, p3: 1 });
        setRollWinner(null);
        setCurrentRoller('none');
        setSelectedLetter(null);
        setAnnouncing(false);
    };


    const handleCardClick = (cat) => {
        if (gamePhase !== 'playing' || eliminatedPlayer === 'me') return;
        setActiveCategory(cat);
        setIsFillingScreenOpen(true);
    };

    const handleSaveAnswer = (category, answer) => {
        setAnswers(prev => ({ ...prev, [category]: answer }));
        setFilledCards(prev => ({ ...prev, [category]: true }));
        setMyFilledStack(prev => [...prev, { category, answer }]);
        if (myFilledStack.length === CARD_SEQUENCE.length - 1) setIsFillingScreenOpen(false);
    };

    // UI Helpers
    const filledCount = CARD_SEQUENCE.filter(cat => filledCards[cat]).length;
    const allFilled = filledCount === CARD_SEQUENCE.length;

    return (
        <div className="game-screen-3p">
            <LetterAnnounceOverlay letter={selectedLetter} isVisible={announcing} />
            <AnimatePresence>
                {gamePhase === 'letter_select' && rollWinner === 'me' && (
                    <LetterSelectionScreen onSelect={handleLetterChoice} />
                )}
            </AnimatePresence>

            {/* Round Announcement Overlay */}
            <AnimatePresence>
                {gamePhase === 'round_announcement' && (
                    <motion.div className="round-announcement-overlay-3p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <h1 className="round-text-vibrant-3p">{announcementText}</h1>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Section: Badges */}
            <div className="top-badges-container">
                <div className="badge-unit">
                    <PlayerBadge name={opponent1.displayName} avatarUrl={opponent1.photoURL} />
                    <ScoreDisplay score={scores.p1} addedPoints={addedPoints.p1} keyPrefix="p1" />
                </div>
                <div className="badge-unit">
                    <PlayerBadge name={user?.displayName || 'You'} avatarUrl={user?.photoURL} />
                    <ScoreDisplay score={scores.me} addedPoints={addedPoints.me} keyPrefix="me" />
                </div>
                <div className="badge-unit">
                    <PlayerBadge name={opponent3.displayName} avatarUrl={opponent3.photoURL} />
                    <ScoreDisplay score={scores.p3} addedPoints={addedPoints.p3} keyPrefix="p3" />
                </div>
            </div>

            <div className="game-main-portrait">
                {/* Player 1 (TOP) */}
                <div className="p1-area">
                    <div className="p1-left-ctrl">
                        <DiceIcon value={diceResults.p1} isRolling={rolling && currentRoller === 'p1'} isActiveRoller={currentRoller === 'p1'} />
                        <StopButton disabled={true} />
                    </div>
                    <div className="p1-cards">
                        {gamePhase !== 'comparison' && p1FilledStack.length < CARD_SEQUENCE.length ? (
                            <GameCard category={CARD_SEQUENCE[p1FilledStack.length]} isActive={true} className="active-card-3p" />
                        ) : <div className="empty-slot-3p"></div>}

                        {gamePhase !== 'comparison' ? (
                            p1FilledStack.length > 0 ? (
                                <GameCard category={p1FilledStack[p1FilledStack.length - 1].category} isActive={true} className="side-submitted-card-3p" />
                            ) : <div className="empty-slot-3p"></div>
                        ) : (
                            comparisonIndex + 1 < CARD_SEQUENCE.length ? (
                                <GameCard category={CARD_SEQUENCE[comparisonIndex + 1]} answer={p1Answers[CARD_SEQUENCE[comparisonIndex + 1]]} isActive={true} />
                            ) : <div className="empty-slot-3p"></div>
                        )}
                    </div>
                </div>

                {/* Player 3 (MIDDLE LEFT AI) */}
                <div className="p3-area">
                    <div className="p3-top-row">
                        <DiceIcon value={diceResults.p3} isRolling={rolling && currentRoller === 'p3'} isActiveRoller={currentRoller === 'p3'} />
                        <StopButton disabled={true} />
                    </div>

                    <div className="p3-bottom-cards">
                        {gamePhase !== 'comparison' && p3FilledStack.length < CARD_SEQUENCE.length ? (
                            <GameCard category={CARD_SEQUENCE[p3FilledStack.length]} isActive={true} className="active-card-3p" />
                        ) : <div className="empty-slot-3p"></div>}

                        {gamePhase !== 'comparison' ? (
                            p3FilledStack.length > 0 ? (
                                <GameCard category={p3FilledStack[p3FilledStack.length - 1].category} isActive={true} className="side-submitted-card-3p" />
                            ) : <div className="empty-slot-3p"></div>
                        ) : (
                            comparisonIndex + 1 < CARD_SEQUENCE.length ? (
                                <GameCard category={CARD_SEQUENCE[comparisonIndex + 1]} answer={p3Answers[CARD_SEQUENCE[comparisonIndex + 1]]} isActive={true} />
                            ) : <div className="empty-slot-3p"></div>
                        )}
                    </div>
                </div>

                {/* Player 2 (BOTTOM - You) */}
                <div className="p2-area">
                    <div className="p2-left-ctrl">
                        <button className="dice-roll-trigger-btn" onClick={handleRoll} disabled={gamePhase !== 'dice_roll' || rolling}>
                            <DiceIcon value={diceResults.me} isRolling={rolling && currentRoller === 'me'} isActiveRoller={currentRoller === 'me'} />
                        </button>
                        <StopButton onClick={() => endRound(user?.displayName || 'You')} disabled={!allFilled || gamePhase !== 'playing'} />
                    </div>
                    <div className="p2-cards">
                        {gamePhase !== 'comparison' && filledCount < CARD_SEQUENCE.length ? (
                            <GameCard category={CARD_SEQUENCE[filledCount]} isActive={true} onClick={() => handleCardClick(CARD_SEQUENCE[filledCount])} className="active-card-3p" />
                        ) : <div className="empty-slot-3p"></div>}

                        {gamePhase !== 'comparison' ? (
                            myFilledStack.length > 0 ? (
                                <GameCard category={myFilledStack[myFilledStack.length - 1].category} answer={myFilledStack[myFilledStack.length - 1].answer} isActive={true} className="side-submitted-card-3p" />
                            ) : <div className="empty-slot-3p"></div>
                        ) : (
                            comparisonIndex + 1 < CARD_SEQUENCE.length ? (
                                <GameCard category={CARD_SEQUENCE[comparisonIndex + 1]} answer={answers[CARD_SEQUENCE[comparisonIndex + 1]]} isActive={true} />
                            ) : <div className="empty-slot-3p"></div>
                        )}
                    </div>
                </div>

                {/* Comparison Zone Column */}
                <div className="comparison-zone-3p">
                    <div className="comparison-slot-3p glow">
                        {gamePhase === 'comparison' && currentResults[comparisonIndex] && (
                            <motion.div
                                key={`p1-card-${comparisonIndex}`}
                                initial={{ y: -300, opacity: 0, scale: 0.5 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                transition={{ duration: 0.7, ease: "easeOut", type: "spring" }}
                                style={{ width: '100%', height: '100%' }}
                            >
                                <GameCard category={CARD_SEQUENCE[comparisonIndex]} answer={p1Answers[CARD_SEQUENCE[comparisonIndex]]} isActive={true} />
                            </motion.div>
                        )}
                    </div>
                    <div className="comparison-slot-3p glow">
                        {gamePhase === 'comparison' && currentResults[comparisonIndex] && (
                            <motion.div
                                key={`me-card-${comparisonIndex}`}
                                initial={{ y: 300, opacity: 0, scale: 0.5 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                transition={{ duration: 0.7, ease: "easeOut", type: "spring" }}
                                style={{ width: '100%', height: '100%' }}
                            >
                                <GameCard category={CARD_SEQUENCE[comparisonIndex]} answer={answers[CARD_SEQUENCE[comparisonIndex]]} isActive={true} />
                            </motion.div>
                        )}
                    </div>
                    <div className="comparison-slot-3p glow">
                        {gamePhase === 'comparison' && currentResults[comparisonIndex] && (
                            <motion.div
                                key={`p3-card-${comparisonIndex}`}
                                initial={{ x: -250, opacity: 0, scale: 0.5 }}
                                animate={{ x: 0, opacity: 1, scale: 1 }}
                                transition={{ duration: 0.7, ease: "easeOut", type: "spring" }}
                                style={{ width: '100%', height: '100%' }}
                            >
                                <GameCard category={CARD_SEQUENCE[comparisonIndex]} answer={p3Answers[CARD_SEQUENCE[comparisonIndex]]} isActive={true} />
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* Overlays */}
            {gamePhase === 'comparison' && currentResults[comparisonIndex] && (() => {
                const res = currentResults[comparisonIndex];
                return (
                    <>
                        <div className="comparison-header-3p">{CARD_SEQUENCE[comparisonIndex]}</div>
                        <div className="comparison-results-row-3p">
                            <div className="result-block-3p">
                                <span className={`result-status-text ${res.valids.p1 ? (res.p1Points > 0 ? 'correct' : 'same') : 'wrong'}`}>
                                    {!res.valids.p1 ? 'WRONG' : (res.p1Points > 0 ? 'CORRECT' : 'SAME')}
                                </span>
                                <span className="result-player-name">{opponent1.displayName}</span>
                            </div>
                            <div className="result-block-3p">
                                <span className={`result-status-text ${res.valids.p2 ? (res.p2Points > 0 ? 'correct' : 'same') : 'wrong'}`}>
                                    {!res.valids.p2 ? 'WRONG' : (res.p2Points > 0 ? 'CORRECT' : 'SAME')}
                                </span>
                                <span className="result-player-name">YOU</span>
                            </div>
                            <div className="result-block-3p">
                                <span className={`result-status-text ${res.valids.p3 ? (res.p3Points > 0 ? 'correct' : 'same') : 'wrong'}`}>
                                    {!res.valids.p3 ? 'WRONG' : (res.p3Points > 0 ? 'CORRECT' : 'SAME')}
                                </span>
                                <span className="result-player-name">{opponent3.displayName}</span>
                            </div>
                        </div>
                    </>
                );
            })()}

            {isFillingScreenOpen && (
                <CardFillingScreen
                    initialCategory={activeCategory} filledCards={filledCards} answers={answers}
                    onSave={handleSaveAnswer} onNext={() => { }} onClose={() => setIsFillingScreenOpen(false)}
                    selectedLetter={selectedLetter}
                />
            )}

            <AnimatePresence>
                {showStopNotification && (
                    <motion.div className="stop-notification-backdrop-3p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="stop-notification-popup-3p" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ type: "spring", damping: 15 }}>
                            <h1 className="stopper-name-large">{stopperName}</h1>
                            <p className="stop-message-medium">has ended the round!</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Round Winner Popup */}
            <AnimatePresence>
                {gamePhase === 'round_winner' && (
                    <motion.div className="round-winner-popup-container-3p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="round-winner-card-3p" initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 200 }}>
                            <div className="winner-avatar-circle">
                                <img src={currentRoundWinner === 'me' ? user?.photoURL : (currentRoundWinner === 'p1' ? opponent1.photoURL : opponent3.photoURL)} alt="Winner" />
                            </div>
                            <h2 className="winner-name-text">
                                {currentRoundWinner === 'me' ? (user?.displayName || 'You') : (currentRoundWinner === 'p1' ? opponent1.displayName : opponent3.displayName)}
                            </h2>
                            <p className="wins-round-text">wins {announcementText}!</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Final Game Winner Popup */}
            <AnimatePresence>
                {gamePhase === 'game_winner' && (
                    <motion.div className="round-winner-popup-container-3p" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <motion.div className="game-winner-vibrant-card-3p" initial={{ scale: 0.5, y: 100 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 100 }}>
                            <div className="avatar-crown-wrapper-3p">
                                <img src={finalGameWinner === 'me' ? user?.photoURL : (finalGameWinner === 'p1' ? opponent1.photoURL : opponent3.photoURL)} className="final-winner-avatar-3p" alt="Final Winner" />
                                <img src={winnerCrown} className="crown-img-absolute-3p" alt="Crown" />
                            </div>
                            <h2 className="final-winner-name-3p">
                                {finalGameWinner === 'me' ? (user?.displayName || 'player name') : (finalGameWinner === 'p1' ? opponent1.displayName : opponent3.displayName)}
                            </h2>
                            <p className="final-win-label-3p">win</p>
                            <div className="reward-section-3p">
                                <img src={winnerCoins} className="coin-img-large-3p" alt="Coins" />
                                <p className="reward-amount-text-3p">{betAmount * 3}</p>
                            </div>
                            <button className="confirm-btn-winnings-3p" onClick={() => onGameEnd(finalGameWinner)}>OK</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* User Elimination Overlay (Spectator Mode) */}
            <AnimatePresence>
                {eliminatedPlayer === 'me' && gamePhase !== 'game_winner' && showEliminationOverlay && (
                    <motion.div className="elimination-overlay-3p" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <motion.div className="elimination-card-3p" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                            <h2 className="eliminated-title">ELIMINATED</h2>
                            <p className="eliminated-msg">You were the slowest this round!</p>
                            <p className="spectator-msg">You can watch the battle or leave now.</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                                <button className="leave-game-btn" onClick={() => onGameEnd('opponent')}>LEAVE MATCH</button>
                                <button className="watch-match-btn" onClick={() => setShowEliminationOverlay(false)}>WATCH THE MATCH</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


export default GameScreen3P;
