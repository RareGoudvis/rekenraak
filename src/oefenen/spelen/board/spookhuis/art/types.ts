import type { ComponentType } from 'react';

// What one haunted place draws (art/klassiek.tsx, zombie.tsx, schip.tsx). Spookhuis.tsx owns the board, the dark,
// the light and the timing; a theme only paints. Every piece is decoration (aria-hidden, no pointer events).
export interface ThemeArt {
    // Under the dark: the walls, the floor and the furniture (lit by the flashlight like the cards). lit = the lights are on.
    Room: ComponentType<{ lit: boolean }>;
    // Above the dark (below an open card): what glows and moves by itself, the room's life.
    Life: ComponentType<{ lit: boolean }>;
    // A closed card's back, in a 100 × 86 viewBox.
    CardBack: ComponentType;
    // The visitor that turns a lone open card back, about a card wide; trick = it is reaching for a card.
    Flipper: ComponentType<{ trick: boolean }>;
    // The pair moment's visitor where the two cards met.
    Pop: ComponentType;
    // A logged mistake's picture over the sum's card.
    Mistake: ComponentType;
    // One pair in the counter above the board; on = found.
    Mark: ComponentType<{ on: boolean }>;
    // The lights-on crowd: the last board's end and the end screen's picture.
    Party: ComponentType;
    // Extra bits flying out of a pair moment: 'confetti', or a colour for pieces (the chest's coins); absent = only sparkles.
    popPieces?: string;
}
