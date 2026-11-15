// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup, screen, within, fireEvent } from '@testing-library/react';
import type { ComponentType } from 'react';
import { SKINS, skinById } from '../oefenen/spelen/skins/registry';
import type { SkinPhase, SkinProps } from '../oefenen/spelen/skins/types';
import GameRow from '../oefenen/zelf/GameRow';
import { GAME_GROUPS, gameGroupOf, gamesFor } from '../oefenen/zelf/topicGames';
import { NUMBER_CONTENT, skinAccepts, skinsFor } from '../oefenen/spelen/accepts';
import { brusselsDay, easterSunday, seasonsOn } from '../oefenen/spelen/seasons';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, useSpelStore } from '../oefenen/spelen/useSpelStore';
import type { SpelEventName } from '../oefenen/spelen/events';
import { choicesOf, mulberry32 } from '../oefenen/spelen/distractors';
import Pakjesband from '../oefenen/spelen/skins/pakjesband/Pakjesband';
import { BELT, beltDone, parcelAt, runStart, secondsUntilOff } from '../oefenen/spelen/skins/pakjesband/belt';
import Eieren from '../oefenen/spelen/skins/eieren/Eieren';
import Mollen from '../oefenen/spelen/skins/mollen/Mollen';
import { MOLE, isUp, molePace, newField, stepField } from '../oefenen/spelen/skins/mollen/moles';
import { resetKiosk } from './helpers/oefenKiosk';

// Spelen round 3: which content a game accepts (the picker hides the rest), the seasonal shelf, and the
// Pakjesband, Eieren zoeken and Mollen meppen skins wired to the real session.

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);
const OFF_SEASON = day('2026-10-01');
const labels = (group: HTMLElement) => within(group).getAllByRole('button').map(b => b.querySelector('.zelf-play-title')!.textContent);
// The games grid's order out of season: by category (Rustig, Op tijd, Samen, Zoeken), registry order within.
const calmFirst = (list: typeof SKINS) => GAME_GROUPS.flatMap(g => list.filter(s => gameGroupOf(s.meta) === g.id)).map(s => s.meta.label);

let choice: ZelfChoice;
const sp = () => useSpelStore.getState();
const log: { name: SpelEventName; payload: unknown }[] = [];
const offs: (() => void)[] = [];

