// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { skinById } from '../oefenen/spelen/skins/registry';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import { PAIRS_SIZE } from '../oefenen/spelen/board/hartjes/hearts';
import {
    beamAt, beamRadius, flightOf, flipperVisit, inBeam, lookAt, loneCard, roomOf, tiltOf, BEAM_MAX_PX, BEAM_MIN_PX, FLIPPER_EVERY_MS, FLIPPER_FLIGHT_MS,
    FLIPPER_LONE_MS, FLIPPER_PASS_MS, FLIPPER_TURN_MS, PAIR_HIT_MS, ROOM_NARROW_PX, ROOM_WIDE_PX, TOUCH_LIFT,
} from '../oefenen/spelen/board/spookhuis/haunt';
import { SPOOK_THEMES, THEMES } from '../oefenen/spelen/board/spookhuis/themes';
import { nextTheme, pickTheme, readLastTheme, saveLastTheme } from '../oefenen/spelen/board/spookhuis/pick';
import { SPOOK_SOUNDS } from '../oefenen/spelen/board/spookhuis/sounds';
import { gameGroupOf } from '../oefenen/zelf/topicGames';
import { GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import type { SkinChoices } from '../oefenen/spelen/skins/types';
import SpelScreen from '../oefenen/spelen/SpelScreen';
import { resetKiosk } from './helpers/oefenKiosk';
import { useOefenStore } from '../oefenen/useOefenStore';

// Spookhuis: Hartjes koppelen's memory in a dark haunted place, read by a flashlight; one of three places per round,
// a visitor that turns a lone open card back (never a mistake), a pair moment and a mistake picture per place.

let choice: ZelfChoice;
const sp = () => useSpelStore.getState();
const META = () => skinById('spookhuis')!.meta;
const start = (picked: SkinChoices = {}) => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: resolveMeta(META(), picked) });
const cells = () => sp().board!.cells;
const wrongFor = (i: number) => cells()[(i + 1) % cells().length].question.answer;
const card = (root: HTMLElement, cell: number, side: 'sum' | 'answer') => root.querySelector<HTMLButtonElement>(`.sph-slot [data-cell="${cell}"].is-${side}`)!;
// The place is picked per round; the tests pin it like the dev ?spook= does.
const atPlace = (k: string) => window.history.replaceState(null, '', `/?spook=${k}`);

beforeAll(async () => {
    const data = await loadEenvoudigData();
    choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
});
beforeEach(() => {
    resetKiosk();
    useOefenStore.setState({ fixed: null });
    sp().otherGame();
    sp().takePickerAt();
    localStorage.clear();
    atPlace('klassiek');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); window.history.replaceState(null, '', '/'); });

describe('Spookhuis: the light and the visitor, pure', () => {
    test('the light: about a card wide, clamped; on a finger it shines above it, on a mouse right there', () => {
        expect(beamRadius(200)).toBeGreaterThan(110);
        expect(beamRadius(10)).toBe(BEAM_MIN_PX);
        expect(beamRadius(2000)).toBe(BEAM_MAX_PX);
        expect(beamAt({ x: 300, y: 400 }, 'mouse', 120)).toEqual({ x: 300, y: 400 });
        expect(beamAt({ x: 300, y: 400 }, 'touch', 120)).toEqual({ x: 300, y: 400 - 120 * TOUCH_LIFT });
        // Never above the stage.
        expect(beamAt({ x: 300, y: 10 }, 'touch', 120).y).toBeGreaterThan(0);
        expect(inBeam({ x: 50, y: 50 }, { x: 60, y: 60 }, 120)).toBe(true);
        expect(inBeam({ x: 50, y: 50 }, { x: 400, y: 60 }, 120)).toBe(false);
        const look = lookAt({ x: 0, y: 0 }, { x: 1000, y: 0 });
        expect(look.x).toBeCloseTo(1);
        expect(look.y).toBeCloseTo(0);
    });

    test('the visitor: due after its interval, turns a card that lay open alone long enough, else only passes by', () => {
        expect(flipperVisit(FLIPPER_EVERY_MS - 100, FLIPPER_LONE_MS)).toBe('none');
        expect(flipperVisit(FLIPPER_EVERY_MS, 0)).toBe('none');
        expect(flipperVisit(FLIPPER_EVERY_MS, FLIPPER_LONE_MS)).toBe('trick');
        expect(flipperVisit(FLIPPER_EVERY_MS + FLIPPER_PASS_MS, 0)).toBe('pass');
        expect(loneCard([4])).toBe(4);
        expect(loneCard([])).toBeNull();
        expect(loneCard([4, 7])).toBeNull();
        expect(FLIPPER_TURN_MS).toBeLessThan(FLIPPER_FLIGHT_MS);
        // It comes in from the far side, over the card, and leaves on the other side.
        const f = flightOf({ x: 900, y: 400 }, { w: 1000, h: 700 }, 200);
        expect(f.from.x).toBeLessThan(0);
        expect(f.to.x).toBeGreaterThan(1000);
        expect(f.at.x).toBe(900);
    });

    test('the room beside the cards, and each card\'s small tilt', () => {
        expect(roomOf(ROOM_WIDE_PX)).toBe('wide');
        expect(roomOf(ROOM_NARROW_PX)).toBe('narrow');
        expect(roomOf(ROOM_NARROW_PX - 1)).toBe('none');
        for (let id = 0; id < 16; id++) expect(Math.abs(tiltOf(12345, id))).toBeLessThanOrEqual(4.5);
        expect(tiltOf(1, 3)).toBe(tiltOf(1, 3));
    });
});

