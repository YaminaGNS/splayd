// Import critical images
import background from '../assets/background.png';
import twoPlayerCard from '../assets/game-icons/2player-card.png';
import threePlayerCard from '../assets/game-icons/3player-card.png';
import fourPlayerCard from '../assets/game-icons/4player-card.png';
import winnerCrown from '../assets/game-icons/winner_crown.png';
import winnerCoins from '../assets/game-icons/winner_coins.png';
import goldCoin from '../assets/game-icons/gold_coin.png';
import storeIcon from '../assets/game-icons/store_icon_new.png';

// Preload critical images to prevent lazy loading
export const preloadImages = (imageUrls) => {
    return Promise.all(
        imageUrls.map((url) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = () => reject(url);
                img.src = url;
            });
        })
    );
};

// Critical images that should load immediately
export const getCriticalImages = () => {
    return [
        background,
        twoPlayerCard,
        threePlayerCard,
        fourPlayerCard,
        winnerCrown,
        winnerCoins,
        goldCoin,
        storeIcon,
    ];
};
