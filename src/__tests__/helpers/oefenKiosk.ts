import { INTERACT_SEP, type OefenSessie, type OefenType } from '../../services/oefenen/types';
import { encodeSessie } from '../../services/oefenen/session';
import { kioskFor, kioskInputOf, kioskInteractOf } from '../../services/oefenen/kiosk';
import { rightCells } from './fillCells';
import { useOefenStore } from '../../oefenen/useOefenStore';
import { EMPTY_INTERACTION } from '../../components/viewer/ViewerInteractionContext';
import type { OrdenenExercise } from '../../services/math/types';
import { numValue } from '../../services/math/answerKeys';

// Shared by the kiosk store and screen suites: a session of the four starter leaves, its
// hash, and a pupil that answers the exercise on screen right or wrong.

export const STARTER_TYPES: OefenType[] = [
    { typeId: 'hr-std-optellen', leafId: 'hr-std-optellen-nat', label: 'Optellen', constraints: { numberType: 'natural', maxGetal: 100 }, limit: 2, weight: 1 },
    { typeId: 'procenten', leafId: 'procenten-nemen', label: 'Procenten', constraints: { subType: 'nemen' }, limit: 2, weight: 1 },
    { typeId: 'afronden', leafId: 'afronden-nat-simpel', label: 'Afronden', constraints: { subType: 'simpel', numberType: 'natural', maxGetal: 1000, roundTargets: ['T', 'H'] }, limit: 2, weight: 1 },
    { typeId: 'vergelijken', leafId: 'vergelijken-getallen', label: 'Vergelijken', constraints: { subType: 'getallen' }, limit: 2, weight: 1 },
];

export const starterSessie = (over: Partial<OefenSessie> = {}): OefenSessie => ({
    v: 1, id: 'kiosktest', createdAt: 0, types: STARTER_TYPES, mode: 'afwisselen',
    allowRepeatType: false, testMode: false, statsLocked: false, ...over,
});

export const hashOf = (s: OefenSessie) => `#oefen=${encodeSessie(s)}`;

export function resetKiosk() {
    localStorage.clear();
    useOefenStore.setState({ sessie: null, error: null, phase: 'start', run: null, shown: null, input: [''], field: 0, lastCorrect: null, statsFrom: 'exercise', interaction: EMPTY_INTERACTION, activeCell: null });
}

/** The accepted answer and input kind of the exercise on the card. */
export function onScreen() {
    const st = useOefenStore.getState();
    const cur = st.shown!;
    const d = kioskFor(st.sessie!.types[cur.slot].typeId)!;
    const choices = d.choicesOf?.(cur.exercise, cur.constraints) ?? d.choices ?? [];
    return { answer: d.answerOf(cur.exercise, cur.constraints), kind: kioskInputOf(d, cur.exercise, cur.constraints), choices };
}

/** Types (right or wrong) into the store the way the keypad / choice buttons do. */
export function fillAnswer(right: boolean) {
    const st = useOefenStore.getState();
    const { answer, kind, choices } = onScreen();
    if (kind === 'interactive') {
        if (kioskInteractOf(kioskFor(st.sessie!.types[st.shown!.slot].typeId)!, st.shown!.constraints)?.kind === 'fill-cells') fillCellsAnswer(right);
        else tapAnswer(right);
    }
    else if (kind === 'choice') st.choose(right ? answer[0] : choices.find(c => c !== answer[0])!);
    else if (kind === 'number+rest') { st.setField(0, right ? answer[0] : '999'); st.setField(1, right ? answer[1] : '9'); }
    else if (kind === 'time') { const [h, m] = answer[0].split(':'); st.setField(0, h); st.setField(1, right ? m : String((Number(m) + 1) % 60)); }
    // One field per blank; a wrong run spoils the last one.
    else if (kind === 'multi-number') answer.forEach((a, i) => st.setField(i, right || i < answer.length - 1 ? a.split('|')[0] : '99999'));
    else if (kind === 'text') st.setField(0, right ? answer[0] : 'xyz');
    else st.setField(0, right ? answer[0] : '99999');
}

/** Fills the card's cells (Phase C2): the right value in every cell, or one cell spoilt. */
export function fillCellsAnswer(right: boolean) {
    const st = useOefenStore.getState();
    const cur = st.shown!;
    const typeId = st.sessie!.types[cur.slot].typeId;
    const cells = rightCells(typeId, kioskFor(typeId)!, cur.exercise, cur.constraints);
    const spoil = Object.keys(cells).find(k => cells[k])!;
    if (!right) cells[spoil] = cells[spoil].replace(/\d(?!.*\d)/, d => String((Number(d) + 1) % 10));
    st.setInteraction({ ...EMPTY_INTERACTION, cells });
}

/** Taps the card's parts the way a pupil would (Phase C): the right key(s), or a wrong set. */
export function tapAnswer(right: boolean) {
    const st = useOefenStore.getState();
    const cur = st.shown!;
    const ia = kioskFor(st.sessie!.types[cur.slot].typeId)!.interact!;
    const want = ia.answerOf(cur.exercise, cur.constraints);
    const keys = ia.keys!(cur.exercise, cur.constraints);
    if (ia.kind === 'order') {
        // The only order kind is ordenen: its display values sorted by the operator; wrong = reversed.
        const o = cur.exercise as OrdenenExercise;
        const sorted = [...keys].sort((a, b) => (numValue(o.display[Number(a)]) - numValue(o.display[Number(b)])) * (o.operator === '<' ? 1 : -1));
        st.setInteraction({ ...EMPTY_INTERACTION, order: right ? sorted : [...sorted].reverse() });
        return;
    }
    const valueOf = (k: string) => ia.fromState({ ...EMPTY_INTERACTION, selected: [k] }, cur.exercise, cur.constraints);
    let selected: string[];
    if (ia.kind === 'tap') selected = [keys.find(k => (valueOf(k) === want) === right)!];
    else {
        const good = keys.filter(k => want.split(INTERACT_SEP).includes(valueOf(k)));
        // Wrong: one right number left out, or a wrong one tapped when nothing is to be tapped.
        selected = right ? good : good.length ? good.slice(1) : keys.slice(0, 1);
    }
    st.setInteraction({ ...EMPTY_INTERACTION, selected });
}
