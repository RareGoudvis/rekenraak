import { Air, Corner, Ground } from './parts';

// Leerjaar 5: a snow landscape: white hills, pines with snow, a snowman, a few flakes.

const Pine = ({ x, s = 1 }: { x: number; s?: number }) => (
    <g transform={`translate(${x} 236) scale(${s})`}>
        <rect className="ks-wood" x="-8" y="-24" width="16" height="24" rx="3" />
        <path className="ks-pine" d="M0 -150 L44 -84 H-44 Z M0 -118 L56 -24 H-56 Z" />
        <path className="ks-white" d="M0 -150 L18 -123 Q9 -116 0 -124 Q-9 -116 -18 -123 Z" />
    </g>
);

const Flake = ({ x, y, r = 4 }: { x: number; y: number; r?: number }) => <circle className="ks-white" cx={x} cy={y} r={r} />;

export default function Sneeuw() {
    return (
        <>
            <Ground back />
            <Ground />
            <Air side="l"><Flake x={30} y={20} /><Flake x={76} y={50} r={5} /><Flake x={120} y={24} r={3} /><Flake x={140} y={62} /></Air>
            <Air side="r"><g className="ks-bob"><Flake x={30} y={40} r={5} /><Flake x={84} y={16} /><Flake x={110} y={58} r={3} /><Flake x={144} y={30} r={4} /></g></Air>
            <Corner side="l">
                <Pine x={70} s={1.1} />
                <Pine x={168} s={0.8} />
            </Corner>
            <Corner side="r">
                <circle className="ks-white" cx="130" cy="192" r="44" />
                <circle className="ks-white" cx="130" cy="122" r="32" />
                <circle className="ks-white" cx="130" cy="70" r="24" />
                <path className="ks-red" d="M104 92 Q130 102 156 92 L158 102 Q130 112 102 102 Z M140 100 L148 128 L136 128 Z" />
                <path className="ks-hat" d="M108 50 H152 V44 H144 V18 H116 V44 H108 Z" />
                <circle className="ks-eye" cx="121" cy="66" r="3" />
                <circle className="ks-eye" cx="139" cy="66" r="3" />
                <path className="ks-orange" d="M130 72 L152 78 L130 80 Z" />
                <circle className="ks-eye" cx="130" cy="118" r="3" />
                <circle className="ks-eye" cx="130" cy="136" r="3" />
            </Corner>
        </>
    );
}
