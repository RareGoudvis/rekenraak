// Curated, print-legible swatches for the style builder. Worksheet chrome prints in
// literal colors (not theme tokens), so these are fixed hexes chosen to stay readable
// on paper. '' = "no color" (transparent fill / default text).
export const PRINT_PALETTE: string[] = [
    '#000000', // zwart
    '#374151', // donkergrijs
    '#6B7280', // grijs
    '#1d4ed8', // blauw
    '#b91c1c', // rood
    '#047857', // groen
    '#7c3aed', // paars
    '#b45309', // oranje/bruin
];

// Light fills (for region backgrounds) — kept pale so text stays legible in print.
export const PRINT_FILLS: string[] = [
    '',        // geen
    '#F3F4F6', // lichtgrijs
    '#DBEAFE', // lichtblauw
    '#FEE2E2', // lichtrood
    '#DCFCE7', // lichtgroen
    '#FEF3C7', // lichtgeel
];

// Bounds so a custom style can never overflow the dialog-proof A4 layout.
export const STYLE_BOUNDS = {
    header: { fontMin: 14, fontMax: 32, padMax: 16, borderMax: 4 },
    titel:  { fontMin: 12, fontMax: 28, padMax: 14, borderMax: 4 },
    footer: { fontMin: 7,  fontMax: 14, padMax: 8,  borderMax: 3 },
} as const;

// Exercise-body text size, shown in px for the UI (nominal base — viewers cluster
// 14–18px). Stored as a zoom factor = px / base; applied via CSS `zoom` in ScaledBlock,
// which auto-fits wide blocks so an enlarged grid/number-line can't clip in print.
export const BODY_FONT_PX = { base: 14, min: 11, max: 18, step: 1 } as const;