describe('Spookhuis: three places, one per round', () => {
    test('a random place, never the same one twice in a row; a forced one is remembered too', () => {
        for (const last of SPOOK_THEMES) for (const r of [0, .34, .5, .99, 1]) expect(pickTheme(last, () => r)).not.toBe(last);
        expect(new Set([0, .6].map(r => pickTheme('klassiek', () => r)))).toEqual(new Set(['zombie', 'schip']));
        saveLastTheme('schip');
        expect(readLastTheme()).toBe('schip');
        expect(nextTheme(null, () => 0)).not.toBe('schip');
        expect(nextTheme('zombie')).toBe('zombie');
        expect(readLastTheme()).toBe('zombie');
        expect(nextTheme('onbekend', () => 0)).not.toBe('zombie');
    });

    test('each place has its own visitor, line, sound and mistake picture', () => {
        expect(SPOOK_THEMES).toEqual(['klassiek', 'zombie', 'schip']);
        const of = (k: keyof typeof THEMES[keyof typeof THEMES]) => new Set(SPOOK_THEMES.map(t => THEMES[t][k]));
        for (const k of ['flipper', 'flipperSays', 'mistake', 'pairSound', 'mistakeSound', 'flipperSound'] as const) expect(of(k).size).toBe(3);
        for (const t of SPOOK_THEMES) for (const s of [THEMES[t].flipperSound, THEMES[t].pairSound, THEMES[t].mistakeSound]) expect(SPOOK_SOUNDS).toContain(s);
    });
});

describe('Spookhuis: the registry', () => {
    test('Halloween, Zoeken en koppelen, griezel music, Hartjes\' board round and content, Normaal / Moeilijk', () => {
        const m = META();
        expect(m).toMatchObject({ label: 'Spookhuis', input: 'board', timed: false, music: 'griezel', season: 'halloween' });
        expect(gameGroupOf(m)).toBe('zoeken');
        expect(m.round.board).toEqual(skinById('hartjes')!.meta.round.board);
        expect(m.accepts).toEqual(skinById('hartjes')!.meta.accepts);
        expect(m.options!.map(o => o.id)).toEqual(['niveau']);
        expect(resolveMeta(m, { niveau: 'moeilijk' }).round.board!.size).toBe(PAIRS_SIZE.moeilijk);
        expect(m.sounds).toMatchObject({ wrong: null, flip: 'flip' });
        expect(m.canFail).toBeFalsy();
        expect(skinById('spookhuis')!.Ending).toBeTruthy();
        expect(GAME_BLURB.spookhuis).toBeTruthy();
    });
});

