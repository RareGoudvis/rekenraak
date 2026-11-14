// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, within, act } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { gameBlurb, GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import { GameThumb } from '../oefenen/zelf/SpeelMeteenRow';
import { SPEEL_METEEN, resolveSpeelMeteen, speelMeteenFor, speelMeteenPreview } from '../oefenen/zelf/speelMeteen';
import { GRADE_KEY } from '../oefenen/zelf/zelfGrade';
import { SKINS, skinById } from '../oefenen/spelen/skins/registry';
import { skinsFor } from '../oefenen/spelen/accepts';
import { choiceCanPlay, spelContentOf } from '../oefenen/spelen/spelQuestion';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import type { Leerjaar } from '../config/gradePresets';
import KidBackdrop from '../oefenen/kiosk/KidBackdrop';
import { sceneOf } from '../oefenen/kiosk/backdrops';
import { resetKiosk } from './helpers/oefenKiosk';

const JULY = new Date(Date.UTC(2026, 6, 1, 12));
const SINTERKLAAS = new Date(Date.UTC(2026, 10, 20, 12));

beforeEach(() => {
    resetKiosk();
    vi.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Zelf oefenen start: leerjaar bar', () => {
    test('first visit: Kies je leerjaar, the topics out of reach; a pick opens them and is remembered', async () => {
        const { unmount } = render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        expect(screen.getByRole('heading', { name: 'Kies je leerjaar' })).toBeTruthy();
        const optellen = () => within(screen.getByRole('region', { name: 'Hoofdrekenen' })).getByRole('button', { name: 'Optellen' }) as HTMLButtonElement;
        expect(optellen().disabled).toBe(true);
        for (let g = 1; g <= 6; g++) expect(screen.getByRole('button', { name: `Leerjaar ${g}` }).getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(screen.getByRole('button', { name: 'Leerjaar 4' }));
        expect(screen.getByRole('button', { name: 'Leerjaar 4' }).getAttribute('aria-pressed')).toBe('true');
        expect(optellen().disabled).toBe(false);
        expect(screen.queryByRole('heading', { name: 'Kies je leerjaar' })).toBeNull();
        expect(localStorage.getItem(GRADE_KEY)).toBe('4');
        unmount();
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        expect(screen.getByRole('button', { name: 'Leerjaar 4' }).getAttribute('aria-pressed')).toBe('true');
    });

    test('a broken remembered value is ignored', async () => {
        localStorage.setItem(GRADE_KEY, '9');
        render(<OefenApp />);
        expect(await screen.findByRole('heading', { name: 'Kies je leerjaar' })).toBeTruthy();
    });
});

describe('Speel meteen: the config', () => {
    let data: EenvoudigData;
    beforeAll(async () => { data = await loadEenvoudigData(); });

    test('every line resolves at its leerjaar to a Zelf choice its game accepts', () => {
        for (const [g, list] of Object.entries(SPEEL_METEEN)) {
            const grade = Number(g) as Leerjaar;
            for (const e of list!) {
                const hit = resolveSpeelMeteen(data, grade, e);
                expect({ grade, title: e.title, ok: !!hit }).toEqual({ grade, title: e.title, ok: true });
                // The same check the game picker makes on that choice.
                expect(skinsFor(SKINS, spelContentOf(hit!.choice, grade)!).map(s => s.meta.id)).toContain(e.skin);
                expect(choiceCanPlay(hit!.choice, grade)).toBe(true);
            }
        }
    });

    test('8 to 12 tiles per playable leerjaar, a game at most twice, calm and timed mixed, plain titles', () => {
        for (const grade of [1, 2, 3, 4] as const) {
            const list = SPEEL_METEEN[grade]!;
            expect(list.length).toBeGreaterThanOrEqual(8);
            expect(list.length).toBeLessThanOrEqual(12);
            const per = new Map<string, number>();
            for (const e of list) per.set(e.skin, (per.get(e.skin) ?? 0) + 1);
            expect(Math.max(...per.values())).toBeLessThanOrEqual(2);
            const timed = list.filter(e => skinById(e.skin)!.meta.timed).length;
            expect(timed).toBeGreaterThanOrEqual(2);
            expect(list.length - timed).toBeGreaterThanOrEqual(2);
            expect(new Set(list.map(e => e.title)).size).toBe(list.length);
            for (const e of list) {
                expect(e.title).not.toMatch(/—|Leerjaar/);
                expect(e.title.length).toBeLessThanOrEqual(48);
            }
        }
        // Nothing plays above leerjaar 4 yet: no row there.
        expect(SPEEL_METEEN[5]).toBeUndefined();
    });

    test('a line that names no real choice, or content its game cannot play, drops out', () => {
        const bad = [
            { skin: 'ballonnen', topic: 'Hoofdrekenen · Optellen', choice: 'bestaat niet', title: 'x' },
            { skin: 'nieuwspel', topic: 'Hoofdrekenen · Optellen', choice: 'met', title: 'y' },
            // Zombies has a keypad: no clock faces.
            { skin: 'zombies', topic: 'Klok en kalender', choice: 'Klok lezen', title: 'z' },
        ];
        for (const e of bad) expect(resolveSpeelMeteen(data, 2, e)).toBeNull();
        expect(speelMeteenFor(data, 2, JULY, bad)).toEqual([]);
        // By key or by label: the same choice.
        const byKey = resolveSpeelMeteen(data, 2, { skin: 'ballonnen', topic: 'Hoofdrekenen · Optellen', choice: 'met', title: 'k' });
        const byLabel = resolveSpeelMeteen(data, 2, { skin: 'ballonnen', topic: 'Hoofdrekenen · Optellen', choice: 'Met brug', title: 'l' });
        expect(byKey!.choice.key).toBe(byLabel!.choice.key);
    });

    test('in season a seasonal game jumps to the front with nu!; out of season the config order stands', () => {
        const july = speelMeteenFor(data, 3, JULY);
        expect(july.map(t => t.entry)).toEqual(SPEEL_METEEN[3]);
        expect(july.some(t => t.nu)).toBe(false);
        const nov = speelMeteenFor(data, 3, SINTERKLAAS);
        expect(nov[0]).toMatchObject({ nu: true, entry: { skin: 'pakjesband' } });
        expect(nov.filter(t => t.nu).map(t => t.skin.meta.id)).toEqual(['pakjesband']);
        // The rest keep their order.
        expect(nov.slice(1).map(t => t.entry)).toEqual(SPEEL_METEEN[3]!.filter(e => e.skin !== 'pakjesband'));
        expect(speelMeteenPreview(SINTERKLAAS)[0].skin.meta.id).toBe('pakjesband');
    });
});

describe('Speel meteen: the row', () => {
    const row = () => screen.getByRole('region', { name: 'Speel meteen' });
    const tile = (name: string | RegExp) => within(row()).getByRole('button', { name });
    beforeEach(() => {
        useSpelStore.getState().otherGame();
        useSpelStore.getState().takePickerAt();
        window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener: () => { }, removeEventListener: () => { } })) as unknown as typeof window.matchMedia;
    });

    test('no leerjaar yet: the games dimmed and out of reach under the glowing bar', async () => {
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        expect(screen.getByRole('heading', { name: 'Kies je leerjaar' })).toBeTruthy();
        expect(row().className).toContain('is-dim');
        const buttons = within(row()).getAllByRole('button') as HTMLButtonElement[];
        expect(buttons.length).toBeGreaterThan(5);
        expect(buttons.every(b => b.disabled)).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'Leerjaar 3' }));
        expect(row().className).not.toContain('is-dim');
        expect(tile(/^Kasteel: tafels door elkaar/)).toBeTruthy();
        // Nothing plays at leerjaar 5: no row.
        fireEvent.click(screen.getByRole('button', { name: 'Leerjaar 5' }));
        expect(screen.queryByRole('region', { name: 'Speel meteen' })).toBeNull();
    });

    test('a tap starts that game with that oefening; Ander spel opens the game tiles of that choice', async () => {
        localStorage.setItem(GRADE_KEY, '2');
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        expect(tile('Voetbal: + met brug, op tijd').getAttribute('title')).toBe(GAME_BLURB.voetbal);
        fireEvent.click(tile('Ballonnen prikken: maaltafels'));
        const st = useSpelStore.getState();
        expect(st.phase).toBe('play');
        expect(st.meta!.id).toBe('ballonnen');
        expect(st.from).toMatchObject({ grade: 2, topicId: 'Hoofdrekenen · Maaltafels', choice: { key: '2|Hoofdrekenen · Maaltafels|alles' } });
        expect(st.question!.text).toMatch(/×/);
        act(() => useSpelStore.getState().otherGame());
        expect(await screen.findByRole('heading', { name: 'Kies een spel' })).toBeTruthy();
        expect(screen.getByText('Maaltafels: Alles door elkaar')).toBeTruthy();
    });

    test('a game with options shows its options screen first', async () => {
        localStorage.setItem(GRADE_KEY, '3');
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        fireEvent.click(tile(/^Voetbal: × 10 en × 100/));
        expect(useSpelStore.getState().phase).toBe('idle');
        expect(screen.getByRole('heading', { name: 'Voetbal' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: '5 minuten' }));
        fireEvent.click(screen.getByRole('button', { name: /Start/ }));
        const st = useSpelStore.getState();
        expect(st.meta).toMatchObject({ id: 'voetbal', round: { seconds: 300 } });
        expect(st.from!.choice.label).toBe('Keer 10 en 100');
        act(() => useSpelStore.getState().otherGame());
        cleanup();
        useSpelStore.getState().takePickerAt();
        // Ander spel on the options screen: back to the tiles.
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        fireEvent.click(tile(/^Kasteel: tafels door elkaar/));
        fireEvent.click(screen.getByRole('button', { name: /Ander spel/ }));
        expect(row()).toBeTruthy();
    });

    test('the thumbnail; a missing picture leaves the icon on its colour', () => {
        const { container } = render(<GameThumb skin={skinById('zombies')!} />);
        const img = container.querySelector('img')!;
        expect(img.getAttribute('src')).toMatch(/spelen\/thumbs\/zombies\.webp$/);
        expect(container.querySelector('.zelf-play-thumb svg')).not.toBeNull();
        fireEvent.error(img);
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('.zelf-play-thumb svg')).not.toBeNull();
    });

    test('every game line is short and without an em dash', () => {
        for (const line of Object.values(GAME_BLURB)) {
            expect(line.length).toBeLessThanOrEqual(80);
            expect(line).not.toMatch(/—/);
        }
        expect(gameBlurb('nieuwspel', 'Nieuw spel')).toBe('Nieuw spel');
        for (const s of SKINS) expect(GAME_BLURB[s.meta.id], s.meta.id).toBeTruthy();
    });
});

