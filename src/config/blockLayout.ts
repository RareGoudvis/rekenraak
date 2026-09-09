import type { MathBlock } from '../services/math/types';

// ── Page grid ────────────────────────────────────────────────────────────────
// A page's content area is COL_UNITS wide (the LCM of ½ and ⅓, so a block can be a
// whole, a half or a third) by ROW_BUDGET tall. Heights are BUDGETED from settings,
// never measured from the DOM — that is what makes pagination deterministic and
// testable instead of a reflow loop.
export const COL_UNITS = 6;
export type WidthUnits = 2 | 3 | 6;

// A4 at 96dpi is 1123px tall. Header, footer and the body cell's own padding come off
// the top; ROW_UNIT_PX is the granularity the cost functions are calibrated in.
export const ROW_UNIT_PX = 24;
const BODY_HEIGHT_PX = 1123 - 118 /* header */ - 60 /* footer */ - 32 /* body padding */;
// Two units under what the body can actually hold. Under-estimating is the dangerous
// direction — content crossing the footer — while over-estimating only wastes space.
export const ROW_BUDGET = Math.floor(BODY_HEIGHT_PX / ROW_UNIT_PX) - 2;

// ── Per-type layout facts ────────────────────────────────────────────────────
// `rowUnits` is MEASURED, not guessed: every sidebar leaf was rendered at two exercise
// counts and the per-row height derived from the difference (see ARCHITECTURE §15).
// `perRowFull` is how many exercises the viewer fits per row at full width.
// `minWidth` is the narrowest column width the type can render at. MEASURED: every type
// rendered at 6, 3 and 2 units with its printable content compared against the cell.
// Measurement alone is not enough — viewers read an injected width, so they SHRINK
// rather than overflow, and a number line at a third fits while being unreadable. The
// tier is max(measured, editorial): measurement rules out the impossible, judgement
// rules out the illegible. Refined per block by minWidthUnits() below.
interface LayoutFacts {
    rowUnits: number;
    perRowFull: number;
    minWidth: WidthUnits;
}

