import type { MathBlock } from '../services/math/types';

// ── Widgets ──────────────────────────────────────────────────────────────────
export type WidgetKind = 'exercise' | 'tekst' | 'datum' | 'klok' | 'afbeelding';

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

export type BoardTool = 'select' | 'pen' | 'marker' | 'eraser' | 'line' | 'shape' | 'instrument';

// ToolEngine contract (implemented in P2): pointer stream in board coordinates →
// a finished stroke. ctx will carry the active instrument geometry (P4) so
// meetlat/geodriehoek/passer snapping is pure math inside the tool.
export interface ToolContext {
    gridSnap: boolean;
    gridSize: number;
    // P4: instrument?: InstrumentGeometry (edges/needle point/angle origin)
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
}

export const DEFAULT_BACKGROUND: BoardBackground = { pattern: 'blanco', dark: false };

export const rndId = () => Math.random().toString(36).substring(2, 9);

export function emptyPage(): BoardPage {
    return { id: rndId(), widgets: [], strokes: [], background: { ...DEFAULT_BACKGROUND } };
}
