import React, { useState, useEffect, useRef } from 'react';
import './MatchmakingScreen.css';
import { joinQueue, joinTournamentQueue, waitForMatchWithTimeout, leaveQueue, MATCHMAKING_TIMEOUT } from '../services/matchmakingService';
import { getPlayerProfile } from '../services/firestoreService';
import { getGameSession } from '../services/gameSessionService';

const MatchmakingScreen = ({ user, languageCode, gameMode, betAmount, onGameStart }) => {
    const [status, setStatus] = useState('searching'); // searching, found, timeout, countdown
    const [countdown, setCountdown] = useState(3);
    const [opponents, setOpponents] = useState([]);
    const [cyclingAvatar, setCyclingAvatar] = useState(0);
    const [sessionId, setSessionId] = useState(null);
    const [isRealMatch, setIsRealMatch] = useState(false);
    const [mySessionPlayerId, setMySessionPlayerId] = useState(null);
    const mySessionPlayerIdRef = useRef(null); // Use ref to avoid async state issues

    const mockAvatars = [
        "https://i.pravatar.cc/150?u=1",
        "https://i.pravatar.cc/150?u=2",
        "https://i.pravatar.cc/150?u=3",
        "https://i.pravatar.cc/150?u=4",
        "https://i.pravatar.cc/150?u=5",
        "https://i.pravatar.cc/150?u=6",
        "https://i.pravatar.cc/150?u=7",
        "https://i.pravatar.cc/150?u=8",
        "https://i.pravatar.cc/150?u=9",
        "https://i.pravatar.cc/150?u=10"
    ];

    const translations = {
        en: {
            title2: "2 Player Match",
            title3: "3 Player Match",
            title4: "4 Player Match",
            titleTournament: "Tournament",
            bet: "Prize Pool:",
            searching: "SEARCHING...",
            found: "MATCH FOUND!",
            noPlayers: "NO PLAYERS FOUND",
            playingAI: "PLAYING WITH AI",
            level: "LVL",
            vs: "VS"
        },
        ar: {
            title2: "مباراة لاعبين",
            title3: "مباراة 3 لاعبين",
            title4: "مباراة 4 لاعبين",
            titleTournament: "بطولة",
            bet: "مجموع الجوائز:",
            searching: "جاري البحث...",
            found: "تم العثور!",
            noPlayers: "لم يتم العثور على لاعبين",
            playingAI: "اللعب مع الذكاء الاصطناعي",
            level: "مستوى",
            vs: "ضد"
        },
        fr: {
            title2: "Match 2 Joueurs",
            title3: "Match 3 Joueurs",
            title4: "Match 4 Joueurs",
            titleTournament: "Tournoi",
            bet: "Prix total:",
            searching: "RECHERCHE...",
            found: "PARTIE TROUVÉE!",
            noPlayers: "AUCUN JOUEUR TROUVÉ",
            playingAI: "JOUER AVEC IA",
            level: "NIVEAU",
            vs: "VS"
        },
        es: {
            title2: "Partido 2 Jugadores",
            title3: "Partido 3 Jugadores",
            title4: "Partido 4 Jugadores",
            titleTournament: "Torneo",
            bet: "Premio total:",
            searching: "BUSCANDO...",
            found: "¡PARTIDO ENCONTRADO!",
            noPlayers: "NO SE ENCONTRARON JUGADORES",
            playingAI: "JUGANDO CON IA",
            level: "NIVEL",
            vs: "VS"
        }
    };

    const t = translations[languageCode] || translations.en;

    const getTitle = () => {
        if (gameMode === 'tournament') return t.titleTournament;
        if (gameMode === '3player') return t.title3;
        if (gameMode === '4player') return t.title4;
        return t.title2;
    };

    // Create AI opponents
    const createAIOpponents = (count) => {
        return Array.from({ length: count }).map((_, i) => ({
            uid: `bot-${Date.now()}-${i}`,
            displayName: `Bot Player ${i + 1}`,
            level: Math.floor(Math.random() * 50) + 1,
            photoURL: null,
            isBot: true
        }));
    };

    // Fetch real player profiles from Firebase
    const fetchPlayerProfiles = async (playerIds) => {
        const profiles = [];
        for (const playerId of playerIds) {
            try {
                const profile = await getPlayerProfile(playerId, languageCode);
                if (profile) {
                    profiles.push(profile);
                }
            } catch (error) {
                console.error('Error fetching player profile:', error);
            }
        }
        return profiles;
    };

    // Real Matchmaking logic
    useEffect(() => {
        let queueEntryId = null;
        let cycleInterval = null;
        let countdownTimer = null;
        let isMounted = true;

        // Generate a unique ID for this matchmaking session to allow multi-tab testing
        // Format: uid_timestamp_random
        const myMatchId = `${user.uid}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        setMySessionPlayerId(myMatchId); // Store for passing to GameScreen
        mySessionPlayerIdRef.current = myMatchId; // Store in ref for immediate access

        const startMatchmaking = async () => {
            try {
                setStatus('searching');

                // Start cycling avatars animation
                cycleInterval = setInterval(() => {
                    setCyclingAvatar(prev => (prev + 1) % mockAvatars.length);
                }, 100);

                if (gameMode === 'tournament') {
                    // Tournament matchmaking
                    console.log('🎮 Starting tournament matchmaking...', myMatchId);
                    const result = await joinTournamentQueue(myMatchId, languageCode, betAmount);

                    if (!isMounted) return;

                    if (result.sessionId && result.playerIds.length > 0) {
                        // Real players found!
                        console.log('✅ Tournament match found with real players:', result.playerIds);

                        // Extract real UIDs for profile fetching
                        const realPlayerIds = result.playerIds.map(id => id.split('_')[0]);
                        const realPlayers = await fetchPlayerProfiles(realPlayerIds);

                        // Map profiles back to match IDs if needed, or just use profiles
                        // For tournament, we just need the profiles for display
                        setOpponents(realPlayers);
                        setSessionId(result.sessionId);
                        setIsRealMatch(true);
                        setStatus('found');
                        clearInterval(cycleInterval);
                    } else {
                        // Timeout - use AI
                        console.log('⏱️ Tournament timeout - using AI bots');
                        const aiOpponents = createAIOpponents(3);
                        setOpponents(aiOpponents);
                        setSessionId(null);
                        setIsRealMatch(false);
                        setStatus('timeout');
                        clearInterval(cycleInterval);

                        // Show timeout message briefly, then proceed
                        setTimeout(() => {
                            if (isMounted) setStatus('found');
                        }, 2000);
                    }
                } else {
                    // 2-player matchmaking
                    console.log('🎮 Starting 2-player matchmaking...', myMatchId);
                    queueEntryId = await joinQueue(myMatchId, languageCode, gameMode, betAmount);

                    if (!isMounted) return;

                    const matchSessionId = await waitForMatchWithTimeout(languageCode, queueEntryId, MATCHMAKING_TIMEOUT);

                    if (!isMounted) return;

                    if (matchSessionId) {
                        // Real opponent found! Fetch their profile from session
                        console.log('✅ Match found! Session ID:', matchSessionId);

                        try {
                            // Get session data to find opponent ID
                            const sessionData = await getGameSession(languageCode, matchSessionId);
                            if (sessionData && sessionData.playerIds) {
                                // Find opponent ID (the one that's not us - using local match ID)
                                const opponentId = sessionData.playerIds.find(id => id !== myMatchId);

                                if (opponentId) {
                                    // Extract real UID from complex ID (uid_timestamp_random)
                                    const realOpponentUid = opponentId.split('_')[0];

                                    // Fetch real opponent profile
                                    const opponentProfile = await getPlayerProfile(realOpponentUid, languageCode);

                                    if (opponentProfile) {
                                        // Use the session-specific ID for the opponent object passed to game
                                        // This ensures GameScreen knows which ID to look for in Firebase updates
                                        setOpponents([{
                                            ...opponentProfile,
                                            uid: opponentId // OVERRIDE uid with session ID for game logic
                                        }]);
                                    } else {
                                        // Fallback if profile not found
                                        setOpponents([{
                                            uid: opponentId,
                                            displayName: 'Opponent',
                                            level: 1,
                                            photoURL: null
                                        }]);
                                    }
                                } else {
                                    throw new Error('Opponent ID not found in session');
                                }
                            } else {
                                throw new Error('Session data not found');
                            }
                        } catch (error) {
                            console.error('Error fetching opponent profile:', error);
                            // Fallback to generic opponent
                            setOpponents([{
                                uid: 'opponent-' + Date.now(),
                                displayName: 'Opponent',
                                level: 1,
                                photoURL: null
                            }]);
                        }

                        setSessionId(matchSessionId);
                        setIsRealMatch(true);
                        setStatus('found');
                        clearInterval(cycleInterval);
                    } else {
                        // Timeout - use AI
                        console.log('⏱️ Matchmaking timeout - using AI opponent');
                        const aiOpponent = createAIOpponents(1);
                        setOpponents(aiOpponent);
                        setSessionId(null);
                        setIsRealMatch(false);
                        setStatus('timeout');
                        clearInterval(cycleInterval);

                        // Show timeout message briefly, then proceed
                        setTimeout(() => {
                            if (isMounted) setStatus('found');
                        }, 2000);
                    }
                }
            } catch (error) {
                console.error('Matchmaking error:', error);
                // Fallback to AI on error
                const numOpponents = gameMode === 'tournament' ? 3 : 1;
                setOpponents(createAIOpponents(numOpponents));
                setSessionId(null);
                setIsRealMatch(false);
                setStatus('timeout');
                clearInterval(cycleInterval);
                setTimeout(() => {
                    if (isMounted) setStatus('found');
                }, 2000);
            }
        };

        startMatchmaking();

        return () => {
            isMounted = false;
            if (cycleInterval) clearInterval(cycleInterval);
            if (countdownTimer) clearTimeout(countdownTimer);
            if (queueEntryId) {
                leaveQueue(languageCode, queueEntryId).catch(err =>
                    console.error('Error leaving queue:', err)
                );
            }
        };
    }, [user.uid, languageCode, gameMode, betAmount]);

    // Countdown logic
    useEffect(() => {
        let countdownTimer;

        if (status === 'found' && countdown > 0) {
            countdownTimer = setTimeout(() => setCountdown(c => c - 1), 1000);
        } else if (status === 'found' && countdown === 0) {
            // Pass opponents and session info to parent
            // Use ref to get the most current value, avoiding async state issues
            onGameStart(opponents, sessionId, isRealMatch, mySessionPlayerIdRef.current);
        }

        return () => {
            if (countdownTimer) clearTimeout(countdownTimer);
        };
    }, [status, countdown, opponents, sessionId, isRealMatch, onGameStart]);

    const Pattern = () => (
        <svg className="moroccan-pattern" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M50 0 L61 39 L100 25 L75 50 L100 75 L61 61 L50 100 L39 61 L0 75 L25 50 L0 25 L39 39 Z" fill="currentColor" fillOpacity="0.1" />
        </svg>
    );

    const AvatarPlaceholder = () => (
        <svg viewBox="0 0 24 24" style={{ width: '100%', height: '100%', background: '#ffccbc' }}>
            <circle cx="12" cy="8" r="5" fill="#d84315" opacity="0.5" />
            <path d="M12 14c-3 0-6 1.5-6 4.5V20h12v-1.5c0-3-3-4.5-6-4.5z" fill="#d84315" opacity="0.5" />
        </svg>
    );

    return (
        <div className="matchmaking-container premium-vs">
            <div className="pattern-container tl"><Pattern /></div>
            <div className="pattern-container tr"><Pattern /></div>
            <div className="pattern-container bl"><Pattern /></div>
            <div className="pattern-container br"><Pattern /></div>

            {/* Header Info */}
            <div className="match-header">
                <div className="match-mode">{getTitle()}</div>
                <div className="match-prize">
                    <img src="https://i.postimg.cc/c4CgLtf9/20260104-1917-Luxurious-Game-Coin-simple-compose-01ke53ksahfk4t9rhx1d5ca8sj.png" alt="coin" />
                    <span>{(betAmount * (gameMode === '2player' ? 2 : gameMode === '3player' ? 3 : 4)).toLocaleString()}</span>
                </div>
            </div>

            {/* VS SECTION: Dynamic Layout based on Players */}
            <div className={`vs-section layout-${gameMode}`}>

                {/* VS LOGO (Center) */}
                <div className="vs-center-logo">
                    <div className="vs-text">VS</div>
                </div>

                {/* PLAYER SLOTS */}
                {(() => {
                    // Define positions based on mode
                    let positions = [];
                    if (gameMode === '3player') {
                        positions = [
                            { type: 'user', pos: 'bottom' },
                            { type: 'opponent', index: 0, pos: 'left' },
                            { type: 'opponent', index: 1, pos: 'right' }
                        ];
                    } else if (gameMode === '4player' || gameMode === 'tournament') {
                        positions = [
                            { type: 'user', pos: 'bottom' },
                            { type: 'opponent', index: 0, pos: 'top' },
                            { type: 'opponent', index: 1, pos: 'left' },
                            { type: 'opponent', index: 2, pos: 'right' }
                        ];
                    } else {
                        // Default 2player
                        positions = [
                            { type: 'user', pos: 'left' },
                            { type: 'opponent', index: 0, pos: 'right' }
                        ];
                    }

                    return positions.map((slot, i) => {
                        let playerDisplay = null;
                        let isSearching = status === 'searching';

                        if (slot.type === 'user') {
                            playerDisplay = {
                                name: user?.displayName || 'YOU',
                                level: user?.level || 1,
                                avatar: user?.photoURL || null,
                                isUser: true
                            };
                        } else {
                            // Opponent Logic
                            if (isSearching) {
                                // While searching, show cycling
                                playerDisplay = {
                                    name: t.searching,
                                    level: '???',
                                    avatar: mockAvatars[(cyclingAvatar + slot.index) % mockAvatars.length],
                                    isSearching: true
                                };
                            } else {
                                // Found or timeout
                                const opp = opponents[slot.index];
                                playerDisplay = {
                                    name: opp?.displayName || 'Player',
                                    level: opp?.level || 1,
                                    avatar: opp?.photoURL || null
                                };
                            }
                        }

                        return (
                            <div key={i} className={`vs-player-slot pos-${slot.pos}`}>
                                <div className="avatar-circle-outer">
                                    <div className={`avatar-circle-inner ${playerDisplay.isSearching ? 'cycling' : ''} ${playerDisplay.isUser ? 'pulse-glow' : ''}`}>
                                        {playerDisplay.avatar ? (
                                            <img src={playerDisplay.avatar} alt="Avatar" />
                                        ) : (
                                            <AvatarPlaceholder />
                                        )}
                                    </div>
                                </div>
                                <div className="player-info-card">
                                    <div className="vs-name">{playerDisplay.name}</div>
                                    <div className="vs-level">{playerDisplay.level === '???' ? '' : `${t.level} `}{playerDisplay.level}</div>
                                </div>
                            </div>
                        );
                    });
                })()}

            </div>

            {/* Match Status Caption */}
            <div className="match-status-footer">
                {status === 'searching' ? (
                    <div className="status-badge searching">
                        <div className="loading-dots">
                            <span></span><span></span><span></span>
                        </div>
                        {t.searching}
                    </div>
                ) : status === 'timeout' ? (
                    <div className="status-badge timeout">
                        <div>{t.noPlayers}</div>
                        <div className="ai-fallback">{t.playingAI}</div>
                    </div>
                ) : (
                    <div className="status-badge found">
                        {t.found} <span>{countdown}s</span>
                    </div>
                )}
            </div>

            {/* Background Light Beam */}
            <div className="vs-light-beam"></div>
        </div>
    );
};

export default MatchmakingScreen;
