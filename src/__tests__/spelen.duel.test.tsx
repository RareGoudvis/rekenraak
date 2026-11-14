// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, act, fireEvent, within } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinMeta } from '../oefenen/spelen/skins/types';
import type { SpelFrom } from '../oefenen/spelen/useSpelStore';
import Touwtrekken from '../oefenen/spelen/skins/touwtrekken/Touwtrekken';
import { DUEL, useDuelStore, winnerOf, type DuelEventMap, type Side } from '../oefenen/spelen/skins/touwtrekken/duelStore';

// Touwtrekken: two independent question streams, both keypads at the same moment, the shared sum of
// Om beurten (first right answer pulls, a wrong one locks only that side) and the win rule.

let from: SpelFrom;
let meta: SkinMeta;
const du = () => useDuelStore.getState();
const wrongOf = (answer: string) => String(Number(answer) + 1);
const q = (side: Side) => du().sides[side].question!;

beforeAll(async () => {
    const data = await loadEenvoudigData();
    const choice: ZelfChoice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    from = { choice, grade: 2, topicId: 'Hoofdrekenen · Optellen' };
    meta = skinById('touwtrekken')!.meta;
});
beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(1_000_000);
    du().setup({ meta, from });
    vi.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => { cleanup(); du().stop(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Touwtrekken rules', () => {
    test('the registry entry: two players, its own screen', () => {
        expect(meta).toMatchObject({ id: 'touwtrekken', players: 2, timed: false });
        expect(skinById('touwtrekken')!.Screen).toBeTruthy();
        expect(skinById('touwtrekken')!.Component).toBeUndefined();
    });

    test('the win rule: 5 steps past the middle at once, else the leaning side after 2 minutes, level = a draw', () => {
        expect(winnerOf(-DUEL.steps, false)).toBe('left');
        expect(winnerOf(DUEL.steps, false)).toBe('right');
        expect(winnerOf(4, false)).toBeNull();
        expect(winnerOf(2, true)).toBe('right');
        expect(winnerOf(-1, true)).toBe('left');
        expect(winnerOf(0, true)).toBe('draw');
        expect(DUEL.seconds).toBe(120);
    });

    test('samen: each side its own stream; answering on one side never touches the other', () => {
        du().start('samen');
        const r1 = q('right');
        expect(q('left')).toBeTruthy();
        du().answer('left', q('left').answer);
        expect(du().sides.left.score).toBe(1);
        expect(du().rope).toBe(-1);
        vi.advanceTimersByTime(DUEL.flash.right);
        expect(du().sides.left.history).toHaveLength(1);
        expect(du().sides.right.history).toHaveLength(0);
        expect(q('right')).toBe(r1);
        // Over a few sums the two streams differ (each draws on its own).
        const lefts: string[] = [], rights: string[] = [];
        for (let i = 0; i < 4; i++) {
            lefts.push(q('left').key); rights.push(q('right').key);
            du().answer('left', wrongOf(q('left').answer));
            du().answer('right', wrongOf(q('right').answer));
            vi.advanceTimersByTime(DUEL.flash.wrong);
        }
        expect(lefts).not.toEqual(rights);
        expect(new Set(lefts).size).toBe(4);
        expect(du().sides.right.history.map(h => h.exerciseKey)).toEqual(rights);
    });

    test('samen: a wrong answer pulls nothing and flashes the right one; a side cannot answer during its flash', () => {
        du().start('samen');
        const left = q('left');
        du().answer('left', wrongOf(left.answer));
        expect(du().rope).toBe(0);
        expect(du().sides.left.feedback).toMatchObject({ correct: false, expected: left.answer });
        du().answer('left', left.answer);
        expect(du().sides.left.history).toHaveLength(1);
        vi.advanceTimersByTime(DUEL.flash.wrong);
        expect(du().sides.left.feedback).toBeNull();
        expect(q('left')).not.toBe(left);
    });

    test('five pulls to one side win at once; the end event carries both scores', () => {
        const ends: DuelEventMap['end'][] = [];
        const off = du().events.on('end', e => ends.push(e));
        du().start('samen');
        du().answer('right', q('right').answer);
        vi.advanceTimersByTime(DUEL.flash.right);
        for (let i = 0; i < DUEL.steps + 1; i++) {
            if (du().phase !== 'play') break;
            du().answer('left', q('left').answer);
            vi.advanceTimersByTime(DUEL.flash.right);
        }
        expect(du().phase).toBe('end');
        expect(du().winner).toBe('left');
        expect(du().rope).toBe(-DUEL.steps);
        expect(ends).toEqual([{ winner: 'left', left: DUEL.steps + 1, right: 1 }]);
        off();
    });

    test('after 2 minutes: the side the flag leans to, or a draw', () => {
        du().start('samen');
        du().answer('right', q('right').answer);
        vi.advanceTimersByTime(DUEL.seconds * 1000);
        du().tick();
        expect(du()).toMatchObject({ phase: 'end', winner: 'right' });
        du().again();
        expect(du()).toMatchObject({ phase: 'play', mode: 'samen', rope: 0, winner: null });
        vi.advanceTimersByTime(DUEL.seconds * 1000);
        du().tick();
        expect(du().winner).toBe('draw');
    });

    test('om beurten: one shared sum; the first right answer pulls and locks the other side', () => {
        du().start('beurt');
        const shared = q('left');
        expect(q('right')).toBe(shared);
        du().answer('right', shared.answer);
        expect(du().rope).toBe(1);
        expect(du().sides.left.locked).toBe(true);
        du().answer('left', shared.answer);
        expect(du().sides.left.score).toBe(0);
        expect(du().rope).toBe(1);
        vi.advanceTimersByTime(DUEL.flash.right + 300);
        expect(q('left')).not.toBe(shared);
        expect(q('left')).toBe(q('right'));
        expect(du().sides.left.locked).toBe(false);
    });

    test('om beurten: a wrong answer locks only that side; the other may still take it; both wrong = next sum', () => {
        du().start('beurt');
        const s1 = q('left');
        du().answer('left', wrongOf(s1.answer));
        expect(du().sides.left.locked).toBe(true);
        expect(du().sides.right.locked).toBe(false);
        vi.advanceTimersByTime(5000);
        // No next sum while the other side can still answer.
        expect(q('right')).toBe(s1);
        du().answer('right', s1.answer);
        expect(du().rope).toBe(1);
        vi.advanceTimersByTime(DUEL.flash.right + 300);
        const s2 = q('left');
        expect(s2).not.toBe(s1);
        du().answer('left', wrongOf(s2.answer));
        du().answer('right', wrongOf(s2.answer));
        expect(du().rope).toBe(1);
        vi.advanceTimersByTime(DUEL.flash.wrong);
        expect(q('left')).not.toBe(s2);
        expect(du().shared).toHaveLength(4);
    });
});

