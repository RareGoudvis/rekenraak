import type { MathBlock } from '../services/math/types';

// ── Widgets ──────────────────────────────────────────────────────────────────
export type WidgetKind =
    | 'exercise' | 'tekst' | 'datum' | 'klok' | 'afbeelding'
    | 'namen' | 'weer' | 'geluid' | 'werksymbolen'
    | 'timer' | 'stopwatch' | 'dobbelsteen' | 'adem'
    | 'groepjes' | 'checklist' | 'stappenplan'
    | 'getallenlijn' | 'positietabel' | 'honderdveld' | 'breukviz'
    | 'mabmat' | 'geld-item';

export interface BoardWidget {
    id: string;
    kind: WidgetKind;
    // Board coordinates in px; w = frame width, content height is intrinsic.
    x: number;
    y: number;
    w: number;
    z: number;
    // Content zoom (1 = 100%); frame width stays w, inner content scales.
    scale?: number;
    rotation?: number;         // reserved (P3/P4: instruments, images)
    // kind='exercise': the FULL MathBlock — the registry's generator/config/viewer
    // machinery runs on it unchanged (same contract as worksheet blocks).
    block?: MathBlock;
    showAnswer?: boolean;      // per-widget red solutions overlay
    props?: Record<string, unknown>;   // widget-specific (klok time, tekst content, image dataURL…)
}

// ── Ink (P2+; typed now so the v1 board format already reserves the field) ──
export type StrokeTool = 'pen' | 'marker';
export interface Stroke {
    id: string;
    tool: StrokeTool;
    color: string;
    width: number;
    opacity?: number;          // marker ≈ 0.45
    path: string;              // SVG path data — instruments emit exact geometry (arcs etc.)
    // Flattened sample points [x0,y0,x1,y1,…] — kept alongside the path for the
    // per-stroke eraser hit-test (and later instrument snapping re-projection).
    pts: number[];
}

// 'select' = normal cursor (select + edit); 'hand' = drag/drop everything, select
// nothing; 'text' = tap the board to place a text widget there.
export type BoardTool = 'select' | 'hand' | 'text' | 'pen' | 'marker' | 'eraser' | 'line' | 'shape' | 'instrument';

// ToolEngine contract (implemented in P2): pointer stream in board coordinates →
// a finished stroke. ctx will carry the active instrument geometry (P4) so
// meetlat/geodriehoek/passer snapping is pure math inside the tool.
export interface ToolContext {
    gridSnap: boolean;
    gridSize: number;
    // P4: the page's instrument geometry; a pen started on an edge or a protractor origin follows it.
    instrument?: InstrumentGeometry;
}
export interface ToolEngine {
    onPointerDown(x: number, y: number, ctx: ToolContext): void;
    onPointerMove(x: number, y: number, ctx: ToolContext): void;
    onPointerUp(x: number, y: number, ctx: ToolContext): Stroke | null;
}

// ── Background / pages ───────────────────────────────────────────────────────
export type BackgroundPattern = 'blanco' | 'raster' | 'lijnen' | 'schrijflijnen' | 'schrijflijnen4' | 'cornell';
export interface BoardBackground {
    pattern: BackgroundPattern;
    dark: boolean;             // zwart bord (chalk look) vs wit bord
    scale?: number;            // pattern size multiplier (0.75 / 1 / 1.5); absent = 1
}

export interface BoardPage {
    id: string;
    widgets: BoardWidget[];
    strokes: Stroke[];
    background: BoardBackground;
    // Absent on boards saved before the instruments (format v1) = none placed.
    instruments?: Instrument[];
}

// ── Meetinstrumenten (P4) ────────────────────────────────────────────────────
// Not widgets, not strokes: a per-page layer above the ink, at most one of each kind.
export type InstrumentKind = 'lat' | 'geodriehoek' | 'passer';
export interface Instrument {
    id: string;
    kind: InstrumentKind;
    // The reference point in board px — the one that snaps: lat = its zero mark on the
    // measuring edge, geodriehoek = the protractor centre (hypotenuse midpoint), passer = needle.
    x: number;
    y: number;
    // Degrees clockwise on screen. Passer: the direction needle → pencil tip.
    rotation: number;
    scale?: number;            // reserved (no size toggle in v1); absent = 1
    radius?: number;           // passer only: the opening in board px
}

// One straight instrument edge in board px: a→b, with the scale's zero at z (mm snapping
// and the length readout measure from z).
export interface InstrumentEdge {
    ax: number; ay: number;
    bx: number; by: number;
    zx: number; zy: number;
}
// What an ink tool needs to follow the instruments: their straight edges and every
// protractor centre (a pen started there draws a ray at a whole-degree angle).
export interface InstrumentGeometry {
    edges: InstrumentEdge[];
    protractors: { x: number; y: number; rotation: number }[];
}

export const DEFAULT_BACKGROUND: BoardBackground = { pattern: 'blanco', dark: false };

export const rndId = () => Math.random().toString(36).substring(2, 9);

export function emptyPage(): BoardPage {
    return { id: rndId(), widgets: [], strokes: [], background: { ...DEFAULT_BACKGROUND } };
}
