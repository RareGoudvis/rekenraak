// The Over page's links and its list of what is stored, in the parents' words.

export const SHEETS_URL = 'https://rekenraak.be/';
export const FEEDBACK_URL = 'https://forms.gle/jc1LcMXaRG3V3M556';

// Frans in the same screens (owner 2026-11-18): on since the Frans cards are in.
export const SHOW_FRANS = true;
export const FRANS_TEXT = 'Frans in een rekenapp? Dezelfde oefenschermen en spelletjes werken ook voor Franse werkwoorden.';

// SYNC: PUPIL_KEYS in pupilStorage.ts (one line per group of keys).
export const STORED_ITEMS: readonly string[] = [
    'het leerjaar en de laatste keuzes (tot hoeveel, welke tafels, oefenen of spelen)',
    'de keuzes bij de spelletjes, en of geluid en muziek aan staan',
    'welke prent, grijpmachine of plek een spel het laatst toonde, zodat het afwisselt',
    'de beste scores, bijvoorbeeld bij Race, Skislalom, Frituur en Voetbal',
    'de resultaten van het oefenen, ook met een link of QR-code van de juf of meester',
    'het laatste werkblad dat in de Stappenhulp openging',
];
