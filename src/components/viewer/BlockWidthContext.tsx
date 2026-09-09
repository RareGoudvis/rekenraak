import { createContext, useContext } from 'react';

// Printable content width of a FULL-WIDTH block, in CSS px.
// A4 at 96dpi is 794px; the print body cell takes 16mm of side padding, and 625 is the
// value the viewers have used since the print work — keep it as the default so nothing
// changes for a full-width block.
export const FULL_BLOCK_WIDTH_PX = 625;

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
