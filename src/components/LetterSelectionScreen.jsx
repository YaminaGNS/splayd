import React from 'react';
import './LetterSelectionScreen.css';
import { motion } from 'framer-motion';

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const LetterSelectionScreen = ({ onSelect, isChoosing = true, chooserName = "Opponent" }) => {
    return (
        <motion.div
            className="letter-selection-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <h2 className="selection-title">
                {isChoosing ? "Choose a Letter" : `${chooserName} is Choosing...`}
            </h2>

            <div className={`letter-grid ${!isChoosing ? 'disabled-grid' : ''}`}>
                {LETTERS.map((letter) => (
                    <motion.button
                        key={letter}
                        className={`letter-btn ${!isChoosing ? 'disabled' : ''}`}
                        whileHover={isChoosing ? { scale: 1.05 } : {}}
                        whileTap={isChoosing ? { scale: 0.95 } : {}}
                        onClick={() => isChoosing && onSelect(letter)}
                        disabled={!isChoosing}
                        style={{ opacity: isChoosing ? 1 : 0.5, cursor: isChoosing ? 'pointer' : 'not-allowed' }}
                    >
                        {letter}
                    </motion.button>
                ))}
                {/* Visual padding for 5x6 grid (26 letters + 4 empty) */}
                {[...Array(4)].map((_, i) => (
                    <div key={`empty-${i}`} className="letter-btn empty" />
                ))}
            </div>

            {!isChoosing && (
                <div className="waiting-indicator" style={{ marginTop: '20px' }}>
                    <div className="loading-spinner"></div>
                </div>
            )}
        </motion.div>
    );
};

export default LetterSelectionScreen;
