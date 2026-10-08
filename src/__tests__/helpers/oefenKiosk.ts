import type { OefenSessie, OefenType } from '../../services/oefenen/types';
import { encodeSessie } from '../../services/oefenen/session';
import { kioskFor, kioskInputOf } from '../../services/oefenen/kiosk';
import { useOefenStore } from '../../oefenen/useOefenStore';

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
    useOefenStore.setState({ sessie: null, error: null, phase: 'start', run: null, shown: null, input: [''], field: 0, lastCorrect: null, statsFrom: 'exercise' });
}

/** The accepted answer and input kind of the exercise on the card. */
export function onScreen() {
    const st = useOefenStore.getState();
    const cur = st.shown!;
    const d = kioskFor(st.sessie!.types[cur.slot].typeId)!;
    return { answer: d.answerOf(cur.exercise, cur.constraints), kind: kioskInputOf(d, cur.exercise, cur.constraints), choices: d.choices ?? [] };
}

/** Types (right or wrong) into the store the way the keypad / choice buttons do. */
export function fillAnswer(right: boolean) {
    const st = useOefenStore.getState();
    const { answer, kind, choices } = onScreen();
    if (kind === 'choice') st.choose(right ? answer[0] : choices.find(c => c !== answer[0])!);
    else if (kind === 'number+rest') { st.setField(0, right ? answer[0] : '999'); st.setField(1, right ? answer[1] : '9'); }
    else st.setField(0, right ? answer[0] : '99999');
}
