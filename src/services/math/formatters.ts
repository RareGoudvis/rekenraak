/**
 * Zet een getal om naar een string met decimale komma en spaties per duizendtal.
 * Voorbeeld: 1234.56 -> "1 234,56"
 */
export const formatMathNumber = (num: number | string | undefined): string => {
    if (num === undefined || num === '') return '';
    const str = String(num);
    const [integerPart, decimalPart] = str.split('.');

    // 1. Duizendtal-spaties toevoegen
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    // 2. Decimale komma toevoegen (als er decimalen zijn)
    if (decimalPart !== undefined) {
        return `${formattedInteger},${decimalPart}`;
    }
    return formattedInteger;
};
/**
 * Printed glyphs for the four operators. Display only — the stored operator stays
 * ASCII ('+' | '-' | 'x' | ':'), so nothing that parses or compares an operator has
 * to know about these.
 *
 * '-' becomes a real minus (U+2212), not a hyphen. Safe for column alignment: Azeret
 * Mono is monospace and both glyphs carry the same 650-unit advance, and U+2212 is in
 * the bundled latin subset, so it never falls back to another face.
 *
 * 'x' becomes '×' and ':' stays ':' — Flemish primary school writes multiplication as
 * a cross (never a middle dot, which arrives later) and division as a colon.
 */
export const OP_GLYPH: Record<string, string> = { '+': '+', '-': '−', 'x': '×', ':': ':' };
export const opGlyph = (op: string): string => OP_GLYPH[op] ?? op;
