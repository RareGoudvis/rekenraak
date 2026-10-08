import { expect } from 'vitest';
import type * as T from '../../services/math/types';
import type { KioskDescriptor } from '../../services/oefenen/types';
import { kioskInteractOf } from '../../services/oefenen/kiosk';
import { checkAnswer } from '../../services/oefenen/check';
import { EMPTY_INTERACTION } from '../../components/viewer/ViewerInteractionContext';
import { klokDragHands, klokHourTo, klokMinuteStep, klokMinuteTo, klokStep } from '../../services/clock/clockDrag';

type Drag = Record<string, number>;

// Phase C4: a drag answer agrees with the generator. Per family: the drag values that are
// right (reached through the same pointer maths the viewer runs), and values that are wrong.
interface DragCase { right: Drag[]; wrong: Drag[] }

function klokCase(k: T.ClockExercise, c: Record<string, unknown>, truth: unknown, where: string): DragCase {
    const { time } = truth as { time: Array<[number, number]> };
    const h = k.hours % 12, m = k.minutes;
    expect(time.some(([th, tm]) => th % 12 === h && tm === m), where).toBe(true);
    const hands = klokDragHands(k, c);
    const exact: Drag = Object.fromEntries(hands.map(x => [x, x === 'h' ? h : m]));
    // As a pupil does it: the grote wijzer first (its turns carry the kleine one along), then
    // the kleine wijzer pointed at its spot for those minutes.
    let byPointer: Drag = {};
    if (hands.includes('m')) byPointer = klokMinuteTo(k, c, byPointer, m * 6);
    if (hands.includes('h')) byPointer = klokHourTo(k, c, byPointer, h * 30 + (hands.includes('m') ? m : k.minutes) / 2 + 7);
    // Arrow keys: up and down once places a hand (at 12), then it steps to its spot.
    let byKeys: Drag = {};
    for (const x of hands) byKeys = klokStep(k, c, klokStep(k, c, byKeys, x, 1), x, -1);
    expect(byKeys, where).toEqual(Object.fromEntries(hands.map(x => [x, 0])));
    const step = klokMinuteStep(k, c);
    expect(m % step, where).toBe(0);
    if (hands.includes('m')) for (let i = 0; i < m / step; i++) byKeys = klokStep(k, c, byKeys, 'm', 1);
    if (hands.includes('h')) {
        const presses = (h - byKeys.h + 12) % 12;
        for (let i = 0; i < presses; i++) byKeys = klokStep(k, c, byKeys, 'h', 1);
    }
    const wrong: Drag[] = [];
    if (hands.includes('m')) wrong.push({ ...exact, m: (m + step) % 60 });
    if (hands.includes('h')) wrong.push({ ...exact, h: (h + 1) % 12 });
    return { right: [exact, byPointer, byKeys], wrong };
}

const CASES: Record<string, (ex: never, c: Record<string, unknown>, truth: unknown, where: string) => DragCase> = {
    'klok-kloklezen': klokCase,
};

export function checkDrag(typeId: string, d: KioskDescriptor, ex: unknown, c: Record<string, unknown>, truth: unknown, where: string) {
    const ia = kioskInteractOf(d, c)!;
    const given = (drag: Drag) => ia.fromState({ ...EMPTY_INTERACTION, drag }, ex, c);
    expect(given({}), `${where}: untouched is no answer`).toBe('');
    const f = CASES[typeId];
    expect(f, `no drag truth for ${typeId}`).toBeDefined();
    const { right, wrong } = f(ex as never, c, truth, where);
    for (const r of right) expect(checkAnswer(d, ex, c, given(r)), `${where} right ${JSON.stringify(r)} → ${given(r)}`).toBe(true);
    for (const w of wrong) expect(checkAnswer(d, ex, c, given(w)), `${where} wrong ${JSON.stringify(w)} → ${given(w)}`).toBe(false);
    expect(ia.keys!(ex, c).length, where).toBeGreaterThan(0);
}
