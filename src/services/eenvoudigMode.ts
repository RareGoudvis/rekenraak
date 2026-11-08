import { TOUR_SEEN_KEY } from '../hooks/useOnboarding';
import type { SidebarTab } from '../store/types';

export const DEFAULT_MODE_KEY = 'rekenraak_default_mode_v1';

export type DefaultMode = 'eenvoudig' | 'oefeningen';

// No saved choice: whoever finished the tour already knows the full list, a new teacher starts on the cards.
export function readDefaultMode(): DefaultMode {
    try {
        const saved = localStorage.getItem(DEFAULT_MODE_KEY);
        if (saved === 'eenvoudig' || saved === 'oefeningen') return saved;
        return localStorage.getItem(TOUR_SEEN_KEY) ? 'oefeningen' : 'eenvoudig';
    } catch {
        return 'oefeningen';
    }
}

export function saveDefaultMode(mode: DefaultMode): void {
    try { localStorage.setItem(DEFAULT_MODE_KEY, mode); } catch { /* private window: the choice just isn't remembered */ }
}

// A locked curriculum only offers its author's palette, which lives in the Uitgebreid pane.
export function effectiveSidebarTab(tab: SidebarTab, locked: boolean): SidebarTab {
    return locked && tab === 'eenvoudig' ? 'oefeningen' : tab;
}
