import type { CSSProperties } from 'react';

// One source for "red under Toon oplossingen". Bold as well as red, so a black-and-white
// printout still separates the answer from the exercise.
export const SOL = 'var(--ink-solution)';

// The colouring keys (breuken, deelbaarheid, even-oneven) fill with the same red at low opacity, so the key
// stays one colour and the numbers/outlines on top remain readable.
export const SOL_FILL = 'color-mix(in srgb, var(--ink-solution) 35%, transparent)';

export const solutionText: CSSProperties = { color: SOL, fontWeight: 700 };

// SVG viewers colour paths instead of text.

// A single exercise alone in a ½ column reads better centred than pinned left (owner
// rule for getallenkennis blocks); a multi-column row keeps its natural left flow.
export const centerWhenSingle = (cols: number): CSSProperties['justifyItems'] => cols === 1 ? 'center' : undefined;
