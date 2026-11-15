import { createContext, useContext } from 'react';

// The sheet's per-sum stappenhulp marks for one block: '1' at each exercise index the QR opens
// with steps, '0' elsewhere; null = no per-sum marks (QR off, a block-level mark, the kiosk, the board).
export const StepsMarksContext = createContext<string | null>(null);

export function useStepsMarks(): string | null {
    const marks = useContext(StepsMarksContext);
    return marks && marks.includes('1') ? marks : null;
}

// The label column room a per-sum mark takes, in digit widths: the glyph (0.85 em ≈ 1.4 digits) plus air.
export const STEPS_MARK_CHARS = 2;
