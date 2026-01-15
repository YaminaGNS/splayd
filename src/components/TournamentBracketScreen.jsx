import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './TournamentBracketScreen.css';
import prizeCoins from '../assets/game-icons/prize-coins.png';
import { TournamentAIService } from '../services/TournamentAIService';

const TournamentBracketScreen = ({
    user,
    players = [],
    betAmount = 0,
    languageCode = 'en',
    onMatchStart,
    onTournamentComplete,
    matchResult,
    savedState,
    onStateUpdate,
    returningAsSpectator = false,
    onSpectatorModeStarted
}) => {
    // Early guard for crash prevention
    if (!user || !players || players.length < 4) {
        console.warn("TournamentBracketScreen: Guard triggered.", { user, playersCount: players?.length });
        return (
            <div style={{
                width: '100vw',
                height: '100vh',
                background: 'radial-gradient(circle at center, #8B0000 0%, #3a0000 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.2rem'
            }}>
                LOADING TOURNAMENT...
            </div>
        );
    }

    // Initialize state - Check savedState for ongoing matches
    const [tournamentState, setTournamentState] = useState(() => {
        if (savedState && savedState.matches) {
            console.log("📁 Resuming Tournament from saved state:", savedState.visualStage);

            // Check if matches are in progress or have results
            const hasMatchActivity = savedState.matches.top.inProgress ||
                savedState.matches.bottom.inProgress ||
                savedState.matches.top.winnerIdx !== null ||
                savedState.matches.bottom.winnerIdx !== null;

            // FIX: If matches are active but visualStage is 'waiting', correct it
            if (hasMatchActivity && savedState.visualStage === 'waiting') {
                console.log("⚠️ Correcting visualStage from 'waiting' to 'semis_playing' (matches in progress)");
                return { ...savedState, visualStage: 'semis_playing' };
            }

            return savedState;
        }
        console.log("🆕 Starting New Tournament State");
        return {
            players: players,
            betAmount: betAmount,
            prizePool: betAmount * 4,
            matches: {
                top: { p1Idx: 0, p2Idx: 1, winnerIdx: null, inProgress: false, completionTime: null },
                bottom: { p1Idx: 2, p2Idx: 3, winnerIdx: null, inProgress: false, completionTime: null },
                final: { inProgress: false, winnerIdx: null }
            },
            visualStage: 'waiting',
            eliminated: []
        };
    });

    // Sync with savedState when returning from a match
    useEffect(() => {
        if (savedState && savedState.matches && savedState.visualStage !== tournamentState.visualStage) {
            console.log("📁 Syncing with saved state:", savedState.visualStage, "(was:", tournamentState.visualStage, ")");
            setTournamentState(savedState);
        }
    }, [savedState]);

    const [animationState, setAnimationState] = useState({
        animating: false,
        winnerId: null,
        targetZone: null
    });

    const [eliminationAnimation, setEliminationAnimation] = useState({
        showing: false,
        player: null,
        matchType: null
    });

    const POSITIONS = useMemo(() => ({
        topLeft: { x: 20, y: 15 },
        topRight: { x: 80, y: 15 },
        midLeft: { x: 25, y: 50 },
        midRight: { x: 75, y: 50 },
        center: { x: 50, y: 50 },
        bottomLeft: { x: 20, y: 85 },
        bottomRight: { x: 80, y: 85 }
    }), []);

    const [displayPlayers, setDisplayPlayers] = useState({
        topLeft: players[0],
        topRight: players[1],
        bottomLeft: players[2],
        bottomRight: players[3],
        midLeft: (tournamentState?.matches?.top?.winnerIdx !== null && players[tournamentState.matches.top.winnerIdx]) || null,
        midRight: (tournamentState?.matches?.bottom?.winnerIdx !== null && players[tournamentState.matches.bottom.winnerIdx]) || null
    });

    const getUserIdx = useCallback(() => {
        const uid = user?.uid;
        if (!uid) return -1;
        return players.findIndex(p => p.uid === uid);
    }, [players, user]);

    // Check if user is eliminated from the WHOLE tournament
    const isUserEliminatedCompletely = useCallback(() => {
        const idx = getUserIdx();
        if (idx === -1) return true;

        const { top, bottom, final } = tournamentState.matches;

        // 1. Semi-Final Loss Check
        if (idx === 0 || idx === 1) {
            if (top.winnerIdx !== null && top.winnerIdx !== idx) return true;
        } else if (idx === 2 || idx === 3) {
            if (bottom.winnerIdx !== null && bottom.winnerIdx !== idx) return true;
        }

        // 2. Final Loss Check
        if (final.winnerIdx !== null && final.winnerIdx !== idx) {
            // Only true if the user actually made it to the final
            if (top.winnerIdx === idx || bottom.winnerIdx === idx) return true;
        }

        return false;
    }, [getUserIdx, tournamentState.matches]);

    // Helper to determine match type (AI vs AI, Player vs Player, or Mixed)
    const getMatchType = useCallback((matchKey) => {
        const match = tournamentState.matches[matchKey];
        if (!match) return 'UNKNOWN';

        const p1 = players[match.p1Idx];
        const p2 = players[match.p2Idx];

        if (!p1 || !p2) return 'UNKNOWN';

        const p1IsAI = p1.uid.startsWith('bot-');
        const p2IsAI = p2.uid.startsWith('bot-');

        if (p1IsAI && p2IsAI) return 'AI_VS_AI';
        if (!p1IsAI && !p2IsAI) return 'PLAYER_VS_PLAYER';
        return 'MIXED';
    }, [players, tournamentState.matches]);

    const handleMatchEnd = useCallback((matchType, winner) => {
        if (!winner) return;
        const winnerIdx = players.findIndex(p => p.uid === winner.uid);
        if (winnerIdx === -1) return;

        console.log(`🏆 Match End: ${matchType} | Winner: ${winner.displayName} (${winnerIdx})`);

        // Determine the loser
        let loserIdx = -1;
        if (matchType === 'top') {
            loserIdx = winnerIdx === 0 ? 1 : 0;
        } else if (matchType === 'bottom') {
            loserIdx = winnerIdx === 2 ? 3 : 2;
        }

        const loser = loserIdx !== -1 ? players[loserIdx] : null;
        const userIdx = getUserIdx();
        const isSpectator = isUserEliminatedCompletely();
        const matchTypeCategory = getMatchType(matchType);

        // Show elimination animation for spectators watching AI matches
        if (isSpectator && matchTypeCategory === 'AI_VS_AI' && loser) {
            console.log(`👁️ Spectator watching AI match - showing elimination for ${loser.displayName}`);
            setEliminationAnimation({
                showing: true,
                player: loser,
                matchType: matchType
            });

            // Wait for elimination animation, then advance winner
            setTimeout(() => {
                setEliminationAnimation({ showing: false, player: null, matchType: null });
                if (matchType === 'top') animateAdvance(winner, 'top', 'midLeft');
                else if (matchType === 'bottom') animateAdvance(winner, 'bottom', 'midRight');
                else if (matchType === 'final') animateChampion(winner);
            }, 2500); // 2.5 seconds for elimination display
        } else {
            // Normal flow - immediate advancement
            if (matchType === 'top') animateAdvance(winner, 'top', 'midLeft');
            else if (matchType === 'bottom') animateAdvance(winner, 'bottom', 'midRight');
            else if (matchType === 'final') animateChampion(winner);
        }
    }, [players, getUserIdx, isUserEliminatedCompletely, getMatchType]);

    // Animation & State Transitions
    const animateAdvance = (winner, fromMatch, toZone) => {
        const winnerIdx = players.findIndex(p => p.uid === winner.uid);
        setAnimationState({ animating: true, winnerId: winner.uid, targetZone: toZone });
        setTimeout(() => {
            setTournamentState(prev => {
                const ns = { ...prev };
                if (fromMatch === 'top') {
                    ns.matches.top.inProgress = false;
                    ns.matches.top.winnerIdx = winnerIdx;
                } else {
                    ns.matches.bottom.inProgress = false;
                    ns.matches.bottom.winnerIdx = winnerIdx;
                }
                const allDone = (ns.matches.top.winnerIdx !== null && ns.matches.bottom.winnerIdx !== null);
                if (allDone) ns.visualStage = 'finals_ready';

                // Add to eliminated list if not the winner
                const loserIdx = fromMatch === 'top'
                    ? (winnerIdx === 0 ? 1 : 0)
                    : (winnerIdx === 2 ? 3 : 2);
                const loserUid = players[loserIdx]?.uid;
                if (loserUid && !ns.eliminated.includes(loserUid)) {
                    ns.eliminated = [...ns.eliminated, loserUid];
                }

                return ns;
            });
            setAnimationState({ animating: false, winnerId: null, targetZone: null });
        }, 1200);
    };

    const animateChampion = (winner) => {
        setAnimationState({ animating: true, winnerId: winner.uid, targetZone: 'center' });
        setTimeout(() => {
            const winnerIdx = players.findIndex(p => p.uid === winner.uid);
            setTournamentState(prev => ({
                ...prev,
                visualStage: 'champion',
                matches: { ...prev.matches, final: { inProgress: false, winnerIdx } }
            }));
            if (onTournamentComplete) onTournamentComplete(winner, tournamentState.prizePool);
            setAnimationState({ animating: false, winnerId: null, targetZone: null });
        }, 1500);
    };

    const startFinals = () => {
        if (tournamentState.matches.final.inProgress) return;

        const w1Idx = tournamentState.matches.top.winnerIdx;
        const w2Idx = tournamentState.matches.bottom.winnerIdx;
        const p1 = players[w1Idx];
        const p2 = players[w2Idx];
        if (!p1 || !p2) {
            console.error("❌ Cannot start finals: missing winners", { w1Idx, w2Idx });
            return;
        }

        console.log("🔥 Starting Finals Match:", p1.displayName, "vs", p2.displayName);

        setTournamentState(prev => ({
            ...prev,
            visualStage: 'final_playing',
            matches: { ...prev.matches, final: { ...prev.matches.final, inProgress: true } }
        }));

        if (user.uid === p1.uid) {
            onMatchStart(p2, 'final');
        } else if (user.uid === p2.uid) {
            onMatchStart(p1, 'final');
        } else {
            // User is a spectator
            console.log("👁️ Entering Finals as Spectator");
            onMatchStart(null, 'final', { p1, p2 });
        }
    };

    // Update display players when match state changes
    useEffect(() => {
        setDisplayPlayers({
            topLeft: players[0],
            topRight: players[1],
            bottomLeft: players[2],
            bottomRight: players[3],
            midLeft: tournamentState.matches.top.winnerIdx !== null ? players[tournamentState.matches.top.winnerIdx] : null,
            midRight: tournamentState.matches.bottom.winnerIdx !== null ? players[tournamentState.matches.bottom.winnerIdx] : null
        });
    }, [tournamentState.matches.top.winnerIdx, tournamentState.matches.bottom.winnerIdx, players]);

    // Sync state up to App.jsx
    useEffect(() => {
        if (onStateUpdate) {
            console.log("📤 Sending state update to App.jsx:", tournamentState.visualStage);
            onStateUpdate(tournamentState);
        }
    }, [tournamentState, onStateUpdate]);

    // Handle incoming results
    useEffect(() => {
        if (matchResult && matchResult.winner) {
            const { matchType, winner } = matchResult;
            console.log("📨 Received Match Result:", matchType, winner.displayName);
            if (tournamentState.matches[matchType]?.winnerIdx === null) {
                handleMatchEnd(matchType, winner);
            }
        }
    }, [matchResult, tournamentState.matches, handleMatchEnd]);

    // AI Simulation Timer - Keep running until BOTH semis are done
    useEffect(() => {
        const { top, bottom } = tournamentState.matches;
        const semisDone = (top.winnerIdx !== null && bottom.winnerIdx !== null);

        if (tournamentState.visualStage === 'semis_playing' && !semisDone) {
            console.log("🤖 AI Simulation Active | Top Winner:", top.winnerIdx, "| Bottom Winner:", bottom.winnerIdx);
            const interval = setInterval(() => {
                console.log("⏰ Checking AI matches...");
                TournamentAIService.checkAndFinalizeMatches(tournamentState, players, user.uid, handleMatchEnd);
            }, 1000);
            return () => {
                console.log("🛑 AI Simulation Stopped");
                clearInterval(interval);
            };
        }
    }, [tournamentState.visualStage, tournamentState.matches, players, user.uid, handleMatchEnd]);

    // Progress to semis - ONLY run this if we're truly at the start
    useEffect(() => {
        // Don't run if matches are already in progress!
        const matchesInProgress = tournamentState.matches.top.inProgress ||
            tournamentState.matches.bottom.inProgress ||
            tournamentState.matches.top.winnerIdx !== null ||
            tournamentState.matches.bottom.winnerIdx !== null;

        if (tournamentState.visualStage === 'waiting' && !matchesInProgress) {
            console.log("🚀 Starting tournament for the FIRST time");
            const timer = setTimeout(() => {
                const userIdx = getUserIdx();
                const isUserInSemis = userIdx >= 0 && userIdx <= 3;
                let userMatchKey = isUserInSemis ? ((userIdx === 0 || userIdx === 1) ? 'top' : 'bottom') : null;
                let otherKey = userMatchKey === 'top' ? 'bottom' : 'top';
                const now = Date.now();

                console.log(`🎮 Tournament Start | User: ${user.displayName} (idx: ${userIdx}) | UserMatch: ${userMatchKey} | OtherMatch: ${otherKey}`);

                // Set up match states
                const newMatches = {
                    top: { ...tournamentState.matches.top, inProgress: true },
                    bottom: { ...tournamentState.matches.bottom, inProgress: true },
                    final: tournamentState.matches.final
                };

                // The match the user is NOT in should get a completion time for AI simulation
                if (userMatchKey === 'top') {
                    newMatches.bottom.completionTime = now + 10000 + Math.random() * 8000;
                    console.log(`⏱️ Bottom match (P3 vs P4) will complete at: ${new Date(newMatches.bottom.completionTime).toLocaleTimeString()}`);
                } else if (userMatchKey === 'bottom') {
                    newMatches.top.completionTime = now + 10000 + Math.random() * 8000;
                    console.log(`⏱️ Top match (P1 vs P2) will complete at: ${new Date(newMatches.top.completionTime).toLocaleTimeString()}`);
                } else {
                    newMatches.top.completionTime = now + 10000 + Math.random() * 5000;
                    newMatches.bottom.completionTime = now + 12000 + Math.random() * 8000;
                    console.log(`👁️ Spectator mode - both matches will auto-complete`);
                }

                // UPDATE STATE FIRST before navigating!
                setTournamentState(prev => ({
                    ...prev,
                    visualStage: 'semis_playing',
                    matches: newMatches
                }));

                // THEN start user's match (which will navigate away)
                if (isUserInSemis) {
                    const oppIdx = (userIdx % 2 === 0) ? userIdx + 1 : userIdx - 1;
                    console.log(`🎯 Starting Semi-Final for user vs ${players[oppIdx].displayName}`);
                    // Small delay to ensure state update is processed
                    setTimeout(() => {
                        onMatchStart(players[oppIdx], userMatchKey);
                    }, 100);
                }
            }, 2500);
            return () => clearTimeout(timer);
        } else if (matchesInProgress) {
            console.log("⏭️ Skipping initialization - matches already in progress");
        }
    }, [tournamentState.visualStage, tournamentState.matches, user.uid, players, onMatchStart, getUserIdx]);

    // Auto-start final if user is in it
    useEffect(() => {
        if (tournamentState.visualStage === 'finals_ready') {
            const userIdx = getUserIdx();
            const topWinner = tournamentState.matches.top.winnerIdx;
            const bottomWinner = tournamentState.matches.bottom.winnerIdx;

            const isUserFinalist = (userIdx === topWinner || userIdx === bottomWinner);

            if (isUserFinalist) {
                console.log("🏃 User is a finalist! Auto-starting in 3s...");
                const timer = setTimeout(startFinals, 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [tournamentState.visualStage, tournamentState.matches.top.winnerIdx, tournamentState.matches.bottom.winnerIdx, getUserIdx]);

    // Auto-start spectator mode when returning as spectator
    useEffect(() => {
        if (returningAsSpectator && isUserEliminatedCompletely()) {
            console.log("👁️ User returning as spectator - checking for active matches...");

            const { top, bottom, final } = tournamentState.matches;
            const { visualStage } = tournamentState;

            // Check if there's an ongoing semi-final match to spectate
            if (visualStage === 'semis_playing') {
                const userIdx = getUserIdx();
                let matchToWatch = null;
                let spectatorPlayers = null;

                // Determine which match the user is NOT in (the one to spectate)
                if (userIdx === 0 || userIdx === 1) {
                    // User was in top match, watch bottom match
                    if (bottom.inProgress || bottom.winnerIdx === null) {
                        matchToWatch = 'bottom';
                        spectatorPlayers = { p1: players[2], p2: players[3] };
                    }
                } else if (userIdx === 2 || userIdx === 3) {
                    // User was in bottom match, watch top match
                    if (top.inProgress || top.winnerIdx === null) {
                        matchToWatch = 'top';
                        spectatorPlayers = { p1: players[0], p2: players[1] };
                    }
                }

                if (matchToWatch && spectatorPlayers) {
                    console.log(`🎬 Auto-starting spectator mode for ${matchToWatch} match`);
                    if (onSpectatorModeStarted) onSpectatorModeStarted();
                    // Small delay to ensure smooth transition
                    setTimeout(() => {
                        onMatchStart(null, matchToWatch, spectatorPlayers);
                    }, 500);
                }
            }
            // Check if finals are ready or in progress
            else if (visualStage === 'finals_ready' || visualStage === 'final_playing') {
                console.log("🎬 Auto-starting spectator mode for finals");
                if (onSpectatorModeStarted) onSpectatorModeStarted();
                setTimeout(() => {
                    startFinals();
                }, 500);
            }
        }
    }, [returningAsSpectator, tournamentState.visualStage, tournamentState.matches, isUserEliminatedCompletely, getUserIdx, players, onMatchStart, onSpectatorModeStarted, startFinals]);

    const getStatus = (player, position) => {
        if (!player) return 'empty';
        const pIdx = players.findIndex(p => p.uid === player.uid);
        const { top, bottom, final } = tournamentState.matches;

        if (position.includes('top')) {
            if (top.inProgress) return 'playing';
            if (top.winnerIdx !== null) return top.winnerIdx === pIdx ? 'winner' : 'eliminated';
        } else if (position.includes('bottom')) {
            if (bottom.inProgress) return 'playing';
            if (bottom.winnerIdx !== null) return bottom.winnerIdx === pIdx ? 'winner' : 'eliminated';
        } else if (position.includes('mid')) {
            if (final.inProgress) return 'playing';
            if (tournamentState.visualStage === 'champion') return final.winnerIdx === pIdx ? 'champion' : 'eliminated';
            // If finals ready, show who made it
            if (tournamentState.visualStage === 'finals_ready') return 'waiting';
        }
        return 'waiting';
    };

    const renderNode = (player, key, isCorner) => {
        if (!player) return null;
        const status = getStatus(player, key);
        const pos = POSITIONS[key];
        const isTopNode = key.includes('top');
        return (
            <div className={`player-node ${isCorner ? 'corner-node' : 'middle-node'} status-${status}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }} key={key}>
                {isTopNode && <div className="player-info" style={{ marginBottom: '8px' }}>
                    <div className="player-name">{player.displayName}</div>
                    <div className="player-level">lvl {player.level || 1}</div>
                </div>}
                <div className="avatar-container">
                    {player.photoURL ? <img src={player.photoURL} className="bracket-avatar" alt="" /> : <div className="avatar-initial">{player.displayName?.[0] || '?'}</div>}
                </div>
                {!isTopNode && <div className="player-info" style={{ marginTop: '8px' }}>
                    <div className="player-name">{player.displayName}</div>
                    <div className="player-level">lvl {player.level || 1}</div>
                </div>}
                {status === 'winner' && <div className="winner-check">✓</div>}
                {status === 'eliminated' && <div className="eliminated-mark">✗</div>}
                {status === 'champion' && <div className="winner-check champ">👑</div>}
            </div>
        );
    };

    const isLineActive = (type) => tournamentState.matches[type]?.inProgress;
    const isLineWinner = (type) => {
        if (type === 'final') return tournamentState.visualStage === 'champion';
        return tournamentState.matches[type]?.winnerIdx !== null;
    };

    return (
        <div className="tournament-bracket-screen">
            <svg className="svg-lines-container" width="100%" height="100%">
                <line x1="20%" y1="15%" x2="80%" y2="15%" className={`bracket-line ${isLineActive('top') ? 'active' : ''} ${isLineWinner('top') ? 'winner' : ''}`} />
                <line x1="50%" y1="15%" x2="50%" y2="30%" className={`bracket-line ${isLineActive('top') ? 'active' : ''} ${isLineWinner('top') ? 'winner' : ''}`} />
                <line x1="25%" y1="30%" x2="75%" y2="30%" className={`bracket-line ${isLineActive('top') ? 'active' : ''} ${isLineWinner('top') ? 'winner' : ''}`} />
                <line x1="25%" y1="30%" x2="25%" y2="42%" className={`bracket-line ${isLineActive('top') ? 'active' : ''} ${isLineWinner('top') ? 'winner' : ''}`} />
                <line x1="75%" y1="30%" x2="75%" y2="42%" className={`bracket-line ${isLineActive('top') ? 'active' : ''} ${isLineWinner('top') ? 'winner' : ''}`} />
                <line x1="20%" y1="85%" x2="80%" y2="85%" className={`bracket-line ${isLineActive('bottom') ? 'active' : ''} ${isLineWinner('bottom') ? 'winner' : ''}`} />
                <line x1="50%" y1="85%" x2="50%" y2="70%" className={`bracket-line ${isLineActive('bottom') ? 'active' : ''} ${isLineWinner('bottom') ? 'winner' : ''}`} />
                <line x1="25%" y1="70%" x2="75%" y2="70%" className={`bracket-line ${isLineActive('bottom') ? 'active' : ''} ${isLineWinner('bottom') ? 'winner' : ''}`} />
                <line x1="25%" y1="70%" x2="25%" y2="58%" className={`bracket-line ${isLineActive('bottom') ? 'active' : ''} ${isLineWinner('bottom') ? 'winner' : ''}`} />
                <line x1="75%" y1="70%" x2="75%" y2="58%" className={`bracket-line ${isLineActive('bottom') ? 'active' : ''} ${isLineWinner('bottom') ? 'winner' : ''}`} />
                <line x1="25%" y1="50%" x2="35%" y2="50%" className={`bracket-line final ${isLineActive('final') ? 'active' : ''} ${isLineWinner('final') ? 'winner' : ''}`} />
                <line x1="65%" y1="50%" x2="75%" y2="50%" className={`bracket-line final ${isLineActive('final') ? 'active' : ''} ${isLineWinner('final') ? 'winner' : ''}`} />
            </svg>

            {renderNode(displayPlayers.topLeft, 'topLeft', true)}
            {renderNode(displayPlayers.topRight, 'topRight', true)}
            {renderNode(displayPlayers.bottomLeft, 'bottomLeft', true)}
            {renderNode(displayPlayers.bottomRight, 'bottomRight', true)}
            {renderNode(displayPlayers.midLeft, 'midLeft', false)}
            {renderNode(displayPlayers.midRight, 'midRight', false)}

            {/* Manual Start Button for Eliminates / Spectators */}
            {tournamentState.visualStage === 'finals_ready' && isUserEliminatedCompletely() && (
                <div className="bracket-action-overlay">
                    <button className="watch-final-btn" onClick={startFinals}>
                        WATCH FINAL MATCH
                    </button>
                    <p className="eliminated-caption">You have been eliminated. Watch the final!</p>
                </div>
            )}

            {/* Waiting Overlay - for players who finished their match OR spectators watching real player matches */}
            {tournamentState.visualStage === 'semis_playing' && (() => {
                const userIdx = getUserIdx();
                const isSpectator = isUserEliminatedCompletely();
                const { top, bottom } = tournamentState.matches;

                let shouldShowWaiting = false;
                let waitingMatchPlayers = null;

                // Case 1: User finished their match, waiting for other match
                if (userIdx !== -1 && !isSpectator) {
                    if ((userIdx === 0 || userIdx === 1) && top.winnerIdx !== null && bottom.winnerIdx === null) {
                        shouldShowWaiting = true;
                        waitingMatchPlayers = { p1: players[2], p2: players[3] };
                    }
                    if ((userIdx === 2 || userIdx === 3) && bottom.winnerIdx !== null && top.winnerIdx === null) {
                        shouldShowWaiting = true;
                        waitingMatchPlayers = { p1: players[0], p2: players[1] };
                    }
                }

                // Case 2: Spectator watching - check if any match has real players still competing
                if (isSpectator) {
                    const topMatchType = getMatchType('top');
                    const bottomMatchType = getMatchType('bottom');

                    // If top match has real players and is still in progress
                    if (top.winnerIdx === null && (topMatchType === 'PLAYER_VS_PLAYER' || topMatchType === 'MIXED')) {
                        shouldShowWaiting = true;
                        waitingMatchPlayers = { p1: players[0], p2: players[1] };
                    }
                    // If bottom match has real players and is still in progress
                    else if (bottom.winnerIdx === null && (bottomMatchType === 'PLAYER_VS_PLAYER' || bottomMatchType === 'MIXED')) {
                        shouldShowWaiting = true;
                        waitingMatchPlayers = { p1: players[2], p2: players[3] };
                    }
                }

                if (shouldShowWaiting && waitingMatchPlayers) {
                    return (
                        <div className="waiting-message-overlay">
                            <div className="waiting-text">WAITING FOR MATCH TO FINISH...</div>
                            <div className="match-info">
                                {waitingMatchPlayers.p1?.displayName} vs {waitingMatchPlayers.p2?.displayName}
                            </div>
                            <div className="waiting-dots"><span></span><span></span><span></span></div>
                        </div>
                    );
                }
                return null;
            })()}

            {/* AI Elimination Animation Overlay */}
            {eliminationAnimation.showing && eliminationAnimation.player && (
                <div className="ai-elimination-overlay">
                    <div className="ai-elimination-content">
                        <div className="eliminated-player">
                            <div className="avatar-container-large">
                                {eliminationAnimation.player.photoURL ? (
                                    <img src={eliminationAnimation.player.photoURL} alt="" className="eliminated-avatar" />
                                ) : (
                                    <div className="avatar-initial-large">
                                        {eliminationAnimation.player.displayName?.[0] || '?'}
                                    </div>
                                )}
                            </div>
                            <div className="eliminated-player-name">{eliminationAnimation.player.displayName}</div>
                        </div>
                        <div className="elimination-text">ELIMINATED</div>
                        <div className="elimination-emoji">😢</div>
                    </div>
                </div>
            )}

            <div className={`prize-box-container ${tournamentState.visualStage === 'champion' ? 'champion-mode' : ''}`}>
                <div className="prize-text">{tournamentState.prizePool.toLocaleString()} coins</div>
                <img src={prizeCoins} alt="" className="prize-icon" />
            </div>

            {animationState.animating && animationState.winnerId && (() => {
                const player = players.find(p => p.uid === animationState.winnerId);
                if (!player) return null;
                const targetPos = POSITIONS[animationState.targetZone || 'center'];
                let startPos = { x: 50, y: 50 };
                if (animationState.targetZone === 'midLeft') {
                    startPos = (players[0]?.uid === player.uid) ? POSITIONS.topLeft : POSITIONS.topRight;
                } else if (animationState.targetZone === 'midRight') {
                    startPos = (players[2]?.uid === player.uid) ? POSITIONS.bottomLeft : POSITIONS.bottomRight;
                } else if (animationState.targetZone === 'center') {
                    startPos = (displayPlayers.midLeft?.uid === player.uid) ? POSITIONS.midLeft : POSITIONS.midRight;
                }
                return (
                    <div className="player-node sliding-winner" style={{ left: `${startPos.x}%`, top: `${startPos.y}%`, '--target-x': `${targetPos.x}%`, '--target-y': `${targetPos.y}%`, animation: 'slide-dynamic 1.2s forwards cubic-bezier(0.4, 0, 0.2, 1)' }}>
                        <div className="avatar-container" style={{ width: '12vw', height: '12vw', borderColor: '#4caf50', boxShadow: '0 0 20px #4caf50' }}>
                            {player.photoURL ? <img src={player.photoURL} alt="" className="bracket-avatar" /> : <div className="avatar-initial">{player.displayName?.[0] || '?'}</div>}
                        </div>
                    </div>
                );
            })()}
            <style>{`@keyframes slide-dynamic { to { left: var(--target-x); top: var(--target-y); } }`}</style>
        </div>
    );
};

export default TournamentBracketScreen;
