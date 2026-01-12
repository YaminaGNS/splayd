import React, { useState, useEffect } from 'react';
import './MatchmakingScreen.css';

const MatchmakingScreen = ({ user, languageCode, gameMode, betAmount, onGameStart }) => {
    const [status, setStatus] = useState('searching'); // searching, found, countdown
    const [countdown, setCountdown] = useState(3);
    const [opponents, setOpponents] = useState([]);
    const [cyclingAvatar, setCyclingAvatar] = useState(0);

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
            bet: "Prize Pool:",
            searching: "SEARCHING...",
            found: "MATCH FOUND!",
            level: "LVL",
            vs: "VS"
        },
        ar: {
            title2: "مباراة لاعبين",
            title3: "مباراة 3 لاعبين",
            title4: "مباراة 4 لاعبين",
            bet: "مجموع الجوائز:",
            searching: "جاري البحث...",
            found: "تم العثور!",
            level: "مستوى",
            vs: "ضد"
        },
        fr: {
            title2: "Match 2 Joueurs",
            title3: "Match 3 Joueurs",
            title4: "Match 4 Joueurs",
            bet: "Prix total:",
            searching: "RECHERCHE...",
            found: "PARTIE TROUVÉE!",
            level: "NIVEAU",
            vs: "VS"
        }
    };

    const t = translations[languageCode] || translations.en;

    const getTitle = () => {
        if (gameMode === '3player') return t.title3;
        if (gameMode === '4player') return t.title4;
        return t.title2;
    };

    // Simulate Matchmaking logic
    useEffect(() => {
        let searchTimer;
        let cycleInterval;
        let countdownTimer;

        if (status === 'searching') {
            // Animation for opponent search (cycling avatars)
            cycleInterval = setInterval(() => {
                setCyclingAvatar(prev => (prev + 1) % mockAvatars.length);
            }, 100); // Fast cycle like 8 ball pool

            // Find match after 3-5 seconds
            const delay = 3000 + Math.random() * 2000;
            searchTimer = setTimeout(() => {
                const numOpponents = gameMode === '2player' ? 1 : gameMode === '3player' ? 2 : 3;

                const mockOpponents = Array.from({ length: numOpponents }).map((_, i) => ({
                    id: `opp-${i}`,
                    displayName: `Player_${Math.floor(Math.random() * 9999)}`, // Changed from 'name' to 'displayName'
                    level: Math.floor(Math.random() * 10) + 1,
                    photoURL: mockAvatars[Math.floor(Math.random() * mockAvatars.length)] // Changed from 'avatar' to 'photoURL'
                }));

                setOpponents(mockOpponents);
                setStatus('found');
                clearInterval(cycleInterval);
            }, delay);
        } else if (status === 'found') {
            if (countdown > 0) {
                countdownTimer = setTimeout(() => setCountdown(c => c - 1), 1000);
            } else {
                // Pass opponents data to parent
                onGameStart(opponents);
            }
        }

        return () => {
            clearTimeout(searchTimer);
            clearInterval(cycleInterval);
            clearTimeout(countdownTimer);
        };
    }, [status, countdown, gameMode, onGameStart]);

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

            {/* VS SECTION */}
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
                    } else if (gameMode === '4player') {
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
                                avatar: user?.photoURL || null, // Use null if no photo
                                isUser: true
                            };
                        } else {
                            // Opponent Logic
                            if (isSearching) {
                                // While searching, show cycling or question mark
                                playerDisplay = {
                                    name: t.searching,
                                    level: '???',
                                    avatar: mockAvatars[(cyclingAvatar + slot.index) % mockAvatars.length], // Offset cycle
                                    isSearching: true
                                };
                            } else {
                                // Found
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
