import { SKINS } from './skins/registry';

/** Where a game's thumbnail lives (public/spelen/thumbs/, 480×300): one neutral picture per game. */
export const thumbOf = (id: string) => `${import.meta.env.BASE_URL}spelen/thumbs/${id}.webp`;

// Colours follow the registry order, so a game keeps its colour wherever it sits.
export const tintOf = (id: string) => `var(--kid-tint-${(Math.max(0, SKINS.findIndex(s => s.meta.id === id)) % 6) + 1})`;
