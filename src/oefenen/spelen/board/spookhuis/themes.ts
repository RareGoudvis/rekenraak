import type { SpookSound } from './sounds';

// Spookhuis' three haunted places, pure: the same rules, flashlight and board, only the look, the life in the room,
// the card-flipper, the pair moment and the mistake picture change. Each one's drawing is its own art file (art/).

export type SpookTheme = 'klassiek' | 'zombie' | 'schip';

export const SPOOK_THEMES: readonly SpookTheme[] = ['klassiek', 'zombie', 'schip'];

export interface ThemeInfo {
    id: SpookTheme;
    // The place, for the board's label and the end screen ("Het spookhuis").
    name: string;
    // A closed card's spoken name.
    closed: string;
    // The card-flipper, its line in a little speech bubble, and its sound as it turns a card back.
    flipper: string;
    flipperSays: string;
    flipperSound: SpookSound;
    // The pair moment's sound as the visitor pops out, and the mistake picture's (with its name, for the tests).
    pairSound: SpookSound;
    mistake: string;
    mistakeSound: SpookSound;
    // The sign once a board is cleared: the lights come on.
    lit: string;
}

export const THEMES: Record<SpookTheme, ThemeInfo> = {
    klassiek: {
        id: 'klassiek', name: 'Het spookhuis', closed: 'Kaart, dicht',
        flipper: 'spookje', flipperSays: 'Hihi!', flipperSound: 'hihi',
        pairSound: 'oehoe', mistake: 'pompoen', mistakeSound: 'pompoen', lit: 'Het licht is aan!',
    },
    zombie: {
        id: 'zombie', name: 'Het zombiehuis', closed: 'Kaart, dicht',
        flipper: 'zombie', flipperSays: 'Breinnn!', flipperSound: 'brein',
        pairSound: 'dans', mistake: 'pudding', mistakeSound: 'pudding', lit: 'Het licht is aan!',
    },
    schip: {
        id: 'schip', name: 'Het spookschip', closed: 'Kaart, dicht',
        flipper: 'spookpiraat', flipperSays: 'Arrr!', flipperSound: 'arrr',
        pairSound: 'munten', mistake: 'anker', mistakeSound: 'anker', lit: 'De lantaarns branden!',
    },
};

export const isSpookTheme = (v: unknown): v is SpookTheme => typeof v === 'string' && (SPOOK_THEMES as readonly string[]).includes(v);
