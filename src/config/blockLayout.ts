import type { MathBlock } from '../services/math/types';

// ── Page grid ────────────────────────────────────────────────────────────────
// A page's content area is COL_UNITS wide (4, so a block can be a whole, a half or a
// quarter) by ROW_BUDGET tall. Heights are BUDGETED from settings, never measured from
// the DOM — that is what makes pagination deterministic and testable instead of a
// reflow loop.
export const COL_UNITS = 4;
export type WidthUnits = 1 | 2 | 4;

// A4 at 96dpi is 1123px tall. Header, footer and the body cell's own padding come off
// the top; ROW_UNIT_PX is the granularity the cost functions are calibrated in.
export const ROW_UNIT_PX = 24;
// The chrome heights are their print padding at 96dpi plus their content: the header is
// 16mm (60.5px) above ~72px of title and name fields plus the 12px content gap, the footer
// 4mm + 8mm (45px) around a ~26px credit line. SYNC: index.css .page-sheet-head/-foot.
const BODY_HEIGHT_PX = 1123 - 145 /* header */ - 71 /* footer */ - 32 /* body padding */;
// Two units under what the body can actually hold. Under-estimating is the dangerous
// direction — content crossing the footer — while over-estimating only wastes space.
export const ROW_BUDGET = Math.floor(BODY_HEIGHT_PX / ROW_UNIT_PX) - 2;

// ── Per-type layout facts ────────────────────────────────────────────────────
// All three numbers come from `scripts/width-matrix.mjs`, which renders every registry
// type at widths 4 / 2 / 1 and at its default count and at a single exercise, and reads
// back the cell height and the content's overflow ratio (scrollWidth / clientWidth of the
// ScaledBlock inner div). Re-run it after any viewer change that moves a block's width:
// see .claude/docs/TESTING.md.
//
// `perRowFull` is how many exercises the viewer fits per row at full width, and
// `rowUnits` the height of ONE such row in ROW_UNIT_PX. Both are derived from the same
// two measurements: rows = round((h_default - chrome) / (h_single - chrome)), and
// rowUnits = (h_default - h_single) / (rows - 1) / 24. Deriving the row count instead of
// trusting the old `perRowFull` is what caught the types that actually render 2-3 up
// (getalfunctie, tijdsduur, herleidingen, geld-rekenen). Since measure-then-pack (§9)
// these two are only the FIRST-PAINT fallback — the rendered height wins within a frame —
// so two decimals is as precise as this needs to be.
//
// `minWidth` is the narrowest column this type may be placed in.
//   RULE: a width is allowed when overflow <= 1.005 AND the applied zoom >= 0.85.
// Measurement alone is not enough — viewers read an injected width, so they SHRINK
// rather than overflow, and a number line at a quarter fits while being unreadable. The
// tier is max(measured, editorial): measurement rules out the impossible, judgement rules
// out the illegible. Every EDITORIAL VETO, from the 2026-09-12 screenshot pass:
//   - geld-tekenen, half: numerically fine, but the draw-the-amount boxes shrink to ~17mm.
//     A child cannot draw coins and notes in that.
//   - oppervlakte (and lengte-meten, omtrek): the figures are drawn TO SCALE (1cm ≈ 37.8px),
//     so whether they fit depends on the shapes the generator happened to roll, not on the
//     viewer. A 10cm rectangle does not fit a half. Full width, always.
//   - getallenas, quarter: the axis labels collide ("345350") even though nothing overflows.
//   - deelbaarheid-kleuren, quarter: a four-digit number wraps INSIDE its cell ("1 000").
//   - geld-teruggeven, quarter: the jump diagram shrinks to unreadable micro-type.
//   - layout-sectie and layout-lege-pagina: full width by definition, not by measurement.
// Refined per block by minWidthUnits() below.
interface LayoutFacts {
    rowUnits: number;
    perRowFull: number;
    minWidth: WidthUnits;
    // Some types need the full width only because several items sit side by side. With a
    // single exercise there is nothing to sit beside, so they can go narrower — MAB is the
    // clear case: one place-value drawing fits a half, four do not.
    minWidthSingle?: WidthUnits;
}