describe('Zelf oefenen start: bundle', () => {
    // The row shows labels, icons and thumbnails only: no game component may load with the start page.
    const sources = import.meta.glob('../oefenen/zelf/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

    test('the zelf files never import a skin component, only the registry', () => {
        expect(Object.keys(sources).length).toBeGreaterThan(3);
        for (const [file, src] of Object.entries(sources)) {
            const imports = [...src.matchAll(/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
            const skin = imports.filter(p => /spelen\/(skins|board)\//.test(p) && !/skins\/registry$/.test(p));
            expect({ file, skin }).toEqual({ file, skin: [] });
        }
    });

    test('the registry holds its components lazily, so importing it loads no game', () => {
        const lazy = Symbol.for('react.lazy');
        for (const s of SKINS) {
            const parts = [s.Component, s.Screen, s.Ending].filter(Boolean) as unknown as { $$typeof: symbol }[];
            expect(parts.length).toBeGreaterThan(0);
            for (const c of parts) expect(c.$$typeof).toBe(lazy);
        }
    });
});

describe('Leerjaar scenes', () => {
    test('one scene per leerjaar; no leerjaar keeps the sky and hill', () => {
        for (let g = 1; g <= 6; g++) expect(sceneOf(g)).not.toBeNull();
        for (const g of [undefined, null, 0, 7]) expect(sceneOf(g)).toBeNull();
        const { container, rerender } = render(<KidBackdrop clouds={false} />);
        expect(container.querySelector('.kid-hill')).not.toBeNull();
        rerender(<KidBackdrop clouds={false} grade={3} />);
        const bd = container.querySelector('.kid-backdrop')!;
        expect(bd.className).toContain('ks-3');
        expect(bd.getAttribute('aria-hidden')).toBe('true');
        expect(container.querySelector('.kid-hill')).toBeNull();
    });

    test('the topics screen follows the leerjaar bar', async () => {
        const { container } = render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        expect(container.querySelector('.kid-backdrop.is-theme')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Leerjaar 5' }));
        expect(container.querySelector('.kid-backdrop.ks-5')).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Leerjaar 2' }));
        expect(container.querySelector('.kid-backdrop.ks-2')).not.toBeNull();
    });
});
