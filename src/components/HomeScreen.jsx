import React, { useState, useEffect } from 'react';
import { getPlayerProfile } from '../services/firestoreService';
import './HomeScreen.css';

// Import React Icons
import { FaUserFriends, FaUsers, FaGift, FaStore, FaTrophy, FaDice, FaCoins } from 'react-icons/fa';
import { RiTeamFill, RiWifiOffLine } from 'react-icons/ri';
import { GiRollingDices, GiWorld } from 'react-icons/gi';

// Import Specific Assets for Currency
import premiumCoinPng from '../assets/game-icons/premium_coin_new.png';
import goldCoinPng from '../assets/game-icons/gold_coin.png';
import storeIconPng from '../assets/game-icons/store_icon_new.png';
import dailyRewardPng from '../assets/game-icons/daily_reward.png';
import luckyWheelPng from '../assets/game-icons/lucky_wheel_v2.png';
import leaderboardPng from '../assets/game-icons/leaderboard_v2.png';

const HomeScreen = ({ user, selectedLanguage, onNavigate }) => {
    const [playerData, setPlayerData] = useState(null);
    const [loading, setLoading] = useState(true);

    const translations = {
        en: {
            level: "Level",
            coins: "Coins",
            premium: "Premium",
            twoPlayer: "2 Player",
            threePlayer: "3 Player",
            fourPlayer: "4 Players",
            offline: "Offline",
            friends: "Play with Friends",
            dailyReward: ["DAILY", "REWARD"],
            store: ["VISIT", "STORE"],
            luckyWheel: ["LUCKY", "WHEEL"],
            leaderboard: ["VIEW", "RANKINGS"]
        },
        ar: {
            level: "المستوى",
            coins: "العملات",
            premium: "مميز",
            twoPlayer: "لاعبان",
            threePlayer: "3 لاعبين",
            fourPlayer: "4 لاعبين",
            offline: "بدون انترنت",
            friends: "اللعب مع الأصدقاء",
            dailyReward: ["المكأفاة", "اليومية"],
            store: ["زيارة", "المتجر"],
            luckyWheel: ["عجلة", "الحظ"],
            leaderboard: ["عرض", "المتصدرين"]
        },
        fr: {
            level: "Niveau",
            coins: "Pièces",
            premium: "Premium",
            twoPlayer: "2 Joueurs",
            threePlayer: "3 Joueurs",
            fourPlayer: "4 Joueurs",
            offline: "Hors ligne",
            friends: "Jouer avec des amis",
            dailyReward: ["RÉCOMPENSE", "QUOTIDIENNE"],
            store: ["VISITER", "BOUTIQUE"],
            luckyWheel: ["ROUE DE", "LA CHANCE"],
            leaderboard: ["VOIR", "CLASSEMENT"]
        },
        es: {
            level: "Nivel",
            coins: "Monedas",
            premium: "Premium",
            twoPlayer: "2 Jugadores",
            threePlayer: "3 Jugadores",
            fourPlayer: "4 Jugadores",
            offline: "Sin conexión",
            friends: "Jugar con amigos",
            dailyReward: ["RECOMPENSA", "DIARIA"],
            store: ["VISITAR", "TIENDA"],
            luckyWheel: ["RUEDA DE", "LA FORTUNA"],
            leaderboard: ["VER", "CLASIFICACIÓN"]
        }
    };

    const t = translations[selectedLanguage] || translations.en;

    useEffect(() => {
        const fetchProfile = async () => {
            if (user && user.uid) {
                try {
                    const profile = await getPlayerProfile(user.uid, selectedLanguage);
                    if (profile) {
                        setPlayerData(profile);
                    }
                } catch (error) {
                    console.error("Error fetching profile:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user, selectedLanguage]);

    const handleButtonClick = (mode) => {
        // Add navigation logic here
        console.log(`Navigating to ${mode}`);
        if (onNavigate) onNavigate(mode, playerData?.coins);
    };

    return (
        <div className={`home-container premium lang-${selectedLanguage}`}>
            <header className="home-header">
                {/* User Profile Summary */}
                <div className="profile-section">
                    <div className="avatar-circle moroccan-avatar">
                        <div className="avatar-pattern"></div>
                        <span className="avatar-initial">{user?.displayName ? user.displayName[0] : 'G'}</span>
                    </div>
                    <div className="user-details">
                        <h2 className="username">{user?.displayName || 'Guest Player'}</h2>
                        <div className="level-badge">
                            <span className="level-text">{t.level} {playerData?.level || 1}</span>
                        </div>
                    </div>
                </div>

                {/* Currency Display - Right Side with Divider */}
                <div className="header-right">
                    <div className="currency-pill">
                        <div className="currency-item">
                            <div className="currency-icon-wrapper gold-coin">
                                <img src={goldCoinPng} alt="Gold Coin" className="gold-coin-img" />
                            </div>
                            <span className="currency-value">{(playerData?.coins || 1000).toLocaleString()}</span>
                        </div>
                        <div className="currency-divider-line"></div>
                        <div className="currency-item premium-coin-item">
                            <div className="currency-icon-wrapper premium-coin">
                                <img src={premiumCoinPng} alt="Premium Coin" className="premium-coin-img" />
                            </div>
                            <span className="currency-value premium-value">{(playerData?.premiumCoins || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Layout: Side Buttons + Center Game Modes */}
            <main className="home-main">
                <div className="main-layout-container">
                    {/* Left Side Buttons */}
                    <div className="side-column left">
                        <button className="side-button premium" onClick={() => handleButtonClick('dailyReward')}>
                            <div className="nav-icon-wrapper daily-reward">
                                <img src={dailyRewardPng} alt="Daily Reward" className="side-icon-img" />
                            </div>
                            <div className="side-label">
                                <span className="label-line-1">{t.dailyReward[0]}</span>
                                <span className="label-line-2">{t.dailyReward[1]}</span>
                            </div>
                        </button>
                        <button className="side-button premium" onClick={() => handleButtonClick('store')}>
                            <div className="nav-icon-wrapper store">
                                <img src={storeIconPng} alt="Store" className="side-icon-img" />
                            </div>
                            <div className="side-label">
                                <span className="label-line-1">{t.store[0]}</span>
                                <span className="label-line-2">{t.store[1]}</span>
                            </div>
                        </button>
                    </div>

                    {/* Center: Vertical Game Mode Buttons */}
                    <div className="game-modes-vertical-container">
                        <div className="game-modes-vertical">
                            <button className="mode-button" onClick={() => handleButtonClick('2player')}>
                                <span className="mode-button-text">{t.twoPlayer}</span>
                            </button>
                            <button className="mode-button" onClick={() => handleButtonClick('3player')}>
                                <span className="mode-button-text">{t.threePlayer}</span>
                            </button>
                            <button className="mode-button" onClick={() => handleButtonClick('4player')}>
                                <span className="mode-button-text">{t.fourPlayer}</span>
                            </button>
                            <button className="mode-button" onClick={() => handleButtonClick('offline')}>
                                <span className="mode-button-text">{t.offline}</span>
                            </button>
                            <button className="mode-button" onClick={() => handleButtonClick('friends')}>
                                <span className="mode-button-text">{t.friends}</span>
                            </button>
                        </div>
                    </div>

                    {/* Right Side Buttons */}
                    <div className="side-column right">
                        <button className="side-button premium" onClick={() => handleButtonClick('luckyWheel')}>
                            <div className="nav-icon-wrapper wheel">
                                <img src={luckyWheelPng} alt="Lucky Wheel" className="side-icon-img spinning-wheel" />
                            </div>
                            <div className="side-label">
                                <span className="label-line-1">{t.luckyWheel[0]}</span>
                                <span className="label-line-2">{t.luckyWheel[1]}</span>
                            </div>
                        </button>
                        <button className="side-button premium" onClick={() => handleButtonClick('leaderboard')}>
                            <div className="nav-icon-wrapper leaderboard">
                                <img src={leaderboardPng} alt="Leaderboard" className="side-icon-img" />
                            </div>
                            <div className="side-label">
                                <span className="label-line-1">{t.leaderboard[0]}</span>
                                <span className="label-line-2">{t.leaderboard[1]}</span>
                            </div>
                        </button>
                    </div>
                </div>
            </main>

            <footer className="home-footer"></footer>
        </div>
    );
};

export default HomeScreen;
