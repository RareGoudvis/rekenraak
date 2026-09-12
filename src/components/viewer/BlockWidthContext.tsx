import { createContext, useContext } from 'react';

// Printable content width of a FULL-WIDTH block, in CSS px.
// A4 at 96dpi is 794px minus the page's 2x53px side padding, so a full-width block gets
// 688px. SYNC: index.css .page-sheet-body padding (53px on screen, 14mm in print).
// It read 681 (15mm) here while App computed 688, so a viewer saw a different width
// depending on whether it was inside a provider; 688 is the one the grid actually gives.
export const FULL_BLOCK_WIDTH_PX = 688;

// Viewers decide their own column count from the width they have (2-up vs 1-up grids).
// They used to hardcode 625, which is only true at full width: in a half-width block the
// real budget is ~334px and in a quarter ~161px, so a hardcoded viewer would confidently
// lay out a grid that overflows its cell. This context hands them the truth instead.
//
// SYNC: every viewer that decides a column count must read this rather than a constant.
const BlockWidthContext = createContext<number>(FULL_BLOCK_WIDTH_PX);

export function useBlockWidth(): number {
    return useContext(BlockWidthContext);
}

export const BlockWidthProvider = BlockWidthContext.Provider;

// Printable width of a grid cell that spans `units` of the 4-unit page grid, given the
// grid's column gap. A spanning cell also swallows the gaps it covers, which is why this
// is not simply units x unit. One definition, used by the sheet and by the tests.
export function cellWidthPx(units: number, gapPx: number): number {
    const unit = (FULL_BLOCK_WIDTH_PX - 3 * gapPx) / 4;   // 4 units, 3 gaps between them
    return Math.floor(unit * units + gapPx * (units - 1));
}

// How many items of `itemMinPx` fit across `availableWidth`, capped at what the viewer
// would use at full width. Viewers that hardcoded a column count overflowed the moment
// blocks could be half or a third wide — the width was being handed to them and ignored.
export function fitCols(availableWidth: number, itemMinPx: number, preferred: number, gapPx = 12): number {
    const fits = Math.floor((availableWidth + gapPx) / (itemMinPx + gapPx));
    return Math.max(1, Math.min(preferred, fits));
}
