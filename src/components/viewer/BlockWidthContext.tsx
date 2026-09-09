import { createContext, useContext } from 'react';

// Printable content width of a FULL-WIDTH block, in CSS px.
// A4 at 96dpi is 794px minus 2x15mm of side margin, so a full-width block gets 681px.
// (It was 625 while the margins were 16mm and the constant was deliberately conservative.)
export const FULL_BLOCK_WIDTH_PX = 681;

// Viewers decide their own column count from the width they have (2-up vs 1-up grids).
// They used to hardcode 625, which is only true at full width: in a half-width block the
// real budget is ~305px and in a third ~200px, so a hardcoded viewer would confidently lay
// out a grid that overflows its cell. This context hands them the truth instead.
//
// SYNC: every viewer that decides a column count must read this rather than a constant.
const BlockWidthContext = createContext<number>(FULL_BLOCK_WIDTH_PX);

export function useBlockWidth(): number {
    return useContext(BlockWidthContext);
}

export const BlockWidthProvider = BlockWidthContext.Provider;

// How many items of `itemMinPx` fit across `availableWidth`, capped at what the viewer
// would use at full width. Viewers that hardcoded a column count overflowed the moment
// blocks could be half or a third wide — the width was being handed to them and ignored.
export function fitCols(availableWidth: number, itemMinPx: number, preferred: number, gapPx = 12): number {
    const fits = Math.floor((availableWidth + gapPx) / (itemMinPx + gapPx));
    return Math.max(1, Math.min(preferred, fits));
}
