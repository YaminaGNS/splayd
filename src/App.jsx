import { useState, useEffect } from 'react'
import SplashScreen from './components/SplashScreen'
import AuthScreen from './components/AuthScreen'
import LanguageScreen from './components/LanguageScreen'
import HomeScreen from './components/HomeScreen'
import BettingScreen from './components/BettingScreen'
import MatchmakingScreen from './components/MatchmakingScreen'
import GameScreen from './components/GameScreen'
import LoadingScreen from './components/LoadingScreen'
import GameLoadingScreen from './components/GameLoadingScreen'
import TournamentBracketScreen from './components/TournamentBracketScreen'
import EliminationPopup from './components/EliminationPopup'
import ChampionPopup from './components/ChampionPopup'
import { savePlayerProfile } from './services/firestoreService'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { preloadImages, getCriticalImages } from './utils/imagePreloader'
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
    const [gamePlayerId, setGamePlayerId] = useState(null); // Store session-specific player ID for multi-tab testing
    const [gameSessionId, setGameSessionId] = useState(null); // Store active session ID

    // Tournament-specific state
    const [tournamentPlayers, setTournamentPlayers] = useState([]);
    const [currentTournamentMatch, setCurrentTournamentMatch] = useState(null);
    const [tournamentMatchType, setTournamentMatchType] = useState(null);
    const [tournamentMatchResult, setTournamentMatchResult] = useState(null);
    const [showEliminationPopup, setShowEliminationPopup] = useState(false);
    const [showChampionPopup, setShowChampionPopup] = useState(false);
    const [tournamentWinner, setTournamentWinner] = useState(null);
    const [tournamentPrize, setTournamentPrize] = useState(0);
    // Persistent tournament bracket state
    const [tournamentState, setTournamentState] = useState(null);

    // Spectator state
    const [isSpectator, setIsSpectator] = useState(false);
    const [spectatedP1, setSpectatedP1] = useState(null);
    const [spectatedP2, setSpectatedP2] = useState(null);
    const [returningAsSpectator, setReturningAsSpectator] = useState(false);

    // Preload critical images on app start
    useEffect(() => {
        const criticalImages = getCriticalImages();
        preloadImages(criticalImages).catch(err => {
            console.warn('Some images failed to preload:', err);
        });
    }, []);

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

    // Auto-clear match result once it's been processed by the bracket
    useEffect(() => {
        if (tournamentMatchResult && tournamentState) {
            const { matchType, winner } = tournamentMatchResult;
            const matchSlot = tournamentState.matches[matchType];
            if (matchSlot && matchSlot.winnerIdx !== null) {
                // Bracket has updated its state, we can clear the prop
                setTournamentMatchResult(null);
            }
        }
    }, [tournamentState, tournamentMatchResult]);

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
                        if (screen === '2player') {
                            setGameMode(screen);
                            if (balance !== undefined) setPlayerBalance(balance);
                            setCurrentScreen('betting');
                        } else if (screen === 'tournament') {
                            // Tournament mode - Go to betting
                            setGameMode('tournament');
                            setIsSpectator(false); // Reset spectator mode
                            setReturningAsSpectator(false); // Reset spectator return flag
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
                    onGameStart={(opponents, sessionId, isRealMatch, mySessionPlayerId) => {
                        console.log("Game Starting with opponents:", opponents);
                        console.log("Session ID:", sessionId, "| Real Match:", isRealMatch, "| Player ID:", mySessionPlayerId);

                        // Store the matched opponents and player ID
                        setMatchedOpponents(opponents || []);
                        if (mySessionPlayerId) setGamePlayerId(mySessionPlayerId);
                        if (sessionId) setGameSessionId(sessionId); // Store Session ID

                        if (gameMode === 'tournament') {
                            console.log("🛠️ Tournament Setup Initiated");
                            const normalizedOpponents = (opponents || []).map((opp, idx) => ({
                                ...opp,
                                ...opp.uid ? {} : { uid: opp.id || `opp-${Math.random().toString(36).substr(2, 9)}` }
                            }));
                            console.log("👥 Normalized Opponents:", normalizedOpponents);

                            let bracketPlayers = [user, ...normalizedOpponents];

                            // No need to add bots - MatchmakingScreen already did that
                            console.log("Final bracket players:", bracketPlayers);
                            setTournamentPlayers(bracketPlayers);

                            const initialState = {
                                players: bracketPlayers,
                                betAmount: betAmount,
                                prizePool: betAmount * 4,
                                matches: {
                                    top: { p1Idx: 0, p2Idx: 1, winnerIdx: null, inProgress: false },
                                    bottom: { p1Idx: 2, p2Idx: 3, winnerIdx: null, inProgress: false },
                                    final: { inProgress: false, winnerIdx: null }
                                },
                                visualStage: 'waiting',
                                eliminated: []
                            };

                            setTournamentState(initialState);
                            setCurrentScreen('tournament-bracket');
                        } else {
                            // For regular 2-player, go to game loading
                            setCurrentScreen('game-loading');
                        }
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
                    sessionId={gameSessionId} // Pass actual Session ID
                    languageCode={selectedLanguage}
                    betAmount={betAmount}
                    playerId={gamePlayerId}
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

            {/* Tournament Bracket Screen */}
            {currentScreen === 'tournament-bracket' && (
                <TournamentBracketScreen
                    user={user}
                    players={tournamentPlayers}
                    betAmount={betAmount}
                    languageCode={selectedLanguage}
                    onMatchStart={(opponent, matchType, spectatorPlayers) => {
                        console.log("Tournament match starting:", matchType, spectatorPlayers ? "(Spectator)" : "");
                        if (spectatorPlayers) {
                            setIsSpectator(true);
                            setSpectatedP1(spectatorPlayers.p1);
                            setSpectatedP2(spectatorPlayers.p2);
                            setCurrentTournamentMatch(spectatorPlayers.p2);
                        } else {
                            setIsSpectator(false);
                            setCurrentTournamentMatch(opponent);
                        }
                        setTournamentMatchType(matchType);
                        setCurrentScreen('game-loading');
                    }}
                    onTournamentComplete={(winner, prize) => {
                        console.log("Tournament complete! Winner:", winner);
                        setTournamentWinner(winner);
                        setTournamentPrize(prize);

                        if (winner.uid === user.uid) {
                            // User won the tournament!
                            setPlayerBalance(prev => prev + prize);
                            setShowChampionPopup(true);
                        }
                    }}

                    matchResult={tournamentMatchResult}
                    // Pass persistent state
                    savedState={tournamentState}
                    onStateUpdate={setTournamentState}
                    returningAsSpectator={returningAsSpectator}
                    onSpectatorModeStarted={() => setReturningAsSpectator(false)}
                />
            )}

            {/* Tournament Game (uses same GameScreen) */}
            {currentScreen === 'game' && gameMode === 'tournament' && (
                <GameScreen
                    user={isSpectator ? spectatedP1 : user}
                    opponent={currentTournamentMatch}
                    sessionId="tournament-match"
                    languageCode={selectedLanguage}
                    betAmount={betAmount}
                    onGameEnd={(winner) => {
                        console.log("Tournament match ended. Winner:", winner);

                        const winnerObj = winner === 'me' ? (isSpectator ? spectatedP1 : user) : currentTournamentMatch;

                        if (!isSpectator && winner === 'me') {
                            // User won this match - update bracket with user as winner
                            setTournamentMatchResult({
                                matchType: tournamentMatchType,
                                winner: user
                            });
                            setCurrentScreen('tournament-bracket');
                        } else if (!isSpectator && winner !== 'me') {
                            // User lost - update bracket with opponent as winner
                            setTournamentMatchResult({
                                matchType: tournamentMatchType,
                                winner: currentTournamentMatch
                            });
                            setShowEliminationPopup(true);
                        } else {
                            // Spectator mode - just update bracket and go back
                            setTournamentMatchResult({
                                matchType: tournamentMatchType,
                                winner: winnerObj
                            });
                            setCurrentScreen('tournament-bracket');
                        }
                    }}
                    isTournament={gameMode === 'tournament'}
                    isSpectator={isSpectator}
                    playerId={gamePlayerId}
                />
            )}

            {/* Elimination Popup */}
            {showEliminationPopup && (
                <EliminationPopup
                    languageCode={selectedLanguage}
                    onLeave={() => {
                        setShowEliminationPopup(false);
                        setCurrentScreen('home');
                        // Reset would happen when re-entering home/betting naturally
                    }}
                    onWatch={() => {
                        setShowEliminationPopup(false);
                        setReturningAsSpectator(true); // Flag that user is returning as spectator
                        setCurrentScreen('tournament-bracket'); // Go back to bracket to spectate
                    }}
                />
            )}

            {/* Champion Popup */}
            {showChampionPopup && (
                <ChampionPopup
                    winner={tournamentWinner}
                    prizeAmount={tournamentPrize}
                    languageCode={selectedLanguage}
                    onClose={() => {
                        setShowChampionPopup(false);
                        setCurrentScreen('home');
                    }}
                />
            )}
        </>
    )
}

export default App
