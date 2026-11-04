import { describe, test, expect } from 'vitest';
import { REGISTRY } from '../config/exerciseRegistry';
import { makeBlock } from './helpers/makeBlock';
import { splittableCount } from '../services/layout/splitBlock';
import { numberBlocks } from '../services/layout/blockNumbering';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Sheet furniture is a registry flag, not a typeId prefix: SheetBlock (no title, no number),
// splitBlock and the store's splitBlock all read isFurniture.
describe('isFurniture', () => {
    const furniture = Object.keys(REGISTRY).filter((t) => REGISTRY[t].isFurniture);

    test('flags exactly the blad-onderdelen', () => {
        expect(furniture.sort()).toEqual(['layout-kader', 'layout-lege-pagina', 'layout-raster', 'layout-schrijflijnen', 'layout-sectie']);
    });

    test.each(furniture)('%s generates nothing and cannot be split', (typeId) => {
        const block = makeBlock(typeId);
        expect(REGISTRY[typeId].generate(block)).toEqual([]);
        expect(splittableCount({ ...block, exercises: [1, 2, 3] } as unknown as typeof block)).toBe(0);
    });

    test('an exercise type is not furniture', () => {
        expect(REGISTRY['hr-std-optellen'].isFurniture).toBeUndefined();
    });

    test('no source file tests the typeId prefix instead of the flag', () => {
        const root = join(__dirname, '..');
        const offenders = (readdirSync(root, { recursive: true }) as string[])
            .filter(f => /\.tsx?$/.test(f) && !f.includes('__tests__'))
            .filter(f => /startsWith\(\s*['"]layout-['"]\s*\)/.test(readFileSync(join(root, f), 'utf8')));
        expect(offenders).toEqual([]);
    });

    test('furniture takes no opdracht number; the exercises around it count on', () => {
        const blocks = [
            { id: 'a', typeId: 'hr-std-optellen' },
            { id: 'b', typeId: 'layout-sectie' },
            { id: 'c', typeId: 'hr-std-aftrekken' },
        ];
        expect(numberBlocks(blocks)).toEqual({ a: 1, b: null, c: 2 });
    });
});
