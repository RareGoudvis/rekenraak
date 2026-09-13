import { useWorksheetStore } from '../../store/useWorksheetStore';
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

// The sheet font tokens (--sheet-size-math / --sheet-size-text, theme.css) in CSS px, for
// the few places that must know a size in JS: a viewer picking a column count around an
// SVG face that is sized `calc(var(--sheet-size-math) * K)` cannot measure that in CSS.
// Read from docSettings rather than getComputedStyle so it is reactive and works before
// first paint; 13pt / 15pt are the token defaults. 1pt = 96/72 px.
export const SHEET_SIZE_DEFAULT_PT = { math: 13, text: 15 } as const;
const PX_PER_PT = 96 / 72;

export function sheetSizePx(kind: 'math' | 'text', pt?: number): number {
    return (pt ?? SHEET_SIZE_DEFAULT_PT[kind]) * PX_PER_PT;
}

export function useSheetSizePx(kind: 'math' | 'text'): number {
    const pt = useWorksheetStore(s => (kind === 'math' ? s.docSettings.fontSizeMath : s.docSettings.fontSizeText));
    return sheetSizePx(kind, pt);
}

// ── Writing space ────────────────────────────────────────────────────────────
// `--sheet-answer-h` (theme.css) is the height of ONE answer line. 18px at the 13pt
// default is what ~11 viewers already hardcoded, so that is the default; the token is
// expressed against --sheet-size-math so the Cijfers slider carries it along, exactly the
// way the font factors do. Two factors are in use across the viewers:
//   1x                  — a single writing line or a one-line blank box ("lijn")
//   ANSWER_REGEL 32/18  — a full working row: stepped hoofdrekenen, table cells ("regel")
export const ANSWER_SPACE_DEFAULT_PX = 18;
export const ANSWER_REGEL = 32 / 18;

// 13pt at 96dpi = 17.333px. Same trick as PX_PER_EM_AT_DEFAULT in the viewers: dividing a
// px literal by it yields the factor whose value at the default slider IS that px.
const PX_PER_EM_AT_DEFAULT = sheetSizePx('math');

/** The token's value for `px` of writing space, as a CSS length that follows the sliders. */
export function answerSpaceVar(px?: number): string {
    return `calc(var(--sheet-size-math) * ${((px ?? ANSWER_SPACE_DEFAULT_PX) / PX_PER_EM_AT_DEFAULT).toFixed(4)})`;
}

/** `--sheet-answer-h` in CSS px, for the packer estimate and any viewer that needs a number. */
export function answerSpacePx(answerSpace?: number, fontSizeMath?: number): number {
    return (answerSpace ?? ANSWER_SPACE_DEFAULT_PX) * (sheetSizePx('math', fontSizeMath) / PX_PER_EM_AT_DEFAULT);
}

export function useSheetAnswerPx(): number {
    const answerSpace = useWorksheetStore(s => s.docSettings.answerSpace);
    const pt = useWorksheetStore(s => s.docSettings.fontSizeMath);
    return answerSpacePx(answerSpace, pt);
}
