import { Air, Corner, Ground } from './parts';

// Leerjaar 1: a flowery meadow, a beehive on a stump and a few bees.

const Flower = ({ x, y, r = 7, pink }: { x: number; y: number; r?: number; pink?: boolean }) => (
    <g>
        <path className="ks-stem" d={`M${x} ${y + r} V240`} />
        {[0, 72, 144, 216, 288].map(a => (
            <circle key={a} className={pink ? 'ks-pink' : 'ks-white'} cx={x + Math.cos(a * Math.PI / 180) * r * 1.3} cy={y + Math.sin(a * Math.PI / 180) * r * 1.3} r={r} />
        ))}
        <circle className="ks-honey" cx={x} cy={y} r={r * 0.85} />
    </g>
);

const Bee = ({ x, y, flip }: { x: number; y: number; flip?: boolean }) => (
    <g transform={`translate(${x} ${y})${flip ? ' scale(-1 1)' : ''}`}>
        <ellipse className="ks-wing" cx="-4" cy="-13" rx="7" ry="10" transform="rotate(-20 -4 -13)" />
        <ellipse className="ks-wing" cx="5" cy="-12" rx="6" ry="9" transform="rotate(20 5 -12)" />
        <ellipse className="ks-honey" cx="0" cy="0" rx="15" ry="11" />
        <path className="ks-stripe" d="M-4 -9 V9 M4 -9 V9" />
        <circle className="ks-eye" cx="10" cy="-2" r="2" />
    </g>
);

export default function Bijen() {
    return (
        <>
            <Ground back />
            <Ground />
            <Corner side="l">
                <rect className="ks-wood" x="40" y="186" width="150" height="34" rx="8" />
                <path className="ks-honey" d="M58 188 Q58 86 115 80 Q172 86 172 188 Z" />
                <path className="ks-band" d="M66 120 Q115 108 164 120 M60 150 Q115 138 170 150" />
                <ellipse className="ks-hole" cx="115" cy="168" rx="15" ry="10" />
                <Flower x={20} y={196} r={7} pink />
                <Flower x={214} y={178} r={8} />
            </Corner>
            <Corner side="r">
                <Flower x={60} y={150} r={10} />
                <Flower x={120} y={118} r={12} pink />
                <Flower x={186} y={160} r={9} />
            </Corner>
            <Air side="l"><path className="ks-trail" d="M20 60 Q50 20 80 46 T 130 34" /><Bee x={138} y={34} /></Air>
            <Air side="r"><g className="ks-bob"><Bee x={40} y={44} flip /></g><Bee x={120} y={30} flip /></Air>
        </>
    );
}
