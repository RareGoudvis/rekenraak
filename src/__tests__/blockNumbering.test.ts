import { describe, test, expect } from 'vitest';
import { numberBlocks } from '../services/layout/blockNumbering';

const b = (id: string, typeId: string, skipNumbering?: boolean, showInstruction?: boolean) => ({ id, typeId, skipNumbering, showInstruction });

describe('numberBlocks', () => {
    test('numbers exercise blocks in order', () => {
        const n = numberBlocks([b('a', 'hr-std-optellen'), b('b', 'klok-kloklezen')]);
        expect(n).toEqual({ a: 1, b: 2 });
    });

    test('layout-* furniture is not an opdracht and does not consume a number', () => {
        const n = numberBlocks([b('a', 'hr-std-optellen'), b('sep', 'layout-sectie'), b('c', 'splitsen')]);
        expect(n).toEqual({ a: 1, sep: null, c: 2 });
    });

    test('a skipped block hands its number to the next opdracht', () => {
        const n = numberBlocks([b('a', 'hr-std-optellen'), b('b', 'splitsen', true, false), b('c', 'breuken')]);
        expect(n).toEqual({ a: 1, b: null, c: 2 });
    });

    // Regression: re-enabling "Opdrachttekst tonen" used to leave a stale skipNumbering
    // on the block, printing "0." for its title. The flag only means something while the
    // title is hidden, so numberBlocks() ignores it once showInstruction is back on.
    test('skipNumbering is ignored once the title row is shown again', () => {
        const n = numberBlocks([b('a', 'hr-std-optellen'), b('b', 'splitsen', true, true), b('c', 'breuken')]);
        expect(n).toEqual({ a: 1, b: 2, c: 3 });
    });
});
