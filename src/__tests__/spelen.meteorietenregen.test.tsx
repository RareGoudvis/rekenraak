// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, act, fireEvent, within } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import { skinById } from '../oefenen/spelen/skins/registry';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import type { SkinMeta } from '../oefenen/spelen/skins/types';
import type { SpelFrom } from '../oefenen/spelen/useSpelStore';
import { MUSIC_IDS } from '../oefenen/spelen/music';
import { SOUND_KEY, resetSoundForTests, setSoundOn } from '../oefenen/spelen/sound';
import { useDuelStore } from '../oefenen/spelen/duel/duelStore';
import { DUEL_TIMING, freshSideView } from '../oefenen/spelen/duel/rules';
import type { DuelConfig, DuelCtx, DuelFlight, Side } from '../oefenen/spelen/duel/types';
import Meteorietenregen from '../oefenen/spelen/skins/meteorietenregen/Meteorietenregen';
import {
    METEOR, METEOR_RULE, PARTS, baseStage, incomingTo, partsKnocked, partsStanding, raisesShield, shieldLayerFor, shieldsOf,
} from '../oefenen/spelen/skins/meteorietenregen/rule';
import { APEX_Y, DOMES, ROOF, arcOf, strikeAt, toScene } from '../oefenen/spelen/skins/meteorietenregen/geometry';
import { METEOR_SOUNDS, playMeteor } from '../oefenen/spelen/skins/meteorietenregen/sounds';

// Meteorietenregen on the duel engine: the rule (a meteor per right answer, shields from 2 in a row that eat one
// meteor, a life per unshielded hit), the base's look per life, the flight geometry, its sounds, the screen.

let from: SpelFrom;
const du = () => useDuelStore.getState();
const skin = () => skinById('meteorietenregen')!;
const meta = (picks: Record<string, string> = {}): SkinMeta => resolveMeta(skin().meta, picks);
const q = (side: Side) => du().sides[side].question!;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const cfg = (over: Partial<DuelConfig> = {}): DuelConfig => ({ players: 2, level: 'normaal', lives: 3, bestOf: 3, stream: 'own', readyMs: 0, ...over });
const ctx = (streak: number, shields = 0, them = 0): DuelCtx => ({
    side: 'left', other: 'right', me: { ...freshSideView(3), streak, flags: shields ? { shield: shields } : {} }, them: { ...freshSideView(3), flags: them ? { shield: them } : {} },
    streak, level: 'normaal', round: 1, config: cfg(),
});
const flight = (o: Partial<DuelFlight> = {}): DuelFlight => ({ id: 1, from: 'left', to: 'right', tag: 'meteor', startedAt: 0, landsAt: 3000, data: {}, effect: { damage: { right: 1 }, tag: 'hit' }, ...o });
// Right answers with the 700 ms flash between them (own stream).
const rights = (side: Side, n: number) => { for (let i = 0; i < n; i++) { act(() => du().answer(side, q(side).answer)); tick(DUEL_TIMING.flashRight); } };

