import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './GameLoadingScreen.css';

// Import NEW card assets (uploaded by user - v3 pure)
import card1 from '../assets/game-icons/card-v3-1.png';
import card2 from '../assets/game-icons/card-v3-2.png';
import card3 from '../assets/game-icons/card-v3-3.png';
import card4 from '../assets/game-icons/card-v3-4.png';
import card5 from '../assets/game-icons/card-v3-5.png';

const cards = [
    { id: 1, src: card1 },
    { id: 2, src: card2 },
    { id: 3, src: card3 },
    { id: 4, src: card4 },
    { id: 5, src: card5 },
];

const GameLoadingScreen = ({ onLoadingComplete }) => {
    const [loadingText, setLoadingText] = useState('LOADING SESSION');

    useEffect(() => {
        console.log("GameLoadingScreen MOUNTED");
        const textInterval = setInterval(() => {
            setLoadingText(prev => {
                if (prev.endsWith('...')) return 'LOADING SESSION';
                return prev + '.';
            });
        }, 500);

        const timer = setTimeout(() => {
            if (onLoadingComplete) {
                onLoadingComplete();
            }
        }, 4000); // Slightly longer for the animation to be appreciated

        return () => {
            clearInterval(textInterval);
            clearTimeout(timer);
        };
    }, [onLoadingComplete]);

    // Calculate rotation and position for a "fanned hand" look
    const cardRun = (index, total) => {
        const mid = (total - 1) / 2;
        const diff = index - mid;
        return {
            rotate: diff * 15, // 15 degrees spread per card
            x: diff * 40,      // Horizontal spread
            y: Math.abs(diff) * 15 // Arch effect (middle highest)
        };
    };

    return (
        <div className="game-loading-container" style={{ background: 'radial-gradient(circle at center, #8B0000 0%, #3a0000 100%)', zIndex: 99999 }}>
            <div className="game-loading-content">
                <div className="cards-hand-stage">
                    {cards.map((card, index) => {
                        const pose = cardRun(index, cards.length);
                        return (
                            <motion.div
                                key={card.id}
                                className="hand-card"
                                initial={{
                                    opacity: 0,
                                    scale: 0.5,
                                    x: 0,      // Start from center
                                    y: 1000,   // Start from bottom (deck)
                                    rotate: 0
                                }}
                                animate={{
                                    opacity: 1,
                                    scale: 1,
                                    y: pose.y,
                                    rotate: pose.rotate,
                                    x: pose.x,
                                    zIndex: index
                                }}
                                transition={{
                                    type: "spring",
                                    damping: 15,
                                    stiffness: 100,
                                    delay: index * 0.15, // Staggered dealing
                                    duration: 0.8,
                                    // Floating animation after dealing
                                    y: {
                                        delay: 1.0 + (index * 0.1),
                                        duration: 2.5,
                                        ease: "easeInOut",
                                        repeat: Infinity,
                                        repeatType: "reverse",
                                        // Subtle float
                                        from: pose.y,
                                        to: pose.y - 15
                                    }
                                }}
                            >
                                <img src={card.src} alt={`Card ${index}`} className="card-image-v2" />
                            </motion.div>
                        );
                    })}
                </div>

                <div className="loading-indicator">
                    <div className="loading-spinner"></div>
                    <h2 className="loading-session-text">{loadingText}</h2>
                </div>
            </div>
        </div>
    );
};

export default GameLoadingScreen;
