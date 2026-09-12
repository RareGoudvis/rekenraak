import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MathBlock } from '../services/math/types';
import type { WidthUnits } from '../config/blockLayout';

// Real cell heights, fed back into the packer. The budget alone could not be right: it is
// derived from settings while the CSS grid lays out actual content, so an over-estimate
// ended a page early (blank tail) and an under-estimate tripped the overflow banner.
//
// This is React state in App, never the store: it describes how the sheet RENDERED, not
// what the sheet IS, so it must not be undoable, autosaved or shared.
//
// Convergence: a cell's height depends only on (block, width, spacing, docSettings) and
// never on where the packer put it, so one remeasure reaches a fixed point. Since the
// width clamp became measured too, widths ARE measurement-derived — but only one way: a
// clamp can widen a block, which writes a NEW `${blockId}:${width}` entry instead of
// overwriting the one that caused it, and the entry that caused it stays in the map. So a
// repack can add measurements, never contradict them, and the clamp settles in one extra
// pass. Writes under 2px are dropped, which stops sub-pixel rounding from oscillating.
const EPSILON_PX = 2;

// ── Intrinsic content widths ─────────────────────────────────────────────────
// How narrow a block's content can get, probed by PageSheet (see probeIntrinsicWidth).
// It lives at MODULE scope rather than in the hook's ref because the Inspector's width
// picker has to read the same number to say why a tier is off ("de inhoud is 412px
// breed"), and there is exactly one sheet in the app — threading it through App would buy
// nothing and App's markup belongs to other work.
//
// Keyed `${blockId}:${width}` like the heights: a viewer that lays out 2-up really is
// wider in a wide cell, so the same block has more than one honest answer. `intrinsicOf`
// returns the SMALLEST one seen and the width it was seen at — the smallest is the one
// that reflects what this block can do when it stops sharing rows.
const intrinsic = new Map<string, number>();

export interface IntrinsicWidth {
    /** Narrowest content width seen for this block, in layout px at its requested scale. */
    px: number;
    /** The cell width that measurement was taken in. */
    atWidth: WidthUnits;
}

export function intrinsicOf(blockId: string): IntrinsicWidth | undefined {
    let best: IntrinsicWidth | undefined;
    for (const [key, px] of intrinsic) {
        const cut = key.lastIndexOf(':');
        if (key.slice(0, cut) !== blockId) continue;
        if (!best || px < best.px) best = { px, atWidth: Number(key.slice(cut + 1)) as WidthUnits };
    }
    return best;
}

export interface MeasuredHeights {
    /** Measured px height of this block's cell at this width, or undefined if unmeasured. */
    heightPxOf: (block: MathBlock, width: number) => number | undefined;
    /** Measured px height of a page's body box, or undefined before first paint. */
    pageBudgetPx: (pageIndex: number) => number | undefined;
    onCellMeasure: (blockId: string, width: number, px: number, intrinsicWidthPx?: number) => void;
    /** Narrowest measured content width for this block, for the packer and the Inspector. */
    intrinsicOf: (blockId: string) => IntrinsicWidth | undefined;
    onBodyMeasure: (pageIndex: number, px: number) => void;
    /** Bumped whenever a measurement actually changed — the packer's only dependency. */
    version: number;
}

