import { UsersThree, SpeakerHigh, HandPointing, UsersFour, Timer, Hourglass, DiceFive, Wind, CalendarBlank, Clock, CloudSun, ListChecks, ListNumbers, Image, ArrowsHorizontal, Table, GridNine, ChartPieSlice, Cube, Coins, TextT, type Icon } from '@phosphor-icons/react';
import { addBasicWidget } from './addWidgets';
import { useBoardStore } from './useBoardStore';
import type { WidgetKind } from './boardTypes';

// Widget-tool catalog for the Toevoegen panel's tabs (Rekenblad is the exercise catalog) + favourites.
export type ToolCategory = 'rekentool' | 'klasbeheer' | 'dagritme' | 'tekst-beeld';

// Tab order and wording of the Toevoegen panel after "Rekenblad".
export const TOOL_CATEGORIES: ReadonlyArray<{ id: ToolCategory; label: string }> = [
    { id: 'rekentool', label: 'Rekentool' },
    { id: 'klasbeheer', label: 'Klasbeheer' },
    { id: 'dagritme', label: 'Dagritme' },
    { id: 'tekst-beeld', label: 'Tekst · beeld' },
];

export interface BoardToolDef {
    id: string;
    label: string;
    icon: Icon;
    category: ToolCategory;
    // picker routes through the file input; geld-palet toggles the money dock
    kind: WidgetKind | 'afbeelding-picker' | 'geld-palet';
    props?: Record<string, unknown>;
    w?: number;
}

export const TOOL_CATALOG: BoardToolDef[] = [
    // Rekentool: manipulatives, no exercise generators
    { id: 'getallenlijn', label: 'Getallenlijn', icon: ArrowsHorizontal, category: 'rekentool', kind: 'getallenlijn', w: 640 },
    { id: 'positietabel', label: 'Positietabel', icon: Table, category: 'rekentool', kind: 'positietabel', w: 480 },
    { id: 'honderdveld', label: 'Honderdveld', icon: GridNine, category: 'rekentool', kind: 'honderdveld', w: 470 },
    { id: 'breukviz', label: 'Breuken', icon: ChartPieSlice, category: 'rekentool', kind: 'breukviz', w: 300 },
    { id: 'mabmat', label: 'MAB-materiaal', icon: Cube, category: 'rekentool', kind: 'mabmat', w: 560 },
    { id: 'geldpalet', label: 'Geld (palet)', icon: Coins, category: 'rekentool', kind: 'geld-palet' },
    { id: 'dobbelsteen', label: 'Dobbelstenen', icon: DiceFive, category: 'rekentool', kind: 'dobbelsteen', w: 320 },
    // Klasbeheer
    { id: 'namen', label: 'Namenkiezer', icon: UsersThree, category: 'klasbeheer', kind: 'namen', w: 340 },
    { id: 'groepjes', label: 'Groepjesmaker', icon: UsersFour, category: 'klasbeheer', kind: 'groepjes', w: 460 },
    { id: 'werksymbolen', label: 'Werksymbolen', icon: HandPointing, category: 'klasbeheer', kind: 'werksymbolen', w: 440 },
    { id: 'geluid', label: 'Geluidsniveau', icon: SpeakerHigh, category: 'klasbeheer', kind: 'geluid', w: 360 },
    { id: 'timer', label: 'Timer', icon: Timer, category: 'klasbeheer', kind: 'timer', w: 300 },
    { id: 'stopwatch', label: 'Stopwatch', icon: Hourglass, category: 'klasbeheer', kind: 'stopwatch', w: 320 },
    { id: 'checklist', label: 'Checklist', icon: ListChecks, category: 'klasbeheer', kind: 'checklist', w: 360 },
    { id: 'stappenplan', label: 'Stappenplan', icon: ListNumbers, category: 'klasbeheer', kind: 'stappenplan', w: 400 },
    // Dagritme
    { id: 'datum', label: 'Datum', icon: CalendarBlank, category: 'dagritme', kind: 'datum', w: 340 },
    { id: 'klok', label: 'Klok', icon: Clock, category: 'dagritme', kind: 'klok', props: { hours: 9, minutes: 0 }, w: 300 },
    { id: 'weer', label: 'Weer', icon: CloudSun, category: 'dagritme', kind: 'weer', w: 360 },
    { id: 'adem', label: 'Ademhaling', icon: Wind, category: 'dagritme', kind: 'adem', w: 320 },
    // Tekst · beeld
    { id: 'tekst', label: 'Tekst', icon: TextT, category: 'tekst-beeld', kind: 'tekst', props: { text: '' }, w: 360 },
    { id: 'afbeelding', label: 'Afbeelding', icon: Image, category: 'tekst-beeld', kind: 'afbeelding-picker' },
];

// Returns false when the tool needs the caller to run the image picker instead.
export function runTool(def: BoardToolDef): boolean {
    if (def.kind === 'afbeelding-picker') return false;
    if (def.kind === 'geld-palet') { useBoardStore.getState().setGeldPaletOpen(true); return true; }
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