describe('Touwtrekken screen', () => {
    const pad = (team: string) => screen.getByRole('group', { name: `Cijfers ${team}` });
    const down = (team: string, key: string) => {
        const b = pad(team).querySelector(`[data-key="${key}"]`)!;
        fireEvent.pointerDown(b, { pointerId: team === 'Blauw' ? 1 : 2, pointerType: 'touch', isPrimary: team === 'Blauw' });
    };

    test('the pre-start screen offers both modes; both keypads take input in the same tick', () => {
        render(<Touwtrekken meta={meta} from={from} onExit={vi.fn()} />);
        expect(screen.getByRole('heading', { name: 'Touwtrekken' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Samen tegelijk/ }));
        const a = q('left').answer, b = q('right').answer;
        // Two children tapping at once: their pointer events interleave in one task, nothing rendered between.
        act(() => {
            for (let i = 0; i < Math.max(a.length, b.length); i++) {
                if (a[i]) down('Blauw', a[i]);
                if (b[i]) down('Oranje', b[i]);
            }
            down('Blauw', 'ok');
            down('Oranje', 'ok');
        });
        expect(du().sides.left.score).toBe(1);
        expect(du().sides.right.score).toBe(1);
        expect(du().rope).toBe(0);
        expect(within(pad('Blauw')).getByLabelText('Antwoord').textContent).toBe(a);
        // After the flash both fields are empty for their new sums.
        act(() => { vi.advanceTimersByTime(DUEL.flash.right); });
        expect(within(pad('Blauw')).getByLabelText('Antwoord').textContent).toBe('');
        expect(within(pad('Oranje')).getByLabelText('Antwoord').textContent).toBe('');
    });

    test('om beurten on screen: the locked side waits, the answer stays hidden until the sum is closed; the end screen', () => {
        const onExit = vi.fn();
        render(<Touwtrekken meta={meta} from={from} onExit={onExit} />);
        fireEvent.click(screen.getByRole('button', { name: /Om beurten/ }));
        const s = q('left');
        act(() => { for (const d of wrongOf(s.answer)) down('Blauw', d); down('Blauw', 'ok'); });
        expect(screen.getByText('Nu mag de ander.')).toBeTruthy();
        expect(document.querySelector('.tt-sign-answer')).toBeNull();
        act(() => { for (const d of s.answer) down('Oranje', d); down('Oranje', 'ok'); });
        expect(screen.getByText('Trek!')).toBeTruthy();
        expect(document.querySelectorAll('.tt-sign-answer')).toHaveLength(2);
        expect(document.querySelector('.tt-pull')!.getAttribute('data-rope')).toBe('1');

        // Oranje pulls to the win.
        for (let i = 1; i < DUEL.steps; i++) {
            act(() => { vi.advanceTimersByTime(DUEL.flash.right + 300); });
            act(() => { for (const d of q('right').answer) down('Oranje', d); down('Oranje', 'ok'); });
        }
        expect(screen.getByRole('heading', { name: 'Oranje wint!' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Nakijken/ })).toBeNull();
        expect(within(screen.getByRole('dialog')).getAllByText(/Blauw|Oranje/).length).toBeGreaterThanOrEqual(2);
        fireEvent.click(screen.getByRole('button', { name: /Nog eens/ }));
        expect(du()).toMatchObject({ phase: 'play', mode: 'beurt', rope: 0 });
        fireEvent.click(screen.getByRole('button', { name: 'Terug' }));
        fireEvent.click(screen.getByRole('button', { name: 'Ja, stoppen' }));
        expect(onExit).toHaveBeenCalledOnce();
    });
});
