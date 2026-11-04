// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { TOOL_CATALOG, FAVORITES_KEY, MAX_FAVORITES, loadFavorites, toggleFavorite } from '../board/toolCatalog';
import { backgroundStyle, PATTERN_LABELS, BACKGROUND_SCALES } from '../board/backgrounds';
import { makeBoardBlock, regenerateBoardBlock, sheetSeedContext } from '../board/boardBlocks';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { DEFAULT_BASE } from '../config/baseSettings';
import type { BackgroundPattern } from '../board/boardTypes';
import type { MathBlock } from '../services/math/types';

// The small pure pieces around the board: the ★ favourites list, the background CSS and the
// board block factory's edges (the leaf-by-leaf factory check is boardLeaves/boardBlocks).
afterEach(() => {
    localStorage.clear();
    useWorksheetStore.setState({ baseSettings: { ...DEFAULT_BASE }, selectedGrade: null, curriculum: null });
});

describe('favourites', () => {
    test('toggle adds and removes, persists, and caps at the max', () => {
        expect(loadFavorites()).toEqual([]);
        expect(toggleFavorite('timer')).toEqual(['timer']);
        expect(toggleFavorite('klok')).toEqual(['timer', 'klok']);
        expect(toggleFavorite('timer')).toEqual(['klok']);
        for (const t of TOOL_CATALOG.slice(0, 10)) toggleFavorite(t.id);
        expect(loadFavorites()).toHaveLength(MAX_FAVORITES);
        expect(loadFavorites()[0]).toBe('klok');
    });

    test('unknown ids, garbage and non-arrays read as nothing', () => {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(['timer', 'weg-tool', 'klok']));
        expect(loadFavorites()).toEqual(['timer', 'klok']);
        localStorage.setItem(FAVORITES_KEY, '{x');
        expect(loadFavorites()).toEqual([]);
        localStorage.setItem(FAVORITES_KEY, '{"a":1}');
        expect(loadFavorites()).toEqual([]);
    });

    test('catalogue ids are unique', () => {
        const ids = TOOL_CATALOG.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('backgrounds', () => {
    const patterns = Object.keys(PATTERN_LABELS) as BackgroundPattern[];

    test.each(patterns.flatMap((p) => [false, true].flatMap((dark) => BACKGROUND_SCALES.map((s) => [p, dark, s.value] as const))))(
        '%s dark=%s scale=%s gives a base colour and a well-formed image', (pattern, dark, scale) => {
            const css = backgroundStyle({ pattern, dark, scale });
            expect(css.backgroundColor).toBe(dark ? '#1c2430' : '#ffffff');
            if (pattern === 'blanco') expect(css.backgroundImage).toBeUndefined();
            else expect(css.backgroundImage).toMatch(/gradient\(/);
            expect(JSON.stringify(css)).not.toMatch(/NaN|undefined/);
        });

    test('the scale multiplies the pattern size; absent = 1', () => {
        expect(backgroundStyle({ pattern: 'raster', dark: false }).backgroundSize).toBe('40px 40px');
        expect(backgroundStyle({ pattern: 'raster', dark: false, scale: 1.5 }).backgroundSize).toBe('60px 60px');
        expect(backgroundStyle({ pattern: 'lijnen', dark: false, scale: 0.75 }).backgroundSize).toBe('100% 33px');
    });

    test('an unknown pattern falls back to blanco', () => {
        expect(backgroundStyle({ pattern: 'ruit' as BackgroundPattern, dark: false })).toEqual({ backgroundColor: '#ffffff' });
    });
});

describe('board blocks', () => {
    test('an unknown typeId makes no block, and regenerating one returns it untouched', () => {
        expect(makeBoardBlock('bestaat-niet', { base: DEFAULT_BASE, grade: null })).toBeNull();
        const stray = { id: 'bw-x', typeId: 'bestaat-niet' } as MathBlock;
        expect(regenerateBoardBlock(stray)).toBe(stray);
    });

    test('the seed context follows the sheet, except a locked curriculum drops the leerjaar', () => {
        useWorksheetStore.getState().setSelectedGrade(4);
        expect(sheetSeedContext().grade).toBe(4);
        expect(sheetSeedContext().base).toBe(useWorksheetStore.getState().baseSettings);
        useWorksheetStore.setState({ curriculum: { locked: true } as never });
        expect(sheetSeedContext().grade).toBeNull();
    });
});
