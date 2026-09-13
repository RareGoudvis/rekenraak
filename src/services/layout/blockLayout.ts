import type { MathBlock } from '../math/types';
import { cellWidthPx } from '../../components/viewer/BlockWidthContext';
import { WIDTH_FIT_FLOOR } from '../../components/viewer/scaledBlockFit';

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
// The chrome heights are their print padding at 96dpi plus their content, measured on the
// rendered page (2026-09-13, title + all four name fields): the header is 8mm (30px) above
// 54px of fields and title plus the 12px content gap = 96px, the footer 4mm + 8mm (45px)
// around a ~26px credit line = 71px. SYNC: index.css .page-sheet-head/-foot.
// The header was 16mm until 2026-09-12 and 12mm until 2026-09-13; the header region's own
// 12px frame padding and the title's 8px fields gap went with it when nothing needs them.
// There is no VERTICAL body padding (.page-sheet-body is `padding: 0 53px`) — the 32px
// that used to be subtracted here was fiction; the ROW_BUDGET -2 below is the real slack.
const BODY_HEIGHT_PX = 1123 - 96 /* header + content gap */ - 71 /* footer */;
// Two units under what the body can actually hold. Under-estimating is the dangerous
// direction — content crossing the footer — while over-estimating only wastes space.
export const ROW_BUDGET = Math.floor(BODY_HEIGHT_PX / ROW_UNIT_PX) - 2;

// What ONE block may be tall before it no longer fits a page: the body minus the block
// chrome that sits OUTSIDE the scaled area (16px padding + 4px margin, top and bottom).
// Approximate on purpose — it is the target of ScaledBlock's opt-in height back-off
// (`constraints.fitToPage`), not a pagination decision, so a few px either way only
// changes how hard that block shrinks. SYNC: App.tsx blockContainer padding/margin.
export const PAGE_BODY_PX = BODY_HEIGHT_PX - 40;

