import type { MathBlock, GetalFunctieExercise, GetalFunctie } from '../math/types';

// Functie van getallen — hoeveelheidsgetal (telresultaat), rangordegetal (positie),
// maatgetal (meting), codegetal (identificatie; rekenen ermee is zinloos).
// Sentence banks use {n} for the number; codegetallen carry their own formats.

const RANG_WORDS = ['eerste', 'tweede', 'derde', 'vierde', 'vijfde', 'zesde', 'zevende', 'achtste', 'negende', 'tiende'];

interface Template { text: string; make: (maxGetal: number) => string; }

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

const BANK: Record<GetalFunctie, Template[]> = {
    hoeveelheid: [
        { text: 'Er zitten {n} kinderen in de klas.', make: m => String(randInt(15, Math.min(30, m))) },
        { text: 'Oma heeft {n} kippen in de tuin.', make: m => String(randInt(2, Math.min(12, m))) },
        { text: 'In de doos liggen {n} knikkers.', make: m => String(randInt(5, Math.min(m, 250))) },
        { text: 'De school telt {n} leerlingen.', make: m => String(randInt(80, Math.max(90, Math.min(m, 600)))) },
        { text: 'Yusuf heeft {n} stickers gespaard.', make: m => String(randInt(10, Math.min(m, 120))) },
        { text: 'Er staan {n} fietsen in de fietsenstalling.', make: m => String(randInt(6, Math.min(m, 80))) },
    ],
    rang: [
        { text: 'Ilias staat {n} in de rij.', make: () => pick(RANG_WORDS) },
        { text: 'Marte werd {n} bij de zwemwedstrijd.', make: () => pick(RANG_WORDS.slice(0, 5)) },
        { text: 'Dit is al het {n} boek dat ik dit jaar lees.', make: () => pick(RANG_WORDS) },
        { text: 'Lotte woont op de {n} verdieping.', make: () => pick(RANG_WORDS.slice(0, 6)) },
        { text: 'Onze klas eindigde als {n} in het toernooi.', make: () => pick(RANG_WORDS.slice(0, 4)) },
    ],
    maat: [
        { text: 'De trui kost {n} euro.', make: m => String(randInt(10, Math.min(m, 80))) },
        { text: 'Papa is {n} cm groot.', make: () => String(randInt(165, 195)) },
        { text: 'De les duurt {n} minuten.', make: () => String(pick([25, 30, 45, 50])) },
        { text: 'De zak aardappelen weegt {n} kg.', make: () => String(randInt(2, 10)) },
        { text: 'Het is vandaag {n} graden buiten.', make: () => String(randInt(3, 28)) },
        { text: 'De brug is {n} meter lang.', make: m => String(randInt(12, Math.min(m, 300))) },
    ],
    code: [
        { text: 'Lotte woont op nummer {n}.', make: () => String(randInt(1, 120)) },
        { text: 'Bus {n} rijdt naar het centrum.', make: () => String(randInt(1, 78)) },
        { text: 'Het postnummer van ons dorp is {n}.', make: () => String(randInt(1000, 9990)) },
        { text: 'De renner met rugnummer {n} wint de sprint.', make: () => String(randInt(1, 199)) },
        { text: 'Je fietsslot opent met de code {n}.', make: () => String(randInt(100, 999)) },
        { text: 'Op tram {n} is het altijd druk.', make: () => String(randInt(1, 24)) },
    ],
};

export function generateGetalFunctieExercises(block: MathBlock): GetalFunctieExercise[] {
    const c = block.constraints;
    const functies: GetalFunctie[] = c.functies ?? ['hoeveelheid', 'rang', 'maat', 'code'];
    const maxGetal: number = c.maxGetal ?? 1000;
    const pool = functies.length ? functies : (['hoeveelheid'] as GetalFunctie[]);
    const count = block.numberOfExercises || 6;

    const out: GetalFunctieExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        const functie = pool[randInt(0, pool.length - 1)];
        const tpl = pick(BANK[functie]);
        if (seen.has(tpl.text)) continue;
        seen.add(tpl.text);
        const number = tpl.make(maxGetal);
        out.push({
            id: Math.random().toString(36).substring(2, 9),
            sentence: tpl.text.replace('{n}', number),
            number, functie, isManuallyEdited: false,
        });
    }
    return out;
}
