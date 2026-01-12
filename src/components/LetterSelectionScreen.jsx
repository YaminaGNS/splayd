import React from 'react';
import './LetterSelectionScreen.css';
import { motion } from 'framer-motion';

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const LetterSelectionScreen = ({ onSelect }) => {
    return (
        <motion.div
            className="letter-selection-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <h2 className="selection-title">Choose a Letter</h2>

            <div className="letter-grid">
                {LETTERS.map((letter) => (
                    <motion.button
                        key={letter}
                        className="letter-btn"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSelect(letter)}
                    >
                        {letter}
                    </motion.button>
                ))}
                {/* Visual padding for 5x6 grid (26 letters + 4 empty) */}
                {[...Array(4)].map((_, i) => (
                    <div key={`empty-${i}`} className="letter-btn empty" />
                ))}
            </div>
        </motion.div>
    );
};

export default LetterSelectionScreen;