beforeAll(async () => {
    const data = await loadEenvoudigData();
    const choice: ZelfChoice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
    from = { choice, grade: 2, topicId: 'Hoofdrekenen · Optellen' };
});
beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(1_000_000);
    vi.spyOn(console, 'error').mockImplementation(() => { });
    localStorage.clear();
});
afterEach(() => { cleanup(); du().stop(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Meteorietenregen: the registry entry', () => {
    test('a duel for 1 or 2 spelers with the shared options, own sounds and a blurb', () => {
        const m = skin().meta;
        expect(m).toMatchObject({ id: 'meteorietenregen', label: 'Meteorietenregen', input: 'keypad', timed: false, players: '1-2' });
        expect(m.accepts.kinds).toEqual(['number']);
        expect(m.options!.map(o => o.id)).toEqual(['spelers', 'levens', 'niveau', 'rondes']);
        expect(meta().chosen).toEqual({ spelers: '2', niveau: 'normaal', levens: '10', rondes: '3' });
        // The launch is the scene's own sound.
        expect(m.sounds!.correct).toBeNull();
        expect(MUSIC_IDS).toContain(m.music);
        expect(skin().Screen && !skin().Component).toBeTruthy();
        expect(GAME_BLURB.meteorietenregen).toBeTruthy();
    });
});

describe('Meteorietenregen: the rule (pure)', () => {
    test('every right answer launches a meteor at the other base that takes a life when it lands', () => {
        const e = METEOR_RULE.right!(ctx(1));
        expect(e.damage).toBeUndefined();
        expect(e.launch).toMatchObject({ ms: METEOR.flightMs, tag: 'meteor', effect: { damage: { right: 1 } } });
        expect(e.flags).toBeUndefined();
        expect(METEOR.flightMs).toBe(3000);
    });

    test('2 right in a row raise a shield, 4 a second; never more than 2', () => {
        expect([1, 2, 3, 4, 5, 6].map(raisesShield)).toEqual([false, true, false, true, false, true]);
        expect(METEOR_RULE.right!(ctx(2)).flags).toEqual({ left: { shield: 1 } });
        expect(METEOR_RULE.right!(ctx(2)).tag).toBe('shield');
        expect(METEOR_RULE.right!(ctx(4, 1)).flags).toEqual({ left: { shield: 2 } });
        const full = METEOR_RULE.right!(ctx(6, 2));
        expect(full.flags).toBeUndefined();
        expect(full.launch).toBeTruthy();
    });

    test('a shield eats the meteor (one layer off, no life); without one the base loses a life', () => {
        // land: ctx.side = who launched it, so them = the target.
        expect(METEOR_RULE.land!(ctx(1, 0, 2), flight())).toEqual({ flags: { right: { shield: 1 } }, tag: 'blocked' });
        expect(METEOR_RULE.land!(ctx(1, 0, 1), flight())).toEqual({ flags: { right: { shield: 0 } }, tag: 'blocked' });
        expect(METEOR_RULE.land!(ctx(1, 0, 0), flight())).toEqual({ damage: { right: 1 }, tag: 'hit' });
    });

    test('a wrong answer or a time-out only breaks the streak: no extra cost, shields stay', () => {
        expect(METEOR_RULE.wrong).toBeUndefined();
        expect(METEOR_RULE.timeout).toBeUndefined();
        expect(METEOR_RULE.cardMs).toBe(METEOR.endMs);
    });

    test('which shield a meteor will strike: the shields minus the meteors landing first', () => {
        const a = flight({ id: 1, landsAt: 3000 });
        const b = flight({ id: 2, landsAt: 3500 });
        const c = flight({ id: 3, landsAt: 4000 });
        const other = flight({ id: 4, to: 'left', landsAt: 2000 });
        const all = [a, b, c, other];
        expect([a, b, c].map(f => shieldLayerFor(2, all, f))).toEqual([2, 1, 0]);
        expect(shieldLayerFor(0, all, a)).toBe(0);
        expect(incomingTo(all, 'right')).toBe(3);
        expect(incomingTo(all, 'left')).toBe(1);
        expect(shieldsOf({ flags: {} })).toBe(0);
        expect(shieldsOf({ flags: { shield: 2 } })).toBe(2);
    });

    test('the base loses at least one part per hit at 3, 5 and 7 lives, all of them at 0', () => {
        for (const lives of [3, 5, 7]) {
            expect(partsStanding(lives, lives)).toBe(PARTS.length);
            expect(partsStanding(0, lives)).toBe(0);
            for (let hp = lives; hp > 1; hp--) expect(partsKnocked(hp, hp - 1, lives).length, `${hp}/${lives}`).toBeGreaterThan(0);
        }
        expect(partsKnocked(3, 2, 3)).toEqual(['flag', 'antenna']);
        expect(baseStage(3, 3)).toMatchObject({ dents: 0, smoke: false, fire: false, crater: false });
        expect(baseStage(1, 3)).toMatchObject({ dents: 2, smoke: true, fire: true, crater: false });
        expect(baseStage(0, 3)).toMatchObject({ crater: true, smoke: false });
    });
});

describe('Meteorietenregen: the flight geometry', () => {
    test('a meteor flies from the launcher up to the apex and down onto the roof or the outer shield', () => {
        for (const [from, to] of [['left', 'right'], ['right', 'left']] as const) {
            for (const layer of [0, 1, 2]) {
                const arc = arcOf(from, to, layer);
                expect(arc.to).toEqual(toScene(to, strikeAt(layer)));
                // The middle of the parabola is the apex.
                expect(arc.from.y + arc.dy / 2 - arc.h).toBeCloseTo(APEX_Y, 5);
                expect(arc.dir).toBe(from === 'left' ? 1 : -1);
                // The head turns from up to down without ever wrapping (it is drawn mirrored for a leftward flight).
                expect(arc.heading[0]).toBeLessThan(0);
                expect(arc.heading[8]).toBeGreaterThan(0);
                for (let i = 1; i < 9; i++) expect(arc.heading[i]).toBeGreaterThan(arc.heading[i - 1]);
            }
        }
        expect(strikeAt(0)).toEqual(ROOF);
        // A shield strike is on its dome.
        for (const layer of [1, 2]) {
            const p = strikeAt(layer);
            const d = DOMES[layer - 1];
            expect((p.x / d.rx) ** 2 + (p.y / d.ry) ** 2).toBeCloseTo(1, 5);
        }
    });
});

describe('Meteorietenregen: its sounds', () => {
    test('every sound is a recipe that plays under the shared on / off', () => {
        class Param { setValueAtTime() { } exponentialRampToValueAtTime() { } value = 0; }
        class Node { connect<T>(n: T) { return n; } }
        let made = 0;
        class Ctx {
            state = 'running'; currentTime = 0; sampleRate = 8000; destination = new Node();
            resume() { return Promise.resolve(); }
            createGain() { return Object.assign(new Node(), { gain: new Param() }); }
            createBiquadFilter() { return Object.assign(new Node(), { type: '', frequency: new Param(), Q: new Param() }); }
            createOscillator() { made++; return Object.assign(new Node(), { type: '', frequency: new Param(), start() { }, stop() { } }); }
            createBuffer(_c: number, len: number, rate: number) { const d = new Float32Array(len); return { sampleRate: rate, getChannelData: () => d }; }
            createBufferSource() { made++; return Object.assign(new Node(), { buffer: null, start() { }, stop() { } }); }
        }
        const g = globalThis as unknown as { AudioContext?: unknown };
        g.AudioContext = Ctx;
        localStorage.setItem(SOUND_KEY, '0');
        resetSoundForTests();
        setSoundOn(true);
        expect(METEOR_SOUNDS).toEqual(['launch', 'whistle', 'alarm', 'shieldUp', 'shieldBlock', 'impact', 'bigBoom', 'firework']);
        for (const s of METEOR_SOUNDS) {
            const before = made;
            playMeteor(s);
            expect(made, s).toBeGreaterThan(before);
        }
        setSoundOn(false);
        const before = made;
        playMeteor('bigBoom');
        expect(made).toBe(before);
        delete g.AudioContext;
        resetSoundForTests();
    });
});

describe('Meteorietenregen: on the engine', () => {
    const begin = (over: Partial<DuelConfig> = {}) => du().begin({ meta: skin().meta, from, rule: METEOR_RULE, config: cfg(over) });

    test('a meteor lands after 3 s; a shield from 2 in a row eats the next one; 0 lives ends the round', () => {
        begin();
        rights('left', 1);
        expect(du().flights).toHaveLength(1);
        expect(du().sides.right.lives).toBe(3);
        tick(METEOR.flightMs - DUEL_TIMING.flashRight - 10);
        expect(du().sides.right.lives).toBe(3);
        tick(20);
        expect(du().sides.right.lives).toBe(2);
        // Right: 2 in a row = a shield; left's next meteor bounces off it.
        rights('right', 2);
        expect(shieldsOf(du().sides.right)).toBe(1);
        expect(du().sides.left.lives).toBe(3);
        rights('left', 1);
        tick(METEOR.flightMs);
        expect(shieldsOf(du().sides.right)).toBe(0);
        expect(du().sides.right.lives).toBe(2);
        // Left's own 2 in a row raised a shield too: it ate the first of right's two meteors, the second hit.
        expect(du().sides.left).toMatchObject({ lives: 2, flags: {} });
        // A wrong answer breaks left's streak but costs nothing more.
        act(() => du().answer('left', String(Number(q('left').answer) + 1)));
        expect(du().sides.left).toMatchObject({ streak: 0, lives: 2 });
        tick(DUEL_TIMING.flashWrong);
        rights('left', 1);
        tick(METEOR.flightMs);
        rights('left', 1);
        tick(METEOR.flightMs);
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
    });
});

describe('Meteorietenregen: the screen', () => {
    const ready = () => tick(DUEL_TIMING.readyMs);
    const hearts = (side: Side) => Number(document.querySelector(`.duel-corner.is-${side} .duel-hearts`)!.getAttribute('data-lives'));

    test('2 spelers: meteors fly, a hit takes a heart and a part, shields go up and block, the base explodes, fireworks, the card', () => {
        const { container } = render(<Meteorietenregen meta={meta({ spelers: '2', levens: '5' })} from={from} onExit={() => { }} />);
        ready();
        expect(container.querySelectorAll('.mt-base')).toHaveLength(2);
        expect(container.querySelector('.mt-rover')).toBeTruthy();
        const parts = () => container.querySelectorAll('.mt-base.is-right .mt-part').length;
        expect(parts()).toBe(PARTS.length);
        act(() => du().answer('left', q('left').answer));
        expect(container.querySelectorAll('.mt-meteor')).toHaveLength(1);
        expect(container.querySelector('.mt-barrel.is-fire')).toBeTruthy();
        // The target's beacon flashes while the meteor is coming.
        expect(container.querySelector('.mt-base.is-right .mt-beacon.is-alarm')).toBeTruthy();
        expect(container.querySelector('.mt-base.is-left .mt-beacon.is-alarm')).toBeNull();
        tick(METEOR.flightMs + 10);
        expect(container.querySelector('.mt-meteor')).toBeNull();
        expect(container.querySelector('.mt-fx.is-hit')).toBeTruthy();
        expect(screen.getByText('BOEM!')).toBeTruthy();
        expect(hearts('right')).toBe(4);
        expect(parts()).toBe(partsStanding(4, 5));
        // Right: 2 in a row = a green dome over its base.
        tick(DUEL_TIMING.flashRight);
        rights('right', 2);
        expect(container.querySelector('.mt-base.is-right .mt-dome.is-l1')).toBeTruthy();
        expect(container.querySelector('.mt-scene')!.getAttribute('data-shields')).toBe('0,1');
        expect(screen.getAllByText('Schild!').length).toBeGreaterThan(0);
        // Left's next meteor aims at that dome and bounces off.
        act(() => du().answer('left', q('left').answer));
        expect(container.querySelector('.mt-meteor[data-to="right"]')!.getAttribute('data-layer')).toBe('1');
        tick(METEOR.flightMs + 10);
        expect(container.querySelector('.mt-fx.is-block')).toBeTruthy();
        expect(container.querySelector('.mt-dome.is-breaking')).toBeTruthy();
        expect(screen.getByText('Geblokt!')).toBeTruthy();
        expect(hearts('right')).toBe(4);
        // Four more hits: the right base explodes into a crater, the left side cheers under fireworks.
        for (let i = 0; i < 4; i++) { tick(DUEL_TIMING.flashRight); act(() => du().answer('left', q('left').answer)); tick(METEOR.flightMs + 10); }
        expect(du()).toMatchObject({ phase: 'roundEnd', roundWinner: 'left' });
        expect(container.querySelector('.mt-base.is-right .mt-crater')).toBeTruthy();
        expect(container.querySelector('.mt-fx.is-boom')).toBeTruthy();
        expect(screen.getByText('KABOEM!')).toBeTruthy();
        expect(container.querySelector('.mt-fireworks')).toBeTruthy();
        expect(container.querySelector('.mt-base.is-left .mt-astro.is-won')).toBeTruthy();
        expect(container.querySelector('.mt-base.is-right .mt-astro.is-sooty')).toBeTruthy();
        expect(screen.queryByRole('dialog')).toBeNull();
        tick(METEOR.endMs);
        const card = screen.getByRole('dialog');
        expect(within(card).getByRole('heading', { name: 'Blauw wint ronde 1!' })).toBeTruthy();
        fireEvent.click(within(card).getByRole('button', { name: /Volgende ronde/ }));
        ready();
        // A new round: both bases whole again, no shields, no crater.
        expect(container.querySelector('.mt-crater')).toBeNull();
        expect(container.querySelector('.mt-dome')).toBeNull();
        expect(parts()).toBe(PARTS.length);
    });

    test('an unshielded crew panics while a meteor comes; with a shield up it stays calm', () => {
        const { container } = render(<Meteorietenregen meta={meta({ spelers: '2', levens: '5' })} from={from} onExit={() => { }} />);
        ready();
        act(() => du().answer('left', q('left').answer));
        tick(1000);
        expect(container.querySelector('.mt-base.is-right .mt-astro.is-panic')).toBeTruthy();
        tick(METEOR.flightMs);
        rights('right', 2);
        tick(1500);
        act(() => du().answer('left', q('left').answer));
        tick(1000);
        expect(container.querySelector('.mt-base.is-right .mt-astro.is-calm')).toBeTruthy();
    });

    test('Moeilijk: a ring per side; 1 speler: Jij against the computer', () => {
        render(<Meteorietenregen meta={meta({ spelers: '1', niveau: 'moeilijk' })} from={from} onExit={() => { }} />);
        act(() => useDuelStore.setState(s => ({ config: { ...s.config, rng: () => 0.5 } })));
        ready();
        expect(screen.getAllByText('Computer').length).toBeGreaterThan(0);
        expect(document.querySelector('.duel-bot')).toBeTruthy();
        expect(document.querySelectorAll('.duel-ring')).toHaveLength(2);
        expect(screen.getByRole('group', { name: 'Cijfers Jij' })).toBeTruthy();
    });
});
