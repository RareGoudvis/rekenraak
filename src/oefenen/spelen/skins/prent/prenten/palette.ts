import type { CSSProperties } from 'react';

// The Verborgen prent pictures' size and palette (prent.css --pf-* tokens, mixed from the theme).

export const PRENT_W = 400;
export const PRENT_H = 300;

const fill = (name: string): CSSProperties => ({ fill: `var(--pf-${name})` });

// Fills by name: F.gold on an outlined shape.
export const F = {
    ink: fill('ink'), white: fill('white'), sky: fill('sky'), sun: fill('sun'), grass: fill('grass'), green: fill('green'),
    gold: fill('gold'), tan: fill('tan'), brown: fill('brown'), pink: fill('pink'), cheek: fill('cheek'), red: fill('red'),
    orange: fill('orange'), blue: fill('blue'), sea: fill('sea'), ice: fill('ice'), purple: fill('purple'), lilac: fill('lilac'),
    grey: fill('grey'), greyDark: fill('grey-dark'), dark: fill('dark'), mint: fill('mint'), cream: fill('cream'), wood: fill('wood'), fur: fill('fur'),
    none: { fill: 'none' },
} as const;
