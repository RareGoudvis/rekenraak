// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';
import LeerjaarBar from '../oefenen/zelf/LeerjaarBar';
import OefenApp from '../oefenen/OefenApp';
import { BAND, CHICK_PEEP_MS, HEADER_ORDER, TOY_LABEL, TOY_SOUND, TRICK_MS, driftLayout, eggLayout, headerSeasonOf, headerSeed, wornTile, type Season } from '../oefenen/zelf/headerSeason';
import { GRADE_KEY } from '../oefenen/zelf/zelfGrade';
import { SEASONS } from '../oefenen/spelen/seasons';
import { LEERJAREN, type Leerjaar } from '../config/gradePresets';
import { resetKiosk } from './helpers/oefenKiosk';

const sound = vi.hoisted(() => ({ play: vi.fn(), unlockSound: vi.fn() }));
vi.mock('../oefenen/spelen/sound', async orig => ({ ...(await orig<typeof import('../oefenen/spelen/sound')>()), ...sound }));

// Noon UTC: the same date in Brussels.
const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

// One day per effect set (2027: Easter 28 March, Aswoensdag 10 February).
const ONE_DAY: Record<Season, string> = {
    halloween: '2026-10-31', sinterklaas: '2026-12-05', kerst: '2026-12-24', winter: '2027-01-20', carnaval: '2027-02-05',
    valentijn: '2027-02-14', pasen: '2027-03-25', lente: '2027-05-10', zomer: '2027-06-15',
};

