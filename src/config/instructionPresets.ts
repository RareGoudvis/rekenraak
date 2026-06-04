// Quick-pick opdracht-titel (instruction) texts so teachers click instead of retype.
// Generic verbs cover most blocks; suggestionsFor() floats a few type-specific lines first.

export const STANDARD_INSTRUCTIONS: string[] = [
    'Los op.',
    'Reken uit.',
    'Vul in.',
    'Kleur.',
    'Teken.',
    'Schrijf op.',
    'Verbind.',
    'Rond af.',
    'Vergelijk.',
    'Zet in volgorde.',
    'Splits.',
];

// typeId-prefix → instruction lines surfaced at the top of the list for that family.
const TYPE_SUGGESTIONS: Array<{ match: string; texts: string[] }> = [
    { match: 'klok', texts: ['Hoe laat is het?', 'Teken de wijzers.'] },
    { match: 'geld', texts: ['Hoeveel geld?', 'Teken het bedrag.'] },
    { match: 'breuken', texts: ['Kleur de breuk.', 'Welke breuk?'] },
    { match: 'splitsen', texts: ['Splits.'] },
    { match: 'ordenen', texts: ['Zet in volgorde.'] },
    { match: 'afronden', texts: ['Rond af.'] },
    { match: 'vergelijken', texts: ['Vul in: <, > of =.'] },
    { match: 'romeinse', texts: ['Schrijf in Romeinse cijfers.'] },
    { match: 'meten', texts: ['Meet.'] },
];

// Type-specific lines first (deduped), then the generic verbs.
export function suggestionsFor(typeId: string): string[] {
    const specific = TYPE_SUGGESTIONS.filter((s) => typeId.startsWith(s.match)).flatMap((s) => s.texts);
    return [...new Set([...specific, ...STANDARD_INSTRUCTIONS])];
}
