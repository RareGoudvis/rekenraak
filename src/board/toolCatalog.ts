import { UsersThree, SpeakerHigh, HandPointing, UsersFour, Timer, Hourglass, DiceFive, Wind, CalendarBlank, Clock, CloudSun, ListChecks, ListNumbers, Image, type Icon } from '@phosphor-icons/react';
import { addBasicWidget } from './addWidgets';
import type { WidgetKind } from './boardTypes';

// Widget-tool catalog for the Toevoegen category panels + the favorites bar.
export type ToolCategory = 'klasmanagement' | 'organisatie';

export interface BoardToolDef {
    id: string;
    label: string;
    icon: Icon;
    category: ToolCategory;
    kind: WidgetKind | 'afbeelding-picker';   // picker routes through the file input
    props?: Record<string, unknown>;
    w?: number;
}

export const TOOL_CATALOG: BoardToolDef[] = [
    // Klasmanagement
    { id: 'namen', label: 'Namenkiezer', icon: UsersThree, category: 'klasmanagement', kind: 'namen', w: 340 },
    { id: 'groepjes', label: 'Groepjesmaker', icon: UsersFour, category: 'klasmanagement', kind: 'groepjes', w: 460 },
    { id: 'werksymbolen', label: 'Werksymbolen', icon: HandPointing, category: 'klasmanagement', kind: 'werksymbolen', w: 440 },
    { id: 'geluid', label: 'Geluidsniveau', icon: SpeakerHigh, category: 'klasmanagement', kind: 'geluid', w: 360 },
    { id: 'timer', label: 'Timer', icon: Timer, category: 'klasmanagement', kind: 'timer', w: 300 },
    { id: 'stopwatch', label: 'Stopwatch', icon: Hourglass, category: 'klasmanagement', kind: 'stopwatch', w: 320 },
    { id: 'dobbelsteen', label: 'Dobbelstenen', icon: DiceFive, category: 'klasmanagement', kind: 'dobbelsteen', w: 320 },
    { id: 'adem', label: 'Ademhaling', icon: Wind, category: 'klasmanagement', kind: 'adem', w: 320 },
    // Organisatie
    { id: 'datum', label: 'Datum', icon: CalendarBlank, category: 'organisatie', kind: 'datum', w: 340 },
    { id: 'klok', label: 'Klok', icon: Clock, category: 'organisatie', kind: 'klok', props: { hours: 9, minutes: 0 }, w: 300 },
    { id: 'weer', label: 'Weer', icon: CloudSun, category: 'organisatie', kind: 'weer', w: 360 },
    { id: 'checklist', label: 'Checklist', icon: ListChecks, category: 'organisatie', kind: 'checklist', w: 360 },
    { id: 'stappenplan', label: 'Stappenplan', icon: ListNumbers, category: 'organisatie', kind: 'stappenplan', w: 400 },
    { id: 'afbeelding', label: 'Afbeelding', icon: Image, category: 'organisatie', kind: 'afbeelding-picker' },
];

// Returns false when the tool needs the caller to run the image picker instead.
export function runTool(def: BoardToolDef): boolean {
    if (def.kind === 'afbeelding-picker') return false;
    addBasicWidget(def.kind, def.props ? { ...def.props } : {}, def.w ?? 340);
    return true;
}

// ── Favorites (★, max 6, localStorage) ───────────────────────────────────────
export const FAVORITES_KEY = 'rekenraak_board_favorites_v1';
export const MAX_FAVORITES = 6;

export function loadFavorites(): string[] {
    try {
        const v = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]');
        return Array.isArray(v) ? v.filter(id => TOOL_CATALOG.some(t => t.id === id)).slice(0, MAX_FAVORITES) : [];
    } catch {
        return [];
    }
}

export function toggleFavorite(id: string): string[] {
    const cur = loadFavorites();
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id].slice(0, MAX_FAVORITES);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    return next;
}