// ── Per-type layout facts ────────────────────────────────────────────────────
// All three numbers come from `scripts/width-matrix.mjs`, which renders every registry
// type at widths 4 / 2 / 1 and at its default count and at a single exercise, and reads
// back the cell height and the content's overflow ratio (scrollWidth / clientWidth of the
// ScaledBlock inner div). Re-run it after any viewer change that moves a block's width:
// see .claude/docs/TESTING.md.
//
// `perRowFull` is how many exercises the viewer fits per row at full width, and
// `rowUnits` the height of ONE such row in ROW_UNIT_PX. The row count is COUNTED off the
// rendered grid (one `.print-row` per FragmentableGrid row) since 2026-09-13, and
// rowUnits = (h_default - h_single) / (rows - 1) / 24 follows from it. It used to be
// derived from the ratio of those two heights, which two different (rows, rowUnits) pairs
// fit equally well whenever the single-exercise height is close to the block's fixed
// chrome — that is what had deelbaarheid, getalfunctie and tijdsduur down as 2-up when
// their viewers pass `cols={1}`. Viewers that render no `.print-row` at all (cijferen,
// temperatuur, verbanden, geld-teruggeven, kalender, layout-*) keep their old numbers.
// The matrix is seeded (`--seed 1234`) so two runs can be diffed. Since measure-then-pack
// (§9) these two are only the FIRST-PAINT fallback — the rendered height wins within a
// frame — so two decimals is as precise as this needs to be.
//
// `minWidth` is the narrowest column this type may be placed in — but only until the
// sheet has rendered once. Since 7a (2026-09-12) the live answer comes from the BLOCK, not
// from its type: PageSheet probes each cell's min-content width and minWidthUnits() picks
// the smallest tier that holds it. This table is what runs before that measurement exists
// (first paint, unit tests), and it is why a three-item rekenvolgorde block used to be told
// it needed the whole page: the tiers were measured once, at default settings, per type.
//   RULE (how these numbers were set): a width is allowed when overflow <= 1.005 at the
//   REQUESTED zoom (zoom === 1 in the harness). It used to also accept a zoom down to 0.85,
//   from when ScaledBlock auto-fitted every block to its column; a block is widened rather
//   than shrunk now, and shrinking is the per-block opt-in `constraints.fitToWidth`.
// Measurement alone is not enough — viewers read an injected width, so they SHRINK
// rather than overflow, and a number line at a quarter fits while being unreadable. The
// tier is max(measured, editorial): measurement rules out the impossible, judgement rules
// out the illegible. The EDITORIAL half is `VETO_MIN` below, which applies in BOTH regimes.
// From the 2026-09-12 screenshot pass:
//   - geld-tekenen, half: numerically fine, but the draw-the-amount boxes shrink to ~17mm.
//     A child cannot draw coins and notes in that.
//   - oppervlakte (and lengte-meten, omtrek): the figures are drawn TO SCALE (1cm ≈ 37.8px),
//     so whether they fit depends on the shapes the generator happened to roll, not on the
//     viewer. A 10cm rectangle does not fit a half. Full width, always.
//   - getallenas, quarter: the axis labels collide ("345350") even though nothing overflows.
//   - deelbaarheid-kleuren, quarter: a four-digit number wraps INSIDE its cell ("1 000").
//   - geld-teruggeven, quarter: the jump diagram shrinks to unreadable micro-type.
//   - layout-sectie and layout-lege-pagina: full width by definition, not by measurement.
// The 2026-09-13 seeded rerun measured geld-tekenen at a half and geld-teruggeven,
// deelbaarheid-kleuren and getallenas at a quarter, so their table entries say so; all
// four are on the veto list below, which is the half of the tier that judgement owns and
// which still holds them where the screenshot pass put them.
// The 2026-09-12 quarter pass moved hr-std-*, getalpatronen, kettingsommen, plaatswaarde
// and deelbaarheid from a half to a quarter after their viewers grew a tight tier below
// 200px (see MathBlockRenderer / PatroonViewer / PlaatswaardeViewer / DeelbaarheidViewer).
// All five measure overflow 1.000 at a quarter at both 1600px and 1000px viewports. What
// stays out of a quarter there is settings-shaped rather than type-shaped, so it lives in
// minWidthUnits() below: decimal hoofdrekenen (1.39), the compenseren tussenstap line
// (1.67) and the plaatswaarde 'tabel' subtype (1.14, six place columns in 163px).
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
    // schrijflijnen/raster/kader render width:100% furniture (schrijflijnen's lines are
    // absolutely positioned so they measure 0; kader wraps text) — their min-content probe
    // (see PageSheet.probeIntrinsicWidth) reports narrow, so they are ¼-capable by content
    // rather than by this table's minWidth alone. Raster used a fixed cols*cell px width
    // until 2026-09-13, which pinned its probe to the full cell and greyed out ½ and ¼.
    "layout-schrijflijnen": { rowUnits: 1, perRowFull: 1, minWidth: 1 },
    "layout-raster": { rowUnits: 1, perRowFull: 1, minWidth: 1 },
    "layout-kader": { rowUnits: 1, perRowFull: 1, minWidth: 1 },
    "afronden": { rowUnits: 10.33, perRowFull: 2, minWidth: 2 },
    "breuken": { rowUnits: 6.23, perRowFull: 2, minWidth: 1 },
    "breuken-bewerken": { rowUnits: 2.58, perRowFull: 2, minWidth: 2 },
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
    "deelbaarheid": { rowUnits: 1.42, perRowFull: 1, minWidth: 1 },
    "deelbaarheid-kleuren": { rowUnits: 3.33, perRowFull: 1, minWidth: 1 },
    // C1 step 7: the rooster's perRow now clamps to the column, so it never overflows —
    // SETTINGS_FLOOR (2) is what actually keeps it off a quarter, not this table.
    "even-oneven": { rowUnits: 1.9, perRowFull: 1, minWidth: 2 },
    "geld-herkennen": { rowUnits: 10.08, perRowFull: 3, minWidth: 1 },
    "geld-rekenen": { rowUnits: 1.58, perRowFull: 1, minWidth: 4 },
    "geld-tekenen": { rowUnits: 5.83, perRowFull: 3, minWidth: 2 },
    "geld-teruggeven": { rowUnits: 8.4, perRowFull: 1, minWidth: 1 },
    "geld-wissel": { rowUnits: 5.58, perRowFull: 2, minWidth: 2 },
    "getalfunctie": { rowUnits: 1.33, perRowFull: 1, minWidth: 4 },
    // minWidth is academic here: SETTINGS_FLOOR floors getallenas at 4 regardless (axis
    // labels collide well before the content itself overflows a narrower cell).
    "getallenas": { rowUnits: 4.08, perRowFull: 1, minWidth: 4 },
    "getallenrijen": { rowUnits: 2.88, perRowFull: 1, minWidth: 4 },
    // C1 step 1: the vertical fallback below 200px is gone from PatroonViewer, so the
    // fallback table floor moves up to match SETTINGS_FLOOR's ½.
    "getalpatronen": { rowUnits: 1.92, perRowFull: 1, minWidth: 2 },
    "herleidingen": { rowUnits: 2.03, perRowFull: 2, minWidth: 4, minWidthSingle: 2 },
    "hr-std-aftrekken": { rowUnits: 2.08, perRowFull: 2, minWidth: 1 },
    "hr-std-delen": { rowUnits: 2.08, perRowFull: 2, minWidth: 1 },
    "hr-std-gemengd": { rowUnits: 2.08, perRowFull: 2, minWidth: 1 },
    "hr-std-optellen": { rowUnits: 2.08, perRowFull: 2, minWidth: 1 },
    "hr-std-vermenigvuldigen": { rowUnits: 2.08, perRowFull: 2, minWidth: 1 },
    // Measured 4 since 2026-09-13: the question row overflows a half (BUGS.md) — 2 once fixed.
    "kalender": { rowUnits: 14.65, perRowFull: 1, minWidth: 2 },
    "kettingsommen": { rowUnits: 2.29, perRowFull: 1, minWidth: 2 },
    "klok-kloklezen": { rowUnits: 7.08, perRowFull: 2.5, minWidth: 1 },
    "lengte-meten": { rowUnits: 5.67, perRowFull: 1, minWidth: 4 },
    "maateenheid": { rowUnits: 1.58, perRowFull: 1, minWidth: 1 },
    "mab-herkennen": { rowUnits: 6.63, perRowFull: 2, minWidth: 2 },
    // A single drawn place-value figure has no glyph table to read, so it can go to ¼ —
    // unlike mab-herkennen, whose numeral/glyph pairing needs the ½ floor (SETTINGS_FLOOR).
    "mab-tekenen": { rowUnits: 6.63, perRowFull: 2, minWidth: 1 },
    "omtrek": { rowUnits: 21.42, perRowFull: 1, minWidth: 4 },
    "oppervlakte": { rowUnits: 18.07, perRowFull: 1, minWidth: 4 },
    "ordenen": { rowUnits: 3.08, perRowFull: 2, minWidth: 1 },
    "plaatswaarde": { rowUnits: 1.63, perRowFull: 2, minWidth: 1 },
    "procenten": { rowUnits: 1.54, perRowFull: 2, minWidth: 1 },
    // ½ since the 2026-09-13 rerun: the viewer's kort/lang/stappen answer lines put the
    // rows 1-up in a half cell (overflow 1.30 → 1.00). A quarter still overflows (1.33).
    "rekenvolgorde": { rowUnits: 1.58, perRowFull: 2, minWidth: 2 },
    "romeinse-cijfers": { rowUnits: 1.75, perRowFull: 2, minWidth: 2 },
    "schattend": { rowUnits: 1.58, perRowFull: 1, minWidth: 4 },
    "splitsen": { rowUnits: 6.79, perRowFull: 2.5, minWidth: 1 },
    "temperatuur": { rowUnits: 10.63, perRowFull: 4, minWidth: 1 },
    "tijdsduur": { rowUnits: 1.58, perRowFull: 1, minWidth: 4 },
    "verbanden": { rowUnits: 3.69, perRowFull: 2, minWidth: 4 },
    "vergelijken": { rowUnits: 2.17, perRowFull: 2, minWidth: 2 },
    "vormleer-figuren": { rowUnits: 6.5, perRowFull: 3, minWidth: 1 },
    "vormleer-hoeken": { rowUnits: 6.5, perRowFull: 3, minWidth: 1 },
    "vormleer-punt-lijn": { rowUnits: 6.5, perRowFull: 3, minWidth: 1 },
    "weegschaal": { rowUnits: 9.38, perRowFull: 2, minWidth: 2 },
};

