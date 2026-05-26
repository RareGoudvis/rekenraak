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