/**
 * TournamentAIService.js
 * Handles automated gameplay simulation for AI players in tournament mode.
 */

export const TournamentAIService = {
    // Generate a random match duration
    getMatchDuration: (min = 8000, max = 15000) => {
        return min + Math.random() * (max - min);
    },

    // Check if an AI match should end based on time
    shouldMatchEnd: (match) => {
        if (!match || !match.inProgress || !match.completionTime) return false;
        return Date.now() >= match.completionTime;
    },

    // Pick a winner for an AI vs AI match
    simulateMatchWinner: (player1, player2) => {
        if (!player1 || !player2) {
            console.error("❌ CRITICAL ERROR: simulateMatchWinner called with missing players!", { player1, player2 });
            return player1 || player2 || { displayName: "Unknown Bot", uid: `bot-${Date.now()}` };
        }
        // Randomly pick a winner
        const winner = Math.random() > 0.5 ? player1 : player2;
        console.log(`🤖 [Tournament AI]: Match Resolved -> ${player1.displayName} vs ${player2.displayName} | WINNER: ${winner.displayName}`);
        return winner;
    },

    // Helper to check and finalize automated matches
    checkAndFinalizeMatches: (tournamentState, players, userUid, onMatchEnd) => {
        if (!tournamentState || !tournamentState.matches || !Array.isArray(players) || players.length < 4) {
            console.warn("⚠️ AI Service: Invalid state", { tournamentState, playersCount: players?.length });
            return;
        }

        const { top, bottom } = tournamentState.matches;
        const now = Date.now();
        const userIdx = players.findIndex(p => p.uid === userUid);

        console.log(`🔍 AI Check | UserIdx: ${userIdx} | Top: ${top.inProgress ? 'PLAYING' : 'DONE'} (Winner: ${top.winnerIdx}) | Bottom: ${bottom.inProgress ? 'PLAYING' : 'DONE'} (Winner: ${bottom.winnerIdx})`);

        // --- CHECK TOP MATCH (P1 vs P2) ---
        const isUserInTop = (userIdx === 0 || userIdx === 1);
        if (!isUserInTop && top.inProgress && top.winnerIdx === null) {
            console.log(`🔎 Checking TOP match | Has CompletionTime: ${!!top.completionTime} | Time: ${top.completionTime ? new Date(top.completionTime).toLocaleTimeString() : 'N/A'} | Now: ${new Date(now).toLocaleTimeString()}`);

            if (top.completionTime && now >= top.completionTime) {
                console.log("⏰ TOP AI MATCH COMPLETE - Resolving now!");
                const winner = TournamentAIService.simulateMatchWinner(players[0], players[1]);
                onMatchEnd('top', winner);
            }
            else if (!top.completionTime) {
                console.warn("⚠️ TOP MATCH stuck without completion time, fixing...");
                const winner = TournamentAIService.simulateMatchWinner(players[0], players[1]);
                onMatchEnd('top', winner);
            }
            else {
                const timeLeft = Math.round((top.completionTime - now) / 1000);
                console.log(`⏳ TOP match will finish in ${timeLeft}s`);
            }
        } else if (isUserInTop) {
            console.log(`👤 User is in TOP match - skipping AI simulation`);
        } else if (top.winnerIdx !== null) {
            console.log(`✅ TOP match already has winner: ${players[top.winnerIdx]?.displayName}`);
        }

        // --- CHECK BOTTOM MATCH (P3 vs P4) ---
        const isUserInBottom = (userIdx === 2 || userIdx === 3);
        if (!isUserInBottom && bottom.inProgress && bottom.winnerIdx === null) {
            console.log(`🔎 Checking BOTTOM match | Has CompletionTime: ${!!bottom.completionTime} | Time: ${bottom.completionTime ? new Date(bottom.completionTime).toLocaleTimeString() : 'N/A'} | Now: ${new Date(now).toLocaleTimeString()}`);

            if (bottom.completionTime && now >= bottom.completionTime) {
                console.log("⏰ BOTTOM AI MATCH COMPLETE - Resolving now!");
                const winner = TournamentAIService.simulateMatchWinner(players[2], players[3]);
                onMatchEnd('bottom', winner);
            }
            else if (!bottom.completionTime) {
                console.warn("⚠️ BOTTOM MATCH stuck without completion time, fixing...");
                const winner = TournamentAIService.simulateMatchWinner(players[2], players[3]);
                onMatchEnd('bottom', winner);
            }
            else {
                const timeLeft = Math.round((bottom.completionTime - now) / 1000);
                console.log(`⏳ BOTTOM match will finish in ${timeLeft}s`);
            }
        } else if (isUserInBottom) {
            console.log(`👤 User is in BOTTOM match - skipping AI simulation`);
        } else if (bottom.winnerIdx !== null) {
            console.log(`✅ BOTTOM match already has winner: ${players[bottom.winnerIdx]?.displayName}`);
        }
    }
};
