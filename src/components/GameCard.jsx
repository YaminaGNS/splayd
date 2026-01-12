import React from 'react';
import './GameCard.css';
import cardTemplate from '../assets/card-template.jpg';
import { CATEGORY_ICONS } from '../constants/gameConstants';

const GameCard = ({
    category,
    answer,
    isLarge = false,
    isActive = false,
    isInput = false,
    onClick,
    className = ''
}) => {

    const displayCategory = category || 'NAME';
    const displayAnswer = answer || '';

    return (
        <div
            className={`game-card-unified ${isLarge ? 'is-large' : 'is-small'} ${isActive ? 'is-active' : ''} ${className}`}
            style={{ backgroundImage: `url(${cardTemplate})` }}
            onClick={onClick}
        >
            <div className="card-inner-relative">
                {/* Category Icon */}
                <div className="unified-card-icon-wrapper">
                    <img
                        src={CATEGORY_ICONS[displayCategory]}
                        alt={displayCategory}
                        className="unified-card-category-icon-img"
                    />
                </div>

                {/* Category Name */}
                <div className="card-category-label-text">
                    {displayCategory.toLowerCase()}
                </div>

                {/* Answer / Input Area */}
                {(displayAnswer || isInput) && (
                    <div className="card-answer-display-wrapper">
                        <span className="card-answer-content-text">
                            {displayAnswer.toLowerCase()}
                        </span>
                        {isInput && <span className="cursor-blink-pipe">|</span>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameCard;
