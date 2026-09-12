import { useEffect, useRef, useState } from 'react';

// Drives the top bar's label-shedding: instead of fixed viewport-width breakpoints
// (which shed labels long before the bar actually needed the room — a 1483px window
// already read icon-only for most buttons), this watches the bar's REAL rendered width
// against its content's REAL rendered width and only sheds when content would overflow.
//
// `barRef` is the outer bar element (its clientWidth is the budget). `contentRef` is the
// row that holds the shedable content at the CURRENT stage: its DIRECT CHILDREN are
// summed (see measureContentWidth) rather than reading contentRef's own scrollWidth.
//
// Why not just contentRef.scrollWidth: the bar's content row is a 3-column CSS grid
// (left group / centred name / right group) so the flanking columns stay visually
// symmetric. Grid track-sizing is free to shrink a column below what it needs — its
// scrollWidth genuinely grows when that happens (its own flexShrink:0 children spill
// past its box), but that spill lands INSIDE the grid row's overall box (it eats into a
// neighbouring column, not past the row's own edge), so the row element's OWN
// scrollWidth never reflects it. Summing each column's scrollWidth catches it because
// scrollWidth is measured per element, at the level where the overflow actually is.

// Content must clear the bar by this much before we call it "fits" — avoids shedding on
// a 1px sub-pixel rounding wobble at the exact boundary.
const OVERFLOW_SLACK_PX = 8;
// Going UP a stage needs MORE headroom than going down needed: without this margin, a
// resize that grows the bar by 1px past the overflow point would immediately re-fit,
// then the next 1px shrink would overflow again — flapping every frame.
const RECOVER_SLACK_PX = 24;
// Circuit breaker, same idea as useMeasuredHeights' repack guard, but counting DIRECTION
// REVERSALS rather than raw stage changes: a mount-time cascade that steps down through
// every stage in one direction (0→1→2→3) is normal convergence, however many steps it
// takes, and must never trip this — only actually bouncing back and forth between stages
// (down, then up, then down again) means something is oscillating.
const MAX_REVERSALS_PER_SECOND = 3;

// The true width `el`'s children need, immune to a parent grid/flex track shrinking one
// child below its content (see the file header comment for why that defeats a plain
// el.scrollWidth read).
function measureContentWidth(el: HTMLElement): number {
    const kids = Array.from(el.children) as HTMLElement[];
    if (kids.length === 0) return el.scrollWidth;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    return kids.reduce((sum, kid) => sum + kid.scrollWidth, 0) + gap * (kids.length - 1);
}

/**
 * @param barRef ref to the element whose clientWidth is the available width budget
 * @param contentRef ref to the row whose direct children's combined width is what the
 *   current stage's content actually needs
 * @param stageCount number of stages, 0 (fullest) .. stageCount-1 (leanest)
 * @returns the active stage index
 */
export function useShedStages(
    barRef: React.RefObject<HTMLElement | null>,
    contentRef: React.RefObject<HTMLElement | null>,
    stageCount: number,
): number {
    const [stage, setStage] = useState(0);
    // neededWidth[s] = the content width stage s's row last measured at, recorded on
    // EVERY measurement of that stage — including one where it didn't fit. That matters:
    // recording only "the bar width where it broke" would say nothing about HOW badly it
    // broke, so a stage that overflowed by 400px would look recoverable the moment the
    // bar grew by a token 24px. Recording the actual content width instead means
    // recovery correctly waits for the bar to clear the REAL requirement, not just
    // whatever width happened to be on screen at the moment it last failed. Always gets
    // populated for every stage the bar has ever shed through, because the mount-time
    // cascade below starts at stage 0 and steps down one at a time, measuring each stage
    // it passes through on the way — so there's never a boundary with no recorded
    // requirement once we're sitting below it.
    const neededWidth = useRef<Array<number | undefined>>([]);
    const reversalTimestamps = useRef<number[]>([]);
    const lastDirection = useRef<1 | -1 | undefined>(undefined);

    // Holds the current measure function so the ResizeObserver effect below can stay
    // mount-once (never tearing down/rebuilding the observer) while still always running
    // fresh logic — reassigned every render (below), so it always closes over THIS
    // render's `stage`. That closure, not a ref updated ad hoc inside applyStage, is
    // deliberately the single source of truth for "what's on screen right now": React
    // (especially StrictMode, which double-invokes effects in development) does not
    // guarantee exactly one effect firing per state update, so a hand-rolled ref that
    // increments the moment applyStage decides to change stage can race ahead of what
    // was actually committed — an earlier version of this hook measured stale DOM under
    // an already-incremented "current" and mis-recorded neededWidth as a result. Closing
    // over `stage` instead ties "current" to an actual React render, which cannot lie
    // about what's on screen. Never read during render itself — react-hooks/refs forbids
    // assigning ref.current mid-render, hence the effect wrapper.
    const measureRef = useRef<() => void>(() => {});

    useEffect(() => {
        measureRef.current = () => {
            const bar = barRef.current;
            const content = contentRef.current;
            if (!bar || !content) return;

            const applyStage = (next: number) => {
                const direction: 1 | -1 = next > stage ? 1 : -1;
                if (lastDirection.current !== undefined && direction !== lastDirection.current) {
                    const now = Date.now();
                    reversalTimestamps.current = reversalTimestamps.current.filter((t) => now - t < 1000);
                    reversalTimestamps.current.push(now);
                    if (reversalTimestamps.current.length > MAX_REVERSALS_PER_SECOND) {
                        if (import.meta.env.DEV) {
                            console.warn(`[useShedStages] ${reversalTimestamps.current.length} direction reversals in the last second — flapping, holding at stage ${stage}`);
                        }
                        return;
                    }
                }
                lastDirection.current = direction;
                setStage(next);
            };

            const barWidth = bar.clientWidth;
            const contentWidth = measureContentWidth(content);
            const fits = contentWidth <= barWidth - OVERFLOW_SLACK_PX;
            neededWidth.current[stage] = contentWidth;

            if (!fits) {
                if (stage < stageCount - 1) applyStage(stage + 1);
                return;
            }
            if (stage > 0) {
                const fullerStageNeeds = neededWidth.current[stage - 1];
                if (fullerStageNeeds !== undefined && barWidth - RECOVER_SLACK_PX >= fullerStageNeeds) {
                    applyStage(stage - 1);
                }
            }
        };
    });

    // ResizeObserver setup: mount-once, observes the bar (whose clientWidth is the
    // budget) and the content row (whose children's combined scrollWidth is the spend).
    useEffect(() => {
        const bar = barRef.current;
        const content = contentRef.current;
        if (!bar || !content) return;
        const ro = new ResizeObserver(() => measureRef.current());
        ro.observe(bar);
        ro.observe(content);
        measureRef.current();
        return () => ro.disconnect();
    }, [barRef, contentRef]);

    // A resize can require MORE than one stage step (e.g. an abrupt window resize skips
    // straight past what stage 1 alone would fix) — but content only reflects the new
    // stage AFTER React re-renders, so shedding further has to wait for that render to
    // land. This re-measures once per stage change to let it cascade, converging in a
    // handful of passes exactly like useMeasuredHeights' repack loop; the circuit
    // breaker above still caps runaway oscillation.
    useEffect(() => {
        measureRef.current();
    }, [stage]);

    return stage;
}
