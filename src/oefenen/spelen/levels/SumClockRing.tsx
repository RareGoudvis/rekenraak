import type { RefObject } from 'react';
import './levels.css';

// The clock per sum on screen: a small clock face whose ring empties (painted by useSumClock through --sc-left),
// warm in the last seconds. Absent on Makkelijk (limitMs null).
export default function SumClockRing({ ringRef, limitMs, className = '' }: { ringRef: RefObject<HTMLSpanElement | null>; limitMs: number | null; className?: string }) {
    if (limitMs === null) return null;
    return (
        <span ref={ringRef} className={`lv-ring ${className}`} role="timer" aria-label={`${Math.round(limitMs / 1000)} seconden per som`} data-limit={limitMs}>
            <svg viewBox="0 0 44 44" aria-hidden>
                <circle className="lv-ring-bg" cx="22" cy="22" r="18" />
                <circle className="lv-ring-fill" cx="22" cy="22" r="18" pathLength="100" transform="rotate(-90 22 22)" />
                <path className="lv-ring-hand" d="M22 13 V22 L28 26" />
                <circle className="lv-ring-pin" cx="22" cy="22" r="2.4" />
            </svg>
        </span>
    );
}
