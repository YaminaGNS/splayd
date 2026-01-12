import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './BettingScreen.css';

const BettingScreen = ({ user, languageCode, gameMode, initialBalance, onConfirm, onBack }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    const userBalance = initialBalance !== undefined ? initialBalance : 2500;

    const translations = {
        en: {
            title2: "2 Player Match",
            title3: "3 Player Match",
            title4: "4 Player Match",
            subtitle: "Swipe to Select Bet",
            balance: "Balance",
            confirm: "CONFIRM BET",
            ranks: ["NOVICE", "STAGIAIRE", "PRO", "ELITE", "LEGEND"],
            win: "WIN UP TO"
        },
        ar: {
            title2: "مباراة لاعبين",
            title3: "مباراة 3 لاعبين",
            title4: "مباراة 4 لاعبين",
            subtitle: "اسحب لاختيار الرهان",
            balance: "الرصيد",
            confirm: "تأكيد الرهان",
            ranks: ["مبتدئ", "متدرب", "محترف", "نخبة", "أسطورة"],
            win: "اربح حتى"
        },
        fr: {
            title2: "Match 2 Joueurs",
            title3: "Match 3 Joueurs",
            title4: "Match 4 Joueurs",
            subtitle: "Glissez pour miser",
            balance: "Solde",
            confirm: "CONFIRMER",
            ranks: ["NOVICE", "STAGIAIRE", "PRO", "ELITE", "LÉGENDE"],
            win: "GAGNER JUSQU'À"
        }
    };

    const t = translations[languageCode] || translations.en;

    const betOptions = [
        { value: 500, label: "500", rank: t.ranks[0], img: "https://i.postimg.cc/2ytr96cX/20260104_0047_Luxury_Coin_Bet_Box_simple_compose_01ke343nv6fvxvpc832qjmr58c.png", color: "#cd7f32" },
        { value: 1000, label: "1,000", rank: t.ranks[1], img: "https://i.postimg.cc/T1sfNw77/20260104_0048_Luxurious_Coin_Box_simple_compose_01ke345kc4e58s4c084cbxaneq.png", color: "#c0c0c0" },
        { value: 2500, label: "2,500", rank: t.ranks[2], img: "https://i.postimg.cc/4yyX1t5j/20260104_0050_Luxurious_Coin_Box_simple_compose_01ke349h8wejmt7yhjhnhkqwxp.png", color: "#ffd700" },
        { value: 5000, label: "5,000", rank: t.ranks[3], img: "https://i.postimg.cc/T1sfNw79/20260104_0052_Golden_Bet_Box_simple_compose_01ke34da7kfpc93vryb9f7xvg8.png", color: "#e5e4e2" },
        { value: 10000, label: "10,000", rank: t.ranks[4], img: "https://i.postimg.cc/x889PHRL/20260104_0054_Luxury_Coin_Box_simple_compose_01ke34g3d2f2ytr5vmdrhh88gj.png", color: "#ff00ff" }
    ];

    const handleNext = () => {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % betOptions.length);
    };

    const handlePrev = () => {
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + betOptions.length) % betOptions.length);
    };

    const currentBet = betOptions[currentIndex];
    const canAfford = userBalance >= currentBet.value;

    const variants = {
        enter: (direction) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            scale: 0.8,
            rotateY: direction > 0 ? 45 : -45
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
            rotateY: 0,
            transition: { duration: 0.4, type: "spring", stiffness: 300, damping: 30 }
        },
        exit: (direction) => ({
            x: direction < 0 ? 300 : -300,
            opacity: 0,
            scale: 0.8,
            rotateY: direction < 0 ? 45 : -45,
            transition: { duration: 0.3 }
        })
    };

    return (
        <div className="betting-container">
            {/* Header */}
            <div className="betting-top-nav">
                <button className="back-btn-luxury" onClick={onBack}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div className="mode-badge">{gameMode.replace('player', ' PLAYER')}</div>
                <div className="balance-badge">
                    <img src="https://i.postimg.cc/c4CgLtf9/20260104-1917-Luxurious-Game-Coin-simple-compose-01ke53ksahfk4t9rhx1d5ca8sj.png" alt="coin" />
                    <span>{userBalance.toLocaleString()}</span>
                </div>
            </div>

            {/* Slider Content */}
            <div className="betting-slider-wrapper">
                <div className="slider-arrows">
                    <button className="arrow-btn left" onClick={handlePrev}>
                        <svg viewBox="0 0 24 24" fill="white"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
                    </button>
                    <button className="arrow-btn right" onClick={handleNext}>
                        <svg viewBox="0 0 24 24" fill="white"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
                    </button>
                </div>

                <div className="card-scene">
                    <AnimatePresence initial={false} custom={direction}>
                        <motion.div
                            key={currentIndex}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="betting-card-luxury"
                        >
                            <div className="card-inner">
                                <div className="card-rank">{currentBet.rank}</div>
                                <div className="card-subtitle">
                                    {t.win} {parseInt(currentBet.value * (gameMode === '3player' ? 2.7 : gameMode === '4player' ? 3.6 : 1.8)).toLocaleString()}
                                </div>
                                <div className="card-image-glow">
                                    <motion.img
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        src={currentBet.img}
                                        alt={currentBet.rank}
                                    />
                                </div>
                                {!canAfford && <div className="insufficient-funds">Insufficient Coins</div>}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Pagination Dots */}
            <div className="slider-dots">
                {betOptions.map((_, i) => (
                    <div key={i} className={`dot ${i === currentIndex ? 'active' : ''}`} />
                ))}
            </div>

            {/* Bottom Section */}
            <div className="bet-action-footer">
                <button
                    className={`confirm-bet-btn ${!canAfford ? 'disabled' : ''}`}
                    disabled={!canAfford}
                    onClick={() => onConfirm(currentBet.value)}
                >
                    <div className="btn-shine"></div>
                    <span className="btn-text">{t.confirm}</span>
                    <div className="btn-price-tag">
                        <img src="https://i.postimg.cc/c4CgLtf9/20260104-1917-Luxurious-Game-Coin-simple-compose-01ke53ksahfk4t9rhx1d5ca8sj.png" alt="coin" />
                        <span>{currentBet.label}</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default BettingScreen;
