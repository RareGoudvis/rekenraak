// The one definition of how big a cijferen ruitje is. Lives outside CijferViewer so the
// Geavanceerd slider can label itself in real millimetres without the viewer exporting
// non-components (and without a second copy of the formula drifting from the first).

// 13pt at 96dpi: the divisor that turns a px geometry into a factor of --sheet-size-math,
// so the ruitjes follow the Lettergrootte slider like every other figure on the sheet.
export const PX_PER_EM_AT_DEFAULT = 17.33;
// The ruitje at the default slider position; gridCellSize is a multiplier of this.
export const NOMINAL_CELL_PX = 25;
// 1mm at 96dpi, the resolution the sheet is laid out in.
export const PX_PER_MM = 3.7795;

/** The ruitje in CSS px: the slider is a multiplier of the 25px nominal, scaled by the token. */
export function cellPxOf(gridCellSize: number | undefined, sheetPx: number): number {
    return (gridCellSize || NOMINAL_CELL_PX) * sheetPx / PX_PER_EM_AT_DEFAULT;
}
