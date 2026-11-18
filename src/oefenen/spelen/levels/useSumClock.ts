import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clockMs } from './clock';
import type { Level } from './levels';
import { sumClockLeft, sumClockStart, sumClockStep, sumClockUrgent } from './sumClock';

interface Spec {
    level: Level;
    // The sum on screen (its key); null = none.
    questionKey: string | null;
    // The sum waits for an answer: false under help, during a flash, the rotate prompt, a skin's own beat (a dive).
    live: boolean;
    // The sum's time ran out: the skin's mistake without an answer (props.onMiss), and its own picture of it.
    onTimeUp(): void;
}

/** The clock per sum (sumClock.ts) on a small frame loop; the ring (SumClockRing) is painted from it outside React. */
export function useSumClock({ level, questionKey, live, onTimeUp }: Spec) {
    const ring = useRef<HTMLSpanElement | null>(null);
    const clock = useRef(sumClockStart());
    // The sum's time, for the ring's label; Makkelijk = null (no ring at all).
    const [limitMs, setLimitMs] = useState<number | null>(() => clockMs(level, 0));
    const spec = useRef({ level, questionKey, live, onTimeUp });
    useLayoutEffect(() => { spec.current = { level, questionKey, live, onTimeUp }; });
    useEffect(() => {
        if (level === 'makkelijk') return;
        let raf = 0;
        let last: number | null = null;
        const frame = (t: number) => {
            raf = requestAnimationFrame(frame);
            // A long gap (a hidden tab) never eats a sum's time at once.
            const dt = last === null ? 0 : Math.min(100, Math.max(0, t - last));
            last = t;
            const s = spec.current;
            const before = clock.current;
            const { clock: c, timeUp } = sumClockStep(before, dt, s.level, s.questionKey, s.live);
            clock.current = c;
            if (c.limitMs !== before.limitMs || c.key !== before.key) setLimitMs(c.limitMs);
            const el = ring.current;
            if (el) {
                el.style.setProperty('--sc-left', sumClockLeft(c).toFixed(4));
                el.dataset.urgent = sumClockUrgent(c) ? '1' : '';
                el.dataset.out = c.out ? '1' : '';
            }
            if (timeUp) s.onTimeUp();
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, [level]);
    return { ring, limitMs, playedMs: () => clock.current.playedMs };
}
