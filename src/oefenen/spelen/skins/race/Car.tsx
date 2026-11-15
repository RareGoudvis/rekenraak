import { useId } from 'react';

// The race car: a low wedge supercar (big wheels, a rear wing, a side intake), no brand marks. Drawn nose to the
// right in a 220 × 90 box, the tyres on y = 78. The loop spins the wheels (.rc-spin) by the distance driven.

// SYNC: Race.tsx WHEEL_SHARE (the wheel's radius 18 over the width 220, for the spin per metre).
const CAR_VIEW = { w: 220, h: 90 } as const;

function Wheel({ cx }: { cx: number }) {
    return (
        <g className="rc-wheel">
            <circle className="rc-tyre" cx={cx} cy="60" r="18" />
            <g className="rc-spin">
                <circle className="rc-rim" cx={cx} cy="60" r="11.5" />
                {[0, 72, 144, 216, 288].map(a => (
                    <path key={a} className="rc-spoke" d={`M${cx} 60 L${cx} 50`} transform={`rotate(${a} ${cx} 60)`} />
                ))}
                <circle className="rc-hub" cx={cx} cy="60" r="3" />
            </g>
            {/* The brake calliper stays put while the rim turns. */}
            <path className="rc-calliper" d={`M${cx - 9} 52 A11 11 0 0 1 ${cx + 2} 49`} />
        </g>
    );
}

// One closed body from the rear bumper to the nose; the wheel arches are bites out of it (r 21 around the wheels).
const BODY = 'M8 66 L33.9 66 A21 21 0 0 1 74.1 66 L149.9 66 A21 21 0 0 1 190.1 66 L206 66 L214 60 L212 54 '
    + 'Q206 40 186 33 L150 31 L118 18 Q100 14 82 18 L40 30 L14 36 L8 43 L6 52 Q6 62 8 66 Z';
const GLASS = 'M88 22 Q100 18 116 21 L140 31 L92 32 Z';

export function CarArt({ ghost = false }: { ghost?: boolean }) {
    const clip = `rc-glass-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
    return (
        <svg className={`rc-car-art${ghost ? ' is-ghost' : ''}`} viewBox={`0 0 ${CAR_VIEW.w} ${CAR_VIEW.h}`} aria-hidden>
            <ellipse className="rc-car-shadow" cx="112" cy="80" rx="102" ry="5" />
            <g className="rc-body-g">
                {/* The rear wing on two struts, behind the body. */}
                <path className="rc-wing-strut" d="M20 34 L16 16 M34 31 L32 16" />
                <path className="rc-wing" d="M2 12 Q2 9 6 9 L42 10 Q46 10 45 14 L43 17 L4 18 Q1 18 2 15 Z" />
                <path className="rc-car-body" d={BODY} />
                {/* The dark wheel wells behind the tyres. */}
                <path className="rc-well" d="M33.9 66 A21 21 0 0 1 74.1 66 Z M149.9 66 A21 21 0 0 1 190.1 66 Z" />
                <path className="rc-skirt" d="M75 66 L149.9 66 L149 61 L75 61 Z" />
                <path className="rc-shine" d="M158 33.5 L182 35" />
                <path className="rc-crease" d="M106 46 L150 45" />
                <path className="rc-door" d="M100 33 L104 58" />
                <path className="rc-intake" d="M80 40 L99 38 L95 54 L82 56 Z" />
                <path className="rc-slat" d="M83 43 L97 42 M82 47 L96 46 M82 51 L95 50" />
                <clipPath id={clip}><path d={GLASS} /></clipPath>
                <path className="rc-car-glass" d={GLASS} />
                {/* The driver: a round helmet with its visor to the front, seen through the side window. */}
                <g clipPath={`url(#${clip})`}>
                    <circle className="rc-helmet" cx="110" cy="28" r="7" />
                    <path className="rc-visor" d="M109.5 23.5 L116.5 23.5 Q118 26.5 116.5 29 L109.5 29 Q108 26 109.5 23.5 Z" />
                    <path className="rc-glass-shine" d="M96 22 L104 21 L95 31 L91 31 Z" />
                </g>
                <path className="rc-glass-line" d={GLASS} />
                <path className="rc-mirror" d="M139 30 L145 26.5 L148 29.5 Z" />
                <path className="rc-headlight" d="M196 43 L208 50 L205.5 52 L194 46 Z" />
                <path className="rc-grille" d="M194 58 L208 58 L206 62 L192.5 62 Z" />
                <path className="rc-taillight" d="M8 46 L17 44 L17 49 L7.5 51 Z" />
                <rect className="rc-exhaust" x="1" y="58" width="11" height="5" rx="2" />
            </g>
            <Wheel cx={54} />
            <Wheel cx={170} />
        </svg>
    );
}

export function Flame() {
    return (
        <svg className="rc-flame" viewBox="0 0 60 30" aria-hidden>
            <path className="rc-flame-out" d="M60 15 Q40 0 4 8 Q18 15 4 22 Q40 30 60 15 Z" />
            <path className="rc-flame-in" d="M60 15 Q46 7 24 11 Q32 15 24 19 Q46 23 60 15 Z" />
        </svg>
    );
}

// A soft cloud of smoke: three puffs that swell and fade (a stop, a cough, an empty tank).
export function Puff({ className = '' }: { className?: string }) {
    return (
        <svg className={`rc-puff ${className}`} viewBox="0 0 80 50" aria-hidden>
            <circle className="rc-puff-c is-1" cx="56" cy="32" r="12" />
            <circle className="rc-puff-c is-2" cx="34" cy="26" r="15" />
            <circle className="rc-puff-c is-3" cx="14" cy="34" r="10" />
        </svg>
    );
}

// The jerrycan, full or empty (the HUD's lives and the refill).
export function Can({ full }: { full: boolean }) {
    return (
        <svg className={`rc-can${full ? ' is-full' : ' is-empty'}`} viewBox="0 0 40 48" aria-hidden>
            <path className="rc-can-handle" d="M10 10 L10 4 Q10 2 12 2 L24 2 Q26 2 26 4 L26 10" />
            <path className="rc-can-spout" d="M28 10 L34 4 L38 8 L32 14" />
            <path className="rc-can-body" d="M4 14 Q4 10 8 10 L32 10 Q36 10 36 14 L36 42 Q36 46 32 46 L8 46 Q4 46 4 42 Z" />
            {/* The fuel inside: it rises when the can fills at the pump. */}
            <rect className="rc-can-fuel" x="8" y="14" width="24" height="28" rx="3" />
            <path className="rc-can-drop" d="M20 20 Q27 28 27 32 A7 7 0 0 1 13 32 Q13 28 20 20 Z" />
        </svg>
    );
}
