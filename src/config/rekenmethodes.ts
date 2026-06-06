// Dutch/Flemish primary-school math METHODS (rekenmethodes). Used as a filter facet in
// the Kant-en-klare bladen (template library). Pure data — a template tags itself with
// the method(s) it suits; 'methode-onafhankelijk' = works regardless of method.
export interface Rekenmethode {
    id: string;
    label: string;
}

export const REKENMETHODES: Rekenmethode[] = [
    { id: 'methode-onafhankelijk', label: 'Methode-onafhankelijk' },
    { id: 'reken-maar', label: 'Reken Maar' },
];

export const rekenmethodeLabel = (id: string): string =>
    REKENMETHODES.find(m => m.id === id)?.label ?? id;
