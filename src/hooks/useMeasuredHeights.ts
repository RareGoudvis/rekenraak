import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { MathBlock } from '../services/math/types';
import type { WidthUnits } from '../services/layout/blockLayout';

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
// returns the entry that demands the WIDEST tier (most recent wins a tie), and entries are
// dropped as soon as the block's content changes (see the prune effect below).
//
// It used to return the SMALLEST entry across widths, and that is how a quarter-width
// vergelijken block slipped past the clamp: the block is measured while it is still empty
// ("(Nog geen oefeningen — klik Genereer)" min-contents at 67px), Genereer fills it to
// 199px under a NEW key, and the stale 67 stayed the smallest for good — so the clamp kept
// saying a quarter (151px, content 199px) was fine and the block rendered overflowing or,
// at a bodyFontScale above 1, silently zoomed back down to 1.
//
// Convergence still holds, in the safe direction: entries only accumulate between content
// changes and the clamp is a MAX over them, so the tier can only widen and settles. Taking
// the smallest was monotone the other way — once any narrow measurement existed the block
// stayed narrow whatever the content did — and taking simply the most recent would let a
// reflowing type flip between two tiers (wide cell measures narrow, so ¼ is allowed; ¼
// measures wide, so it is promoted back).
//
// Narrowing is not lost: minWidthUnits' reflow rule opens exactly one tier below the width
// a reflowing block was measured at, and the next tier only opens after a real measurement
// there.
const intrinsic = new Map<string, { px: number; seq: number }>();
// Monotone write counter — the tie-break between two entries that demand the same tier has
// to survive Map's insertion order, which a re-`set` of an existing key does not move.
let intrinsicSeq = 0;
// What a block's measurements were taken of. A measurement is a fact about CONTENT at a
// width, so the moment the content changes (Genereer, a settings edit, a longer title) the
// old entries are not stale-ish, they are wrong — and one of them, taken while the block
// was still empty, is what let the ¼ through.
const measuredOf = new Map<string, string>();

export interface IntrinsicWidth {
    /** Widest content-minimum seen for this block's current content, in layout px at its
        requested scale — the one that decides the tier. */
    px: number;
    /** The cell width that measurement was taken in. */
    atWidth: WidthUnits;
}

// The map is written from a layout effect and read by the Inspector, which does not
// re-render on App's state — without this the width picker would show the measurement of
// the PREVIOUS interaction and could grey out a tier the sheet has since accepted.
const listeners = new Set<() => void>();
let intrinsicVersion = 0;
function notifyIntrinsic() {
    intrinsicVersion += 1;
    for (const l of listeners) l();
}

const subscribeIntrinsic = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

/** The narrowest measured content width for a block, re-rendering when it changes. */
export function useIntrinsicWidth(blockId: string): IntrinsicWidth | undefined {
    // `version` is the dependency that matters — it changes exactly when the map does —
    // even though the lint rule cannot see it inside intrinsicOf().
    const version = useSyncExternalStore(subscribeIntrinsic, () => intrinsicVersion, () => intrinsicVersion);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version IS the map's identity
    return useMemo(() => intrinsicOf(blockId), [blockId, version]);
}

export function intrinsicOf(blockId: string): IntrinsicWidth | undefined {
    let best: IntrinsicWidth | undefined;
    let bestSeq = -1;
    for (const [key, entry] of intrinsic) {
        const cut = key.lastIndexOf(':');
        if (key.slice(0, cut) !== blockId) continue;
        const atWidth = Number(key.slice(cut + 1)) as WidthUnits;
        // "Widest tier demanded" is judged per cell, not on px alone: the same 300px is a
        // half in a half-cell and a comfortable fit in a full one.
        if (!best || entry.px > best.px || (entry.px === best.px && entry.seq > bestSeq)) {
            bestSeq = entry.seq;
            best = { px: entry.px, atWidth };
        }
    }
    return best;
}

// DEV-only window into the two maps the packer reads, for scripts/height-audit.mjs: the
// audit has to compare the number the packer USED against the rect the paper will use, and
// re-deriving it from the DOM would only prove the DOM agrees with itself. Registered by
// the live hook instance (the maps are refs) and torn down with it.
export interface MeasuredSnapshot {
    cells: Record<string, number>;
    intrinsic: Record<string, number>;
    body: { first?: number; rest?: number };
}
let devSnapshot: (() => MeasuredSnapshot) | null = null;
export function measuredSnapshot(): MeasuredSnapshot | null {
    return devSnapshot ? devSnapshot() : null;
}

