import React, { useState } from 'react';
import './LanguageScreen.css';

const LanguageScreen = ({ onLanguageSelect }) => {
    const [loading, setLoading] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState(null);

    const languages = [
        {
            code: 'en',
            name: 'English',
            nativeName: 'English',
            flag: 'flag-en',
            server: 'English'
        },
        {
            code: 'ar',
            name: 'Arabic',
            nativeName: 'العربية',
            flag: 'flag-ar',
            server: 'Arabic'
        },
        {
            code: 'fr',
            name: 'French',
            nativeName: 'Français',
            flag: 'flag-fr',
            server: 'French'
        },
        {
            code: 'es',
            name: 'Spanish',
            nativeName: 'Español',
            flag: 'flag-es',
            server: 'Spanish'
        }
    ];

    const handleLanguageSelect = async (language) => {
        setSelectedLanguage(language.code);
        setLoading(true);

        // Store language preference
        localStorage.setItem('selectedLanguage', language.code);
        localStorage.setItem('selectedServer', language.server);

        // Simulate brief loading animation
        await new Promise(resolve => setTimeout(resolve, 500));

        // Call parent callback with language data
        onLanguageSelect({
            code: language.code,
            name: language.name,
            server: language.server
        });
    };

    // Get heading text based on current context (default to English)
    const getHeading = () => {
        return 'Select Language';
    };

    return (
        <div className="language-container">
            <div className="language-content">
                <h1 className="language-heading">{getHeading()}</h1>

                <div className="language-buttons">
                    {languages.map((language) => (
                        <button
                            key={language.code}
                            className={`language-button ${selectedLanguage === language.code ? 'selected' : ''}`}
                            onClick={() => handleLanguageSelect(language)}
                            disabled={loading}
                        >
                            <div className={`flag-icon ${language.flag}`}></div>
                            <span className="language-text">{language.nativeName}</span>
                            {loading && selectedLanguage === language.code && (
                                <div className="spinner"></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LanguageScreen;
