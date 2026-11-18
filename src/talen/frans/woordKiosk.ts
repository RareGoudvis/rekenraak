import type { KioskDescriptor, OefenType } from '../../services/oefenen/types';
import type { KioskSubject } from '../../services/oefenen/subjects';
import type { StepLine } from '../../services/math/workedSteps';
import { FRANS_WOORD_TYPE_ID, dirLabelOf, woordCardOfLeaf } from './woordCards';
import { WORD_DIRS, flashLine, listsOf, makeWordExercise, orderLine, otherFormLine, pairLine, tableOf, textsOf, type WordDirChoice, type WordExercise, type WordSettings } from './woorden';

// The Frans word lists as a kiosk subject: "mercredi" / "Nederlands: ___" with six words on the kiosk's buttons, the
// right pair after a fout (and a number's other form).

const asEx = (ex: unknown) => ex as WordExercise;

function settingsOf(c: Record<string, unknown>): WordSettings | null {
    const dir = c.dir as WordDirChoice;
    const lists = Array.isArray(c.lists) ? c.lists.filter((x): x is string => typeof x === 'string') : [];
    if (!WORD_DIRS.includes(dir) || !listsOf(lists).length) return null;
    return { dir, lists };
}

const word = (w: string, kind: string): StepLine => ({ kind: `frans.${kind}`, basis: true, aside: true, tokens: [{ t: 'word', w }] });

const WOORD_KIOSK: KioskDescriptor = {
    input: 'choice',
    choicesOf: ex => asEx(ex).choices,
    wordGrid: true,
    answerOf: ex => [asEx(ex).answer],
    display: ex => `${asEx(ex).shown} = ?`,
    kioskInstruction: ex => textsOf(asEx(ex)).instruction,
    supported: c => settingsOf(c) !== null,
};

export const WOORD_SUBJECT: KioskSubject = {
    typeId: FRANS_WOORD_TYPE_ID,
    kiosk: WOORD_KIOSK,
    generate: (c, rng) => {
        const s = settingsOf(c);
        return s ? makeWordExercise(s, rng) : null;
    },
    // The same word asked the same way is the same question; its distractors (and a number's form) may differ.
    keyOf: ex => { const e = asEx(ex); return `frans-woord|${e.list}|${e.dir}|${e.index}`; },
    // The blank's label names the side to pick in, so a mixed run reads at a glance.
    prompt: ex => ({ lead: asEx(ex).shown, ask: textsOf(asEx(ex)).ask }),
    steps: ex => {
        const e = asEx(ex);
        return [pairLine(e), otherFormLine(e), orderLine(e)].filter((l): l is string => l !== null).map((l, i) => word(l, i ? 'uitleg' : 'antwoord'));
    },
    // Hoe los ik dit op? in a game: where to look (the first line stands out), then the list or the number's tens.
    help: ex => [word(`Zoek ${asEx(ex).shown} in de lijst.`, 'tip'), ...tableOf(asEx(ex)).map(l => word(l, 'tabel'))],
    afterLine: (ex, _c, correct) => (correct ? null : flashLine(asEx(ex))),
    typeOf: (v): OefenType | null => {
        const card = woordCardOfLeaf(v.leafId);
        if (!card) return null;
        const dir = v.ov.dir as WordDirChoice;
        return { typeId: FRANS_WOORD_TYPE_ID, leafId: v.leafId, label: `${card.label} · ${dirLabelOf(card, dir)}`, constraints: { ...v.ov }, weight: 100 };
    },
};
