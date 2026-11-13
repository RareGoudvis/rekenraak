import type { FractionExercise } from '../math/types';
import { EMPTY_INTERACTION, type GroupWork, type InteractionState } from '../../components/viewer/ViewerInteractionContext';
import { INTERACT_SEP, type KioskReview } from '../oefenen/types';

// Oefenmodus, breuk van een hoeveelheid (3/4 van 28): the pupil groups the card's objects into
// equal groups, colours the groups the teller asks, and types the answer; two working rows
// (geheel : noemer = één deel, teller × één deel = antwoord) are optional but checked when filled.
// SYNC: FractionExerciseItem's kiosk group branch draws these keys; BREUKEN_KIOSK checks them.

// Working-row cells in reading order, then the answer: also the card's DOM order (Tab walks it).
export const HV_ROW_KEYS = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5'] as const;
export const HV_ANSWER = 'a';
export const HV_CELLS: string[] = [...HV_ROW_KEYS, HV_ANSWER];
export const hvObject = (i: number) => `o${i}`;

// The breukvragen of breukHoeveelheidSteps, per field, in the owner's wording for the rows.
const ROW_QUESTIONS: Record<string, string> = {
    r0: 'Hoeveel is het geheel?',
    r1: 'In hoeveel moet je het delen?',
    r2: 'Hoeveel is één deel?',
    r3: 'Hoeveel keer moet je dat deel nemen?',
    r4: 'Hoeveel is één deel?',
    r5: 'Hoeveel is dat samen?',
};

/** The question a cell answers (the panel shows it while the cell is active; also the cell's spoken name). */
export const hvQuestion = (key: string, ex: FractionExercise): string =>
    ROW_QUESTIONS[key] ?? `Hoeveel is ${ex.numerator}/${ex.denominator} van ${ex.total ?? 0}?`;

/** What the objects are called on this card. */
export const hvWord = (ex: Pick<FractionExercise, 'objectShape'>, many = true): string =>
    (ex.objectShape === 'square' ? (many ? 'blokjes' : 'blokje') : (many ? 'bolletjes' : 'bolletje'));

const sizes = (ex: FractionExercise) => {
    const g = ex.total ?? 0, n = ex.denominator, t = ex.numerator;
    const p = g / Math.max(1, n);
    return { g, n, t, p, ans: t * p };
};

// Parts after the cells: the group size when every group is equally big ('' otherwise), the
// number of groups and of coloured groups. All numbers, so check.ts compares them as cells.
const GROUP_PARTS = 3;

/** The canonical answer: each row cell may stay blank ('|'), the answer, then n groups of g/n with t coloured. */
export function hvAnswer(ex: FractionExercise): string {
    const { g, n, t, p, ans } = sizes(ex);
    return [`${g}|`, `${n}|`, `${p}|`, `${t}|`, `${p}|`, `${ans}|`, String(ans), String(p), String(n), String(t)].join(INTERACT_SEP);
}

/** The pupil's answer from the card: the cells, then their groups; '' until the answer cell is typed. */
export function hvGiven(state: InteractionState): string {
    const answer = (state.cells[HV_ANSWER] ?? '').trim();
    if (!answer) return '';
    const work: GroupWork | undefined = state.groups;
    const groups = (work?.members ?? []).map((m, g) => ({ size: m.length, colored: !!work?.colored.includes(g) })).filter(x => x.size > 0);
    const equal = groups.length > 0 && groups.every(x => x.size === groups[0].size);
    const cells = HV_CELLS.map(k => (state.cells[k] ?? '').trim());
    return [...cells, equal ? String(groups[0].size) : '', String(groups.length), String(groups.filter(x => x.colored).length)].join(INTERACT_SEP);
}

// An answer string split into its parts (an empty part stays, as in check.ts).
const partsOf = (s: string) => s.split(INTERACT_SEP.trim()).map(x => x.trim());

const groupPart = (given: string) => {
    const parts = partsOf(given);
    const [size = '', count = '0', colored = '0'] = parts.slice(-GROUP_PARTS);
    return { parts, size, count: Number(count) || 0, colored: Number(colored) || 0 };
};

/** The work still missing before a Controleer counts: groups, then colour. */
export function hvNudge(given: string): string | undefined {
    const { count, colored } = groupPart(given);
    if (count === 0) return 'Maak eerst de groepjes en kleur de delen.';
    if (colored === 0) return 'Kleur eerst de delen.';
    return undefined;
}

