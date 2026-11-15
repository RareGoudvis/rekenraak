import type { Gate, Land } from './route';
import { LandIcon } from './Scenery';

// What stands between two landscapes (a tunnel, a bridge, a road sign showing what comes next) and the petrol
// station. A gate has a back part (behind the car) and a front part (over it): the car drives into the tunnel,
// between the bridge's two arches. Sizes in scene units; SYNC: race.css .rc-gate / .rc-station.

const STONES = [[40, 250, 46, 24], [96, 232, 52, 26], [160, 210, 44, 22], [420, 214, 48, 24], [470, 240, 44, 22], [200, 120, 50, 24], [300, 96, 56, 26], [380, 138, 46, 22], [120, 170, 40, 20], [440, 180, 36, 18]] as const;

function Tunnel() {
    return (
        <svg className="rc-gate-art" viewBox="0 0 560 380" aria-hidden>
            <path className="rc-rockface" d="M0 380 L24 240 Q44 130 150 84 Q280 24 410 74 Q510 116 534 236 L560 380 Z" />
            {STONES.map(([x, y, w, h]) => <rect key={`${x}${y}`} className="rc-stone" x={x} y={y} width={w} height={h} rx="10" />)}
            {/* The tube: dark inside, a row of little lamps; the car shows through as a shadow. */}
            <path className="rc-tunnel-in" d="M76 380 L76 270 Q76 214 132 214 L428 214 Q484 214 484 270 L484 380 Z" />
            {[150, 230, 310, 390].map(x => <circle key={x} className="rc-tunnel-lamp" cx={x} cy="232" r="5" />)}
            <path className="rc-portal" d="M76 380 L76 270 Q76 214 132 214 L428 214 Q484 214 484 270 L484 380" />
        </svg>
    );
}

function Bridge({ part }: { part: 'back' | 'front' }) {
    // The near arch stands on the road's near edge, the far one on its far side (higher up, lighter).
    const arch = part === 'front' ? 'M24 440 Q320 -280 616 440' : 'M60 300 Q320 -360 580 300';
    const [x0, x1, y0, yc] = part === 'front' ? [24, 616, 440, -280] : [60, 580, 300, -360];
    const hangers = [0.2, 0.32, 0.44, 0.56, 0.68, 0.8].map(t => {
        // The arch's x and height at t (the quadratic Bézier), a hanger straight down to the deck.
        const x = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * 320 + t * t * x1;
        const y = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * yc + t * t * y0;
        return `M${x.toFixed(0)} ${y.toFixed(0)} L${x.toFixed(0)} ${y0}`;
    }).join(' ');
    return part === 'back' ? (
        <svg className="rc-gate-art is-back" viewBox="0 0 640 440" aria-hidden>
            <path className="rc-hanger is-back" d={hangers} />
            <path className="rc-tube-ol" d={arch} strokeWidth="18" />
            <path className="rc-tube rc-arch is-back" d={arch} strokeWidth="12" />
        </svg>
    ) : (
        <svg className="rc-gate-art is-front" viewBox="0 0 640 440" aria-hidden>
            <path className="rc-hanger" d={hangers} />
            <path className="rc-tube-ol" d={arch} strokeWidth="24" />
            <path className="rc-tube rc-arch" d={arch} strokeWidth="18" />
            <rect className="rc-rail" x="0" y="426" width="640" height="10" rx="3" />
            {Array.from({ length: 17 }, (_, i) => <rect key={i} className="rc-rail" x={i * 40 - 3} y="418" width="6" height="22" />)}
        </svg>
    );
}

function Sign({ next }: { next: Land }) {
    return (
        <svg className="rc-gate-art" viewBox="0 0 300 260" aria-hidden>
            <rect className="rc-signpost" x="70" y="120" width="14" height="140" rx="3" />
            <rect className="rc-signpost" x="216" y="120" width="14" height="140" rx="3" />
            <rect className="rc-signboard" x="20" y="10" width="260" height="140" rx="18" />
            <rect className="rc-signboard-in" x="34" y="24" width="232" height="112" rx="10" />
            {/* The next landscape's picture and an arrow: this way. */}
            <g transform="translate(118 80) scale(1.5)"><LandIcon land={next} /></g>
            <path className="rc-sign-arrow" d="M186 66 L226 66 L226 52 L254 80 L226 108 L226 94 L186 94 Z" />
        </svg>
    );
}

/** A gate, back (behind the car) or front (over it). */
export function GateArt({ gate, part, next }: { gate: Gate; part: 'back' | 'front'; next: Land }) {
    if (gate === 'tunnel') return part === 'front' ? <Tunnel /> : null;
    if (gate === 'brug') return <Bridge part={part} />;
    return part === 'back' ? <Sign next={next} /> : null;
}

// The petrol station: a canopy, a pump with a drop on its screen (no numbers), a price-less sign. busy = the
// fuel runs (its lamp blinks).
export function Station({ busy }: { busy: boolean }) {
    return (
        <svg className={`rc-station-art${busy ? ' is-busy' : ''}`} viewBox="0 0 420 330" aria-hidden>
            <rect className="rc-st-post" x="40" y="44" width="16" height="286" />
            <rect className="rc-st-post" x="364" y="44" width="16" height="286" />
            <rect className="rc-st-roof" x="8" y="10" width="404" height="44" rx="8" />
            <rect className="rc-st-stripe" x="8" y="38" width="404" height="10" />
            <path className="rc-st-drop" d="M210 14 Q222 28 222 34 A12 12 0 0 1 198 34 Q198 28 210 14 Z" />
            <rect className="rc-st-island" x="120" y="300" width="180" height="30" rx="8" />
            <rect className="rc-st-pump" x="166" y="150" width="88" height="152" rx="12" />
            <rect className="rc-st-screen" x="180" y="166" width="60" height="38" rx="6" />
            <path className="rc-st-drop is-small" d="M210 172 Q218 182 218 187 A8 8 0 0 1 202 187 Q202 182 210 172 Z" />
            <rect className="rc-st-panel" x="180" y="216" width="60" height="68" rx="6" />
            <circle className="rc-st-lamp" cx="210" cy="140" r="9" />
            <path className="rc-st-hose" d="M254 230 Q282 236 280 272 Q278 300 262 300" />
            <path className="rc-st-nozzle" d="M254 196 L272 196 L276 214 L262 216 L262 230 L254 230 Z" />
        </svg>
    );
}
