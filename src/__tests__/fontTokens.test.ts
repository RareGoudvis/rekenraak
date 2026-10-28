import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { SHEET_MATH_FONT } from '../config/fontOptions';

// The maths face lives in one token so a teacher-picked font can replace it per region; a
// literal left in a viewer would silently keep Azeret Mono there.
const SRC = join(__dirname, '..');
const ALLOWED = new Set(['config/fontOptions.ts', '__tests__/fontTokens.test.ts']);

function walk(dir: string, out: string[] = []): string[] {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
    return out;
}

// Comments may name the font (glyph-advance notes in the layout estimates); only code counts.
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');

const files = walk(SRC).map(p => ({ rel: relative(SRC, p).replace(/\\/g, '/'), code: stripComments(readFileSync(p, 'utf8')) }));

describe('sheet fonts go through tokens', () => {
    test('no SVG presentation attribute with a CSS variable (it never resolves there)', () => {
        const bad = files.filter(f => f.rel !== '__tests__/fontTokens.test.ts' && /fontFamily="var\(/.test(f.code)).map(f => f.rel);
        expect(bad).toEqual([]);
    });
    test('no literal Azeret Mono outside theme.css and fontOptions.ts', () => {
        const bad = files.filter(f => !ALLOWED.has(f.rel) && /Azeret Mono/.test(f.code)).map(f => f.rel);
        expect(bad).toEqual([]);
    });
    test('SHEET_MATH_FONT matches the theme.css token', () => {
        const css = readFileSync(join(SRC, 'assets', 'theme.css'), 'utf8');
        const m = css.match(/--font-sheet-math:\s*([^;]+);/);
        expect(m?.[1].trim()).toBe(SHEET_MATH_FONT);
    });
});
