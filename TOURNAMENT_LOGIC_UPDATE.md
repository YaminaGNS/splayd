# Tournament Logic Update Required

## Current Issue
The tournament needs to support TRUE SIMULTANEOUS matches where:
1. Both semi-finals start at the same time
2. AI vs AI match runs in parallel (30-60 sec duration)
3. When BOTH semis complete → Auto-progress to finals
4. If user loses → Spectate AI vs AI finals

## Changes Needed in TournamentBracketScreen.jsx

### 1. Replace lines 73-93 (Auto-progression checker)
```javascript
// Auto-progress to finals when BOTH semi-finals complete
useEffect(() => {
    if (tournamentState.visualStage === 'semis_playing') {
        const { top, bottom } = tournamentState.matches;
        
        // Check if both matches are complete
        const topComplete = top.winnerIdx !== null;
        const bottomComplete = bottom.winnerIdx !== null;
        
        if (topComplete && bottomComplete) {
            console.log("✅ Both semi-finals complete! Moving to finals...");
            setTournamentState(prev => ({
                ...prev,
                visualStage: 'finals_ready'
            }));
        }
    }
}, [tournamentState.matches.top.winnerIdx, tournamentState.matches.bottom.winnerIdx]);
```

### 2. AI Match Duration (Already Updated ✅)
Lines 130-145 now use realistic 30-60 second duration instead of 5 seconds.

## How It Works Now

**Semi-Finals Start:**
- User's match: Goes to GameScreen immediately
- AI match: Starts setTimeout with 30-60 sec duration

**During User's Match:**
- User plays their game (takes 1-3 minutes typically)
- AI match completes in background (30-60 sec)
- AI winner advances to bracket automatically

**When User's Match Ends:**
- User returns to bracket screen
- useEffect checks: Are both semis done?
  - YES → Auto-progress to finals_ready
  - NO → Show "Waiting..." (rare, if user finishes very fast)

**Finals:**
- If user won → User plays finals
- If user lost → AI vs AI finals (auto-simulated)

## Status
✅ AI match duration: DONE (30-60 sec)
⏳ Auto-progression checker: NEEDS MANUAL UPDATE (lines 73-93)
