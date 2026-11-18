import type { KioskDescriptor, OefenType } from '../../services/oefenen/types';
import type { KioskSubject } from '../../services/oefenen/subjects';
import type { StepLine } from '../../services/math/workedSteps';
import { FRANS_WOORD_TYPE_ID, WORD_DIR_LABELS, woordCardOfLeaf } from './woordCards';
import { WORD_DIRS, listsOf, makeWordExercise, orderLine, pairLine, tableOfList, type WordDirChoice, type WordExercise, type WordSettings } from './woorden';

// The Frans word lists as a kiosk subject: "mercredi = ___" with six words on the kiosk's buttons, the right pair after a fout.

const asEx = (ex: unknown) => ex as WordExercise;

function settingsOf(c: Record<string, unknown>): WordSettings | null {
    const dir = c.dir as WordDirChoice;
    const lists = Array.isArray(c.lists) ? c.lists.filter((x): x is string => typeof x === 'string') : [];
    if (!WORD_DIRS.includes(dir) || !listsOf(lists).length) return null;
    return { dir, lists };
}

const INSTRUCTION = { 'fr-nl': 'Wat betekent dit Franse woord?', 'nl-fr': 'Hoe zeg je dit in het Frans?' } as const;
// The blank's label names the language to pick in, so a mixed run reads at a glance.
const LANGUAGE = { 'fr-nl': 'Nederlands:', 'nl-fr': 'Frans:' } as const;

const word = (w: string, kind: string): StepLine => ({ kind: `frans.${kind}`, basis: true, aside: true, tokens: [{ t: 'word', w }] });

const WOORD_KIOSK: KioskDescriptor = {
    input: 'choice',
    choicesOf: ex => asEx(ex).choices,
    wordGrid: true,
    answerOf: ex => [asEx(ex).answer],
    display: ex => `${asEx(ex).shown} = ?`,
    kioskInstruction: ex => INSTRUCTION[asEx(ex).dir],
    supported: c => settingsOf(c) !== null,
};

export const WOORD_SUBJECT: KioskSubject = {
    typeId: FRANS_WOORD_TYPE_ID,
    kiosk: WOORD_KIOSK,
    generate: (c, rng) => {
        const s = settingsOf(c);
        return s ? makeWordExercise(s, rng) : null;
    },
    // The same word asked the same way is the same question; its distractors may differ.
    keyOf: ex => { const e = asEx(ex); return `frans-woord|${e.list}|${e.dir}|${e.index}`; },
    prompt: ex => ({ lead: asEx(ex).shown, ask: LANGUAGE[asEx(ex).dir] }),
    steps: ex => {
        const order = orderLine(asEx(ex));
        return [word(pairLine(asEx(ex)), 'antwoord'), ...(order ? [word(order, 'uitleg')] : [])];
    },
    // Hoe los ik dit op? in a game: where to look (the first line stands out), then the whole list, French beside Dutch.
    help: ex => [word(`Zoek ${asEx(ex).shown} in de lijst.`, 'tip'), ...tableOfList(asEx(ex).list).map(l => word(l, 'tabel'))],
    afterLine: (ex, _c, correct) => (correct ? null : pairLine(asEx(ex))),
    typeOf: (v): OefenType | null => {
        const card = woordCardOfLeaf(v.leafId);
        if (!card) return null;
        const dir = v.ov.dir as WordDirChoice;
        return { typeId: FRANS_WOORD_TYPE_ID, leafId: v.leafId, label: `${card.label} · ${WORD_DIR_LABELS[dir] ?? ''}`, constraints: { ...v.ov }, weight: 100 };
    },
};
