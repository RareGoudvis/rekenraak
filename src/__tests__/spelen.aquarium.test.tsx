// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup } from '@testing-library/react';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinPhase } from '../oefenen/spelen/skins/types';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, useSpelStore } from '../oefenen/spelen/useSpelStore';
import { GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import { gameGroupOf } from '../oefenen/zelf/topicGames';
import Aquarium, { AquariumEnding } from '../oefenen/spelen/skins/aquarium/Aquarium';
import {
    CATCHABLE, CATCH_AFTER, CLASS_OF, GLASS, JACKPOT_CHANCE, SAND_Y, TANK_GOAL, WATER_TOP,
    crawlAt, isJackpot, orderFor, pathFor, shownOf, startTank, stepTank, swimAt, victimOf, type ItemKind, type TankState,
} from '../oefenen/spelen/skins/aquarium/tank';
import { resetKiosk } from './helpers/oefenKiosk';
import { CAT_EYE, catGaze, nearestTo } from '../oefenen/spelen/skins/aquarium/tank';
import { CatArt, NappingCat } from '../oefenen/spelen/skins/aquarium/art';

// Aquarium (round 6): the seeded order, the swim paths, the cat's catch (tank.ts) and the game on the real session.

const ORDER = orderFor(42, false);
// The counters after an answer, the way the session moves them; `back` = the skin's setback reached the climb.
const ok = (s: TankState, count: number, order = ORDER) => stepTank(s, order, { count, right: s.right + 1, mistakes: s.mistakes });
const oops = (s: TankState, count: number, order = ORDER) => stepTank(s, order, { count, right: s.right, mistakes: s.mistakes + 1 });
function fill(n: number, order = ORDER) {
    let s = startTank();
    for (let i = 0; i < n; i++) s = ok(s, i + 1, order);
    return s;
}

describe('the order (tank.ts)', () => {
    test('20 different items, the first a goldfish; a jackpot round ends on the white goldfish', () => {
        for (const seed of [1, 42, 999, 123456]) {
            const o = orderFor(seed, false);
            expect(o).toHaveLength(TANK_GOAL);
            expect(new Set(o).size).toBe(TANK_GOAL);
            expect(o[0]).toBe('goudvis');
            expect(o).not.toContain('witteGoudvis');
            const j = orderFor(seed, true);
            expect(j[TANK_GOAL - 1]).toBe('witteGoudvis');
            expect(j.slice(0, -1)).toEqual(o.slice(0, -1));
        }
        expect(orderFor(7, false)).toEqual(orderFor(7, false));
        expect(new Set([1, 2, 3, 4, 5].map(s => orderFor(s, false).join()))).not.toHaveProperty('size', 1);
    });

    test('something swims at least every other answer: never two still items in a row', () => {
        for (const seed of [3, 8, 21, 55]) {
            const still = orderFor(seed, false).map(k => CLASS_OF[k] === 'plant' || CLASS_OF[k] === 'decor');
            for (let i = 1; i < still.length; i++) expect(still[i - 1] && still[i]).toBe(false);
        }
    });

    test('one round in 10 is a jackpot round', () => {
        expect(JACKPOT_CHANCE).toBe(0.1);
        expect(isJackpot(0.05)).toBe(true);
        expect(isJackpot(0.5)).toBe(false);
    });

    test('every swimmer stays inside the water, and its whole body inside the glass', () => {
        const kinds = Object.keys(CLASS_OF).filter(k => CLASS_OF[k as ItemKind] === 'fish' || CLASS_OF[k as ItemKind] === 'crawler') as ItemKind[];
        for (const kind of kinds) {
            const path = pathFor(kind, 5)!;
            expect(path, kind).not.toBeNull();
            for (let t = 0; t < 600; t += 0.37) {
                const p = CLASS_OF[kind] === 'crawler' ? crawlAt(path, t) : swimAt(path, t);
                expect(p.x - path.size / 2, kind).toBeGreaterThan(GLASS.x0);
                expect(p.x + path.size / 2, kind).toBeLessThan(GLASS.x1);
                expect(p.y, kind).toBeGreaterThan(WATER_TOP);
                expect(p.y, kind).toBeLessThan(SAND_Y + 10);
            }
        }
        expect(pathFor('kasteel', 1)).toBeNull();
    });
});

describe('the cat (owner 2026-11-18: a real cat with idle life)', () => {
    test('it watches the nearest fish; its pupils and head follow within bounds', () => {
        const near = { x: CAT_EYE.x - 20, y: CAT_EYE.y + 10 };
        expect(nearestTo([{ x: 60, y: 120 }, near, { x: 200, y: 200 }])).toBe(near);
        expect(nearestTo([])).toBeNull();
        expect(catGaze(null)).toEqual({ dx: -1, dy: 0, deg: 0 });
        const far = catGaze({ x: 0, y: 400 });
        expect(far).toEqual({ dx: -2.4, dy: 1.8, deg: 10 });
        const up = catGaze({ x: CAT_EYE.x + 300, y: 0 });
        expect(up).toEqual({ dx: 1.2, dy: -1.8, deg: -8 });
    });

    test('drawn whole: two front legs, a haunch, a ringed tail round the paws, ears, eyes, a muzzle and whiskers', () => {
        const { container } = render(<svg><CatArt act="idle" fish={null} pupils={() => { }} head={() => { }} /></svg>);
        expect(container.querySelectorAll('.aq-cat-limb').length).toBe(3);
        expect(container.querySelector('.aq-cat-leg .aq-cat-leg-low .aq-cat-sock')).not.toBeNull();
        expect(container.querySelectorAll('.aq-cat-tail-tip .aq-cat-tail-rings').length).toBe(1);
        expect(container.querySelectorAll('.aq-cat-ear-wrap').length).toBe(2);
        expect(container.querySelectorAll('.aq-cat-pupil').length).toBe(2);
        expect(container.querySelectorAll('.aq-whisker.is-cat').length).toBe(2);
        expect(container.querySelector('.aq-cat-tongue')).not.toBeNull();
        expect(container.querySelector('.aq-cat-arm')).toBeNull();
    });

    test('a mistake or the catch: the reaching arm comes out (with the fish in its paw on the catch); the nap is a loaf', () => {
        const { container, rerender } = render(<svg><CatArt act="reach" fish={null} pupils={() => { }} head={() => { }} /></svg>);
        expect(container.querySelector('.aq-cat-arm .aq-cat-paw')).not.toBeNull();
        expect(container.querySelector('.aq-cat-paw-fish')).toBeNull();
        rerender(<svg><CatArt act="catch" fish="goudvis" pupils={() => { }} head={() => { }} /></svg>);
        expect(container.querySelector('.aq-cat-paw-fish')).not.toBeNull();
        expect(container.querySelector('.aq-cat-mouth-fish')).not.toBeNull();
        rerender(<svg><NappingCat /></svg>);
        expect(container.querySelector('.aq-cat-nap .aq-cat-lid.is-shut')).not.toBeNull();
        expect(container.querySelector('.aq-cat-nap .aq-cat-tail-rings')).not.toBeNull();
    });
});

describe('the cat (stepTank)', () => {
    test('a single mistake costs nothing; two in a row and the cat takes the newest catchable fish', () => {
        expect(CATCH_AFTER).toBe(2);
        let s = fill(6);
        s = oops(s, 6);
        expect(s.caught).toEqual([]);
        expect(shownOf(s)).toHaveLength(6);
        s = oops(s, 6);
        const newest = [5, 4, 3, 2, 1, 0].find(i => CATCHABLE.has(ORDER[i]))!;
        expect(s.caught).toEqual([{ pos: newest, kind: ORDER[newest], n: 0 }]);
        expect(s.gaps).toEqual([newest]);
        expect(shownOf(s)).toHaveLength(5);
        expect(s.run).toBe(0);
    });

    test('a right answer between two mistakes breaks the run', () => {
        let s = oops(fill(4), 4);
        s = ok(s, 5);
        s = oops(s, 5);
        expect(s.caught).toEqual([]);
    });

    test('the next right answer drops a fresh fish into the gap (the climb went one down with the setback)', () => {
        let s = oops(oops(fill(6), 6), 6);
        const gap = s.gaps[0];
        // The skin asked for the setback: the climb is 5 now; the next right answer makes it 6 again.
        s = stepTank(s, ORDER, { count: 5, right: s.right, mistakes: s.mistakes });
        s = ok(s, 6);
        expect(s.gaps).toEqual([]);
        expect(s.added).toEqual([gap]);
        expect(shownOf(s)).toHaveLength(6);
        expect(s.filled).toBe(6);
        // The answer after that adds the next new item.
        s = ok(s, 7);
        expect(s.added).toEqual([6]);
    });

    test('a shell without the setback still keeps the tank in step with the climb', () => {
        let s = oops(oops(fill(6), 6), 6);
        s = ok(s, 7);
        expect(shownOf(s)).toHaveLength(7);
        expect(s.added).toHaveLength(2);
    });

    test('never below 0: no fish in the tank, nothing caught, and the next two mistakes are a new run', () => {
        let s = oops(oops(startTank(), 0), 0);
        expect(s.caught).toEqual([]);
        expect(s.run).toBe(0);
        // Only plants and decor in the tank: nothing to catch either.
        const still: ItemKind[] = ['plantHoog', 'kasteel', 'schelp', ...ORDER.slice(3)];
        s = oops(oops(fill(3, still), 3, still), 3, still);
        expect(s.caught).toEqual([]);
    });

    test('the cat never takes the white goldfish, the school, the catfish or the seahorse', () => {
        for (const k of ['witteGoudvis', 'neons', 'meerval', 'zeepaardje', 'krab', 'slak'] as ItemKind[]) expect(CATCHABLE.has(k)).toBe(false);
        const order: ItemKind[] = ['neons', 'meerval', 'zeepaardje', 'witteGoudvis', ...ORDER.slice(4)];
        const s = fill(4, order);
        expect(victimOf(order, s)).toBeNull();
        expect(oops(oops(s, 4, order), 4, order).caught).toEqual([]);
    });

    test('four in a row: two fish, the newest first; a new round on the same screen starts an empty tank', () => {
        let s = fill(8);
        for (let i = 0; i < 4; i++) s = oops(s, 8);
        expect(s.caught).toHaveLength(2);
        expect(s.caught[0].pos).toBeGreaterThan(s.caught[1].pos);
        const fresh = stepTank(s, ORDER, { count: 0, right: 0, mistakes: 0 });
        expect(fresh).toEqual(startTank());
    });
});

describe('on the real session', () => {
    let choice: ZelfChoice;
    const sp = () => useSpelStore.getState();
    beforeAll(async () => {
        const data = await loadEenvoudigData();
        choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    });
    beforeEach(() => {
        resetKiosk();
        useOefenStore.setState({ fixed: null });
        sp().otherGame();
        sp().takePickerAt();
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });
    afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.pushState({}, '', '/'); });
    // A fixed round (dev query): never a jackpot by chance.
    const fixed = () => window.history.pushState({}, '', '/?aquarium=5');

    const start = () => act(() => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: skinById('aquarium')!.meta }));
    const right = () => { act(() => sp().answer(sp().question!.answer)); act(() => sp().next()); };
    const wrong = () => { act(() => sp().answer(String(Number(sp().question!.answer) + 1))); act(() => sp().next()); };

    function Wired() {
        const st = useSpelStore();
        if (!st.question || !st.meta) return null;
        const progress = progressOf(st);
        return (
            <Aquarium question={{ key: st.question.key, text: st.question.text, index: progress.answered }} choices={null}
                phase={st.phase as SkinPhase} feedback={st.feedback} onAnswer={st.answer} onHelp={() => st.openHelp()} onMiss={() => st.miss()}
                onFail={() => st.fail()} sound={() => { }} progress={progress} options={{}} events={st.events}
                onReport={st.report} onSetback={st.setback} />
        );
    }

    test('registry: zomer, keypad, calm, a climb to 20 that a single mistake never lowers, 30 questions at most', () => {
        const meta = skinById('aquarium')!.meta;
        expect(meta).toMatchObject({ input: 'keypad', timed: false, season: 'zomer', music: 'zee', round: { questions: 30, goal: 20, goalKeep: true }, accepts: { kinds: ['number'] } });
        expect(meta.canFail).toBeFalsy();
        expect(gameGroupOf(meta)).toBe('rustig');
        expect(GAME_BLURB.aquarium).toBeTruthy();
    });

    test('an item per right answer; one mistake costs nothing, two in a row take a fish and one off the climb', () => {
        fixed();
        start();
        const { container } = render(<Wired />);
        const items = () => container.querySelectorAll('.aq-swimmer, .aq-stand').length;
        expect(container.querySelector('.aq-world')!.textContent).toBe('');
        for (let i = 0; i < 5; i++) right();
        expect(sp().climb).toBe(5);
        expect(items()).toBeGreaterThanOrEqual(5);
        wrong();
        expect(sp().climb).toBe(5);
        wrong();
        expect(sp().climb).toBe(4);
        expect(container.querySelector('.aq-cat.is-catch')).not.toBeNull();
        right();
        expect(sp().climb).toBe(5);
        // The setback never goes below 0 and is ignored outside a goal round's play.
        act(() => useSpelStore.setState({ climb: 0 }));
        act(() => sp().setback());
        expect(sp().climb).toBe(0);
    });

    test('the round ends won at 20; the end screen shows the tank and the napping cat', () => {
        fixed();
        start();
        render(<Wired />);
        for (let i = 0; i < 20; i++) right();
        expect(sp().phase).toBe('end');
        expect(sp().outcome).toBe('won');
        const { container } = render(<AquariumEnding outcome="won" progress={progressOf(sp())} options={{}} />);
        expect(container.querySelector('.aq-cat-nap')).not.toBeNull();
        expect(container.querySelectorAll('.aq-swimmer').length).toBeGreaterThan(8);
        expect(sp().result).toBeNull();
    });

    test('a jackpot round ends on the white goldfish with its own title', () => {
        window.history.pushState({}, '', '/?goudvis=wit');
        try {
            start();
            const { container } = render(<Wired />);
            for (let i = 0; i < 19; i++) right();
            expect(container.querySelector('.aq-goldfish.is-white')).toBeNull();
            act(() => sp().answer(sp().question!.answer));
            expect(container.querySelector('.aq-goldfish.is-white')).not.toBeNull();
            act(() => sp().next());
            expect(sp().outcome).toBe('won');
            expect(sp().result?.title).toBe('Een zeldzame witte goudvis!');
        } finally {
            window.history.pushState({}, '', '/');
        }
    });
});