const LAYOUT: Record<string, LayoutFacts> = {
    "layout-sectie": { rowUnits: 1, perRowFull: 1, minWidth: 6 },
    "layout-lege-pagina": { rowUnits: 1, perRowFull: 1, minWidth: 6 },
    "layout-schrijflijnen": { rowUnits: 1, perRowFull: 1, minWidth: 2 },
    "layout-raster": { rowUnits: 1, perRowFull: 1, minWidth: 2 },
    "layout-kader": { rowUnits: 1, perRowFull: 1, minWidth: 2 },
    "afronden": { rowUnits: 10.17, perRowFull: 2, minWidth: 3 },
    "breuken": { rowUnits: 7, perRowFull: 2, minWidth: 6 },
    "breuken-bewerken": { rowUnits: 2.43, perRowFull: 2, minWidth: 6 },
    "breuken-rangschikken": { rowUnits: 3.63, perRowFull: 2, minWidth: 3 },
    "controleren": { rowUnits: 4.5, perRowFull: 2, minWidth: 6 },
    "deelbaarheid": { rowUnits: 2.67, perRowFull: 1, minWidth: 6 },
    "deelbaarheid-kleuren": { rowUnits: 13.04, perRowFull: 1, minWidth: 6 },
    "even-oneven": { rowUnits: 4.04, perRowFull: 2, minWidth: 6 },
    "geld-herkennen": { rowUnits: 6.67, perRowFull: 4, minWidth: 6 },
    "geld-rekenen": { rowUnits: 1.42, perRowFull: 1, minWidth: 6 },
    "geld-tekenen": { rowUnits: 5.67, perRowFull: 4, minWidth: 6 },
    "geld-teruggeven": { rowUnits: 2.4, perRowFull: 2, minWidth: 6 },
    "geld-wissel": { rowUnits: 5.42, perRowFull: 2, minWidth: 6 },
    "getalfunctie": { rowUnits: 1.33, perRowFull: 1, minWidth: 6 },
    "getallenas": { rowUnits: 4.67, perRowFull: 1, minWidth: 6 },
    "getallenrijen": { rowUnits: 3.25, perRowFull: 1, minWidth: 6 },
    "getalpatronen": { rowUnits: 1.75, perRowFull: 1, minWidth: 6 },
    "herleidingen": { rowUnits: 1.5, perRowFull: 2, minWidth: 6 },
    "hr-std-aftrekken": { rowUnits: 2, perRowFull: 1, minWidth: 3 },
    "hr-std-delen": { rowUnits: 2, perRowFull: 1, minWidth: 2 },
    "hr-std-optellen": { rowUnits: 2, perRowFull: 1, minWidth: 3 },
    "hr-std-vermenigvuldigen": { rowUnits: 2, perRowFull: 1, minWidth: 2 },
    "kalender": { rowUnits: 14.65, perRowFull: 1, minWidth: 6 },
    "kettingsommen": { rowUnits: 1.75, perRowFull: 1, minWidth: 3 },
    "klok-kloklezen": { rowUnits: 7.33, perRowFull: 2.7, minWidth: 6 },
    "lengte-meten": { rowUnits: 5.5, perRowFull: 1, minWidth: 6 },
    "maateenheid": { rowUnits: 1.42, perRowFull: 1, minWidth: 2 },
    "mab-herkennen": { rowUnits: 6.46, perRowFull: 2.7, minWidth: 6 },
    "mab-tekenen": { rowUnits: 6.46, perRowFull: 2.7, minWidth: 6 },
    "omtrek": { rowUnits: 21.78, perRowFull: 1, minWidth: 6 },
    "oppervlakte": { rowUnits: 18.42, perRowFull: 1, minWidth: 6 },
    "ordenen": { rowUnits: 3.63, perRowFull: 2, minWidth: 3 },
    "plaatswaarde": { rowUnits: 3.58, perRowFull: 2, minWidth: 6 },
    "procenten": { rowUnits: 1.38, perRowFull: 2, minWidth: 3 },
    "rekenvolgorde": { rowUnits: 1.38, perRowFull: 2, minWidth: 6 },
    "romeinse-cijfers": { rowUnits: 1.58, perRowFull: 2, minWidth: 6 },
    "schattend": { rowUnits: 1.38, perRowFull: 1, minWidth: 6 },
    "splitsen": { rowUnits: 6.63, perRowFull: 4, minWidth: 3 },
    "temperatuur": { rowUnits: 10.63, perRowFull: 4, minWidth: 6 },
    "tijdsduur": { rowUnits: 1.42, perRowFull: 1, minWidth: 6 },
    "verbanden": { rowUnits: 1.81, perRowFull: 2, minWidth: 6 },
    "vergelijken": { rowUnits: 2.17, perRowFull: 2, minWidth: 6 },
    "vormleer-figuren": { rowUnits: 2.4, perRowFull: 2, minWidth: 6 },
    "vormleer-hoeken": { rowUnits: 8.06, perRowFull: 2, minWidth: 6 },
    "vormleer-punt-lijn": { rowUnits: 8.06, perRowFull: 2, minWidth: 6 },
    "weegschaal": { rowUnits: 9.21, perRowFull: 2, minWidth: 6 },
};

// Types added without a measurement fall back to a middling row and half width.
const FALLBACK: LayoutFacts = { rowUnits: 2.4, perRowFull: 2, minWidth: 3 };

export function layoutFacts(typeId: string): LayoutFacts {
    return LAYOUT[typeId] ?? FALLBACK;
}

// Exercises per row shrink with the column: a viewer that fits 2 side by side at full
// width fits 1 in a half block. Never below 1.
//
// Some viewers decide this from the block's own settings rather than a fixed number, so
// the estimate has to follow the same rule the viewer uses — a cost function that
// disagrees with the renderer is exactly what the height harness exists to catch.
export function perRow(block: MathBlock, width: WidthUnits): number {
    const facts = layoutFacts(block.typeId);
    let full = facts.perRowFull;

    // MathBlockRenderer lays hoofdrekenen out 2-up while the operands stay narrow and
    // drops to 1-up for wide numbers, met-rest rows and long chains.
    if (block.typeId.startsWith('hr-std-')) {
        const c = (block.constraints ?? {}) as Record<string, unknown>;
        const maxGetal = typeof c.maxGetal === 'number' ? c.maxGetal : 1000;
        const terms = typeof c.termCount === 'number' ? c.termCount : 2;
        full = (maxGetal >= 100000 || terms > 2 || block.layoutPreset === 'inline-long') ? 1 : 2;
    }

    if (width >= 6) return Math.max(1, full);
    if (width >= 3) return Math.max(1, Math.round(full / 2));
    return 1;
}

