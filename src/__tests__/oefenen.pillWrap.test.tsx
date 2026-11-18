// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { lineHeightPx, wrapsOver } from '../oefenen/kiosk/pillWrap';
import SpelOptions from '../oefenen/spelen/SpelOptions';
import type { SkinMeta } from '../oefenen/spelen/skins/types';

// Round 6 (owner 2026-11-18): a pill whose text wraps becomes a rounded rectangle (data-wrapped), never text in its round ends.

describe('pillWrap', () => {
    test('the line height: px as given, a factor times the font size, normal = 1.2 ×', () => {
        expect(lineHeightPx('24px', '20px')).toBe(24);
        expect(lineHeightPx('1.25', '20px')).toBe(25);
        expect(lineHeightPx('normal', '20px')).toBe(24);
    });

    test('wraps over more than one and a half lines', () => {
        expect(wrapsOver(24, 24)).toBe(false);
        expect(wrapsOver(30, 24)).toBe(false);
        expect(wrapsOver(48, 24)).toBe(true);
        expect(wrapsOver(48, 0)).toBe(false);
    });
});

describe('the start screen topic pill', () => {
    afterEach(() => { cleanup(); vi.restoreAllMocks(); });
    const META: SkinMeta = { id: 'frituur', label: 'Frituur', input: 'keypad', timed: true, round: { seconds: 300 }, accepts: { kinds: ['number'] }, options: [] };

    const renderAt = (heightPx: number) => {
        vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(heightPx);
        vi.spyOn(window, 'getComputedStyle').mockReturnValue({ lineHeight: '24px', fontSize: '20px', paddingTop: '2px', paddingBottom: '2px' } as CSSStyleDeclaration);
        render(<SpelOptions meta={META} note="Maaltafels: Maal- en deeltafels van 1 tot 10" onStart={() => { }} onBack={() => { }} />);
        return document.querySelector('.spel-options-note')!;
    };

    test('one line stays a pill', () => {
        expect(renderAt(28).hasAttribute('data-wrapped')).toBe(false);
    });

    test('two lines are marked wrapped (a rounded rectangle in the CSS)', () => {
        expect(renderAt(52).hasAttribute('data-wrapped')).toBe(true);
    });
});
