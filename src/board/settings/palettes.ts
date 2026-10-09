// Colour sets for widget faces (board ink on a white card, like ACCENT_PALETTE), lowercase so
// ColorSwatches can match a stored value. Names keep colour from carrying meaning alone and
// differ from ACCENT_PALETTE's, so a panel never has two swatches with one accessible name.

// Saturated fills: timer wedge, breathing shape, noise bands.
export const BRIGHT_PALETTE: ReadonlyArray<{ name: string; hex: string }> = [
    { name: 'Felgroen', hex: '#16a34a' },
    { name: 'Felblauw', hex: '#1d4ed8' },
    { name: 'Hemelsblauw', hex: '#0ea5e9' },
    { name: 'Zeegroen', hex: '#0d9488' },
    { name: 'Violet', hex: '#7c3aed' },
    { name: 'Fuchsia', hex: '#db2777' },
    { name: 'Felrood', hex: '#dc2626' },
    { name: 'Feloranje', hex: '#ea580c' },
    { name: 'Goudgeel', hex: '#eab308' },
];

// Light fills behind dark ink: note backgrounds, notebook lines, dice bodies.
export const LIGHT_PALETTE: ReadonlyArray<{ name: string; hex: string }> = [
    { name: 'Wit', hex: '#ffffff' },
    { name: 'Lichtgeel', hex: '#fef08a' },
    { name: 'Lichtgroen', hex: '#bbf7d0' },
    { name: 'Lichtblauw', hex: '#bfdbfe' },
    { name: 'Lichtroze', hex: '#fbcfe8' },
    { name: 'Perzik', hex: '#fed7aa' },
    { name: 'Lila', hex: '#ddd6fe' },
    { name: 'Lichtgrijs', hex: '#e5e7eb' },
];