const LAYOUT: Record<string, LayoutFacts> = {
    "layout-sectie": { rowUnits: 1, perRowFull: 1, minWidth: 4 },
    "layout-lege-pagina": { rowUnits: 1, perRowFull: 1, minWidth: 4 },
    "layout-schrijflijnen": { rowUnits: 1, perRowFull: 1, minWidth: 1 },
    "layout-raster": { rowUnits: 1, perRowFull: 1, minWidth: 1 },
    "layout-kader": { rowUnits: 1, perRowFull: 1, minWidth: 1 },
    "afronden": { rowUnits: 10.33, perRowFull: 2, minWidth: 2 },
    "breuken": { rowUnits: 6.23, perRowFull: 2, minWidth: 4, minWidthSingle: 2 },
    "breuken-bewerken": { rowUnits: 1.95, perRowFull: 1.6, minWidth: 2 },
    "breuken-rangschikken": { rowUnits: 5.04, perRowFull: 2, minWidth: 1 },
    // Cijferen (column arithmetic) sat on FALLBACK; the width matrix shows the grid fits a
    // quarter cell at its default 2-up count, so it is one of the few types that can go ¼.
    "cijferen-optellen-nat": { rowUnits: 7.25, perRowFull: 2, minWidth: 1 },
    "cijferen-optellen-dec": { rowUnits: 7.25, perRowFull: 2, minWidth: 1 },
    "cijferen-aftrekken-nat": { rowUnits: 7.25, perRowFull: 2, minWidth: 1 },
    "cijferen-aftrekken-dec": { rowUnits: 7.25, perRowFull: 2, minWidth: 1 },
    "cijferen-vermenigvuldigen-nat": { rowUnits: 7.25, perRowFull: 2, minWidth: 1 },
    "cijferen-vermenigvuldigen-dec": { rowUnits: 7.25, perRowFull: 2, minWidth: 1 },
    "cijferen-delen-nat": { rowUnits: 7.25, perRowFull: 2, minWidth: 1 },
    "cijferen-delen-dec": { rowUnits: 7.25, perRowFull: 2, minWidth: 1 },
    "controleren": { rowUnits: 4.67, perRowFull: 2, minWidth: 4, minWidthSingle: 2 },
    "deelbaarheid": { rowUnits: 3.54, perRowFull: 2, minWidth: 2 },
    "deelbaarheid-kleuren": { rowUnits: 3.33, perRowFull: 1, minWidth: 2 },
    "even-oneven": { rowUnits: 2.17, perRowFull: 1, minWidth: 4 },
    "geld-herkennen": { rowUnits: 8.33, perRowFull: 3, minWidth: 1 },
    "geld-rekenen": { rowUnits: 3.17, perRowFull: 1.7, minWidth: 4 },
    "geld-tekenen": { rowUnits: 5.83, perRowFull: 3, minWidth: 4 },
    "geld-teruggeven": { rowUnits: 8.4, perRowFull: 1, minWidth: 2 },
    "geld-wissel": { rowUnits: 5.58, perRowFull: 2, minWidth: 2 },
    "getalfunctie": { rowUnits: 3.33, perRowFull: 2, minWidth: 4 },
    "getallenas": { rowUnits: 4.08, perRowFull: 1, minWidth: 2 },
    "getallenrijen": { rowUnits: 2.88, perRowFull: 1, minWidth: 4 },
    "getalpatronen": { rowUnits: 1.92, perRowFull: 1, minWidth: 2 },
    "herleidingen": { rowUnits: 3.04, perRowFull: 2.7, minWidth: 4, minWidthSingle: 2 },
    "hr-std-aftrekken": { rowUnits: 2.08, perRowFull: 2, minWidth: 2 },
    "hr-std-delen": { rowUnits: 2.08, perRowFull: 2, minWidth: 2 },
    "hr-std-optellen": { rowUnits: 2.08, perRowFull: 2, minWidth: 2 },
    "hr-std-vermenigvuldigen": { rowUnits: 2.08, perRowFull: 2, minWidth: 2 },
    "kalender": { rowUnits: 14.65, perRowFull: 1, minWidth: 2 },
    "kettingsommen": { rowUnits: 2.29, perRowFull: 1, minWidth: 2 },
    "klok-kloklezen": { rowUnits: 7.08, perRowFull: 2.5, minWidth: 1 },
    "lengte-meten": { rowUnits: 5.67, perRowFull: 1, minWidth: 4 },
    "maateenheid": { rowUnits: 1.58, perRowFull: 1, minWidth: 1 },
    "mab-herkennen": { rowUnits: 6.62, perRowFull: 2, minWidth: 2 },
    "mab-tekenen": { rowUnits: 6.62, perRowFull: 2, minWidth: 2 },
    "omtrek": { rowUnits: 21.1, perRowFull: 1, minWidth: 4 },
    "oppervlakte": { rowUnits: 18.58, perRowFull: 1, minWidth: 4 },
    "ordenen": { rowUnits: 3.08, perRowFull: 2, minWidth: 1 },
    "plaatswaarde": { rowUnits: 1.62, perRowFull: 2, minWidth: 2 },
    "procenten": { rowUnits: 1.54, perRowFull: 2, minWidth: 1 },
    "rekenvolgorde": { rowUnits: 1.54, perRowFull: 2, minWidth: 4, minWidthSingle: 2 },
    "romeinse-cijfers": { rowUnits: 1.75, perRowFull: 2, minWidth: 2 },
    "schattend": { rowUnits: 1.58, perRowFull: 1, minWidth: 4 },
    "splitsen": { rowUnits: 6.79, perRowFull: 2.5, minWidth: 1 },
    "temperatuur": { rowUnits: 10.63, perRowFull: 4, minWidth: 1 },
    "tijdsduur": { rowUnits: 3.96, perRowFull: 2, minWidth: 4 },
    "verbanden": { rowUnits: 3.69, perRowFull: 2, minWidth: 4 },
    "vergelijken": { rowUnits: 2.17, perRowFull: 2, minWidth: 4, minWidthSingle: 2 },
    "vormleer-figuren": { rowUnits: 6.5, perRowFull: 3, minWidth: 4, minWidthSingle: 2 },
    "vormleer-hoeken": { rowUnits: 6.5, perRowFull: 3, minWidth: 4, minWidthSingle: 2 },
    "vormleer-punt-lijn": { rowUnits: 6.5, perRowFull: 3, minWidth: 4, minWidthSingle: 2 },
    "weegschaal": { rowUnits: 9.38, perRowFull: 2, minWidth: 4, minWidthSingle: 2 },
};

