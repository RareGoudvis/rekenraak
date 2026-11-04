import { describe, test, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEXT_FONT_OPTIONS, MATH_FONT_OPTIONS, INSTALLED_SUFFIX, ensureFontLoaded, type FontOption } from '../config/fontOptions';

const theme = readFileSync(join(__dirname, '..', 'assets', 'theme.css'), 'utf8');
const token = (name: string) => theme.match(new RegExp(String.raw`${name}:\s*([^;]+);`))?.[1].trim();

describe('sheet font options', () => {
    test('the first entry of each list is the theme default', () => {
        expect(TEXT_FONT_OPTIONS[0].value).toBe(token('--font-sheet-text'));
        expect(MATH_FONT_OPTIONS[0].value).toBe(token('--font-sheet-math'));
    });
    test('every region token exists and defaults to the text face', () => {
        for (const t of ['--font-sheet-header', '--font-sheet-titel', '--font-sheet-velden', '--font-sheet-footer']) {
            expect(token(t)).toBe(token('--font-sheet-text'));
        }
    });
    test('maths faces end in monospace; self-hosted faces never claim "als geïnstalleerd"', () => {
        for (const o of MATH_FONT_OPTIONS) expect(o.value.trim().endsWith('monospace')).toBe(true);
        for (const o of [...TEXT_FONT_OPTIONS, ...MATH_FONT_OPTIONS]) {
            expect(!!o.load && o.label.endsWith(INSTALLED_SUFFIX)).toBe(false);
        }
    });
    test('ensureFontLoaded loads a face once and ignores system fonts', async () => {
        const opt = TEXT_FONT_OPTIONS.find(o => o.load) as FontOption;
        const spy = vi.spyOn(opt, 'load').mockResolvedValue(undefined);
        await Promise.all([ensureFontLoaded(opt.value), ensureFontLoaded(opt.value)]);
        await ensureFontLoaded("Arial, 'Helvetica Neue', 'Ubuntu', sans-serif");
        await ensureFontLoaded(undefined);
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
