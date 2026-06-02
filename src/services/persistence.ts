import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { MathBlock, FooterData } from './math/types';
import type { DocSettings } from '../store/useWorksheetStore';
import type { BaseSettings } from '../config/baseSettings';

// Bump this when the JSON schema gains/loses required fields so older files
// fail loudly instead of half-loading. Keep the parser strict on read.
// v2 added optional baseSettings + curriculum (both back-compat: absent → defaults).
export const WORKSHEET_FORMAT_VERSION = 2;

export const AUTOSAVE_KEY = 'rekenraak_autosave_v1';
export const PRESETS_KEY = 'rekenraak_presets_v1';
export const RELEASE_SEEN_KEY = 'rekenraak_release_seen_v1';
export const MAX_PRESETS = 20;
// Measured against the LZ-compressed, URL-safe payload (not raw JSON). 30 KB of
// such text stays under mainstream browser URL limits incl. mobile, and — since
// worksheet JSON compresses ~8× — covers ~100+ blocks before this backstop trips.
const MAX_SHARE_BYTES = 30000;

interface HeaderData {
    naam: boolean;
    klas: boolean;
    nummer: boolean;
    datum: boolean;
    titel: string;
}

// 'template' = settings-only payload (exercise arrays stripped). Receiver clicks
// Genereer alles to populate. 'full' (or absent for back-compat) = complete snapshot.
export type WorksheetFileMode = 'full' | 'template';

// Curated curriculum lock: restricts the palette to allowedTypes and freezes each
// block's difficulty so a parent can only add on-curriculum exercises (count +
// regenerate stay editable). Authored by a teacher, distributed via share link.
export interface CurriculumLock {
    locked: boolean;
    allowedTypes: Array<{
        typeId: string;
        label: string;
        lockedConstraints?: Record<string, unknown>;
    }>;
}

export interface WorksheetFile {
    version: number;
    exportedAt: string;
    mode?: WorksheetFileMode;
    blocks: MathBlock[];
    header: HeaderData;
    footer: FooterData;
    docSettings: DocSettings;
    baseSettings?: BaseSettings;   // v2+; absent → receiver keeps DEFAULT_BASE
    curriculum?: CurriculumLock;   // v2+; absent → normal (unlocked) editing
}

export interface SerialisableState {
    blocks: MathBlock[];
    header: HeaderData;
    footer: FooterData;
    docSettings: DocSettings;
    baseSettings: BaseSettings;
}

export interface AutosaveRecord {
    savedAt: string;
    payload: WorksheetFile;
}

export interface Preset {
    id: string;
    name: string;
    savedAt: string;
    blockCount: number;
    payload: WorksheetFile;
}

// Filesystem-safe slug from the worksheet title; falls back to 'naamloos'.
function safeSlug(s: string): string {
    const trimmed = (s || '').trim();
    if (!trimmed) return 'naamloos';
    return trimmed.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'naamloos';
}

