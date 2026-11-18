import type { CSSProperties } from 'react';
import { SIDES, type Side } from '../duel/types';
import { progressOf } from './course';
import './course.css';

// The race's map at the top of the band: the course as a track, a marker per side in its team colour, the
// chequered flag at the end. Who is ahead reads at a glance, also when the lanes scroll at their own pace.

export interface CourseBarProps {
    points: Record<Side, number>;
    length: number;
    // The aria label's words per side (the team names).
    names: Record<Side, string>;
}

export default function CourseBar({ points, length, names }: CourseBarProps) {
    return (
        <div className="crs-bar" role="img" aria-label={SIDES.map(s => `${names[s]}: ${Math.min(points[s], length)} van ${length}`).join(', ')}>
            <span className="crs-track">
                {SIDES.map(side => (
                    <span key={side} className={`crs-marker is-${side}`} style={{ '--crs-at': progressOf(points[side], length) } as CSSProperties} />
                ))}
            </span>
            <svg className="crs-flag" viewBox="0 0 24 28" aria-hidden>
                <path className="crs-flag-pole" d="M3 2 V27" />
                <g className="crs-flag-cloth">
                    {[0, 1, 2, 3, 4, 5].map(k => <rect key={k} className={`crs-check is-${(Math.floor(k / 3) + k) % 2}`} x={4 + (k % 3) * 6} y={2 + Math.floor(k / 3) * 6} width={6} height={6} />)}
                    <rect className="crs-flag-edge" x={4} y={2} width={18} height={12} />
                </g>
            </svg>
        </div>
    );
}
