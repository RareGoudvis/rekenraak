// The race car: a low wedge supercar (big wheels, a rear wing, side intakes), no brand marks. Drawn nose to the
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

export function CarArt({ ghost = false }: { ghost?: boolean }) {
    return (
        <svg className={`rc-car-art${ghost ? ' is-ghost' : ''}`} viewBox={`0 0 ${CAR_VIEW.w} ${CAR_VIEW.h}`} aria-hidden>
            <ellipse className="rc-car-shadow" cx="112" cy="80" rx="100" ry="5" />
            <g className="rc-body-g">
                {/* The rear wing on two struts, behind the body. */}
                <path className="rc-wing-strut" d="M20 36 L16 20 M36 33 L32 20" />
                <path className="rc-wing" d="M2 14 Q2 11 6 11 L44 12 Q47 12 46 16 L44 20 L4 21 Q1 21 2 18 Z" />
                {/* The wedge: a long low nose, the cabin far back, angular wheel arches. */}
                <path className="rc-car-body" d="M10 38 L22 34 L74 24 Q96 19 112 21 L150 34 L156 35 Q170 30 186 38 L208 50 L216 56 L211 64 L197 64 L192 44 L183 39 L157 39 L148 44 L143 64 L81 64 L76 44 L67 39 L41 39 L32 44 L27 64 L12 64 Q6 64 6 58 L6 44 Q6 40 10 38 Z" />
                <path className="rc-skirt" d="M81 64 L143 64 L141 59 L83 59 Z M197 64 L211 64 L213 60 L198 60 Z M12 64 L27 64 L28 60 L7 60 Q7 63 12 64 Z" />
                <path className="rc-car-glass" d="M78 27 Q96 22 110 24 L140 35 L84 38 Z" />
                <path className="rc-glass-shine" d="M98 25 L108 26 L96 36 L88 36 Z" />
                <circle className="rc-helmet" cx="103" cy="31" r="6" />
                <rect className="rc-visor" x="104" y="29.5" width="5.5" height="3.5" rx="1.5" />
                <path className="rc-helmet-stripe" d="M98 27 Q103 24 107 26" />
                {/* Side intake behind the door, with slats. */}
                <path className="rc-intake" d="M86 41 L114 39 L108 56 L82 56 Z" />
                <path className="rc-slat" d="M89 45 L111 44 M87 49 L109 48 M85 53 L107 52" />
                <path className="rc-crease" d="M116 48 L146 50" />
                <path className="rc-headlight" d="M198 47 L211 52 L209 55 L197 51 Z" />
                <path className="rc-taillight" d="M6 42 L16 39 L16 44 L6 46 Z" />
                <rect className="rc-exhaust" x="0" y="54" width="10" height="5" rx="2" />
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
