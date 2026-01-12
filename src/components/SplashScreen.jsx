import React, { useEffect, useState } from 'react';
import './SplashScreen.css';
import cardRed from '../assets/card-red.png';
import cardGreen from '../assets/card-green.png';

const SplashScreen = ({ onComplete }) => {
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // Trigger fade in animation
    setFadeIn(true);

    // Auto transition to next screen
    const timer = setTimeout(() => {
      onComplete();
    }, 4000); // Extended slightly for animations

    return () => clearTimeout(timer);
  }, [onComplete]);

  const titleText = "SPLAYED";

  return (
    <div className="splash-container">
      <div className={`splash-content ${fadeIn ? 'fade-in' : ''}`}>
        <div className="cards-container">
          <div className="card-wrapper red-card">
            <img src={cardRed} alt="Red Card" />
          </div>
          <div className="card-wrapper green-card">
            <img src={cardGreen} alt="Green Card" />
          </div>
        </div>

        <h1 className="splash-title">
          {titleText.split('').map((char, index) => (
            <span key={index} style={{ animationDelay: `${index * 0.1}s` }}>
              {char}
            </span>
          ))}
        </h1>
      </div>
    </div>
  );
};

export default SplashScreen;
