// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor } from '../oefenen/zelf/zelfSessie';
import { useSpelStore, type SpelFrom } from '../oefenen/spelen/useSpelStore';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinMeta } from '../oefenen/spelen/skins/types';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import { duelConfigOf } from '../oefenen/spelen/duel/options';
import { GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import Tovenaarsduel from '../oefenen/spelen/skins/tovenaarsduel/Tovenaarsduel';
import {
    TOVER, TOVER_RULE, freshMarks, healthTone, ladderStep, landTag, markHit, nextSpellOf, parseLandTag, spellOf,
} from '../oefenen/spelen/skins/tovenaarsduel/rule';
import { TOVER_SOUNDS, stepSound } from '../oefenen/spelen/skins/tovenaarsduel/sounds';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { DUEL_TIMING, freshSideView } from '../oefenen/spelen/duel/rules';
import { STAND, stageOf } from '../oefenen/spelen/skins/tovenaarsduel/geometry';
import type { DuelConfig, DuelFlags, DuelFlight, Side } from '../oefenen/spelen/duel/types';

// Tovenaarsduel on the duel engine: the spell ladder (IJspijl 1, Vuurbal 2, Bliksem 3, Schild, again), the shield
// that blocks the next hit and breaks, a wrong answer or a time-out back to IJspijl, the frost that never locks a
// keypad, the defeat, and the screen for 1 and 2 spelers.

let from: SpelFrom;
const tover = () => skinById('tovenaarsduel')!;
const meta = (picks: Record<string, string> = {}): SkinMeta => resolveMeta(tover().meta, picks);
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

describe('Tovenaarsduel: the pure rule', () => {
    test('the ladder: IJspijl, Vuurbal, Bliksem, Schild, then IJspijl again; the orb shows the next one', () => {
        expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(spellOf)).toEqual(['ijs', 'vuur', 'bliksem', 'schild', 'ijs', 'vuur', 'bliksem', 'schild', 'ijs']);
        expect([0, 1, 2, 3, 4].map(nextSpellOf)).toEqual(['ijs', 'vuur', 'bliksem', 'schild', 'ijs']);
        expect([0, 1, 2, 3, 4, 5].map(ladderStep)).toEqual([0, 1, 2, 3, 0, 1]);
        expect(TOVER.damage).toEqual({ ijs: 1, vuur: 2, bliksem: 3 });
    });

    test('a right answer casts at the other wizard (1–3) or raises a shield on yourself (4)', () => {
        const ctx = (streak: number) => ({ side: 'left' as Side, other: 'right' as Side, me: freshSideView(30), them: freshSideView(30), streak, level: 'normaal' as const, round: 1, config: {} as DuelConfig });
        expect(TOVER_RULE.right!(ctx(1)).launch).toMatchObject({ to: 'right', tag: 'ijs', ms: TOVER.castMs.ijs, data: { spell: 'ijs' } });
        expect(TOVER_RULE.right!(ctx(2)).launch).toMatchObject({ tag: 'vuur', data: { spell: 'vuur' } });
        expect(TOVER_RULE.right!(ctx(3)).launch).toMatchObject({ tag: 'bliksem', data: { spell: 'bliksem' } });
        expect(TOVER_RULE.right!(ctx(4))).toEqual({ flags: { left: { shield: 1 } }, tag: 'schild' });
        expect(TOVER_RULE.wrong).toBeUndefined();
    });

    test('landing: the damage, or a raised shield eats it and breaks', () => {
        const flight = (spell: string) => ({ data: { spell }, to: 'right' } as unknown as DuelFlight);
        const ctx = (shield: number) => ({ side: 'left' as Side, other: 'right' as Side, me: freshSideView(30), them: { ...freshSideView(30), flags: (shield ? { shield } : {}) as DuelFlags }, streak: 1, level: 'normaal' as const, round: 1, config: {} as DuelConfig });
        expect(TOVER_RULE.land!(ctx(0), flight('bliksem'))).toEqual({ damage: { right: 3 }, tag: 'bliksem' });
        expect(TOVER_RULE.land!(ctx(1), flight('bliksem'))).toEqual({ flags: { right: { shield: 0 } }, tag: 'bliksem-blocked' });
        expect(parseLandTag(landTag('vuur', true))).toEqual({ spell: 'vuur', blocked: true });
        expect(parseLandTag('schild')).toBeNull();
    });

    test('marks pile up per kind and stop at 3; the bar colours; the chime climbs per step', () => {
        let m = freshMarks();
        for (let i = 0; i < 5; i++) m = markHit(m, 'vuur');
        m = markHit(m, 'ijs');
        expect(m).toEqual({ singe: 3, frost: 1, soot: 0 });
        expect([30, 18, 10, 9, 0].map(l => healthTone(l, 30))).toEqual(['ok', 'mid', 'mid', 'low', 'low']);
        expect([1, 2, 3, 4].map(stepSound)).toEqual(['step1', 'step2', 'step3', 'step4']);
        expect(TOVER_SOUNDS).toEqual(expect.arrayContaining(['iceShatter', 'fireBoom', 'thunder', 'shieldUp', 'shieldBlock', 'poof', 'fanfare']));
    });
});

