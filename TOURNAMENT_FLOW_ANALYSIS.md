# Tournament Flow Analysis

## Current Tournament Structure

### Initial Bracket Setup (App.jsx lines 202-230)
```
bracketPlayers = [user, opponent1, opponent2, opponent3/bot]

Index 0: User (You)
Index 1: Opponent 1
Index 2: Opponent 2
Index 3: Opponent 3 or Bot

Matches:
- Top Match: players[0] vs players[1] (User vs Opponent1)
- Bottom Match: players[2] vs players[3] (Opponent2 vs Opponent3/Bot)
```

### Visual Bracket Positions (TournamentBracketScreen.jsx lines 96-103)
```
topLeft: players[0]     (User)
topRight: players[1]    (Opponent1)
bottomLeft: players[2]  (Opponent2)
bottomRight: players[3] (Opponent3/Bot)

midLeft: Winner of Top Match
midRight: Winner of Bottom Match
```

### Finals Setup (TournamentBracketScreen.jsx lines 192-220)
```
w1Idx = top match winner index
w2Idx = bottom match winner index

p1 = players[w1Idx]  (Winner from top match)
p2 = players[w2Idx]  (Winner from bottom match)

Finals: p1 vs p2
```

## Spectator Mode Flow

### When User is Eliminated (App.jsx lines 278-282)
```
spectatorPlayers = { p1, p2 }  // The two players in the match to spectate

spectatedP1 = spectatorPlayers.p1
spectatedP2 = spectatorPlayers.p2
currentTournamentMatch = spectatorPlayers.p2

GameScreen receives:
- user = spectatedP1
- opponent = spectatedP2
```

### Auto-Spectator Logic (TournamentBracketScreen.jsx lines 351-398)
```
If user was in TOP match (idx 0 or 1):
  Watch BOTTOM match
  spectatorPlayers = { p1: players[2], p2: players[3] }

If user was in BOTTOM match (idx 2 or 3):
  Watch TOP match
  spectatorPlayers = { p1: players[0], p2: players[1] }

If finals:
  Watch finals
  spectatorPlayers = { p1: topWinner, p2: bottomWinner }
```

## Potential Issues to Check

### Issue 1: Wrong Avatars in Bracket
- Are players[2] and players[3] showing wrong avatars?
- Are the positions topLeft/topRight/bottomLeft/bottomRight correct?

### Issue 2: Wrong Winner Advancing
- Is the wrong player advancing from semi-finals to finals?
- Is winnerIdx being set incorrectly?

### Issue 3: Finals Matchup Wrong
- Are the wrong two players facing each other in finals?
- Is w1Idx or w2Idx incorrect?

## Please Specify:
1. Which players are showing wrong avatars? (P1, P2, P3, P4?)
2. Which match has the wrong winner? (Top semi, Bottom semi, or Finals?)
3. What should happen vs what is happening?
