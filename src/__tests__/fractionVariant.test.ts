import { describe, it, expect } from 'vitest';
import { constraintsForVariant } from '../components/configurator/plugins/shared/fractionVariant';

describe('Breuk van hoeveelheid variant switch', () => {
    it('keeps the noemer range and maxTotal across concreet -> schematisch -> abstract', () => {
        const concreet = { subType: 'hoeveelheid', objectShape: 'square', minDenominator: 3, maxDenominator: 7, maxTotal: 40, answerFormat: 'met-hulp' };
        const schem = constraintsForVariant(concreet, 'hoeveelheid-rechthoek');
        expect(schem).toMatchObject({ subType: 'hoeveelheid-rechthoek', minDenominator: 3, maxDenominator: 7, maxTotal: 40, answerFormat: 'met-berekening' });
        expect(schem).not.toHaveProperty('objectShape');
        const abs = constraintsForVariant(schem, 'hoeveelheid-abstract');
        expect(abs).toMatchObject({ subType: 'hoeveelheid-abstract', minDenominator: 3, maxDenominator: 7, answerMode: 'berekeningslijnen' });
        expect(abs).not.toHaveProperty('maxTotal');
    });
    it('fills defaults for keys the old variant lacked', () => {
        expect(constraintsForVariant({ subType: 'hoeveelheid-abstract', minDenominator: 2, maxDenominator: 9 }, 'hoeveelheid'))
            .toMatchObject({ objectShape: 'circle', maxTotal: 20, minDenominator: 2, maxDenominator: 9 });
    });
});
