import { describe, test, expect } from 'vitest';
import { REGISTRY } from '../config/exerciseRegistry';
import { makeBlock } from './helpers/makeBlock';
import { splittableCount } from '../services/layout/splitBlock';

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
});
