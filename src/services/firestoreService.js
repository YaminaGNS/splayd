import { db } from '../firebase';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';

/**
 * Gets the collection name based on the language.
 * @param {string} languageCode - 'en', 'ar', 'fr', 'es'
 * @param {string} baseName - 'players', 'game_sessions', etc.
 * @returns {string} - e.g., 'players_en'
 */
export const getLanguageCollection = (languageCode, baseName) => {
    return `${baseName}_${languageCode}`;
};

/**
 * Creates or updates a player profile in the language-specific collection.
 * @param {string} uid - Firebase Auth UID
 * @param {Object} userData - User info (name, photo, etc.)
 * @param {string} languageCode - Selected language
 */
export const savePlayerProfile = async (uid, userData, languageCode) => {
    const collectionName = getLanguageCollection(languageCode, 'players');
    const playerRef = doc(db, collectionName, uid);

    const profile = {
        uid,
        displayName: userData.displayName || 'Guest Player',
        photoURL: userData.photoURL || null,
        language: languageCode,
        level: 1,
        coins: 1000,
        wins: 0,
        losses: 0,
        crowns: 0,
        lastActive: serverTimestamp(),
        createdAt: serverTimestamp()
    };

    // Check if player already exists to avoid overwriting level/coins
    const docSnap = await getDoc(playerRef);
    if (docSnap.exists()) {
        await updateDoc(playerRef, {
            displayName: profile.displayName,
            photoURL: profile.photoURL,
            lastActive: serverTimestamp()
        });
    } else {
        await setDoc(playerRef, profile);
    }
};

/**
 * Fetches a player profile from the language-specific collection.
 * @param {string} uid - Firebase Auth UID
 * @param {string} languageCode - Selected language
 * @returns {Promise<Object|null>} - Player profile or null if not found
 */
export const getPlayerProfile = async (uid, languageCode) => {
    const collectionName = getLanguageCollection(languageCode, 'players');
    const playerRef = doc(db, collectionName, uid);
    const docSnap = await getDoc(playerRef);

    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        return null;
    }
};
