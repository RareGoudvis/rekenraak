import type { FractionExercise } from '../math/types';
import { EMPTY_INTERACTION, type GroupWork, type InteractionState } from '../../components/viewer/ViewerInteractionContext';
import { INTERACT_SEP, type KioskReview } from '../oefenen/types';

// Oefenmodus, breuk van een hoeveelheid (3/4 van 28): the pupil groups the card's objects into
// equal groups, chooses the groups the teller asks (they fill in their colour), and types the answer; two working rows
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
// number of groups and of chosen groups. All numbers, so check.ts compares them as cells.
const GROUP_PARTS = 3;

/** The canonical answer: each row cell may stay blank ('|'), the answer, then n groups of g/n with t chosen. */
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

/** The breuk as the card names it, "2/4". */
const breukOf = (ex: FractionExercise) => `${ex.numerator}/${ex.denominator}`;

/** The kiosk card's instruction: both steps, the groups and then the choosing. */
export const hvInstruction = (ex: FractionExercise): string => `Maak gelijke groepjes. Kies dan de groepjes voor ${breukOf(ex)}.`;

/** The work still missing before a Controleer counts: groups, then the chosen groups. */
export function hvNudge(given: string, ex: FractionExercise): string | undefined {
    const { count, colored } = groupPart(given);
    if (count === 0) return `Maak eerst de groepjes. Kies dan de groepjes voor ${breukOf(ex)}.`;
    if (colored === 0) return `Kies nog de groepjes voor ${breukOf(ex)}.`;
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
    if (count === 0) hint = `Maak eerst de groepjes. Kies dan de groepjes voor ${breukOf(ex)}.`;
    else if (size === '') hint = 'Zijn alle groepjes even groot?';
    else if (count !== n) hint = 'Hoeveel groepjes heb je nodig? Kijk naar de noemer.';
    else if (Number(size) !== p) hint = `Zitten alle ${word} in een groepje?`;
    else if (colored !== t) hint = 'Hoeveel groepjes moet je kiezen? Kijk naar de teller.';
    else if (marks[HV_ANSWER] && Object.keys(marks).length === 1) hint = `Tel de ${word} in de gekozen groepjes.`;
    else if (Object.keys(marks).length) hint = Object.keys(marks).length === 1 ? 'Kijk naar het rode vakje.' : 'Kijk naar de rode vakjes.';
    return { ...(hint && { hint }), ...(Object.keys(marks).length && { marks }) };
}

/** A correct way, filled in as far as `answered` breukvragen go: geheel, delen (the groups appear), één deel, then the chosen groups and row 2. */
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

// The card's one "i": the next step in the owner's order, with its breukvraag and hint.
export interface HvTip { step: number; question: string; hint: string }

const filled = (state: InteractionState, k: string) => (state.cells[k] ?? '').trim();
const ROW_1 = ['r0', 'r1', 'r2'], ROW_2 = ['r3', 'r4', 'r5'];

/** The next step from what the pupil did so far (1 groups, 2 row 1, 3 groups vs row 1, 4 choose, 5 row 2, 6 answer, 7 Controleer); hints use only the card and the pupil's own numbers. */
export function hvNextStep(ex: FractionExercise, state: InteractionState): HvTip {
    const { g, n, t } = sizes(ex);
    const word = hvWord(ex);
    const cell = (k: string) => filled(state, k);
    const groups = (state.groups?.members ?? []).filter(m => m.length > 0);
    // The rows are optional: once the answer is typed, an unfinished row no longer counts as the next step.
    const rowsOpen = !cell(HV_ANSWER);
    const next = (keys: string[]) => (rowsOpen ? keys.find(k => !cell(k)) : undefined);

    if (groups.length === 0 || state.groups?.mode !== 'colour') {
        const done = groups.length > 0 ? ' Klaar? Tik op Groepjes kiezen en kies zoveel groepjes als de teller zegt.' : '';
        return { step: 1, question: 'Hoe maak je gelijke groepjes?', hint: `Kijk naar de noemer: zoveel groepjes maak je. Tik op Nieuw groepje en tik dan op de ${word}. Elk groepje krijgt evenveel ${word}.${done}` };
    }
    const r1 = next(ROW_1);
    // No hint for the geheel: "the number after 'van'" would give it away (owner, 2026-11-13).
    if (r1 === 'r0') return { step: 2, question: ROW_QUESTIONS.r0, hint: '' };
    if (r1 === 'r1') return { step: 2, question: ROW_QUESTIONS.r1, hint: 'Kijk naar de noemer.' };
    if (r1 === 'r2') return { step: 2, question: ROW_QUESTIONS.r2, hint: `Deel het geheel door de noemer: ${cell('r0')} : ${cell('r1')}.` };

    // The groups against the pupil's own row 1 (never the right one-deel), else against the card.
    const fix = ' Tik op Groepjes aanpassen om ze te veranderen.';
    const recheck = (hint: string): HvTip => ({ step: 3, question: 'Kloppen je groepjes?', hint: hint + fix });
    const ownCount = Number(cell('r1').replace(',', '.')), ownPart = Number(cell('r2').replace(',', '.'));
    if (cell('r2') && groups.some(m => m.length !== ownPart)) return recheck(`Kijk je groepjes na: zitten er ${cell('r2')} ${word} in elk groepje?`);
    if (!cell('r2') && groups.some(m => m.length !== groups[0].length)) return recheck('Kijk je groepjes na: zijn ze allemaal even groot?');
    if (cell('r1') && groups.length !== ownCount) return recheck(`Kijk je groepjes na: je eerste rij zegt ${cell('r1')} groepjes.`);
    if (!cell('r1') && groups.length !== n) return recheck('Kijk je groepjes na: de noemer zegt hoeveel groepjes je maakt.');
    if (groups.reduce((a, m) => a + m.length, 0) !== g) return recheck(`Kijk je groepjes na: zitten alle ${word} in een groepje?`);

    if ((state.groups?.colored.length ?? 0) !== t) return { step: 4, question: 'Hoeveel groepjes kies je?', hint: 'Kies zoveel groepjes als de teller zegt. Tik op een groepje om het te kiezen, nog eens tikken zet het terug.' };

    const r2 = next(ROW_2);
    if (r2 === 'r3') return { step: 5, question: ROW_QUESTIONS.r3, hint: 'Kijk naar de teller.' };
    if (r2 === 'r4') return { step: 5, question: ROW_QUESTIONS.r4, hint: 'Dat staat al in je eerste rij.' };
    if (r2 === 'r5') return { step: 5, question: ROW_QUESTIONS.r5, hint: `Reken: ${cell('r3')} × ${cell('r4')}.` };

    if (!cell(HV_ANSWER)) return { step: 6, question: hvQuestion(HV_ANSWER, ex), hint: `Tel de ${word} in de gekozen groepjes.${cell('r5') ? ' Of kijk naar je tweede rij.' : ''}` };
    return { step: 7, question: 'Klaar?', hint: 'Tik op Controleer.' };
}

/** Stats text of an answer string: the answer, then the groups behind it. */
export function hvShow(answer: string): string {
    const { parts, size, count, colored } = groupPart(answer);
    const typed = parts[HV_CELLS.length - 1] ?? '';
    const groups = count === 0 ? 'geen groepjes' : size !== '' ? `${count} groepjes van ${size}` : `${count} groepjes, niet even groot`;
    return `${typed} (${groups}, ${colored} gekozen)`;
}
