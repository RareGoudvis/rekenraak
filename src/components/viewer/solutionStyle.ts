import type { CSSProperties } from 'react';

// One source for "red under Toon oplossingen". Bold as well as red, so a black-and-white
// printout still separates the answer from the exercise.
export const SOL = 'var(--ink-solution)';

export const solutionText: CSSProperties = { color: SOL, fontWeight: 700 };

// SVG viewers colour paths instead of text.
