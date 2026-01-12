import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './LetterSelectionScreen.css'; // Reusing backdrop styles

const LetterAnnounceOverlay = ({ letter, isVisible }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="letter-selection-overlay announcement"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(15px)' }}
                >
                    <div className="announcement-content" style={{ textAlign: 'center' }}>
                        <motion.h1
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 4, rotate: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 200,
                                damping: 15,
                                duration: 0.6
                            }}
                            style={{
                                fontSize: '6rem',
                                color: '#ffd700',
                                margin: 0,
                                textShadow: '0 0 30px rgba(255, 215, 0, 0.6)',
                                fontWeight: 900
                            }}
                        >
                            {letter}
                        </motion.h1>

                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            style={{
                                marginTop: '120px',
                                fontSize: '2.5rem',
                                color: 'white',
                                fontWeight: 'bold',
                                fontFamily: 'Cinzel, serif',
                                letterSpacing: '3px'
                            }}
                        >
                            LETTER CHOSEN!
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LetterAnnounceOverlay;
