import { describe, test, expect } from 'vitest';
import { makeBlock } from './helpers/makeBlock';
import { comboConstraints, comboFromConstraints, newCombo } from '../components/eenvoudig/comboModel';
import { generateMixedOne } from '../services/math/mixedGenerator';

// The Eenvoudig Combinatie / Zelf samenstellen builder's Met rest choice: the delen config's settings, both ways.

describe('Eenvoudig builder, Met rest', () => {
    test('writes the delen config\'s met-rest settings and reads them back', () => {
        const s = newCombo(4, ':');
        s.max = 1000;
        s.ops[':'] = { ...s.ops[':'], mode: 'rest', tables: [6, 7], restLevel: 3, klad: true };
        const c = comboConstraints(s, 4);
        expect((c.perVariant as Record<string, unknown>)[':']).toEqual({ multiplicationMode: 'met_rest', selectedTables: [6, 7], metRestLevel: 3, metRestKladlijn: true });
        const ex = generateMixedOne({ ...makeBlock('hr-std-gemengd', { id: 'x' }), constraints: c, exercises: [] }, ':');
        expect(ex?.remainder).toBeGreaterThan(0);
        const back = comboFromConstraints(c, 4)!;
        expect(back.ops[':']).toMatchObject({ on: true, mode: 'rest', tables: [6, 7], restLevel: 3, klad: true });
    });
    test('a niveau the range cannot hold is stored clipped, kladlijn off is not written', () => {
        const s = newCombo(2, ':');
        s.max = 100;
        s.ops[':'] = { ...s.ops[':'], mode: 'rest', restLevel: 3 };
        const per = (comboConstraints(s, 2).perVariant as Record<string, Record<string, unknown>>)[':'];
        expect(per.metRestLevel).toBe(2);
        expect(per).not.toHaveProperty('metRestKladlijn');
    });
});
