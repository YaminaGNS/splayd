import React, { useEffect } from 'react';
import './EliminationPopup.css';

const EliminationPopup = ({ languageCode, onWatch, onLeave }) => {
    const translations = {
        en: {
            eliminated: "You've been eliminated!",
            betterLuck: "Better luck next time!",
            watch: "Watch Tournament",
            leave: "Leave"
        },
        ar: {
            eliminated: "لقد تم إقصاؤك!",
            betterLuck: "حظ أفضل في المرة القادمة!",
            watch: "مشاهدة البطولة",
            leave: "خروج"
        },
        fr: {
            eliminated: "Vous avez été éliminé!",
            betterLuck: "Meilleure chance la prochaine fois!",
            watch: "Regarder le tournoi",
            leave: "Quitter"
        },
        es: {
            eliminated: "¡Has sido eliminado!",
            betterLuck: "¡Mejor suerte la próxima vez!",
            watch: "Ver torneo",
            leave: "Salir"
        }
    };

    const t = translations[languageCode] || translations.en;

    // Auto-close removed to allow choice
    // useEffect(() => {
    //     const timer = setTimeout(() => {
    //         onClose();
    //     }, 3000);
    //     return () => clearTimeout(timer);
    // }, [onClose]);

    return (
        <div className="elimination-popup-overlay">
            <div className="elimination-popup">
                <div className="sad-emoji">😢</div>
                <h1 className="elimination-title">{t.eliminated}</h1>
                <p className="elimination-subtitle">{t.betterLuck}</p>

                <div className="elimination-buttons">
                    <button className="btn-watch" onClick={onWatch}>{t.watch}</button>
                    <button className="btn-leave" onClick={onLeave}>{t.leave}</button>
                </div>
            </div>
        </div>
    );
};

export default EliminationPopup;