beforeEach(() => { resetKiosk(); sound.play.mockClear(); sound.unlockSound.mockClear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('headerSeasonOf: which set the header wears', () => {
    test('one day per season', () => {
        for (const s of SEASONS) expect(headerSeasonOf(day(ONE_DAY[s])), s).toBe(s);
    });

    test('outside every season: nothing', () => {
        for (const iso of ['2026-09-10', '2026-11-05', '2026-07-15', '2026-08-31']) expect(headerSeasonOf(day(iso)), iso).toBeNull();
    });

    test('overlaps: the more specific feast first', () => {
        // 2027-02-05: Valentijn, Carnaval and Winter all at once.
        expect(headerSeasonOf(day('2027-02-05'))).toBe('carnaval');
        // 2024: Aswoensdag fell on 14 February; that day is Valentijn's, the days before are Carnaval's.
        expect(headerSeasonOf(day('2024-02-14'))).toBe('valentijn');
        expect(headerSeasonOf(day('2024-02-10'))).toBe('carnaval');
        // Valentijn beats the broad Winter, Pasen beats Lente.
        expect(headerSeasonOf(day('2027-02-12'))).toBe('valentijn');
        expect(headerSeasonOf(day('2027-03-25'))).toBe('pasen');
        expect(headerSeasonOf(day('2027-04-10'))).toBe('lente');
    });

    test('the order lists every season once, the broad ones last', () => {
        expect([...HEADER_ORDER].sort()).toEqual([...SEASONS].sort());
        expect(HEADER_ORDER.slice(-2)).toEqual(['winter', 'zomer']);
    });

    test('the Brussels date counts: 23:30 UTC on 30 Nov is already December there', () => {
        expect(headerSeed(new Date('2026-11-30T23:30:00Z'))).toBe(20261201);
    });
});

describe('the seeded layout', () => {
    test('the same day gives the same particles, inside the strip', () => {
        for (const s of SEASONS) {
            const spec = BAND[s].drift;
            if (!spec) continue;
            const a = driftLayout(spec, 20261224);
            expect(a).toEqual(driftLayout(spec, 20261224));
            expect(a).toHaveLength(spec.count);
            for (const d of a) {
                expect(d.left).toBeGreaterThanOrEqual(0);
                expect(d.left).toBeLessThanOrEqual(100);
                expect(d.size).toBeGreaterThanOrEqual(spec.size[0]);
                expect(d.size).toBeLessThanOrEqual(spec.size[1]);
                expect(d.delay).toBeLessThanOrEqual(0);
            }
        }
        expect(eggLayout(5, 1)).toEqual(eggLayout(5, 1));
        expect(eggLayout(5, 1)).not.toEqual(eggLayout(5, 2));
    });

    test('few particles: light on the CPU', () => {
        for (const s of SEASONS) {
            const b = BAND[s];
            expect((b.drift?.count ?? 0) + (b.snow ?? 0) + (b.eggs ?? 0), s).toBeLessThanOrEqual(20);
        }
    });

    test('the hat goes on the chosen tile, else on a tile of the day', () => {
        expect(wornTile(4, 123)).toBe(4);
        for (const seed of [20261224, 20261225, 7]) expect(LEERJAREN).toContain(wornTile(null, seed));
    });
});

const tile = (g: Leerjaar) => screen.getByRole('button', { name: `Leerjaar ${g}` });

describe('LeerjaarBar in season', () => {
    test.each(SEASONS)('%s: the band, the hat on the chosen tile and the toy', s => {
        const { container } = render(<LeerjaarBar grade={3} onPick={() => { }} today={day(ONE_DAY[s])} />);
        const bar = container.querySelector('.zelf-years')!;
        expect(bar.classList.contains(`zf-${s}`)).toBe(true);
        const band = bar.querySelector('.zf-band')!;
        expect(band.getAttribute('aria-hidden')).toBe('true');
        // The band's own particles: snow, a drift, eggs or something crossing.
        expect(band.querySelectorAll('.spel-flake, .zf-p, .zf-peek, .zf-cross').length).toBeGreaterThan(0);
        expect(tile(3).querySelector(`.zf-wear.is-${s}`)).toBeTruthy();
        expect(container.querySelectorAll('.zf-wear')).toHaveLength(1);
        const toy = screen.getByRole('button', { name: TOY_LABEL[s] });
        // The toy stands beside the tiles, never inside their row.
        expect(bar.querySelector('.zelf-years-row')!.contains(toy)).toBe(false);
    });

    test('outside every season the bar stays plain', () => {
        const { container } = render(<LeerjaarBar grade={3} onPick={() => { }} today={day('2026-09-10')} />);
        expect(container.querySelector('.zelf-years')!.className).toBe('zelf-years');
        expect(container.querySelector('.zf-band, .zf-wear, .zf-toy, .zf-side')).toBeNull();
        expect(screen.getAllByRole('button')).toHaveLength(6);
    });

    test('a tapped toy plays its trick and its sound, then rests', () => {
        vi.useFakeTimers();
        const { container } = render(<LeerjaarBar grade={2} onPick={() => { }} today={day(ONE_DAY.carnaval)} />);
        const toy = screen.getByRole('button', { name: TOY_LABEL.carnaval });
        fireEvent.click(toy);
        expect(sound.unlockSound).toHaveBeenCalled();
        expect(sound.play).toHaveBeenCalledWith(TOY_SOUND.carnaval);
        expect(toy.classList.contains('is-trick')).toBe(true);
        expect(container.querySelector('.zf-band.is-trick .spel-burst')).toBeTruthy();
        act(() => { vi.advanceTimersByTime(TRICK_MS.carnaval + 10); });
        expect(toy.classList.contains('is-trick')).toBe(false);
    });

    test('the egg cracks, then the chick peeps', () => {
        vi.useFakeTimers();
        render(<LeerjaarBar grade={1} onPick={() => { }} today={day(ONE_DAY.pasen)} />);
        fireEvent.click(screen.getByRole('button', { name: TOY_LABEL.pasen }));
        expect(sound.play.mock.calls.map(c => c[0])).toEqual(['krak']);
        act(() => { vi.advanceTimersByTime(CHICK_PEEP_MS + 10); });
        expect(sound.play.mock.calls.map(c => c[0])).toEqual(['krak', 'piep']);
    });

    test.each(SEASONS)('%s: every tile tap still lands, also during a trick', s => {
        const onPick = vi.fn();
        render(<LeerjaarBar grade={null} onPick={onPick} today={day(ONE_DAY[s])} />);
        fireEvent.click(screen.getByRole('button', { name: TOY_LABEL[s] }));
        for (const g of LEERJAREN) fireEvent.click(tile(g));
        expect(onPick.mock.calls.map(c => c[0])).toEqual([...LEERJAREN]);
        // The decorations never take a tap themselves.
        expect(sound.play).toHaveBeenCalledTimes(1);
    });
});

describe('the Zelf home in season', () => {
    test('Kerst: the toy plays and a leerjaar is picked as always', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(day(ONE_DAY.kerst));
        const { container } = render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        expect(container.querySelector('.zelf-years.zf-kerst .zf-band .spel-snow')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Sneeuwbol' }));
        expect(sound.play).toHaveBeenCalledWith('sparkle');
        fireEvent.click(tile(4));
        expect(tile(4).getAttribute('aria-pressed')).toBe('true');
        expect(tile(4).querySelector('.zf-wear.is-kerst')).toBeTruthy();
        expect(localStorage.getItem(GRADE_KEY)).toBe('4');
    });
});
