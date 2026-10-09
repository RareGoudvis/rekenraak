import type { BoardPage, BoardWidget, Instrument, Stroke } from './boardTypes';
import { emptyPage } from './boardTypes';
import { NATURAL_W } from './widgetSizing';
import { BOARD_CM_PX, INSTRUMENT_KINDS, PASSER } from './instrumentGeometry';

// Board persistence — mirrors the worksheet persistence patterns (strict version
// check, debounced autosave, capped preset list) but fully separate keys/format.
// No share-link for boards in P1: stroke/image payloads can exceed URL limits.
// v2 (P4) adds the per-page `instruments`; a v1 board reads as a v2 board without any.
export const BOARD_FORMAT_VERSION = 2;
const READABLE_VERSIONS = [1, 2];
export const BOARD_AUTOSAVE_KEY = 'rekenraak_board_autosave_v1';
export const BOARD_PRESETS_KEY = 'rekenraak_board_presets_v1';
export const MAX_BOARD_PRESETS = 30;

export interface BoardFile {
    version: number;
    exportedAt: string;
    pages: BoardPage[];
    activePageIdx?: number;
}

export interface BoardPreset {
    id: string;
    name: string;
    savedAt: string;
    pageCount: number;
    payload: BoardFile;
}

function makeFile(pages: BoardPage[], activePageIdx: number): BoardFile {
    return { version: BOARD_FORMAT_VERSION, exportedAt: new Date().toISOString(), pages, activePageIdx };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

// The frame reads id/kind/x/y/w/z outside the per-widget error boundary, so those must be sound.
function isWidget(w: unknown): w is BoardWidget {
    if (!isObj(w) || typeof w.id !== 'string' || typeof w.kind !== 'string' || !(w.kind in NATURAL_W)) return false;
    if (!isNum(w.x) || !isNum(w.y) || !isNum(w.w) || !isNum(w.z)) return false;
    return w.kind !== 'exercise' || isObj(w.block);
}

const isStroke = (s: unknown): s is Stroke => isObj(s) && typeof s.id === 'string' && typeof s.path === 'string';

// An instrument the layer can place: known kind, finite position and rotation. Scale and the
// passer's opening are optional and fall back (to absent / 5 cm) when junk.
function toInstrument(v: unknown): Instrument | null {
    if (!isObj(v) || typeof v.id !== 'string' || !INSTRUMENT_KINDS.includes(v.kind as Instrument['kind'])) return null;
    if (!isNum(v.x) || !isNum(v.y) || !isNum(v.rotation)) return null;
    const inst: Instrument = { id: v.id, kind: v.kind as Instrument['kind'], x: v.x, y: v.y, rotation: v.rotation };
    if (isNum(v.scale) && v.scale > 0) inst.scale = v.scale;
    // Vastklikken: each flag that is not a boolean reads as on (the default behaviour).
    if (isObj(v.snap)) {
        const sn = v.snap;
        const flag = (k: string) => (typeof sn[k] === 'boolean' ? sn[k] as boolean : true);
        inst.snap = { on: flag('on'), angles45: flag('angles45'), angles15: flag('angles15'), grid: flag('grid'), endpoints: flag('endpoints') };
    }
    if (inst.kind === 'passer') {
        inst.radius = isNum(v.radius) ? Math.min(PASSER.maxR, Math.max(PASSER.minR, v.radius)) : 5 * BOARD_CM_PX;
    }
    return inst;
}

// At most one of each kind per page (the toggle model); the first one wins.
function parseInstruments(list: unknown): Instrument[] {
    if (!Array.isArray(list)) return [];
    const out: Instrument[] = [];
    for (const raw of list) {
        const inst = toInstrument(raw);
        if (inst && !out.some(i => i.kind === inst.kind)) out.push(inst);
    }
    return out;
}

const isPage = (p: unknown): p is BoardPage =>
    isObj(p) && typeof p.id === 'string' && Array.isArray(p.widgets) && Array.isArray(p.strokes) && isObj(p.background);

// Strict on read: wrong/missing version, no pages or a malformed page → null. Inside a sound
// page a junk widget or stroke (hand-edited/foreign file) is dropped rather than losing the
// whole lesson; the index is clamped so the store never opens pages[-1].
export function parseBoardFile(json: string): BoardFile | null {
    try {
        const data: unknown = JSON.parse(json);
        if (!isObj(data) || !READABLE_VERSIONS.includes(data.version as number)) return null;
        if (!Array.isArray(data.pages) || data.pages.length === 0 || !data.pages.every(isPage)) return null;
        const pages: BoardPage[] = data.pages.map(p => ({
            ...p,
            // Every widget reader defaults a missing prop key, so junk props (not an object)
            // drop to none: the widget loads with its default look instead of throwing.
            widgets: p.widgets.filter(isWidget).map(w => (w.props === undefined || isObj(w.props) ? w : { ...w, props: {} })),
            // Strokes saved by early builds may lack sample points.
            strokes: p.strokes.filter(isStroke).map(s => (Array.isArray(s.pts) ? s : { ...s, pts: [] })),
            // Only a page that carries the field gets it back, so a v1 page round-trips unchanged.
            ...('instruments' in p ? { instruments: parseInstruments(p.instruments) } : {}),
        }));
        const idx = data.activePageIdx;
        const activePageIdx = Number.isInteger(idx) ? Math.max(0, Math.min(pages.length - 1, idx as number)) : 0;
        return { version: BOARD_FORMAT_VERSION, exportedAt: String(data.exportedAt ?? ''), pages, activePageIdx };
    } catch {
        return null;
    }
}

// ── Autosave ──────────────────────────────────────────────────────────────────
export function saveBoardAutosave(pages: BoardPage[], activePageIdx: number): void {
    try {
        localStorage.setItem(BOARD_AUTOSAVE_KEY, JSON.stringify(makeFile(pages, activePageIdx)));
    } catch {
        // Quota exceeded (large images) — autosave silently skips; export still works.
    }
}

export function loadBoardAutosave(): BoardFile | null {
    const raw = localStorage.getItem(BOARD_AUTOSAVE_KEY);
    return raw ? parseBoardFile(raw) : null;
}

export function clearBoardAutosave(): void {
    localStorage.removeItem(BOARD_AUTOSAVE_KEY);
}

// ── Presets ("Mijn borden") ──────────────────────────────────────────────────
export function loadBoardPresets(): BoardPreset[] {
    try {
        const raw = localStorage.getItem(BOARD_PRESETS_KEY);
        const list = raw ? (JSON.parse(raw) as BoardPreset[]) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

// Returns false when the write is refused (quota full: a board with big images), so the
// caller can tell the teacher instead of the throw escaping a click handler.
export function saveBoardPreset(name: string, pages: BoardPage[], activePageIdx: number): BoardPreset[] | false {
    const list = loadBoardPresets();
    const preset: BoardPreset = {
        id: Math.random().toString(36).substring(2, 9),
        name: name.trim() || 'Naamloos bord',
        savedAt: new Date().toISOString(),
        pageCount: pages.length,
        payload: makeFile(pages, activePageIdx),
    };
    const next = [preset, ...list].slice(0, MAX_BOARD_PRESETS);
    try {
        localStorage.setItem(BOARD_PRESETS_KEY, JSON.stringify(next));
    } catch {
        return false;
    }
    return next;
}

export function deleteBoardPreset(id: string): BoardPreset[] {
    const next = loadBoardPresets().filter(p => p.id !== id);
    localStorage.setItem(BOARD_PRESETS_KEY, JSON.stringify(next));
    return next;
}

// ── File export / import ─────────────────────────────────────────────────────
export function exportBoardFile(pages: BoardPage[], activePageIdx: number): void {
    const blob = new Blob([JSON.stringify(makeFile(pages, activePageIdx), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rekenraak-bord.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Fresh default board (used for "Leegmaken").
export function emptyBoard(): BoardPage[] {
    return [emptyPage()];
}