// Types added without a measurement fall back to a middling row and half width.
const FALLBACK: LayoutFacts = { rowUnits: 2.4, perRowFull: 2, minWidth: 2 };

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

    if (width >= COL_UNITS) return Math.max(1, full);
    if (width >= COL_UNITS / 2) return Math.max(1, Math.round(full / 2));
    return 1;
}

// The narrowest width this block can render at WITH ITS CURRENT SETTINGS. It has to be a
// function, not a constant: hoofdrekenen fits a quarter at "tot 100" but needs the full
// width at a million, which is exactly what the operand-width fix taught us.
export function minWidthUnits(block: MathBlock): WidthUnits {
    const facts = layoutFacts(block.typeId);
    // A single exercise has no neighbours to fit beside it, so a type that only needs the
    // full width for a ROW of items can go narrower when there is just one.
    const single = (block.numberOfExercises ?? 0) <= 1 && facts.minWidthSingle;
    const base = single ? facts.minWidthSingle! : facts.minWidth;
    const c = (block.constraints ?? {}) as Record<string, unknown>;

    // MAB is sized by its glyphs rather than by its share of the block: the hundreds plate
    // sets the column width and this type tops out at 1000, so four columns still fit a
    // half. It stays out of a quarter, where the place columns stop reading as places.
    if (block.typeId.startsWith('mab-')) return 2;

    if (base === 4) return 4;

    const maxGetal = typeof c.maxGetal === 'number' ? c.maxGetal : 0;

    // Wide numbers need wide columns whatever the type's baseline tier says.
    if (maxGetal >= 100000) return 4;
    if (maxGetal >= 10000 && base < 4) return Math.max(base, 2) as WidthUnits;

    // Multi-term chains and the stepped layout both eat horizontal room.
    const termCount = typeof c.termCount === 'number' ? c.termCount : 2;
    if (termCount > 2 || block.layoutPreset === 'inline-long') return Math.max(base, 2) as WidthUnits;

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
