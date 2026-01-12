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
        // Background
        '/src/assets/background.png',

        // Game mode cards
        '/src/assets/game-icons/2player-card.png',
        '/src/assets/game-icons/3player-card.png',
        '/src/assets/game-icons/4player-card.png',

        // Winner assets
        '/src/assets/game-icons/winner_crown.png',
        '/src/assets/game-icons/winner_coins.png',

        // UI elements
        '/src/assets/game-icons/gold_coin.png',
        '/src/assets/game-icons/store_icon_new.png',
    ];
};
