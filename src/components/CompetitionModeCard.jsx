import React from 'react';
import './CompetitionModeCard.css';

// Import Custom Card Assets
import card2Player from '../assets/game-icons/2player-luxury.png';
import cardTournament from '../assets/game-icons/tournament-luxury.png';
import cardOffline from '../assets/game-icons/offline-luxury.png';
import cardFriends from '../assets/game-icons/friends-luxury.png';

const CompetitionModeCard = ({ mode, className = '' }) => {
    const getCardImage = () => {
        switch (mode) {
            case '2player': return card2Player;
            case 'tournament': return cardTournament;
            case 'offline': return cardOffline;
            case 'friends': return cardFriends;
            default: return null;
        }
    };

    const cardImg = getCardImage();

    if (!cardImg) return null;

    return (
        <div className={`competition-mode-card luxury ${mode} ${className}`}>
            <img src={cardImg} alt={`${mode} mode`} className="luxury-card-img" />

            {/* Optional: Add a subtle overlay or shine effect here if needed to "impress" */}
            <div className="card-shine"></div>
        </div>
    );
};

export default CompetitionModeCard;
