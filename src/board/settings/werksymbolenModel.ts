import {
    SpeakerSlash, Ear, HandPointing, UsersThree, ChalkboardTeacher, BookOpen, PencilSimple, Headphones,
    Laptop, Lightbulb, Question, Hand, ChatsCircle, User, Timer, MusicNotes, Palette, Calculator,
    Smiley, Star, CheckCircle, Prohibit, Brain, Eye, Coffee, PersonSimpleWalk, type Icon,
} from '@phosphor-icons/react';
import { isHex } from './baseProps';
import { WERKSYMBOLEN } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

// Werksymbolen: an editable symbol list (props.symbols) with per-symbol icon + colour,
// one or several active, grid / row / column layouts, and named sets. Boards from before
// props.symbols read the five built-ins filtered by `enabled`, exactly as they looked.

export const WS_ICONS: Record<string, { icon: Icon; name: string }> = {
    stil: { icon: SpeakerSlash, name: 'Stil' },
    fluisteren: { icon: Ear, name: 'Oor' },
    buur: { icon: HandPointing, name: 'Wijzen' },
    samen: { icon: UsersThree, name: 'Groep' },
    juf: { icon: ChalkboardTeacher, name: 'Leerkracht' },
    boek: { icon: BookOpen, name: 'Boek' },
    potlood: { icon: PencilSimple, name: 'Potlood' },
    koptelefoon: { icon: Headphones, name: 'Koptelefoon' },
    laptop: { icon: Laptop, name: 'Laptop' },
    idee: { icon: Lightbulb, name: 'Idee' },
    vraag: { icon: Question, name: 'Vraag' },
    hand: { icon: Hand, name: 'Hand opsteken' },
    praten: { icon: ChatsCircle, name: 'Praten' },
    alleen: { icon: User, name: 'Alleen' },
    timer: { icon: Timer, name: 'Timer' },
    muziek: { icon: MusicNotes, name: 'Muziek' },
    tekenen: { icon: Palette, name: 'Tekenen' },
    rekenen: { icon: Calculator, name: 'Rekenen' },
    blij: { icon: Smiley, name: 'Blij' },
    ster: { icon: Star, name: 'Ster' },
    klaar: { icon: CheckCircle, name: 'Klaar' },
    niet: { icon: Prohibit, name: 'Niet' },
    denken: { icon: Brain, name: 'Denken' },
    kijken: { icon: Eye, name: 'Kijken' },
    pauze: { icon: Coffee, name: 'Pauze' },
    bewegen: { icon: PersonSimpleWalk, name: 'Bewegen' },
};

export interface WerkSymbol { key: string; label: string; icon: string; color: string | null }
export type WsLayout = 'raster' | 'rij' | 'kolom';
export type WsSize = 'klein' | 'normaal' | 'groot';

const BUILT_IN: WerkSymbol[] = WERKSYMBOLEN.map(m => ({ key: m.key, label: m.label, icon: m.key, color: null }));

export interface WsModel {
    symbols: WerkSymbol[];
    active: string[];          // keys; one unless multi
    multi: boolean;            // several symbols active at once
    layout: WsLayout;          // 'raster' = today's 3-column grid, 'kolom' = today's "verticaal"
    columns: number;           // raster only, 2-5
    size: WsSize;
    showLabel: boolean;
    onlyActive: boolean;       // show just the active symbol(s), big and alone
}

function readSymbols(raw: unknown): WerkSymbol[] | null {
    if (!Array.isArray(raw)) return null;
    const out = raw.flatMap((r, i): WerkSymbol[] => {
        if (!r || typeof r !== 'object') return [];
        const o = r as Record<string, unknown>;
        return [{
            key: typeof o.key === 'string' && o.key ? o.key : `s${i}`,
            label: typeof o.label === 'string' ? o.label : '',
            icon: typeof o.icon === 'string' && o.icon in WS_ICONS ? o.icon : 'ster',
            color: isHex(o.color) ? o.color : null,
        }];
    });
    return out.length ? out : null;
}

export function werksymbolenModel(widget: BoardWidget): WsModel {
    const p = widget.props ?? {};
    const enabled = Array.isArray(p.enabled) ? p.enabled : null;
    const symbols = readSymbols(p.symbols) ?? (enabled ? BUILT_IN.filter(s => enabled.includes(s.key)) : BUILT_IN);
    const multi = p.multi === true;
    const rawActive = Array.isArray(p.active) ? p.active.filter((k): k is string => typeof k === 'string') : [typeof p.active === 'string' ? p.active : 'stil'];
    return {
        symbols,
        active: multi ? rawActive : rawActive.slice(0, 1),
        multi,
        layout: p.layout === 'rij' || p.layout === 'kolom' || p.layout === 'raster' ? p.layout : (p.vertical === true ? 'kolom' : 'raster'),
        columns: Number.isInteger(p.columns) ? Math.min(5, Math.max(2, p.columns as number)) : 3,
        size: p.size === 'klein' || p.size === 'groot' ? p.size : 'normaal',
        showLabel: p.iconOnly !== true,
        onlyActive: p.onlyActive === true,
    };
}

// Tapping a tile: single mode makes it the one active symbol; multi mode toggles it.
export function tapSymbol(m: WsModel, key: string): string | string[] {
    if (!m.multi) return key;
    return m.active.includes(key) ? m.active.filter(k => k !== key) : [...m.active, key];
}

// ── Named sets ("Stil werken", "Samenwerken", …): built-ins + the teacher's own, app-wide ──
export const WERKSETS_KEY = 'rekenraak_board_werksets_v1';
export interface WerkSet { name: string; symbols: WerkSymbol[] }

const pick = (...keys: string[]) => BUILT_IN.filter(s => keys.includes(s.key));
export const BUILT_IN_SETS: WerkSet[] = [
    { name: 'Alle symbolen', symbols: BUILT_IN },
    { name: 'Stil werken', symbols: pick('stil', 'fluisteren', 'juf') },
    { name: 'Samenwerken', symbols: pick('fluisteren', 'buur', 'samen') },
    { name: 'Toets', symbols: [pick('stil')[0], { key: 'hand', label: 'Hand opsteken', icon: 'hand', color: null }] },
];

export function loadWerksets(): WerkSet[] {
    try {
        const v: unknown = JSON.parse(localStorage.getItem(WERKSETS_KEY) ?? '[]');
        if (!Array.isArray(v)) return [];
        return v.flatMap((s): WerkSet[] => {
            if (!s || typeof s !== 'object' || typeof (s as WerkSet).name !== 'string') return [];
            const symbols = readSymbols((s as WerkSet).symbols);
            return symbols ? [{ name: (s as WerkSet).name, symbols }] : [];
        });
    } catch {
        return [];
    }
}

// A set with an existing name is replaced; false when the write is refused (quota).
export function saveWerkset(name: string, symbols: WerkSymbol[]): WerkSet[] | false {
    const clean = name.trim() || 'Mijn set';
    const next = [...loadWerksets().filter(s => s.name !== clean), { name: clean, symbols }];
    try {
        localStorage.setItem(WERKSETS_KEY, JSON.stringify(next));
        return next;
    } catch {
        return false;
    }
}

export function deleteWerkset(name: string): WerkSet[] {
    const next = loadWerksets().filter(s => s.name !== name);
    try { localStorage.setItem(WERKSETS_KEY, JSON.stringify(next)); } catch { /* list stays as it was */ }
    return next;
}