describe('Spookhuis: the game', () => {
    test('closed cards in the dark, the light, the room\'s furniture; a turned card shines by itself', async () => {
        act(() => start());
        const { container } = render(<SpelScreen />);
        const group = await screen.findByRole('group', { name: 'Kaarten in het spookhuis' });
        const all = within(group).getAllByRole('button');
        expect(all).toHaveLength(12);
        expect(all.every(b => b.getAttribute('aria-label') === 'Kaart, dicht')).toBe(true);
        expect(container.querySelector('.sph-root.is-klassiek .sph-room-dark')).toBeTruthy();
        expect(container.querySelector('.sph-floor-dark')).toBeTruthy();
        expect(container.querySelector('.sph-k-portrait')).toBeTruthy();
        fireEvent.click(card(group, 0, 'sum'));
        expect(card(group, 0, 'sum').closest('.sph-slot')!.classList.contains('is-up')).toBe(true);
        expect(card(group, 0, 'sum').getAttribute('aria-label')).not.toBe('Kaart, dicht');
    }, 15_000);

    test('a found pair: the cards fly together and the place\'s visitor pops out', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        act(() => start());
        const { container } = render(<SpelScreen />);
        const group = await screen.findByRole('group', { name: 'Kaarten in het spookhuis' });
        fireEvent.click(card(group, 1, 'sum'));
        fireEvent.click(card(group, 1, 'answer'));
        expect(cells()[1].state).toBe('solved');
        const moment = container.querySelector('.sph-moment')!;
        expect(moment.querySelectorAll('.sph-fly')).toHaveLength(2);
        expect(moment.querySelector('.sph-pop .sph-k-ghost')).toBeTruthy();
        act(() => { vi.advanceTimersByTime(PAIR_HIT_MS + 20); });
        expect(moment.querySelector('.spel-burst.is-sparkle')).toBeTruthy();
        expect(container.querySelector('.sph-k-pumpkin.is-lit')).toBeTruthy();
        act(() => { vi.advanceTimersByTime(3000); });
        expect(container.querySelector('.sph-moment')).toBeNull();
    }, 15_000);

    test('a logged mistake turns the sum\'s card into the place\'s picture for a moment (Zombiehuis: a brain jelly)', async () => {
        atPlace('zombie');
        vi.useFakeTimers({ shouldAdvanceTime: true });
        act(() => start());
        const { container } = render(<SpelScreen />);
        const group = await screen.findByRole('group', { name: 'Kaarten in het zombiehuis' });
        const wrong = cells().findIndex(c => c.question.answer === wrongFor(0));
        for (let k = 0; k < 2; k++) {
            fireEvent.click(card(group, 0, 'sum'));
            fireEvent.click(card(group, wrong, 'answer'));
            if (k === 0) {
                expect(container.querySelector('.sph-mistake')).toBeNull();
                act(() => { vi.advanceTimersByTime(1500); });
            }
        }
        expect(sp().mistakes).toHaveLength(1);
        expect(container.querySelector('.sph-mistake .sph-z-jelly')).toBeTruthy();
        act(() => { vi.advanceTimersByTime(2500); });
        expect(container.querySelector('.sph-mistake')).toBeNull();
        expect(card(group, 0, 'sum').getAttribute('aria-label')).toBe('Kaart, dicht');
    }, 15_000);

    test('the visitor turns a lone open card back: no mistake, no point (Spookschip: the ghost pirate, "Arrr!")', async () => {
        atPlace('schip');
        vi.useFakeTimers({ shouldAdvanceTime: true });
        act(() => start());
        const { container } = render(<SpelScreen />);
        const group = await screen.findByRole('group', { name: 'Kaarten in het spookschip' });
        fireEvent.click(card(group, 2, 'sum'));
        // The card has lain open alone far longer than FLIPPER_LONE_MS once the visitor is due.
        act(() => { vi.advanceTimersByTime(FLIPPER_EVERY_MS + 300); });
        expect(container.querySelector('.sph-flipper.is-trick .sph-s-ghost')).toBeTruthy();
        expect(card(group, 2, 'sum').getAttribute('aria-label')).not.toBe('Kaart, dicht');
        act(() => { vi.advanceTimersByTime(FLIPPER_TURN_MS + 200); });
        expect(card(group, 2, 'sum').getAttribute('aria-label')).toBe('Kaart, dicht');
        expect(screen.getByText('Arrr!')).toBeTruthy();
        expect(sp().mistakes).toHaveLength(0);
        expect(sp().history).toHaveLength(0);
        act(() => { vi.advanceTimersByTime(FLIPPER_FLIGHT_MS); });
        expect(container.querySelector('.sph-flipper')).toBeNull();
    }, 15_000);

    test('no card open: the visitor only floats by later', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        act(() => start());
        const { container } = render(<SpelScreen />);
        await screen.findByRole('group', { name: 'Kaarten in het spookhuis' });
        act(() => { vi.advanceTimersByTime(FLIPPER_EVERY_MS + 500); });
        expect(container.querySelector('.sph-flipper')).toBeNull();
        act(() => { vi.advanceTimersByTime(FLIPPER_PASS_MS); });
        expect(container.querySelector('.sph-flipper:not(.is-trick)')).toBeTruthy();
    }, 15_000);

    test('a cleared board turns the lights on; the last one brings the crowd out; the end screen shows the place', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        act(() => start());
        const { container } = render(<SpelScreen />);
        await screen.findByRole('group', { name: 'Kaarten in het spookhuis' });
        act(() => { for (let i = 0; i < cells().length; i++) sp().boardPick(i, cells()[i].question.answer); });
        expect(container.querySelector('.sph-root.is-lit')).toBeTruthy();
        expect(screen.getByText('Het licht is aan!')).toBeTruthy();
        expect(container.querySelector('.sph-party')).toBeNull();
        act(() => { vi.advanceTimersByTime(2500); });
        expect(sp().board!.index).toBe(1);
        expect(container.querySelector('.sph-root.is-lit')).toBeNull();
        act(() => { for (let i = 0; i < cells().length; i++) sp().boardPick(i, cells()[i].question.answer); });
        expect(container.querySelector('.sph-party .sph-k-hanger')).toBeTruthy();
        act(() => { vi.advanceTimersByTime(2500); });
        expect(sp().phase).toBe('end');
        expect(await screen.findByText('Klaar!')).toBeTruthy();
        await vi.waitFor(() => expect(container.querySelector('.sph-ending.is-klassiek .sph-party')).toBeTruthy());
    }, 15_000);
});
