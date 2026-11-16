// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import Arena, { pickArena, readLastArena, saveLastArena, type ArenaKind } from '../oefenen/spelen/skins/tovenaarsduel/arenas';

// Tovenaarsduel's arenas: the pick (random, never the same twice in a row), the last arena in localStorage, and the
// contract the game codes against (one full-bleed slice SVG, no text, a reaction per raise of impact).

const KINDS: ArenaKind[] = ['lab', 'kerker', 'school'];
const KEY = 'rekenraak_tovenaar_arena_v1';

beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('pickArena', () => {
    test('never the same as the last one, for any rng value', () => {
        for (const last of KINDS) {
            for (const r of [0, 0.2, 0.49, 0.5, 0.51, 0.8, 0.999999, 1]) {
                const k = pickArena(last, () => r);
                expect(KINDS).toContain(k);
                expect(k).not.toBe(last);
            }
        }
    });
    test('both others come up after a given last; all three without a last', () => {
        expect(new Set([0, 0.99].map(r => pickArena('lab', () => r)))).toEqual(new Set(['kerker', 'school']));
        expect(new Set([0, 0.5, 0.99].map(r => pickArena(null, () => r)))).toEqual(new Set(KINDS));
        expect(new Set([0, 0.5, 0.99].map(r => pickArena(undefined, () => r)))).toEqual(new Set(KINDS));
    });
    test('with Math.random a long run never repeats', () => {
        let last: ArenaKind | null = null;
        for (let i = 0; i < 200; i++) {
            const k = pickArena(last);
            expect(k).not.toBe(last);
            last = k;
        }
    });
});

describe('readLastArena / saveLastArena', () => {
    test('nothing saved = null; a save reads back under its key', () => {
        expect(readLastArena()).toBeNull();
        saveLastArena('kerker');
        expect(localStorage.getItem(KEY)).toBe('kerker');
        expect(readLastArena()).toBe('kerker');
        saveLastArena('school');
        expect(readLastArena()).toBe('school');
    });
    test('an unknown value reads as null', () => {
        localStorage.setItem(KEY, 'zolder');
        expect(readLastArena()).toBeNull();
    });
    test('a storage that throws never breaks the game', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
        expect(() => saveLastArena('lab')).not.toThrow();
        expect(readLastArena()).toBeNull();
    });
});

describe('<Arena>', () => {
    const root = (c: HTMLElement) => c.firstElementChild as HTMLElement;

    test.each(KINDS)('%s: a full-bleed box with one slice SVG of 1600 x 700 and no text', kind => {
        const { container } = render(<Arena kind={kind} impact={0} side={null} />);
        const box = root(container);
        expect(box.style.position).toBe('absolute');
        expect(box.style.overflow).toBe('hidden');
        expect(box.getAttribute('aria-hidden')).toBe('true');
        const svgs = box.querySelectorAll('svg');
        expect(svgs).toHaveLength(1);
        expect(svgs[0].getAttribute('viewBox')).toBe('0 0 1600 700');
        expect(svgs[0].getAttribute('preserveAspectRatio')).toBe('xMidYMax slice');
        expect(box.querySelectorAll('text')).toHaveLength(0);
        expect(box.textContent).toBe('');
    });

    test('calm at mount, even with a counter already up', () => {
        const { container } = render(<Arena kind="lab" impact={7} side="left" />);
        expect(root(container).className).toBe('tva tva-lab');
        expect(container.querySelector('.tva-hitflash')).toBeNull();
    });

    test('each raise restarts the reaction (parity) on the side that was hit; a reset does not', () => {
        const { container, rerender } = render(<Arena kind="kerker" impact={0} side={null} />);
        rerender(<Arena kind="kerker" impact={1} side="left" />);
        expect(root(container).className).toBe('tva tva-kerker is-p1 is-hit-left');
        expect(container.querySelector('.tva-hitflash.is-left')).not.toBeNull();
        rerender(<Arena kind="kerker" impact={2} side="right" />);
        expect(root(container).className).toBe('tva tva-kerker is-p0 is-hit-right');
        rerender(<Arena kind="kerker" impact={0} side={null} />);
        expect(root(container).className).toBe('tva tva-kerker is-p0 is-hit-right');
        rerender(<Arena kind="kerker" impact={1} side={null} />);
        expect(root(container).className).toBe('tva tva-kerker is-p1 is-hit-mid');
    });

    test('a new arena starts calm', () => {
        const { container, rerender } = render(<Arena kind="school" impact={0} side={null} />);
        rerender(<Arena kind="school" impact={1} side="right" />);
        expect(root(container).className).toContain('is-p1');
        rerender(<Arena kind="lab" impact={1} side="right" />);
        expect(root(container).className).toBe('tva tva-lab');
        rerender(<Arena kind="lab" impact={2} side="left" />);
        expect(root(container).className).toBe('tva tva-lab is-p1 is-hit-left');
    });
});