beforeAll(async () => {
    const data = await loadEenvoudigData();
    choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
});
beforeEach(() => {
    resetKiosk();
    useOefenStore.setState({ fixed: null });
    sp().otherGame();
    sp().takePickerAt();
    log.length = 0;
    for (const name of ['correct', 'wrong', 'help', 'end'] as SpelEventName[]) offs.push(sp().events.on(name, p => log.push({ name, payload: p })));
    vi.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => { offs.splice(0).forEach(off => off()); cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

const start = (id: string) => act(() => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: skinById(id)!.meta }));

// A skin on the real session, the way SpelScreen wires it (without the lazy chunk and the shell).
function Wired({ Skin }: { Skin: ComponentType<SkinProps> }) {
    const st = useSpelStore();
    if (!st.question || !st.meta) return null;
    const progress = progressOf(st);
    return (
        <Skin question={{ key: st.question.key, text: st.question.text, index: progress.answered }} choices={st.question.choices}
            phase={st.phase as SkinPhase} feedback={st.feedback} onAnswer={st.answer} onHelp={() => st.openHelp()} onMiss={() => st.miss()}
            onFail={() => st.fail()} sound={() => { }} progress={progress} options={{}} events={st.events} reducedMotion={false} />
    );
}
const options = () => within(screen.getByRole('group', { name: 'Kies het antwoord' })).queryAllByRole('button', { hidden: true }) as HTMLButtonElement[];
const tapValue = (value: string) => fireEvent.click(options().find(b => !b.disabled && b.getAttribute('aria-label') === value)!);
const wrongOf = () => sp().question!.choices.find(c => c !== sp().question!.answer)!;
const names = () => log.map(l => l.name);

describe('accepts', () => {
    test('every skin says what it accepts; today (whole numbers) every skin shows', () => {
        expect(SKINS.every(s => s.meta.accepts.kinds.length > 0)).toBe(true);
        expect(skinsFor(SKINS, NUMBER_CONTENT)).toHaveLength(SKINS.length);
        // Keypad skins type a number; only tap skins take an exercise's own choices.
        for (const s of SKINS) {
            if (s.meta.input === 'keypad') expect(s.meta.accepts.kinds, s.meta.id).toEqual(['number']);
            else expect(s.meta.accepts.kinds, s.meta.id).toContain('number');
        }
        expect(SKINS.some(s => s.meta.accepts.kinds.includes('pair'))).toBe(false);
    });

    test('kinds, answer length and digits filter', () => {
        const tap = { kinds: ['number', 'choice'] as const, maxAnswerChars: 4 };
        expect(skinAccepts(tap, { kind: 'choice' })).toBe(true);
        expect(skinAccepts(tap, { kind: 'pair' })).toBe(false);
        expect(skinAccepts(tap, { kind: 'number', answerChars: 4 })).toBe(true);
        expect(skinAccepts(tap, { kind: 'number', answerChars: 5 })).toBe(false);
        // Unknown length fits.
        expect(skinAccepts(tap, { kind: 'number' })).toBe(true);
        const lock = { kinds: ['number'] as const, digits: true };
        expect(skinAccepts(lock, { kind: 'number', digitsOnly: true })).toBe(true);
        expect(skinAccepts(lock, { kind: 'number' })).toBe(false);
    });

    test('a choice question kind: the picker shows only the tap skins, the rest are hidden (no binnenkort)', () => {
        render(<GameRow games={gamesFor({ kind: 'choice' }, OFF_SEASON)} onPlay={vi.fn()} />);
        const shown = labels(screen.getByRole('group', { name: 'Kies een spel' }));
        expect(shown).toEqual(calmFirst(SKINS.filter(s => s.meta.accepts.kinds.includes('choice'))));
        expect(shown).toContain('Ballonnen');
        expect(shown).not.toContain('Pinguïntoren');
        expect(shown).not.toContain('Zombies');
        expect(screen.queryByText('binnenkort')).toBeNull();
        cleanup();
        render(<GameRow games={gamesFor(NUMBER_CONTENT, OFF_SEASON)} onPlay={vi.fn()} />);
        expect(labels(screen.getByRole('group', { name: 'Kies een spel' }))).toEqual(calmFirst(SKINS));
    });
});

describe('seasons', () => {
    test('Easter by the anonymous Gregorian algorithm', () => {
        expect(easterSunday(2026)).toEqual({ y: 2026, m: 4, d: 5 });
        expect(easterSunday(2027)).toEqual({ y: 2027, m: 3, d: 28 });
        expect(easterSunday(2028)).toEqual({ y: 2028, m: 4, d: 16 });
        expect(easterSunday(2038)).toEqual({ y: 2038, m: 4, d: 25 });
        expect(easterSunday(2285)).toEqual({ y: 2285, m: 3, d: 22 });
    });

    test('each season by its dates, edges included', () => {
        expect(seasonsOn(day('2026-11-14'))).toEqual([]);
        expect(seasonsOn(day('2026-11-15'))).toEqual(['sinterklaas']);
        expect(seasonsOn(day('2026-12-06'))).toEqual(['sinterklaas']);
        expect(seasonsOn(day('2026-12-07'))).toEqual(['kerst']);
        expect(seasonsOn(day('2026-12-25'))).toEqual(['kerst']);
        expect(seasonsOn(day('2027-01-06'))).toEqual(['kerst']);
        expect(seasonsOn(day('2027-01-07'))).toEqual([]);
        expect(seasonsOn(day('2027-02-01'))).toEqual(['valentijn']);
        expect(seasonsOn(day('2027-02-14'))).toEqual(['valentijn']);
        expect(seasonsOn(day('2027-02-15'))).toEqual([]);
        expect(seasonsOn(day('2026-05-31'))).toEqual(['lente']);
        expect(seasonsOn(day('2026-06-01'))).toEqual([]);
        expect(seasonsOn(day('2026-08-15'))).toEqual([]);
    });

    test('Pasen: the three weeks before Easter Monday and that day; overlaps list both', () => {
        // 2027: Easter 28 Mar, Monday 29 Mar → 8 Mar to 29 Mar.
        expect(seasonsOn(day('2027-03-07'))).toEqual([]);
        expect(seasonsOn(day('2027-03-08'))).toEqual(['pasen']);
        expect(seasonsOn(day('2027-03-20'))).toEqual(['pasen']);
        expect(seasonsOn(day('2027-03-21'))).toEqual(['pasen', 'lente']);
        expect(seasonsOn(day('2027-03-29'))).toEqual(['pasen', 'lente']);
        expect(seasonsOn(day('2027-03-30'))).toEqual(['lente']);
        // 2028: Easter 16 Apr, Monday 17 Apr → 27 Mar to 17 Apr.
        expect(seasonsOn(day('2028-03-26'))).toEqual(['lente']);
        expect(seasonsOn(day('2028-03-27'))).toEqual(['pasen', 'lente']);
        expect(seasonsOn(day('2028-04-17'))).toEqual(['pasen', 'lente']);
        expect(seasonsOn(day('2028-04-18'))).toEqual(['lente']);
    });

    test('the Brussels date, not UTC', () => {
        // 23:30 UTC on 14 Nov is already 15 Nov in Brussels (UTC+1).
        expect(brusselsDay(new Date('2026-11-14T23:30:00Z'))).toEqual({ y: 2026, m: 11, d: 15 });
        expect(seasonsOn(new Date('2026-11-14T23:30:00Z'))).toEqual(['sinterklaas']);
        // Summer time: 22:30 UTC on 31 May is 1 June there.
        expect(seasonsOn(new Date('2026-05-31T22:30:00Z'))).toEqual([]);
    });

    test('the games bar: in-season games first with nu!, then the rest; out of season no nu!', () => {
        const seasonal = SKINS.filter(s => s.meta.season);
        for (const s of seasonal) {
            const at = { sinterklaas: '2026-11-20', kerst: '2026-12-20', valentijn: '2027-02-10', pasen: '2027-03-10', lente: '2027-05-10' }[s.meta.season!];
            const games = gamesFor(NUMBER_CONTENT, day(at));
            render(<GameRow games={games} onPlay={vi.fn()} />);
            const first = within(screen.getByRole('group', { name: 'Kies een spel' })).getAllByRole('button').filter(b => /nu extra leuk$/.test(b.getAttribute('aria-label')!));
            expect(first.map(b => b.querySelector('.zelf-play-title')!.textContent)).toContain(s.meta.label);
            // In-season games lead their category; every game is still there.
            expect(games.findIndex(g => !g.nu)).toBe(games.filter(g => g.nu).length);
            const own = within(screen.getByRole('region', { name: GAME_GROUPS.find(x => x.id === gameGroupOf(s.meta))!.label })).getAllByRole('button');
            expect(own[0].getAttribute('aria-label')).toMatch(/nu extra leuk$/);
            expect(games).toHaveLength(SKINS.length);
            cleanup();
        }
        const onPlay = vi.fn();
        render(<GameRow games={gamesFor(NUMBER_CONTENT, OFF_SEASON)} onPlay={onPlay} />);
        expect(document.querySelector('.zelf-play-nu')).toBeNull();
        // Nothing is locked out of season.
        const tiles = within(screen.getByRole('group', { name: 'Kies een spel' })).getAllByRole('button') as HTMLButtonElement[];
        expect(tiles.every(t => !t.disabled)).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'Ballonnen' }));
        expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ meta: expect.objectContaining({ id: 'ballonnen' }) }));
    });
});