describe('Tovenaarsduel: the stage', () => {
    test('the wizards stand near the edges at every band shape: a wide runway between them', () => {
        for (const aspect of [2.2, 3.2, 4.4]) {
            const st = stageOf(aspect);
            expect(st.x.left / st.w).toBeCloseTo(STAND, 2);
            expect(st.x.right / st.w).toBeCloseTo(1 - STAND, 2);
        }
        expect(STAND).toBeGreaterThanOrEqual(0.12);
        expect(STAND).toBeLessThanOrEqual(0.15);
    });
});

describe('Tovenaarsduel: a match on the engine', () => {
    const begin = (lives = 20, level: 'normaal' | 'moeilijk' = 'normaal') => {
        vi.useFakeTimers();
        du().begin({ meta: meta({ spelers: '2' }), from, rule: TOVER_RULE, config: { players: 2, level, lives, bestOf: 3, stream: 'own', readyMs: 0 } });
    };
    const right = (side: Side) => { du().answer(side, du().sides[side].question!.answer); };
    const wrong = (side: Side) => { du().answer(side, `${du().sides[side].question!.answer}9`); };
    // One right answer and its spell landing (a shield has no flight), then the next sum.
    const cast = (side: Side) => {
        const spell = spellOf(du().sides[side].streak + 1);
        right(side);
        vi.advanceTimersByTime(spell === 'schild' ? 0 : TOVER.castMs[spell]);
        vi.advanceTimersByTime(DUEL_TIMING.flashRight);
    };

    test('four in a row: 1 + 2 + 3 damage, then a shield; the fifth is an IJspijl again', () => {
        begin();
        cast('left');
        expect(du().sides.right.lives).toBe(19);
        cast('left');
        expect(du().sides.right.lives).toBe(17);
        right('left');
        expect(du().flights).toHaveLength(1);
        expect(du().sides.right.lives).toBe(17);
        vi.advanceTimersByTime(TOVER.castMs.bliksem);
        expect(du().sides.right.lives).toBe(14);
        vi.advanceTimersByTime(DUEL_TIMING.flashRight);
        cast('left');
        expect(du().sides.left.flags.shield).toBe(1);
        expect(du().sides.right.lives).toBe(14);
        right('left');
        expect(du().flights[0].data.spell).toBe('ijs');
    });

    test('the shield blocks the next hit, a Bliksem too, and breaks', () => {
        begin();
        cast('right');
        cast('right');
        expect(du().sides.left.lives).toBe(17);
        for (let i = 0; i < 4; i++) cast('left');
        expect(du().sides.left.flags.shield).toBe(1);
        right('right');
        vi.advanceTimersByTime(TOVER.castMs.bliksem);
        expect(du().sides.left.lives).toBe(17);
        expect(du().sides.left.flags.shield).toBeUndefined();
    });

    test('a shield raised while a spell is on its way still blocks it', () => {
        begin();
        for (let i = 0; i < 3; i++) cast('left');
        right('right');
        right('left');
        expect(du().sides.left.flags.shield).toBe(1);
        vi.advanceTimersByTime(TOVER.castMs.ijs);
        expect(du().sides.left.lives).toBe(20);
        expect(du().sides.left.flags.shield).toBeUndefined();
    });

    test('a wrong answer breaks the streak: back to IJspijl', () => {
        begin();
        cast('left');
        cast('left');
        wrong('left');
        expect(du().sides.left.streak).toBe(0);
        expect(nextSpellOf(du().sides.left.streak)).toBe('ijs');
        vi.advanceTimersByTime(DUEL_TIMING.flashWrong);
        cast('left');
        expect(du().sides.right.lives).toBe(20 - 1 - 2 - 1);
    });

    test('the frost is only a picture: the frozen wizard answers on at once', () => {
        begin();
        cast('left');
        const r = du().sides.right;
        expect(r.locked).toBe(false);
        expect(r.feedback).toBeNull();
        expect(r.question).not.toBeNull();
        right('right');
        expect(du().sides.right.streak).toBe(1);
    });

    test('a Moeilijk time-out breaks the streak too', () => {
        begin(20, 'moeilijk');
        cast('left');
        cast('left');
        vi.advanceTimersByTime(10_000);
        expect(du().sides.left.streak).toBe(0);
    });

    test('0 lives: the wizard is defeated, the round is lost, the card waits for the defeat', () => {
        begin(5);
        cast('left');
        cast('left');
        expect(du().sides.right.lives).toBe(2);
        right('left');
        vi.advanceTimersByTime(TOVER.castMs.bliksem);
        expect(du().sides.right.lives).toBe(0);
        expect(du().phase).toBe('roundEnd');
        expect(du().sides.left.wins).toBe(1);
        vi.advanceTimersByTime(TOVER.endMs - 1);
        expect(du().card).toBe(false);
        vi.advanceTimersByTime(1);
        expect(du().card).toBe(true);
    });
});

