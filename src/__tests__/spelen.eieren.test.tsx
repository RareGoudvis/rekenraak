// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { render } from '@testing-library/react';
import { EGG_COLOURS, PATTERNS, eggLooks, eggState } from '../oefenen/spelen/skins/eieren/looks';
import { GardenBack, GardenFront } from '../oefenen/spelen/skins/eieren/Garden';

describe('Eieren zoeken: egg looks', () => {
    test('nine eggs per question, all with distinct pattern + colour, accent never the shell colour', () => {
        for (const key of ['q1', 'q2', 'a-very-long-key-7']) {
            const looks = eggLooks(key);
            expect(looks).toHaveLength(9);
            expect(new Set(looks.map(l => `${l.pattern}/${l.base}`)).size).toBe(9);
            expect(new Set(looks.slice(0, PATTERNS.length).map(l => l.pattern)).size).toBe(PATTERNS.length);
            for (const l of looks) {
                expect(l.accent).not.toBe(l.base);
                expect(l.base).toBeLessThan(EGG_COLOURS);
                expect(l.accent).toBeLessThan(EGG_COLOURS);
            }
        }
    });
    test('the same question always looks the same; the next question looks different', () => {
        expect(eggLooks('k1')).toEqual(eggLooks('k1'));
        expect(eggLooks('k1')).not.toEqual(eggLooks('k2'));
    });
});

describe('Eieren zoeken: egg states', () => {
    test('nothing opens while playing', () => {
        expect(eggState(2, 'play', null, 4, undefined)).toBe('idle');
        expect(eggState(2, 'help', null, 4, undefined)).toBe('idle');
    });
    test('a right pick holds a chick, the others rest', () => {
        expect(eggState(4, 'right', 4, 4, true)).toBe('chick');
        expect(eggState(1, 'right', 4, 4, true)).toBe('rest');
    });
    test('a wrong pick opens empty, the right egg glows, the rest wait', () => {
        expect(eggState(1, 'wrong', 1, 4, false)).toBe('empty');
        expect(eggState(4, 'wrong', 1, 4, false)).toBe('answer');
        expect(eggState(7, 'wrong', 1, 4, false)).toBe('rest');
    });
});

describe('Eieren zoeken: garden', () => {
    test('is decorative: no text, no buttons, no numbers', () => {
        const { container } = render(<><GardenBack reducedMotion={false} paused={false} /><GardenFront /></>);
        expect(container.textContent).toBe('');
        expect(container.querySelector('button, [tabindex]')).toBeNull();
    });
});