describe('the three new skins', () => {
    test('registry: Speelgoedfabriek (year-round, can sputter), Eieren zoeken (Pasen, nine options), Mollen meppen (two minutes)', () => {
        expect(skinById('pakjesband')!.meta).toMatchObject({ label: 'Speelgoedfabriek', input: 'choice', timed: false, round: { questions: 20 }, canFail: true });
        expect(skinById('pakjesband')!.meta.season).toBeUndefined();
        expect(skinById('eieren')!.meta).toMatchObject({ input: 'choice', choiceCount: 9, timed: false, round: { questions: 15 }, season: 'pasen' });
        expect(skinById('mollen')!.meta).toMatchObject({ input: 'choice', timed: true, round: { seconds: 120 } });
        expect(skinById('mollen')!.meta.season).toBeUndefined();
        // Nine eggs need nine numbers: an exercise's own few choices do not fit.
        expect(skinById('eieren')!.meta.accepts.kinds).toEqual(['number']);
        expect(skinById('pakjesband')!.meta.accepts.kinds).toContain('choice');
    });

    test('nine options: distinct, never negative, the answer among them (tiny answers too)', () => {
        for (let a = 0; a <= 120; a++) {
            const facts = { answer: a, operands: [Math.max(0, a - 3), Math.min(a, 3)], op: '+' as const };
            const c = choicesOf(facts, mulberry32(a + 7), 9);
            expect(c).toHaveLength(9);
            expect(new Set(c).size).toBe(9);
            expect(c).toContain(a);
            expect(c.every(v => Number.isInteger(v) && v >= 0)).toBe(true);
        }
        // Four options are unchanged by the count parameter (same seed, same order).
        const f = { answer: 12, operands: [7, 5], op: '+' as const };
        expect(choicesOf(f, mulberry32(3))).toEqual(choicesOf(f, mulberry32(3), 4));
    });

    test('Eieren: the session hands nine distinct options with the answer; a round is 15', () => {
        start('eieren');
        for (let i = 0; i < 15; i++) {
            const q = sp().question!;
            expect(q.kind).toBe('number');
            expect(q.choices).toHaveLength(9);
            expect(new Set(q.choices).size).toBe(9);
            expect(q.choices).toContain(q.answer);
            act(() => sp().answer(q.answer));
            act(() => sp().next());
        }
        expect(sp().phase).toBe('end');
        expect(sp().score).toBe(15);
    });

    test('Eieren: a right egg cracks into a chick and fills the basket; a wrong egg opens empty (no chick), the right one glows', () => {
        start('eieren');
        const { container } = render(<Wired Skin={Eieren} />);
        expect(options()).toHaveLength(9);
        expect(container.querySelector('.egg-basket')!.getAttribute('aria-label')).toBe('0 kuikens in het mandje');
        tapValue(sp().question!.answer);
        expect(names()).toEqual(['correct']);
        expect(container.querySelector('.egg-spot.is-chick .egg-chick')).not.toBeNull();
        expect(container.querySelector('.egg-basket')!.getAttribute('aria-label')).toBe('1 kuikens in het mandje');
        act(() => sp().next());
        const wrong = wrongOf();
        tapValue(wrong);
        expect(names()).toEqual(['correct', 'wrong']);
        expect(log[1].payload).toMatchObject({ given: wrong });
        const spot = container.querySelector('.egg-spot.is-empty')!;
        expect(spot.querySelector('.egg')!.getAttribute('aria-label')).toBe(wrong);
        expect(spot.querySelector('.egg-chick')).toBeNull();
        // The right egg lights up; the sign shows the answer.
        expect(container.querySelector('.egg-spot.is-answer .egg-num')!.textContent).toBe(sp().question!.answer);
        expect(container.querySelector('.egg-sign-answer')!.textContent).toBe(sp().question!.answer);
        // Keys 1 to 9 pick an egg.
        act(() => sp().next());
        const q = sp().question!;
        fireEvent.keyDown(window, { key: String(q.choices.indexOf(q.answer) + 1) });
        expect(names()).toEqual(['correct', 'wrong', 'correct']);
    });

    describe('timed by the belt and the moles (fake clock)', () => {
        beforeEach(() => { vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'performance', 'Date'] }); });
        const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

        test('the belt: the rightmost parcel falls off after about 12 s; parcels never move before their start', () => {
            expect(secondsUntilOff(BELT.parcels - 1)).toBeGreaterThan(10);
            expect(secondsUntilOff(BELT.parcels - 1)).toBeLessThan(14);
            expect(parcelAt(0, runStart())).toBe(BELT.start0);
            expect(beltDone(runStart())).toBe(false);
            expect(beltDone(1 - (BELT.start0 + 3 * BELT.gap))).toBe(true);
        });

        test('Pakjesband: right → correct, wrong → wrong, a parcel off the belt → a miss; help stops the belt', () => {
            start('pakjesband');
            const { container } = render(<Wired Skin={Pakjesband} />);
            expect(options()).toHaveLength(4);
            tapValue(sp().question!.answer);
            expect(names()).toEqual(['correct']);
            expect(container.querySelector('.pk-slot.is-down')).not.toBeNull();
            wait(800);
            const wrong = wrongOf();
            tapValue(wrong);
            expect(names()).toEqual(['correct', 'wrong']);
            expect(container.querySelector('.pk-slot.is-bounce')).not.toBeNull();
            wait(1700);
            // The next sum: under help the belt waits, however long.
            const key = sp().question!.key;
            act(() => sp().openHelp());
            wait(30_000);
            expect(sp().misses).toBe(0);
            expect(Number(container.querySelector<HTMLElement>('.pk-slot')!.dataset.at)).toBeCloseTo(BELT.start0);
            act(() => sp().closeHelp());
            wait(10_000);
            expect(sp().misses).toBe(0);
            wait(3_000);
            expect(sp().misses).toBe(1);
            expect(names()).toEqual(['correct', 'wrong', 'help', 'wrong']);
            expect(log[3].payload).toEqual({ given: '', expected: expect.any(String) });
            expect(sp().question!.key).toBe(key);
            expect(container.querySelector('.pk-slot.is-missed, .pk-slot.is-off')).not.toBeNull();
            // Met hulp: the miss is no counted mistake (only the wrong parcel is).
            expect(sp().mistakes).toHaveLength(1);
        });

        test('Pakjesband: a miss outside help counts as a mistake, then the next sum comes', () => {
            start('pakjesband');
            render(<Wired Skin={Pakjesband} />);
            const key = sp().question!.key;
            wait(13_000);
            expect(sp().misses).toBe(1);
            expect(sp().mistakes).toHaveLength(1);
            wait(1_700);
            expect(sp().question!.key).not.toBe(key);
        });

        test('Mollen: moles carry the options in turn; the answer comes up within a few pop-ups; max three up', () => {
            const opts = ['12', '11', '13', '22'];
            let f = newField(0);
            const seenAnswerAt: number[] = [];
            let seed = 1;
            const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            for (let t = 0; t <= 30_000; t += 50) {
                f = stepField(f, t, opts, rng);
                const up = f.moles.filter(m => isUp(m, t));
                expect(up.length).toBeLessThanOrEqual(MOLE.maxUp);
                expect(new Set(up.map(m => m!.value)).size).toBe(up.length);
                if (up.some(m => m!.value === '12' && m!.upAt > t - 50)) seenAnswerAt.push(t);
            }
            const gaps = seenAnswerAt.slice(1).map((t, i) => t - seenAnswerAt[i]);
            expect(seenAnswerAt.length).toBeGreaterThan(5);
            // Every option once per bag of four: never much more than two bags apart.
            expect(Math.max(...gaps)).toBeLessThanOrEqual(8 * MOLE.everyMs);
            expect(molePace(0)).toBe(1);
            expect(molePace(4)).toBeGreaterThan(1);
            expect(molePace(100)).toBe(molePace(MOLE.maxStreak));
        });

        test('Mollen: tap the right mole → correct (bonk), a wrong one → wrong; help freezes moles and clock', () => {
            start('mollen');
            const { container } = render(<Wired Skin={Mollen} />);
            const upMoles = () => [...container.querySelectorAll<HTMLElement>('.ml-hole.is-up')].map(h => h.dataset.mole);
            expect(upMoles()).toEqual([]);
            // Wait until the value pops up, then tap it.
            const waitFor = (value: string) => { for (let i = 0; i < 80 && !upMoles().includes(value); i++) wait(100); expect(upMoles()).toContain(value); };
            waitFor(sp().question!.answer);
            tapValue(sp().question!.answer);
            expect(names()).toEqual(['correct']);
            expect(container.querySelector('.ml-hole.is-bonked .ml-hammer')).not.toBeNull();
            wait(800);
            expect(container.querySelector('.ml-hole.is-bonked')).toBeNull();
            const wrong = wrongOf();
            waitFor(wrong);
            tapValue(wrong);
            expect(names()).toEqual(['correct', 'wrong']);
            expect(container.querySelector('.ml-hole.is-nope')).not.toBeNull();
            wait(1700);
            // Help: nothing pops up or goes down, the clock stands still.
            wait(1200);
            const before = upMoles();
            expect(before.length).toBeGreaterThan(0);
            act(() => sp().openHelp());
            const left = progressOf(sp()).msLeft;
            wait(20_000);
            expect(upMoles()).toEqual(before);
            expect(progressOf(sp()).msLeft).toBe(left);
            expect(container.querySelector('.ml-root.is-paused')).not.toBeNull();
            act(() => sp().closeHelp());
            wait(3_000);
            expect(upMoles()).not.toEqual(before);
            expect(progressOf(sp()).msLeft).toBeLessThan(left!);
        });

        test('Mollen: the round ends after two minutes of play', () => {
            start('mollen');
            render(<Wired Skin={Mollen} />);
            wait(60_000);
            act(() => sp().tick());
            expect(sp().phase).toBe('play');
            wait(61_000);
            act(() => sp().tick());
            expect(sp().phase).toBe('end');
            expect(names()).toContain('end');
        });
    });
});