/** After a wrong check: the first thing to look at, and every filled cell that is wrong. */
export function hvReview(given: string, ex: FractionExercise): KioskReview {
    const { g, n, t, p, ans } = sizes(ex);
    const { parts, size, count, colored } = groupPart(given);
    const want = [g, n, p, t, p, ans, ans];
    const marks: Record<string, string> = {};
    HV_CELLS.forEach((k, i) => {
        const v = parts[i] ?? '';
        if (v !== '' && Number(v.replace(',', '.')) !== want[i]) marks[k] = 'wrong';
    });
    const word = hvWord(ex);
    let hint: string | undefined;
    if (count === 0) hint = 'Maak eerst de groepjes en kleur de delen.';
    else if (size === '') hint = 'Zijn alle groepjes even groot?';
    else if (count !== n) hint = 'Hoeveel groepjes heb je nodig? Kijk naar de noemer.';
    else if (Number(size) !== p) hint = `Zitten alle ${word} in een groepje?`;
    else if (colored !== t) hint = 'Hoeveel groepjes moet je kleuren? Kijk naar de teller.';
    else if (marks[HV_ANSWER] && Object.keys(marks).length === 1) hint = `Tel de gekleurde ${word}.`;
    else if (Object.keys(marks).length) hint = Object.keys(marks).length === 1 ? 'Kijk naar het rode vakje.' : 'Kijk naar de rode vakjes.';
    return { ...(hint && { hint }), ...(Object.keys(marks).length && { marks }) };
}

/** A correct way, filled in as far as `answered` breukvragen go: geheel, delen (the groups appear), één deel, then the colour and row 2. */
export function hvSolution(ex: FractionExercise, answered: number): InteractionState {
    const { g, n, t, p, ans } = sizes(ex);
    const cells: Record<string, string> = {};
    if (answered >= 1) cells.r0 = String(g);
    if (answered >= 2) cells.r1 = String(n);
    if (answered >= 3) cells.r2 = String(p);
    if (answered >= 4) Object.assign(cells, { r3: String(t), r4: String(p), r5: String(ans), [HV_ANSWER]: String(ans) });
    if (answered < 2) return { ...EMPTY_INTERACTION, cells };
    const members = Array.from({ length: n }, (_, k) => Array.from({ length: p }, (_, i) => hvObject(k * p + i)));
    const colored = answered >= 4 ? Array.from({ length: t }, (_, k) => k) : [];
    return { ...EMPTY_INTERACTION, cells, groups: { members, active: null, mode: 'colour', colored } };
}

/** The panel's guidance from the pupil's own work: what a tap does now, and once row 1 is filled, make or recheck the groups. */
export function hvGuide(state: InteractionState, ex: FractionExercise): string | undefined {
    const word = hvWord(ex);
    const work = state.groups;
    const made = (work?.members ?? []).some(m => m.length > 0);
    const [, n, p] = ['r0', 'r1', 'r2'].map(k => (state.cells[k] ?? '').trim());
    const row1 = ['r0', 'r1', 'r2'].every(k => (state.cells[k] ?? '').trim() !== '');
    const row2 = ['r3', 'r4', 'r5'].some(k => (state.cells[k] ?? '').trim() !== '');
    // Only the pupil's own values: the line never tells the answer.
    if (row1 && !row2) return made ? `Kijk je groepjes na: zitten er ${p} ${word} in elk groepje?` : `Maak nu ${n} groepjes van ${p} ${word}.`;
    if (work?.mode === 'colour') return 'Tik op een groepje om het te kleuren.';
    if (work?.active != null) return `Tik op ${word} om ze in dit groepje te zetten. Nog eens tikken haalt er een uit.`;
    return made ? `Tik op ${word} voor een nieuw groepje.` : `Tik op Nieuw groepje of op ${word} om een groepje te maken.`;
}

/** Stats text of an answer string: the answer, then the groups behind it. */
export function hvShow(answer: string): string {
    const { parts, size, count, colored } = groupPart(answer);
    const typed = parts[HV_CELLS.length - 1] ?? '';
    const groups = count === 0 ? 'geen groepjes' : size !== '' ? `${count} groepjes van ${size}` : `${count} groepjes, niet even groot`;
    return `${typed} (${groups}, ${colored} gekleurd)`;
}