// Types added without a measurement fall back to a middling row and half width.
const FALLBACK: LayoutFacts = { rowUnits: 2.4, perRowFull: 2, minWidth: 2 };

function layoutFacts(typeId: string): LayoutFacts {
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

// ── Width vetoes ─────────────────────────────────────────────────────────────
// The narrowest column a type may sit in REGARDLESS of what fits. Measurement rules out
// the impossible; this table rules out the illegible. Every entry is from the 2026-09-12
// screenshot pass and is quoted in the LAYOUT header above: number lines whose labels
// collide, to-scale rulers, draw-the-amount boxes, jump diagrams, and the two layout
// blocks that are full width by definition rather than by content.
const VETO_MIN: Record<string, WidthUnits> = {
    "layout-sectie": 4,
    "layout-lege-pagina": 4,
    "lengte-meten": 4,
    "omtrek": 4,
    "oppervlakte": 4,
    "geld-tekenen": 4,
    "kalender": 2,
    "geld-teruggeven": 2,
    // deelbaarheid-kleuren used to be pinned here because its cells were fixed px and a
    // 4-digit number wrapped inside them; the strip/raster cells are `em`-sized now (C1
    // step 6), so the width clamp judges it on measurement like everything else.
};

// A typeId-only veto cannot see WHAT the teacher configured — a getallenrijen block reads
// its own settings, and "the axis labels collide" is true regardless of them, while
// "six place columns" only happens with the 'tabel' subtype. These rules read
// `block.constraints` (narrowed per family) instead of being one more flat table entry,
// so they stay a registry lookup rather than growing into an if-else chain in
// `editorialFloor`. Every floor here is from the 2026-09-13 owner pass (see BUGS.md /
// UpdateState.md for the screenshots that set each number).
type FloorRule = (block: MathBlock) => WidthUnits;

const SETTINGS_FLOOR: Record<string, FloorRule> = {
    // Axis / sequence / function-table labels collide well before anything overflows —
    // full width regardless of settings.
    getallenas: () => 4,
    getallenrijen: () => 4,
    getalfunctie: () => 4,
    getalpatronen: () => 2,
    kettingsommen: () => 2,
    'even-oneven': () => 2,
    deelbaarheid: (block) => {
        const c = (block.constraints ?? {}) as Partial<import('../math/constraintTypes').DeelbaarheidConstraints>;
        if (c.layout === 'tabel') return (c.divisors?.length ?? 0) <= 3 ? 2 : 4;
        // 'veelvouden' (the default) never needs more than a half: C1 step 4 caps the
        // printed sequence length to whatever the column actually holds.
        return 2;
    },
    splitsen: (block) => {
        const c = (block.constraints ?? {}) as Partial<import('../math/constraintTypes').SplitsenConstraints>;
        const maxGetal = c.maxGetal ?? 0;
        if (c.layout === 'positie-tabel') return maxGetal <= 100 ? 2 : 4;
        if (c.layout === 'positie-benen') return maxGetal <= 100 ? 1 : 2;
        if (c.layout === 'positie-math') return 2;
        return 1;
    },
    breuken: (block) => {
        const c = (block.constraints ?? {}) as Partial<import('../math/constraintTypes').FractionConstraints>;
        return c.subType === 'hoeveelheid' ? 2 : 1;
    },
    // MAB is sized by its glyphs rather than by its share of the block: mab-herkennen
    // pairs a numeral with a glyph table, which stops reading at a quarter; mab-tekenen
    // draws ONE place-value figure, which has no such pairing and can go to a quarter.
    'mab-herkennen': () => 2,
    'mab-tekenen': () => 1,
};

function editorialFloor(block: MathBlock): WidthUnits {
    const rule = SETTINGS_FLOOR[block.typeId];
    if (rule) return rule(block);
    return VETO_MIN[block.typeId] ?? 1;
}

// Judge tiers against the WIDEST column gap the sheet can have (blockSpacing 12 + the 16px
// the column rule adds): a tier that fits with the rule on fits without it.
const COL_GAP_PX = 12 + 16;
// A block that exactly fills its cell is one rounding error from overflowing.
const WIDTH_SLACK_PX = 8;

const TIERS: WidthUnits[] = [1, 2, 4];

/** Printable width of a cell at this tier, as the width clamp judges it. */
export function tierWidthPx(units: WidthUnits): number {
    return cellWidthPx(units, COL_GAP_PX);
}

/** Smallest tier whose printable cell holds `px` of content. */
function tierFor(px: number): WidthUnits {
    return TIERS.find(w => tierWidthPx(w) >= px + WIDTH_SLACK_PX) ?? 4;
}

/** One tier narrower than `w` — 4 → 2 → 1, and 1 stays 1. */
function narrower(w: WidthUnits): WidthUnits {
    return w === 4 ? 2 : 1;
}

// The narrowest width this block can render at WITH ITS CURRENT SETTINGS.
//
// With a MEASUREMENT (PageSheet probes each block's min-content width, see
// useMeasuredHeights) this is simply: the smallest tier the content fits in, never below
// the type's editorial veto. That replaces a per-type table measured once at default
// settings, which is what told a three-item rekenvolgorde block it needed the whole page.
//
// REFLOW RULE. The measurement is taken at the width the block currently sits in, and a
// viewer that lays out 2-up there lays out 1-up in a narrower cell — so a measurement at
// width 4 says nothing about what the same block needs at width 2. When the block reflows
// (perRow > 1 at the measured width) and its content fits where it is, the tier is allowed
// ONE step narrower than the width it was measured at. The teacher picks that width, the
// block is measured again THERE, and either it opens the next step or the packer clamps it
// back with the `promoted` hint. One step at a time is what keeps this honest: each step
// is backed by a real measurement instead of a guess two tiers out.
//
// This cannot oscillate. Measuring at a narrower width writes a NEW `blockId:width` entry;
// the entry that allowed the step stays, and `intrinsicOf` takes the SMALLEST — so the
// allowance can only grow, the clamp is monotone in it, and a clamp-up re-measures at a
// key that was not the input to the decision. See useMeasuredHeights' convergence note.
//
// WITHOUT a measurement (first paint, tests, the Inspector before the sheet rendered) the
// old settings-derived gates below run unchanged: they are the fallback, not the truth.
export function minWidthUnits(block: MathBlock, measured?: { intrinsicPx?: number; atWidth?: WidthUnits }): WidthUnits {
    const floor = editorialFloor(block);
    const px = measured?.intrinsicPx;
    if (px !== undefined && px > 0) {
        // `fitToWidth` is the teacher saying "shrink this block rather than widen it", so
        // the tier is judged against what the block is allowed to shrink TO. It buys one
        // 15% step, not a licence to clip: a block that does not fit even at the floor is
        // still promoted, because nothing on the sheet may run off its column in print.
        const fits = block.constraints?.fitToWidth ? px * WIDTH_FIT_FLOOR : px;
        let tier = tierFor(fits);
        const at = measured?.atWidth ?? (COL_UNITS as WidthUnits);
        if (tier > 1 && perRow(block, at) > 1 && fits <= tierWidthPx(at)) {
            tier = Math.min(tier, narrower(at)) as WidthUnits;
        }
        return Math.max(tier, floor) as WidthUnits;
    }
    return Math.max(fallbackMinWidth(block), floor) as WidthUnits;
}

// Pre-measurement tiers: the hand-measured per-type table plus the settings that were
// known to outgrow it. Kept only for the frames (and the unit tests) where nothing has
// been rendered yet — a measurement supersedes all of it.
function fallbackMinWidth(block: MathBlock): WidthUnits {
    const facts = layoutFacts(block.typeId);
    // A single exercise has no neighbours to fit beside it, so a type that only needs the
    // full width for a ROW of items can go narrower when there is just one.
    const single = (block.numberOfExercises ?? 0) <= 1 && facts.minWidthSingle;
    const base = single ? facts.minWidthSingle! : facts.minWidth;
    const c = (block.constraints ?? {}) as Record<string, unknown>;

    if (base === 4) return 4;

    // A place-value TABLE needs one bordered cell per place plus the number itself; six
    // columns do not fit 163px however small the cells get. The other two subtypes do.
    if (block.typeId === 'plaatswaarde' && c.subType === 'tabel') return Math.max(base, 2) as WidthUnits;

    // Hoofdrekenen fits a quarter as plain whole numbers or fractions only: decimals add
    // two to three characters to every operand, and the compenseren tussenstap
    // ("= a + ___ - ___") is wider than the whole cell on its own.
    if (block.typeId.startsWith('hr-std-')) {
        if (c.numberType === 'decimal') return Math.max(base, 2) as WidthUnits;
        if (c.preset === 'compenseren' && (c.compenserenScaffold ?? 'tussenstap') === 'tussenstap') return Math.max(base, 2) as WidthUnits;
    }

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