function todayStamp(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

// Strip all generated exercise content from a block, keeping every setting that
// the Inspector controls. Used for template export/share — the receiver gets a
// pre-configured but empty worksheet.
function stripBlock(b: MathBlock): MathBlock {
    return {
        ...b,
        exercises: [],
        clockExercises: b.clockExercises ? [] : undefined,
        fractionExercises: b.fractionExercises ? [] : undefined,
        splitsenExercises: b.splitsenExercises ? [] : undefined,
        cijferExercises: b.cijferExercises ? [] : undefined,
        geldExercises: b.geldExercises ? [] : undefined,
        geldWisselExercises: b.geldWisselExercises ? [] : undefined,
        geldTeruggevenExercises: b.geldTeruggevenExercises ? [] : undefined,
        mabExercises: b.mabExercises ? [] : undefined,
    };
}

function buildPayload(state: SerialisableState, mode: WorksheetFileMode = 'full', curriculum?: CurriculumLock): WorksheetFile {
    const blocks = mode === 'template' ? state.blocks.map(stripBlock) : state.blocks;
    return {
        version: WORKSHEET_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        mode,
        blocks,
        header: state.header,
        footer: state.footer,
        docSettings: state.docSettings,
        baseSettings: state.baseSettings,
        ...(curriculum ? { curriculum } : {}),
    };
}

// ── File export / import ──────────────────────────────────────────────────────

export function exportWorksheet(state: SerialisableState): void {
    const blob = new Blob([JSON.stringify(buildPayload(state), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `werkbundel-${safeSlug(state.header.titel)}-${todayStamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function parseWorksheetFile(json: string): WorksheetFile {
    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    } catch {
        throw new Error('Bestand is geen geldige JSON.');
    }
    if (!parsed || typeof parsed !== 'object') throw new Error('Bestand heeft geen geldig formaat.');
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.version !== 'number') throw new Error('Versie-veld ontbreekt of is ongeldig.');
    if (obj.version > WORKSHEET_FORMAT_VERSION) {
        throw new Error(`Bestand komt uit een nieuwere versie (v${obj.version}). Werk de app bij om dit te openen.`);
    }
    if (!Array.isArray(obj.blocks)) throw new Error('blocks-veld ontbreekt of is geen array.');
    if (!obj.header || typeof obj.header !== 'object') throw new Error('header-veld ontbreekt.');
    if (!obj.footer || typeof obj.footer !== 'object') throw new Error('footer-veld ontbreekt.');
    if (!obj.docSettings || typeof obj.docSettings !== 'object') throw new Error('docSettings-veld ontbreekt.');
    // curriculum is optional, but if present must be well-formed (locked + allowedTypes array).
    if (obj.curriculum !== undefined) {
        const cur = obj.curriculum as Record<string, unknown>;
        if (!cur || typeof cur !== 'object' || typeof cur.locked !== 'boolean' || !Array.isArray(cur.allowedTypes)) {
            throw new Error('curriculum-veld is ongeldig.');
        }
    }
    return obj as unknown as WorksheetFile;
}

// ── Auto-save (1 implicit slot, crash recovery) ───────────────────────────────

export function saveAutosave(state: SerialisableState, curriculum?: CurriculumLock | null): void {
    try {
        const record: AutosaveRecord = { savedAt: new Date().toISOString(), payload: buildPayload(state, 'full', curriculum ?? undefined) };
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(record));
    } catch { /* quota / unavailable — ignore */ }
}

export function loadAutosave(): AutosaveRecord | null {
    try {
        const raw = localStorage.getItem(AUTOSAVE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as AutosaveRecord;
        // Sanity check — bail if the embedded payload is unreadable.
        if (!parsed?.payload || !Array.isArray(parsed.payload.blocks)) return null;
        return parsed;
    } catch { return null; }
}

export function clearAutosave(): void {
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* ignore */ }
}

// ── Named preset library (explicit, max 20) ───────────────────────────────────

export function loadPresets(): Preset[] {
    try {
        const raw = localStorage.getItem(PRESETS_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        return arr.filter(p => p && typeof p.id === 'string' && p.payload?.blocks);
    } catch { return []; }
}

function persistPresets(list: Preset[]): void {
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export function savePreset(name: string, state: SerialisableState): Preset {
    const list = loadPresets();
    const trimmed = (name || '').trim() || (state.header.titel || 'Naamloos').trim() || 'Naamloos';
    const entry: Preset = {
        id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
        name: trimmed.slice(0, 80),
        savedAt: new Date().toISOString(),
        blockCount: state.blocks.length,
        payload: buildPayload(state),
    };
    const next = [...list, entry].sort((a, b) => a.savedAt.localeCompare(b.savedAt));
    // Drop oldest when exceeding the cap so the most recent 20 survive.
    const trimmedList = next.slice(-MAX_PRESETS);
    persistPresets(trimmedList);
    return entry;
}

export function deletePreset(id: string): void {
    persistPresets(loadPresets().filter(p => p.id !== id));
}

export function renamePreset(id: string, name: string): void {
    const trimmed = (name || '').trim().slice(0, 80) || 'Naamloos';
    persistPresets(loadPresets().map(p => p.id === id ? { ...p, name: trimmed } : p));
}

// ── Share via URL hash (base64 in fragment, not query — never leaves browser) ─

export function encodeShareLink(state: SerialisableState, opts: { template?: boolean; curriculum?: CurriculumLock } = {}): string | null {
    try {
        const json = JSON.stringify(buildPayload(state, opts.template ? 'template' : 'full', opts.curriculum));
        // LZ-compress to URL-safe text — repetitive worksheet JSON shrinks ~8×.
        const data = compressToEncodedURIComponent(json);
        if (data.length > MAX_SHARE_BYTES) return null;
        return `${location.origin}${location.pathname}#share=${data}`;
    } catch { return null; }
}

export function decodeShareHash(hash: string): WorksheetFile | null {
    const m = /^#share=(.+)$/.exec(hash);
    if (!m) return null;
    try {
        // Old base64 links are intentionally not supported (alpha, links ephemeral).
        const json = decompressFromEncodedURIComponent(m[1]);
        if (!json) return null;
        return parseWorksheetFile(json);
    } catch { return null; }
}