export function useMeasuredHeights(blocks: MathBlock[]): MeasuredHeights {
    // Key is `${blockId}:${widthUnits}`: the same block is a different height at a
    // different width, and both versions stay valid while the teacher toggles between them.
    const cells = useRef<Map<string, number>>(new Map());
    // Page 0 carries the header, so its body is the shorter one. Every other page shares a
    // single measurement — they are identical by construction.
    const body = useRef<{ first?: number; rest?: number }>({});
    const [version, setVersion] = useState(0);

    // Guard against a measure→pack→measure loop. A converging sheet settles in two or
    // three passes; a burst means some height is measurement-dependent, and left alone it
    // re-renders forever — the tab froze on a teacher's sheet before this existed. Past
    // BREAKER_BUMPS in a second the hook stops accepting measurements for COOLDOWN_MS: the
    // layout keeps whatever it last had (possibly a few px off) instead of hanging.
    const BREAKER_BUMPS = 12;
    const COOLDOWN_MS = 1500;
    const bumps = useRef<number[]>([]);
    const cooldownUntil = useRef(0);
    const bump = useCallback((what: string) => {
        const now = performance.now();
        bumps.current = [...bumps.current.filter(t => now - t < 1000), now];
        if (bumps.current.length > BREAKER_BUMPS) {
            cooldownUntil.current = now + COOLDOWN_MS;
            bumps.current = [];
            console.warn(`[layout] repack loop broken (${what}); measurements paused ${COOLDOWN_MS}ms`);
            return;
        }
        setVersion(v => v + 1);
        if (import.meta.env.DEV && bumps.current.length > 5) {
            console.warn(`[layout] ${bumps.current.length} repacks in 1s — ${what} is feeding back into itself`);
        }
    }, []);
    const paused = () => performance.now() < cooldownUntil.current;

    // Drop measurements for blocks that left the sheet, so the map cannot grow unbounded
    // across a long editing session. No version bump: pruning cannot change the height of
    // a block that is still there.
    useEffect(() => {
        const alive = new Set(blocks.map(b => b.id));
        for (const map of [cells.current, intrinsic]) {
            for (const key of map.keys()) {
                if (!alive.has(key.slice(0, key.lastIndexOf(':')))) map.delete(key);
            }
        }
    }, [blocks]);

    const onCellMeasure = useCallback((blockId: string, width: number, px: number, intrinsicWidthPx?: number) => {
        if (paused()) return;
        const key = `${blockId}:${width}`;
        let changed = '';
        if (px > 0) {   // a hidden or not-yet-laid-out cell says nothing
            const prev = cells.current.get(key);
            if (prev === undefined || Math.abs(prev - px) > EPSILON_PX) {
                cells.current.set(key, px);
                changed = `cell ${key} ${prev ?? '–'}→${Math.round(px)}px`;
            }
        }
        // A width bump goes through the same circuit breaker: the width clamp feeds the
        // packer, so a viewer whose min-content depended on its placement could loop here
        // exactly as a height could.
        if (intrinsicWidthPx !== undefined && intrinsicWidthPx > 0) {
            const prev = intrinsic.get(key);
            if (prev === undefined || Math.abs(prev - intrinsicWidthPx) > EPSILON_PX) {
                intrinsic.set(key, intrinsicWidthPx);
                changed = changed || `width ${key} ${prev ?? '–'}→${Math.round(intrinsicWidthPx)}px`;
            }
        }
        if (changed) bump(changed);
    }, [bump]);

    const onBodyMeasure = useCallback((pageIndex: number, px: number) => {
        if (!(px > 0) || paused()) return;
        const slot = pageIndex === 0 ? 'first' : 'rest';
        const prev = body.current[slot];
        if (prev !== undefined && Math.abs(prev - px) <= EPSILON_PX) return;
        body.current = { ...body.current, [slot]: px };
        bump(`body ${slot} ${prev ?? '–'}→${Math.round(px)}px`);
    }, [bump]);

    const heightPxOf = useCallback((block: MathBlock, width: number) => cells.current.get(`${block.id}:${width}`), []);

    // Before page 2 exists there is nothing to measure it with; page 0 is the shorter box,
    // so falling back to it errs towards ending a page early rather than overrunning it.
    const pageBudgetPx = useCallback((pageIndex: number) => (pageIndex === 0 ? body.current.first : body.current.rest ?? body.current.first), []);

    // One object whose identity changes only when a measurement did: consumers can depend
    // on it wholesale instead of threading the version counter through their dep arrays.
    return useMemo(
        () => ({ heightPxOf, pageBudgetPx, onCellMeasure, onBodyMeasure, intrinsicOf, version }),
        [heightPxOf, pageBudgetPx, onCellMeasure, onBodyMeasure, version],
    );
}