describe('Tovenaarsduel: the tile and the screen', () => {
    test('a 1-2 player duel tile; levens 20 / 30 / 40 (default 30); a blurb', () => {
        const t = tover();
        expect(t.meta).toMatchObject({ id: 'tovenaarsduel', label: 'Tovenaarsduel', input: 'keypad', players: '1-2' });
        expect(t.Screen && !t.Component).toBeTruthy();
        expect(t.meta.options!.map(o => o.id)).toEqual(['spelers', 'niveau', 'levens', 'rondes']);
        const lives = t.meta.options!.find(o => o.id === 'levens')!;
        expect(lives.choices.map(c => c.value)).toEqual(['20', '30', '40']);
        expect(lives.default).toBe('30');
        expect(duelConfigOf(meta().chosen).lives).toBe(30);
        expect(GAME_BLURB.tovenaarsduel).toBeTruthy();
    });

    test('2 spelers: two keypads, health bars with the number, the orb and the ladder, a hit number, the defeat', () => {
        vi.useFakeTimers();
        render(<Tovenaarsduel meta={meta({ spelers: '2', levens: '20' })} from={from} onExit={() => { }} />);
        tick(DUEL_TIMING.readyMs);
        expect(screen.getByRole('group', { name: 'Cijfers Paars' })).toBeTruthy();
        expect(screen.getByRole('group', { name: 'Cijfers Rood' })).toBeTruthy();
        expect(screen.getByRole('region', { name: 'Paars' })).toBeTruthy();
        expect(document.querySelector('.duel-hearts')).toBeNull();
        expect(screen.getAllByRole('img', { name: '20 van 20 levens' })).toHaveLength(2);
        expect(screen.getAllByRole('img', { name: 'Volgende spreuk: IJspijl' })).toHaveLength(2);
        expect(document.querySelectorAll('.tv-orb.is-ijs')).toHaveLength(2);
        act(() => du().answer('left', du().sides.left.question!.answer));
        expect(document.querySelector('.tv-shot.is-ijs')).not.toBeNull();
        expect(screen.getByRole('img', { name: 'Volgende spreuk: Vuurbal' })).toBeTruthy();
        tick(TOVER.castMs.ijs);
        expect(document.querySelector('.tv-impact.is-ijs')).not.toBeNull();
        expect(document.querySelector('.tv-pop')?.textContent).toBe('-1');
        expect(screen.getByRole('img', { name: '19 van 20 levens' })).toBeTruthy();
        expect(document.querySelector('.tv-wiz.is-right .tv-crust')).not.toBeNull();
        // Hit down to 0: the defeat and Poef!
        act(() => useDuelStore.getState().effect('left', { damage: { right: 19 } }));
        expect(document.querySelector('.tv-wiz.is-right.is-ko')).not.toBeNull();
        expect(screen.getByText('Poef!')).toBeTruthy();
        tick(TOVER.endMs);
        expect(screen.getByRole('button', { name: /Volgende ronde/ })).toBeTruthy();
        expect(document.querySelector('.tv-card-art')).not.toBeNull();
    });

    test('a shield shows a dome and a chip; a block says Blok!', () => {
        vi.useFakeTimers();
        render(<Tovenaarsduel meta={meta({ spelers: '2', levens: '20' })} from={from} onExit={() => { }} />);
        tick(DUEL_TIMING.readyMs);
        for (let i = 0; i < 4; i++) {
            act(() => du().answer('left', du().sides.left.question!.answer));
            tick(4 > i + 1 ? TOVER.castMs.vuur + DUEL_TIMING.flashRight : 0);
        }
        expect(document.querySelector('.tv-wiz.is-left .tv-dome')).not.toBeNull();
        expect(screen.getByRole('img', { name: 'Schild' })).toBeTruthy();
        act(() => du().answer('right', du().sides.right.question!.answer));
        tick(TOVER.castMs.ijs);
        expect(screen.getByText('Blok!')).toBeTruthy();
        expect(document.querySelector('.tv-impact.is-blocked')).not.toBeNull();
        expect(document.querySelector('.tv-wiz.is-left .tv-dome')).toBeNull();
    });

    test('1 speler: the computer plays the orange wizard', () => {
        vi.useFakeTimers();
        render(<Tovenaarsduel meta={meta({ spelers: '1' })} from={from} onExit={() => { }} />);
        act(() => useDuelStore.setState(s => ({ config: { ...s.config, rng: () => 0.5 } })));
        tick(DUEL_TIMING.readyMs);
        expect(screen.getByRole('group', { name: 'Cijfers Jij' })).toBeTruthy();
        expect(screen.queryByRole('group', { name: 'Cijfers Computer' })).toBeNull();
        expect(document.querySelectorAll('.tv-scene .tv-wiz')).toHaveLength(2);
        tick(15_000);
        expect(du().sides.right.right + du().sides.right.wrong).toBeGreaterThan(0);
    });
});
