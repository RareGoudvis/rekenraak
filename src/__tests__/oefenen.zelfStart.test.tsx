// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, within } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import GameStrip from '../oefenen/zelf/GameStrip';
import { gameBlurb, GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import { GRADE_KEY } from '../oefenen/zelf/zelfGrade';
import { SKINS } from '../oefenen/spelen/skins/registry';
import KidBackdrop from '../oefenen/kiosk/KidBackdrop';
import { sceneOf } from '../oefenen/kiosk/backdrops';
import { resetKiosk } from './helpers/oefenKiosk';

const strip = () => screen.getByRole('region', { name: 'Je kan ook spelen!' });

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

describe('Zelf oefenen start: game strip', () => {
    test('lists every game in the registry, with its badges', async () => {
        render(<GameStrip today={new Date(Date.UTC(2026, 6, 1, 12))} />);
        const names = within(strip()).getAllByRole('button').map(b => b.getAttribute('aria-label'));
        expect(names).toHaveLength(SKINS.length);
        for (const s of SKINS) expect(names.some(n => n?.startsWith(s.meta.label))).toBe(true);
        expect(names).toContain('Zombies, op tijd');
        expect(names).toContain('Touwtrekken, 2 spelers');
        // No leerjaar names here: the tests and the smoke click "Leerjaar n".
        expect(names.some(n => /Leerjaar/.test(n ?? ''))).toBe(false);
    });

    test('an in-season game comes first with "nu!"', () => {
        render(<GameStrip today={new Date(Date.UTC(2026, 10, 20, 12))} />);
        const first = within(strip()).getAllByRole('button')[0];
        expect(first.getAttribute('aria-label')).toBe('Pakjesband, nu extra leuk');
        expect(first.textContent).toContain('nu!');
    });

    test('a tap opens a sheet with what you do and how to get there; Oké and Escape close it', () => {
        const onWish = vi.fn();
        render(<GameStrip onWish={onWish} />);
        fireEvent.click(within(strip()).getByRole('button', { name: /^Ballonnen/ }));
        const sheet = screen.getByRole('dialog', { name: 'Ballonnen' });
        expect(sheet.textContent).toContain(GAME_BLURB.ballonnen);
        expect(sheet.textContent).toContain('Kies je leerjaar bovenaan, kies wat je oefent en tik dan op Spelen.');
        expect(document.activeElement?.textContent).toBe('Oké!');
        fireEvent.click(within(sheet).getByRole('button', { name: 'Oké!' }));
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(onWish).toHaveBeenCalledWith('ballonnen');
        fireEvent.click(within(strip()).getByRole('button', { name: /^Bom/ }));
        expect(screen.getByRole('dialog', { name: 'Bom' }).textContent).toContain('op tijd');
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    test('a game without a line of its own falls back to its name', () => {
        expect(gameBlurb('nieuwspel', 'Nieuw spel')).toBe('Nieuw spel');
        const fake = { ...SKINS[0], meta: { ...SKINS[0].meta, id: 'nieuwspel', label: 'Nieuw spel' } };
        render(<GameStrip games={[fake]} />);
        fireEvent.click(within(strip()).getByRole('button', { name: 'Nieuw spel' }));
        const sheet = screen.getByRole('dialog', { name: 'Nieuw spel' });
        expect(sheet.textContent).toContain('Een nieuw spel om te ontdekken.');
    });

    test('every line is short, Dutch-plain and without an em dash', () => {
        for (const line of Object.values(GAME_BLURB)) {
            expect(line.length).toBeLessThanOrEqual(80);
            expect(line).not.toMatch(/—/);
        }
    });
});

describe('Zelf oefenen start: bundle', () => {
    // The strip shows labels and icons only: no game component may load with the start page.
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
