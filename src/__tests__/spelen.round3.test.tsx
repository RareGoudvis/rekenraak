// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, within, fireEvent } from '@testing-library/react';
import { SKINS } from '../oefenen/spelen/skins/registry';
import GamePicker from '../oefenen/spelen/GamePicker';
import { NUMBER_CONTENT, skinAccepts, skinsFor } from '../oefenen/spelen/accepts';
import { brusselsDay, easterSunday, seasonsOn } from '../oefenen/spelen/seasons';

// Spelen round 3: which content a game accepts (the picker hides the rest), the seasonal shelf.

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);
const OFF_SEASON = day('2026-10-01');
const labels = (group: HTMLElement) => within(group).getAllByRole('button').map(b => b.querySelector('.spel-tile-label')!.textContent);

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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
        render(<GamePicker onPick={vi.fn()} content={{ kind: 'choice' }} today={OFF_SEASON} />);
        const shown = labels(screen.getByRole('group', { name: 'Kies een spel' }));
        expect(shown).toEqual(SKINS.filter(s => s.meta.accepts.kinds.includes('choice')).map(s => s.meta.label));
        expect(shown).toContain('Ballonnen');
        expect(shown).not.toContain('Pinguïntoren');
        expect(shown).not.toContain('Zombies');
        expect(screen.queryByText('binnenkort')).toBeNull();
        cleanup();
        render(<GamePicker onPick={vi.fn()} today={OFF_SEASON} />);
        expect(labels(screen.getByRole('group', { name: 'Kies een spel' }))).toEqual(SKINS.map(s => s.meta.label));
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

    test('the picker: in-season games on "Nu extra leuk" on top, then all games; out of season no shelf', () => {
        const seasonal = SKINS.filter(s => s.meta.season);
        for (const s of seasonal) {
            const at = { sinterklaas: '2026-11-20', kerst: '2026-12-20', valentijn: '2027-02-10', pasen: '2027-03-10', lente: '2027-05-10' }[s.meta.season!];
            render(<GamePicker onPick={vi.fn()} today={day(at)} />);
            expect(screen.getByRole('heading', { name: 'Nu extra leuk' })).toBeTruthy();
            expect(labels(screen.getByRole('group', { name: 'Nu extra leuk' }))).toContain(s.meta.label);
            // Still in the full list, and playable from the shelf.
            expect(labels(screen.getByRole('group', { name: 'Kies een spel' }))).toContain(s.meta.label);
            cleanup();
        }
        const onPick = vi.fn();
        render(<GamePicker onPick={onPick} today={OFF_SEASON} />);
        expect(screen.queryByRole('heading', { name: 'Nu extra leuk' })).toBeNull();
        // Nothing is locked out of season.
        const tiles = within(screen.getByRole('group', { name: 'Kies een spel' })).getAllByRole('button') as HTMLButtonElement[];
        expect(tiles.every(t => !t.disabled)).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'Ballonnen' }));
        expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'ballonnen' }));
    });
});
