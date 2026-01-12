import { useState, useEffect } from 'react'
import SplashScreen from './components/SplashScreen'
import AuthScreen from './components/AuthScreen'
import LanguageScreen from './components/LanguageScreen'
import HomeScreen from './components/HomeScreen'
import BettingScreen from './components/BettingScreen'
import MatchmakingScreen from './components/MatchmakingScreen'
import GameScreen from './components/GameScreen'
import GameScreen3P from './components/GameScreen3P'
import LoadingScreen from './components/LoadingScreen'
import GameLoadingScreen from './components/GameLoadingScreen'
import { savePlayerProfile } from './services/firestoreService'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import './App.css'

// Firebase configuration is handled in src/firebase.js via .env

function App() {
    const [currentScreen, setCurrentScreen] = useState('splash');
    const [user, setUser] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState(localStorage.getItem('selectedLanguage') || 'en');
    const [gameMode, setGameMode] = useState('2player');
    const [betAmount, setBetAmount] = useState(0);
    const [playerBalance, setPlayerBalance] = useState(2500); // Default start balance
    const [authInitialized, setAuthInitialized] = useState(false);
    const [matchedOpponents, setMatchedOpponents] = useState([]); // Store matched opponents

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                // User is signed in
                console.log("Auto-login: User found", currentUser);
                setUser(currentUser);
            } else {
                // User is signed out
                console.log("Auto-login: No user");
                setUser(null);
            }
            setAuthInitialized(true);
        });

        return () => unsubscribe();
    }, []);

    const handleSplashComplete = () => {
        if (user) {
            // User is already authenticated -> Go to Loading Screen then Home
            setCurrentScreen('loading');
            setTimeout(() => {
                setCurrentScreen('home');
            }, 2500); // Show "Enjoy the game" for 2.5 seconds
        } else {
            // No user -> Go to Auth Screen
            setCurrentScreen('auth');
        }
    };

    const handleAuthComplete = (userData) => {
        setUser(userData);
        console.log('User authenticated:', userData);

        // Transition to next screen (Language Selection - Step 3)
        setTimeout(() => {
            setCurrentScreen('language');
        }, 300);
    };

    const handleLanguageSelect = async (languageData) => {
        console.log('Language selected:', languageData);
        setSelectedLanguage(languageData.code);

        // Save to Firebase Firestore (Language-Specific Collection)
        if (user && user.uid) {
            try {
                await savePlayerProfile(user.uid, user, languageData.code);
            } catch (error) {
                console.error("Error saving player profile:", error);
            }
        }

        // Transition to next screen (Main Game Home - Step 4)
        setTimeout(() => {
            setCurrentScreen('home');
        }, 300);
    };

    return (
        <>
            {currentScreen === 'splash' && (
                <SplashScreen onComplete={handleSplashComplete} />
            )}

            {currentScreen === 'loading' && (
                <LoadingScreen language={selectedLanguage} />
            )}

            {currentScreen === 'auth' && (
                <AuthScreen onAuthComplete={handleAuthComplete} />
            )}

            {currentScreen === 'language' && (
                <LanguageScreen onLanguageSelect={handleLanguageSelect} />
            )}

            {currentScreen === 'home' && (
                <HomeScreen
                    user={user}
                    selectedLanguage={selectedLanguage}
                    onNavigate={(screen, balance) => {
                        console.log(`Navigating to ${screen} with balance ${balance}`);
                        if (screen === '2player' || screen === '3player' || screen === '4player') {
                            setGameMode(screen);
                            if (balance !== undefined) setPlayerBalance(balance);
                            setCurrentScreen('betting');
                        }
                    }}
                />
            )}

            {currentScreen === 'betting' && (
                <BettingScreen
                    user={user}
                    languageCode={selectedLanguage}
                    gameMode={gameMode}
                    initialBalance={playerBalance}
                    onBack={() => setCurrentScreen('home')}
                    onConfirm={(amount) => {
                        setBetAmount(amount);
                        setCurrentScreen('matchmaking');
                    }}
                />
            )}

            {currentScreen === 'matchmaking' && (
                <MatchmakingScreen
                    user={user}
                    languageCode={selectedLanguage}
                    gameMode={gameMode}
                    betAmount={betAmount}
                    onGameStart={(opponents) => {
                        console.log("Game Starting with opponents:", opponents);
                        // Store the matched opponents
                        setMatchedOpponents(opponents || []);
                        // Navigate to GameLoadingScreen first
                        setCurrentScreen('game-loading');
                    }}
                />
            )}

            {currentScreen === 'game-loading' && (
                <GameLoadingScreen
                    onLoadingComplete={() => {
                        console.log("Loading Complete. Starting Game...");
                        setCurrentScreen('game');
                    }}
                />
            )}

            {currentScreen === 'game' && gameMode === '2player' && (
                <GameScreen
                    user={user}
                    opponent={matchedOpponents[0]}
                    sessionId="mock-session-id"
                    languageCode={selectedLanguage}
                    betAmount={betAmount}
                    onGameEnd={(winner) => {
                        console.log("Game Ended. Winner:", winner);
                        if (winner === 'me') {
                            // Reward = 2x Bet for 2 players
                            setPlayerBalance(prev => prev + (betAmount * 2));
                        }
                        setCurrentScreen('home');
                    }}
                />
            )}

            {currentScreen === 'game' && gameMode === '3player' && (
                <GameScreen3P
                    user={user}
                    opponents={matchedOpponents}
                    languageCode={selectedLanguage}
                    betAmount={betAmount}
                    onGameEnd={(winner) => {
                        console.log("Game Ended. Winner:", winner);
                        if (winner === 'me') {
                            setPlayerBalance(prev => prev + (betAmount * 3));
                        }
                        setCurrentScreen('home');
                    }}
                />
            )}
        </>
    )
}

export default App
