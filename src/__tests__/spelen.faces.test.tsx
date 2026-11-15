// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { faceChars, faceText } from '../oefenen/spelen/spelChoice';
import { SpelChoiceFace } from '../oefenen/spelen/SpelVisual';
import { cardLines, isLoneBreuk, lineChars } from '../oefenen/spelen/board/board';
import { meadowLayout, MEADOW } from '../oefenen/spelen/board/honingraat/comb';

// What fits on a target (round 4): a long word face shrinks to its longest part and may break inside a long number word,
// a board's long sum stands as a column sum, and the meadow's flowers never touch.

afterEach(cleanup);

describe('tap faces', () => {
    test('a long Dutch number word gets a soft break; the font fits its longest part', () => {
        expect(faceText('honderdtallen')).toBe('honderd­tallen');
        expect(faceText('hoeveelheid')).toBe('hoeveel­heid');
        expect(faceText('eenheden')).toBe('eenheden');
        expect(faceChars({ label: 'honderdtallen', text: 'honderdtallen' })).toBe(8);
        // A measure never breaks inside, so it counts whole.
        expect(faceChars({ label: '2 u 15 min', text: '2 u 15 min' })).toBe(10);
        expect(faceChars({ label: 'scherpe hoek', text: 'scherpe hoek' })).toBe(7);
        expect(faceChars(undefined)).toBe(1);
    });

    test('a phrase face reads its words in the pupil font; the label keeps the plain word', () => {
        const { container } = render(<SpelChoiceFace value="h" view={{ label: 'honderdtallen', text: 'honderdtallen' }} />);
        expect(container.querySelector('.spel-face-text .spel-line-chunk.is-word')).not.toBeNull();
        expect(container.textContent).toBe('honderd­tallen');
    });
});

describe('board cards', () => {
    test('a long sum stands as a column sum, each operator opening a line', () => {
        expect(cardLines('8 + 5')).toEqual(['8 + 5']);
        expect(cardLines('5 918 − 2 499')).toEqual(['5 918', '− 2 499']);
        expect(cardLines('96 + 49 + 95')).toEqual(['96 + 49', '+ 95']);
        expect(cardLines('12 + 345')).toEqual(['12', '+ 345']);
        expect(lineChars(['5 918', '− 2 499'])).toBe(6.5);
        expect(isLoneBreuk('3/4')).toBe(true);
        expect(isLoneBreuk('3/4 + 1/4')).toBe(false);
    });

    test('the meadow: 13 flowers in 4-5-4 (rows of 3 and 2 upright), no two heads touching', () => {
        for (const portrait of [false, true]) {
            const { cells, width } = meadowLayout(13, portrait);
            expect(cells).toHaveLength(13);
            for (const a of cells) {
                expect(a.x - MEADOW.head / 2).toBeGreaterThanOrEqual(0);
                expect(a.x + MEADOW.head / 2).toBeLessThanOrEqual(width);
                // A head is MEADOW.head wide; an open one swells by 4 %: still a gap to every neighbour.
                for (const b of cells) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(MEADOW.head * 1.04);
            }
        }
        expect(meadowLayout(13, false).width).toBeCloseTo(5 * MEADOW.dx);
        expect(meadowLayout(13, true).width).toBeCloseTo(3 * MEADOW.dx);
    });
});
