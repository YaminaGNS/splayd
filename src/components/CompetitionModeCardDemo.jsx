import React from 'react';
import CompetitionModeCard from './CompetitionModeCard';
import './CompetitionModeCard.css';

/**
 * Demo component showing all 5 competition mode cards
 * This can be used to preview the cards or integrated into your game screens
 */
const CompetitionModeCardDemo = () => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '40px',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <h1 style={{ color: '#FFD700', marginBottom: '20px', fontFamily: 'Fredoka, sans-serif' }}>
                Competition Mode Cards
            </h1>
            
            <CompetitionModeCard mode="2player" />
            <CompetitionModeCard mode="3player" />
            <CompetitionModeCard mode="4player" />
            <CompetitionModeCard mode="offline" />
            <CompetitionModeCard mode="friends" />
        </div>
    );
};

export default CompetitionModeCardDemo;
