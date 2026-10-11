import { describe, test, expect } from 'vitest';
import { kioskFor, kioskInputOf } from '../services/oefenen/kiosk';
import { listOefenLeaves, seedRowConstraints } from '../components/oefenen/oefenBuild';
import type { PlaatswaardeExercise } from '../services/math/types';

describe('R1 plaatswaarde: three leaves, three cards', () => {
    const d = kioskFor('plaatswaarde')!;
    const ex: PlaatswaardeExercise = { id: 'p', number: 345, placeKey: 'T', isManuallyEdited: false };
    const seeded = (id: string) => {
        const l = listOefenLeaves().find(x => x.id === id)!;
        return { ...seedRowConstraints(l, 3), maxGetal: 1000, decimalPlaces: 0 } as Record<string, unknown>;
    };
    test('each leaf seeds its own Antwoord', () => {
        expect(seeded('plaatswaarde-waarde').plaatsAnswer).toBe('waarde');
        expect(seeded('plaatswaarde-plaats').plaatsAnswer).toBe('plaats-shuffle');
        expect(seeded('plaatswaarde-omcirkelen').plaatsAnswer).toBe('plaats-shuffle');
    });
    test('input kind and choices differ per leaf', () => {
        const kinds = ['plaatswaarde-waarde', 'plaatswaarde-plaats', 'plaatswaarde-omcirkelen'].map(id => kioskInputOf(d, ex, seeded(id)));
        expect(kinds).toEqual(['number', 'choice', 'interactive']);
        const words = d.choicesOf!(ex, seeded('plaatswaarde-plaats')) as string[];
        expect(words).not.toEqual(['honderdtallen', 'tientallen', 'eenheden']);
        expect([...words].sort()).toEqual(['eenheden', 'honderdtallen', 'tientallen']);
    });
});