// The narrowest width this block can render at WITH ITS CURRENT SETTINGS. It has to be a
// function, not a constant: hoofdrekenen fits a third at "tot 100" but needs the full
// width at a million, which is exactly what the operand-width fix taught us.
export function minWidthUnits(block: MathBlock): WidthUnits {
    const base = layoutFacts(block.typeId).minWidth;
    if (base === 6) return 6;

    const c = (block.constraints ?? {}) as Record<string, unknown>;
    const maxGetal = typeof c.maxGetal === 'number' ? c.maxGetal : 0;

    // Wide numbers need wide columns whatever the type's baseline tier says.
    if (maxGetal >= 100000) return 6;
    if (maxGetal >= 10000 && base < 6) return Math.max(base, 3) as WidthUnits;

    // Multi-term chains and the stepped layout both eat horizontal room.
    const termCount = typeof c.termCount === 'number' ? c.termCount : 2;
    if (termCount > 2 || block.layoutPreset === 'inline-long') return Math.max(base, 3) as WidthUnits;

    return base;
}

// Budgeted height of a block at a given width, in row units. Pure function of settings.
// Sheet furniture is sized by its own settings rather than by an exercise count.
function layoutBlockHeight(block: MathBlock): number | null {
    if (!block.typeId.startsWith('layout-')) return null;
    const c = (block.constraints ?? {}) as Record<string, unknown>;
    const CM_PER_MM = 3.78;   // 1mm at 96dpi
    switch (block.typeId) {
        case 'layout-sectie':
            return (c.title ? 1.4 : 0.5);
        case 'layout-schrijflijnen': {
            const n = Math.max(1, Number(c.lineCount ?? 6));
            const mm = Number(c.lineSpacing ?? 10);
            return (n * mm * CM_PER_MM) / ROW_UNIT_PX;
        }
        case 'layout-raster': {
            const rows = Math.max(1, Number(c.rows ?? 8));
            const mm = Number(c.cellMm ?? 10);
            return (rows * mm * CM_PER_MM) / ROW_UNIT_PX;
        }
        case 'layout-kader': {
            const lines = String(c.body ?? '').split(String.fromCharCode(10)).length;
            return 1.6 + lines * 0.75;
        }
        case 'layout-lege-pagina':
            // Deliberately a whole page: that is the entire point of the block.
            return ROW_BUDGET;
        default:
            return null;
    }
}

export function estimateHeightUnits(block: MathBlock, width: WidthUnits): number {
    const furniture = layoutBlockHeight(block);
    if (furniture !== null) return furniture;

    const facts = layoutFacts(block.typeId);
    const count = Math.max(1, block.numberOfExercises || 1);
    const rows = Math.ceil(count / perRow(block, width));

    // Stepped layout adds its answer lines under every exercise.
    const stepped = block.layoutPreset === 'stepped' ? Math.max(0, (block.steppedLines || 1) - 1) : 0;
    const rowUnits = facts.rowUnits + stepped * (32 / ROW_UNIT_PX);

    // Whitespace is real height. rowUnits was calibrated at the 14px default gap, so only
    // the difference is charged on top — more air per exercise means fewer per page.
    const gap = block.verticalSpacing || 14;
    const gapExtra = Math.max(0, rows - 1) * ((gap - 14) / ROW_UNIT_PX);

    // Fixed chrome: the opdracht title plus the block's own padding.
    const TITLE_UNITS = 1;
    return TITLE_UNITS + rows * rowUnits + gapExtra;
}