export interface MeasuredHeights {
    /** Measured px height of this block's cell at this width, or undefined if unmeasured. */
    heightPxOf: (block: MathBlock, width: number) => number | undefined;
    /** Measured px height of a page's body box, or undefined before first paint. */
    pageBudgetPx: (pageIndex: number) => number | undefined;
    onCellMeasure: (blockId: string, width: number, px: number, intrinsicWidthPx?: number) => void;
    /** Measured content-minimum for this block, for the packer and the Inspector. */
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
    // A measure PASS reports every cell on the page one after another, and counting each
    // of those as a repack made the breaker a block-count limit: a plain 10-block sheet
    // tripped it on first paint and the blocks measured after the trip kept their
    // estimates for good (2026-09-13 height audit). The pass is synchronous, so a
    // microtask coalesces it into ONE bump — which is what the breaker is meant to count.
    const pendingWhat = useRef<string | null>(null);
    const flushQueued = useRef(false);
    const flush = useCallback(() => {
        flushQueued.current = false;
        const what = pendingWhat.current ?? 'measurement';
        pendingWhat.current = null;
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
    const bump = useCallback((what: string) => {
        // Keep the FIRST change of the pass: it is the one that explains the repack.
        pendingWhat.current ??= what;
        if (flushQueued.current) return;
        flushQueued.current = true;
        queueMicrotask(flush);
    }, [flush]);
    const paused = () => performance.now() < cooldownUntil.current;

    // Drop measurements for blocks that left the sheet, so the map cannot grow unbounded
    // across a long editing session. No version bump: pruning cannot change the height of
    // a block that is still there.
    useEffect(() => {
        const alive = new Set(blocks.map(b => b.id));
        // Same pass drops the measurements of a block whose CONTENT changed: the block is
        // the whole signature, so a regenerate, a settings edit or a longer title all
        // invalidate every width it was measured at. Without this an entry taken before
        // Genereer (an empty block min-contents at 67px) outlived the content it described
        // and kept telling the clamp a quarter was fine. No version bump either way: the
        // remeasure that follows is what changes the layout, and it bumps.
        for (const b of blocks) {
            const sig = JSON.stringify(b);
            if (measuredOf.get(b.id) === sig) continue;
            measuredOf.set(b.id, sig);
            // Heights are not dropped: they are only ever READ at the width the block
            // currently sits in, and the measure pass overwrites that key in the same
            // frame. Dropping them would hand the packer an estimate for a frame on every
            // keystroke. The intrinsic map is the one read across widths, so it is the one
            // that can go stale.
            for (const key of intrinsic.keys()) {
                if (key.slice(0, key.lastIndexOf(':')) === b.id) intrinsic.delete(key);
            }
        }
        for (const map of [cells.current, intrinsic, measuredOf]) {
            for (const key of map.keys()) {
                const id = map === measuredOf ? key : key.slice(0, key.lastIndexOf(':'));
                if (!alive.has(id)) map.delete(key);
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
            if (prev === undefined || Math.abs(prev.px - intrinsicWidthPx) > EPSILON_PX) {
                intrinsic.set(key, { px: intrinsicWidthPx, seq: ++intrinsicSeq });
                notifyIntrinsic();
                changed = changed || `width ${key} ${prev?.px ?? '–'}→${Math.round(intrinsicWidthPx)}px`;
            } else if (prev.seq < intrinsicSeq) {
                // Unchanged in px, but this IS the current rendering — move it to the front
                // of the recency order so a stale entry from another width cannot outrank it.
                intrinsic.set(key, { px: prev.px, seq: ++intrinsicSeq });
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

    useEffect(() => {
        if (!import.meta.env.DEV) return;
        devSnapshot = () => ({
            cells: Object.fromEntries(cells.current),
            intrinsic: Object.fromEntries([...intrinsic].map(([k, v]) => [k, v.px])),
            body: { ...body.current },
        });
        return () => { devSnapshot = null; };
    }, []);

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
