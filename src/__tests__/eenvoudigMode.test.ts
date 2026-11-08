// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_MODE_KEY, effectiveSidebarTab, readDefaultMode, saveDefaultMode } from '../services/eenvoudigMode';
import { TOUR_SEEN_KEY } from '../hooks/useOnboarding';

describe('eenvoudigMode', () => {
    beforeEach(() => localStorage.clear());

    it('starts a new teacher on the cards', () => {
        expect(readDefaultMode()).toBe('eenvoudig');
    });

    it('keeps a returning teacher on the full list', () => {
        localStorage.setItem(TOUR_SEEN_KEY, '1');
        expect(readDefaultMode()).toBe('oefeningen');
    });

    it('lets a saved choice win over the tour flag', () => {
        localStorage.setItem(TOUR_SEEN_KEY, '1');
        saveDefaultMode('eenvoudig');
        expect(localStorage.getItem(DEFAULT_MODE_KEY)).toBe('eenvoudig');
        expect(readDefaultMode()).toBe('eenvoudig');
    });

    it('ignores an unknown saved value', () => {
        localStorage.setItem(DEFAULT_MODE_KEY, 'iets-anders');
        expect(readDefaultMode()).toBe('eenvoudig');
    });

    it('redirects only the Eenvoudig tab when the curriculum is locked', () => {
        expect(effectiveSidebarTab('eenvoudig', true)).toBe('oefeningen');
        expect(effectiveSidebarTab('eenvoudig', false)).toBe('eenvoudig');
        expect(effectiveSidebarTab('overzicht', true)).toBe('overzicht');
    });
});
