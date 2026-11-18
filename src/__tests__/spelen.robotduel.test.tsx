// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor } from '../oefenen/zelf/zelfSessie';
import { useSpelStore, type SpelFrom } from '../oefenen/spelen/useSpelStore';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinMeta } from '../oefenen/spelen/skins/types';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import { GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import Robotduel from '../oefenen/spelen/skins/robotduel/Robotduel';
import { ROBOT, ROBOT_RULE, chargeOf, hitOf, hitTag, isSpecial, parseHitTag, platesOff } from '../oefenen/spelen/skins/robotduel/rule';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { DUEL_TIMING } from '../oefenen/spelen/duel/rules';
import type { DuelConfig, Side } from '../oefenen/spelen/duel/types';

// Robotduel on the duel engine: the damage rule (a punch for 1, the special every 3rd in a row for 2, a dropped
// guard doubles the next hit and is then back up, 0 lives = KO), the plates, and the screen for 1 and 2 spelers.

let from: SpelFrom;
const robot = () => skinById('robotduel')!;
const meta = (picks: Record<string, string> = {}): SkinMeta => resolveMeta(robot().meta, picks);
const du = () => useDuelStore.getState();
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeAll(async () => {
    const data = await loadEenvoudigData();
    const choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    from = { choice, grade: 2, topicId: 'Hoofdrekenen · Optellen' };
});
beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => { });
    localStorage.clear();
});
afterEach(() => { cleanup(); du().stop(); useSpelStore.getState().otherGame(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Robotduel: the pure rule', () => {
    test('the special every 3rd right answer in a row', () => {
        expect([0, 1, 2, 3, 4, 5, 6, 9].map(isSpecial)).toEqual([false, false, false, true, false, false, true, true]);
        expect([0, 1, 2, 3, 4].map(chargeOf)).toEqual([0, 1, 2, 0, 1]);
    });

    test('a dropped guard doubles a punch and a special', () => {
        expect(hitOf('punch', false)).toBe(1);
        expect(hitOf('punch', true)).toBe(2);
        expect(hitOf('special', false)).toBe(2);
        expect(hitOf('special', true)).toBe(4);
        expect(parseHitTag(hitTag('special', true))).toEqual({ kind: 'special', double: true });
        expect(parseHitTag(hitTag('punch', false))).toEqual({ kind: 'punch', double: false });
        expect(parseHitTag(undefined)).toEqual({ kind: 'punch', double: false });
    });

    test('plates come off as lives go, all of them at 0', () => {
        expect([5, 4, 3, 2, 1, 0].map(l => platesOff(l, 5))).toEqual([0, 1, 2, 3, 4, 4]);
        expect([3, 2, 1, 0].map(l => platesOff(l, 3))).toEqual([0, 2, 3, 4]);
        for (let l = 7; l > 0; l--) expect(platesOff(l - 1, 7)).toBeGreaterThanOrEqual(platesOff(l, 7));
    });

    test('a right answer launches a punch at the other side; a wrong one drops the own guard', () => {
        const view = { lives: 5, points: 0, streak: 1, right: 1, wrong: 0, flags: {} };
        const ctx = { side: 'left' as Side, other: 'right' as Side, me: view, them: view, streak: 1, level: 'normaal' as const, round: 1, config: {} as DuelConfig };
        expect(ROBOT_RULE.right!(ctx).launch).toMatchObject({ ms: ROBOT.punchMs, to: 'right', data: { special: false } });
        expect(ROBOT_RULE.right!({ ...ctx, streak: 3 }).launch).toMatchObject({ ms: ROBOT.specialMs, data: { special: true } });
        expect(ROBOT_RULE.wrong!(ctx)).toEqual({ flags: { left: { guard: 1 } } });
    });
});

describe('Robotduel: a match on the engine', () => {
    const begin = (lives = 7) => {
        vi.useFakeTimers();
        du().begin({ meta: meta({ spelers: '2' }), from, rule: ROBOT_RULE, config: { players: 2, level: 'normaal', lives, bestOf: 3, stream: 'own', readyMs: 0 } });
    };
    const right = (side: Side) => { du().answer(side, du().sides[side].question!.answer); };
    const wrong = (side: Side) => { du().answer(side, `${du().sides[side].question!.answer}9`); };
    // The punch lands after its wind-up, then the next sum shows.
    const punch = (side: Side) => {
        const special = isSpecial(du().sides[side].streak + 1);
        right(side);
        vi.advanceTimersByTime(special ? ROBOT.specialMs : ROBOT.punchMs);
        vi.advanceTimersByTime(DUEL_TIMING.flashRight);
    };

    test('a punch lands after its wind-up for 1; the 3rd in a row is the special for 2', () => {
        begin();
        right('left');
        expect(du().sides.right.lives).toBe(7);
        expect(du().flights).toHaveLength(1);
        vi.advanceTimersByTime(ROBOT.punchMs);
        expect(du().sides.right.lives).toBe(6);
        vi.advanceTimersByTime(DUEL_TIMING.flashRight);
        punch('left');
        expect(du().sides.right.lives).toBe(5);
        punch('left');
        expect(du().sides.right.lives).toBe(3);
        punch('left');
        expect(du().sides.right.lives).toBe(2);
    });

    test('a wrong answer drops the guard: the next hit counts double, then the guard is back up', () => {
        begin();
        wrong('right');
        expect(du().sides.right.flags.guard).toBe(1);
        vi.advanceTimersByTime(DUEL_TIMING.flashWrong);
        punch('left');
        expect(du().sides.right.lives).toBe(5);
        expect(du().sides.right.flags.guard).toBeUndefined();
        punch('left');
        expect(du().sides.right.lives).toBe(4);
    });

    test('a guard dropped while a fist is on its way still counts when it lands; a special on it hits for 4', () => {
        begin();
        punch('left');
        punch('left');
        right('left');
        wrong('right');
        vi.advanceTimersByTime(ROBOT.specialMs);
        expect(du().sides.right.lives).toBe(7 - 2 - 4);
    });

    test('0 lives = KO: the round is lost, the card waits for the fall', () => {
        begin(3);
        const fired: string[] = [];
        const off = du().events.on('roundEnd', ({ winner }) => fired.push(String(winner)));
        punch('left');
        punch('left');
        expect(du().sides.right.lives).toBe(1);
        right('left');
        vi.advanceTimersByTime(ROBOT.specialMs);
        expect(du().sides.right.lives).toBe(0);
        expect(du().phase).toBe('roundEnd');
        expect(fired).toEqual(['left']);
        expect(du().sides.left.wins).toBe(1);
        vi.advanceTimersByTime(ROBOT.koMs - 1);
        expect(du().card).toBe(false);
        vi.advanceTimersByTime(1);
        expect(du().card).toBe(true);
        off();
    });

    test('a Moeilijk time-out drops the guard too', () => {
        vi.useFakeTimers();
        du().begin({ meta: meta({ spelers: '2', niveau: 'moeilijk' }), from, rule: ROBOT_RULE, config: { players: 2, level: 'moeilijk', lives: 5, bestOf: 1, stream: 'own', readyMs: 0 } });
        vi.advanceTimersByTime(12_000);
        expect(du().sides.left.flags.guard).toBe(1);
        expect(du().sides.right.flags.guard).toBe(1);
    });
});

describe('Robotduel: the tile and the screen', () => {
    test('a 1-2 player duel tile with the shared options and a blurb', () => {
        const r = robot();
        expect(r.meta).toMatchObject({ id: 'robotduel', label: 'Robotduel', input: 'keypad', players: '1-2' });
        expect(r.Screen && !r.Component).toBeTruthy();
        expect(r.meta.options!.map(o => o.id)).toEqual(['spelers', 'levens', 'niveau', 'rondes']);
        expect(GAME_BLURB.robotduel).toBeTruthy();
    });

    test('2 spelers: two keypads, health bars instead of hearts, a POW on a hit, the KO banner', () => {
        vi.useFakeTimers();
        render(<Robotduel meta={meta({ spelers: '2', levens: '5' })} from={from} onExit={() => { }} />);
        tick(DUEL_TIMING.readyMs);
        expect(screen.getByRole('group', { name: 'Cijfers Blauw' })).toBeTruthy();
        expect(screen.getByRole('group', { name: 'Cijfers Oranje' })).toBeTruthy();
        expect(document.querySelector('.duel-hearts')).toBeNull();
        expect(screen.getAllByRole('img', { name: '5 van 5 levens' })).toHaveLength(2);
        act(() => du().answer('left', du().sides.left.question!.answer));
        tick(ROBOT.punchMs);
        expect(document.querySelector('.rd-pow')).not.toBeNull();
        expect(screen.getByRole('img', { name: '4 van 5 levens' })).toBeTruthy();
        act(() => du().answer('right', '99999'));
        expect(screen.getByRole('img', { name: 'Dekking weg' })).toBeTruthy();
        expect(document.querySelector('.rd-bot.is-right.is-guard')).not.toBeNull();
        tick(DUEL_TIMING.flashRight);
        act(() => du().answer('left', du().sides.left.question!.answer));
        tick(ROBOT.punchMs);
        // The dropped guard doubled that punch (4 -> 2); keep punching until the KO.
        expect(du().sides.right.lives).toBe(2);
        while (du().sides.right.lives > 0) {
            tick(DUEL_TIMING.flashRight);
            act(() => du().answer('left', du().sides.left.question!.answer));
            tick(ROBOT.punchMs);
        }
        expect(document.querySelector('.rd-bot.is-right.is-ko')).not.toBeNull();
        expect(screen.getByText('K.O.!')).toBeTruthy();
        tick(ROBOT.koMs);
        expect(screen.getByRole('button', { name: /Volgende ronde/ })).toBeTruthy();
        expect(document.querySelector('.rd-card-art')).not.toBeNull();
    });

    test('1 speler: the computer plays the orange robot', () => {
        vi.useFakeTimers();
        render(<Robotduel meta={meta({ spelers: '1' })} from={from} onExit={() => { }} />);
        act(() => useDuelStore.setState(s => ({ config: { ...s.config, rng: () => 0.5 } })));
        tick(DUEL_TIMING.readyMs);
        expect(screen.getByRole('group', { name: 'Cijfers Jij' })).toBeTruthy();
        expect(screen.queryByRole('group', { name: 'Cijfers Computer' })).toBeNull();
        expect(document.querySelectorAll('.rd-bot')).toHaveLength(2);
        tick(15_000);
        expect(du().sides.right.right + du().sides.right.wrong).toBeGreaterThan(0);
    });
});
