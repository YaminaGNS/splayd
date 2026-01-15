import React, { useState, useEffect } from 'react';
import './CardFillingScreen.css';
import { motion, AnimatePresence } from 'framer-motion';

import GameCard from './GameCard';
import { CATEGORY_ICONS, CARD_SEQUENCE } from '../constants/gameConstants';

const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

// SVG Icons
const CloseIcon = () => (
    <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M25 25L75 75M75 25L25 75" stroke="white" strokeWidth="12" strokeLinecap="round" />
    </svg>
);

const NextIcon = () => (
    <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 25L55 50L30 75M50 25L75 50L50 75" stroke="white" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CardFillingScreen = ({ initialCategory, filledCards, answers, onSave, onNext, onClose, selectedLetter }) => {
    // Initialize state with proper checks
    const [currentCategoryIndex, setCurrentCategoryIndex] = useState(() => {
        if (!initialCategory) return 0;
        const index = CARD_SEQUENCE.indexOf(initialCategory);
        return index !== -1 ? index : 0;
    });

    const currentCategory = CARD_SEQUENCE[currentCategoryIndex];
    const [inputText, setInputText] = useState('');
    const [error, setError] = useState('');
    const [isShaking, setIsShaking] = useState(false);

    // Update input text when category changes
    useEffect(() => {
        if (answers && currentCategory) {
            setInputText(answers[currentCategory] || '');
        }
    }, [currentCategoryIndex, answers, currentCategory]);

    const handleKeyPress = (key) => {
        if (inputText.length < 15) {
            setInputText(prev => prev + key.toLowerCase());
        }
    };

    const handleBackspace = () => {
        setInputText(prev => prev.slice(0, -1));
    };

    const handleSpace = () => {
        if (inputText.length < 15) {
            setInputText(prev => prev + ' ');
        }
    };

    const handleSubmit = async () => {
        const trimmed = inputText.trim();

        if (!trimmed) {
            triggerError("Please enter an answer");
            return;
        }

        // Relaxed Validation: Allow any input!
        // Incorrect answers will be caught during the comparison phase.

        if (onSave) {
            onSave(currentCategory, trimmed);
            goToNextUnfilled();
        }
    };

    const triggerError = (msg) => {
        setError(msg);
        setIsShaking(true);
        setTimeout(() => {
            setError('');
            setIsShaking(false);
        }, 2000);
    };

    const handleNextBtn = () => {
        if (onNext) {
            onNext();
        }
        moveToNextInSequence();
    };

    const moveToNextInSequence = () => {
        const nextIndex = (currentCategoryIndex + 1) % CARD_SEQUENCE.length;
        setCurrentCategoryIndex(nextIndex);
    };

    const goToNextUnfilled = () => {
        if (!filledCards) {
            if (onClose) onClose();
            return;
        }

        const allFilled = CARD_SEQUENCE.every(cat => filledCards[cat] || cat === currentCategory);
        if (allFilled) {
            if (onClose) onClose();
            return;
        }

        let nextIndex = (currentCategoryIndex + 1) % CARD_SEQUENCE.length;
        let count = 0;
        while (filledCards[CARD_SEQUENCE[nextIndex]] && count < CARD_SEQUENCE.length) {
            nextIndex = (nextIndex + 1) % CARD_SEQUENCE.length;
            count++;
        }

        setCurrentCategoryIndex(nextIndex);
    };


    return (
        <div className="card-filling-overlay">
            {/* Blur backdrop */}
            <div className="blur-backdrop" onClick={onClose}></div>

            {/* Top Navigation Buttons */}
            <div className="filling-header">
                <button className="nav-btn-simple close-btn-simple" onClick={onClose}>
                    <CloseIcon />
                    <span className="nav-label">close</span>
                </button>

                <button className="nav-btn-simple next-btn-simple" onClick={handleNextBtn}>
                    <NextIcon />
                    <span className="nav-label">next card</span>
                </button>

                {/* Selected Letter Display */}
                {selectedLetter && (
                    <div className="filling-letter-badge">
                        <span className="letter-label">letter</span>
                        <span className="letter-val">{selectedLetter}</span>
                    </div>
                )}
            </div>

            <div className="focused-card-container">
                <GameCard
                    category={currentCategory}
                    answer={inputText}
                    isLarge={true}
                    isActive={true}
                    isInput={true}
                    className={isShaking ? 'shake-card' : ''}
                />
            </div>

            {/* Error Message Display */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        className="error-message-bubble"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Simple Custom Keyboard */}
            <div className="simple-keyboard">
                {KEYBOARD_ROWS.map((row, rowIndex) => (
                    <div key={rowIndex} className="keyboard-row">
                        {row.map(key => (
                            <button
                                key={key}
                                className="key-button"
                                onClick={() => handleKeyPress(key)}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                ))}

                {/* Bottom Row: DELETE | SPACE | SUBMIT */}
                <div className="keyboard-row keyboard-row-bottom">
                    <button className="key-button key-delete" onClick={handleBackspace}>
                        DELETE
                    </button>
                    <button className="key-button key-space" onClick={handleSpace}>
                        SPACE
                    </button>
                    <button className="key-button key-submit" onClick={handleSubmit}>
                        SUBMIT
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CardFillingScreen;