# Competition Mode Cards - Usage Guide

## Overview

The `CompetitionModeCard` component displays beautiful, professional competition mode cards with Moroccan zelij style design. These cards show which game mode is currently active.

## Installation

The component is already created in:
- `src/components/CompetitionModeCard.jsx`
- `src/components/CompetitionModeCard.css`

## Usage

### Basic Usage

```jsx
import CompetitionModeCard from './components/CompetitionModeCard';

// In your component
<CompetitionModeCard mode="2player" />
<CompetitionModeCard mode="3player" />
<CompetitionModeCard mode="4player" />
<CompetitionModeCard mode="offline" />
<CompetitionModeCard mode="friends" />
```

### Available Modes

1. **`2player`** - Two Player Mode
   - Shows 2 fanned playing cards (red & gold)
   - Dice icon
   - "2 PLAYER" text

2. **`3player`** - Three Player Mode
   - Shows 3 fanned playing cards (red, purple, gold)
   - Dice icon
   - "3 PLAYER" text

3. **`4player`** - Four Players Mode
   - Shows 4 fanned playing cards (red, purple, gold, blue)
   - Dice icon
   - "4 PLAYERS" text

4. **`offline`** - Offline Mode
   - Offline icon
   - Dice icon
   - "OFFLINE" text

5. **`friends`** - Play with Friends Mode
   - Two player avatars
   - Mini cards and dice
   - "PLAY WITH FRIENDS" text (two lines)

### Example: Using in GameScreen

```jsx
import CompetitionModeCard from './components/CompetitionModeCard';

const GameScreen = ({ gameMode, ... }) => {
    return (
        <div className="game-container">
            {/* Display current mode card */}
            <CompetitionModeCard mode={gameMode} />
            
            {/* Rest of your game UI */}
        </div>
    );
};
```

### Example: Using in MatchmakingScreen

```jsx
import CompetitionModeCard from './components/CompetitionModeCard';

const MatchmakingScreen = ({ gameMode, ... }) => {
    return (
        <div className="matchmaking-container">
            {/* Show which mode is being matched */}
            <CompetitionModeCard mode={gameMode} />
            
            {/* Rest of matchmaking UI */}
        </div>
    );
};
```

## Styling

The cards are styled with:
- **Size**: 220px × 90px (200px × 85px on mobile)
- **Background**: Maroon gradient (#8B0000)
- **Border**: Gold (#FFD700), 3px thick
- **Border Radius**: 18px (rounded rectangle)
- **Moroccan Zelij**: Intricate geometric patterns on top and bottom borders
- **Shadows**: Professional drop shadows for depth

## Customization

You can add custom classes:

```jsx
<CompetitionModeCard 
    mode="2player" 
    className="custom-card-class" 
/>
```

## Features

✅ Moroccan zelij geometric patterns  
✅ Gold borders and accents  
✅ Maroon background with gradient  
✅ Professional shadows and depth  
✅ Responsive design for mobile  
✅ Hover animations  
✅ All 5 game modes supported  

## Design Specifications Met

- ✅ Rounded rectangular cards (18px radius)
- ✅ Landscape orientation (220×90px)
- ✅ Maroon background with gradient
- ✅ Gold borders (3px)
- ✅ Moroccan zelij decorative borders (top & bottom)
- ✅ Playing cards with zelij patterns
- ✅ Dice icons
- ✅ Professional typography
- ✅ Drop shadows
- ✅ Mobile responsive

## Next Steps

1. **Replace with Images**: If you have designed PNG/SVG images, you can replace the CSS-based cards with image imports:

```jsx
// In CompetitionModeCard.jsx
import twoPlayerCard from '../assets/competition-cards/2-player-card.png';
import threePlayerCard from '../assets/competition-cards/3-player-card.png';
// ... etc

// Then use:
<img src={twoPlayerCard} alt="2 Player Mode" className="competition-card-image" />
```

2. **Integration**: Add the cards to your GameScreen, MatchmakingScreen, or wherever you need to display the current mode.

3. **Animation**: The cards already have hover animations. You can add more animations as needed.

## Demo

To see all cards, you can use the demo component:

```jsx
import CompetitionModeCardDemo from './components/CompetitionModeCardDemo';

// Render it anywhere to preview all 5 cards
<CompetitionModeCardDemo />
```

---

**Note**: The current implementation uses CSS and emojis for visual elements. For production, you may want to replace emojis with SVG icons or use the actual designed PNG/SVG images when available.
