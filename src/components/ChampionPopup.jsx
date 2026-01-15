import React from 'react';
import './ChampionPopup.css';
import crownGold from '../assets/game-icons/crown-gold.png';
import prizeCoins from '../assets/game-icons/prize-coins.png';

const ChampionPopup = ({ winner, prizeAmount, languageCode, onClose }) => {
    const translations = {
        en: {
            champion: "CHAMPION!",
            congratulations: "Congratulations!",
            youWon: "You Won",
            continue: "Continue"
        },
        ar: {
            champion: "البطل!",
            congratulations: "تهانينا!",
            youWon: "لقد فزت",
            continue: "متابعة"
        },
        fr: {
            champion: "CHAMPION!",
            congratulations: "Félicitations!",
            youWon: "Vous avez gagné",
            continue: "Continuer"
        },
        es: {
            champion: "¡CAMPEÓN!",
            congratulations: "¡Felicitaciones!",
            youWon: "Ganaste",
            continue: "Continuar"
        }
    };

    const t = translations[languageCode] || translations.en;

    return (
        <div className="champion-popup-overlay">
            <div className="champion-popup">
                {/* Crown */}
                <img src={crownGold} alt="Crown" className="champion-crown" />

                {/* Champion Title */}
                <h1 className="champion-title">{t.champion}</h1>

                {/* Player Avatar */}
                <div className="champion-avatar">
                    {winner?.photoURL ? (
                        <img src={winner.photoURL} alt={winner.displayName} />
                    ) : (
                        <div className="avatar-initial">{winner?.displayName?.[0] || 'C'}</div>
                    )}
                </div>

                {/* Player Name */}
                <h2 className="champion-name">{winner?.displayName || 'Champion'}</h2>

                {/* Congratulations */}
                <p className="champion-congrats">{t.congratulations}</p>

                {/* Prize Display */}
                <div className="champion-prize">
                    <img src={prizeCoins} alt="Prize" className="champion-prize-coins" />
                    <div className="champion-prize-info">
                        <div className="champion-prize-label">{t.youWon}</div>
                        <div className="champion-prize-amount">{prizeAmount.toLocaleString()}</div>
                    </div>
                </div>

                {/* Continue Button */}
                <button className="champion-continue-btn" onClick={onClose}>
                    {t.continue}
                </button>

                {/* Celebration Effects */}
                <div className="confetti-container">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                backgroundColor: ['#FFD700', '#FFA500', '#FF6347', '#00FF00', '#00BFFF'][Math.floor(Math.random() * 5)]
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ChampionPopup;
