import React, { useEffect, useState } from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ language = 'en' }) => {
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length < 3 ? prev + '.' : '');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const translations = {
        en: {
            text: <>Fun for Everyone<br />Anytime & Anywhere!</>
        },
        fr: {
            text: <>Du plaisir pour tout le monde<br />n'importe quand et n'importe où !</>
        },
        es: {
            text: <>¡Diversión para todos<br />en cualquier momento y en cualquier lugar!</>
        },
        ar: {
            text: <>متعة للجميع<br />في أي وقت وفي أي مكان!</>
        }
    };

    const currentText = translations[language]?.text || translations['en'].text;

    return (
        <div className="loading-screen-container">
            <div className="loading-content">
                <div className="loading-spinner-large"></div>
                <h2 className="loading-text" style={language === 'ar' ? { fontFamily: "'Cairo', sans-serif" } : {}}>
                    {currentText}{dots}
                </h2>
            </div>
        </div>
    );
};

export default LoadingScreen;
