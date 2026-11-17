import type { SpookTheme } from '../themes';
import type { ThemeArt } from './types';
import * as klassiek from './klassiek';
import * as zombie from './zombie';
import * as schip from './schip';

// Each place's drawing (one file per place, so each can be fixed alone), as Spookhuis.tsx uses it.
export const ART: Record<SpookTheme, ThemeArt> = {
    klassiek: { ...klassiek },
    zombie: { ...zombie, popPieces: 'confetti' },
    schip: { ...schip, popPieces: 'var(--mab-e)' },
};
