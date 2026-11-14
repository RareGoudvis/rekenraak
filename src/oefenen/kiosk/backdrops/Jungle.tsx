import { Air, Corner, Ground } from './parts';

// Leerjaar 4: the jungle: big leaves, vines from the top edges, a parrot on a branch.

const Leaf = ({ x, y, a, len = 110, dark }: { x: number; y: number; a: number; len?: number; dark?: boolean }) => (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
        <path className={dark ? 'ks-leaf-dark' : 'ks-leaf'} d={`M0 0 Q${len * 0.45} ${-len * 0.32} ${len} 0 Q${len * 0.45} ${len * 0.32} 0 0 Z`} />
        <path className="ks-vein" d={`M4 0 H${len * 0.85}`} />
    </g>
);

// A vine hanging along the top edge like a garland.
const Vine = () => (
    <>
        <path className="ks-stem" d="M0 4 Q50 60 100 30 T 170 20" />
        <Leaf x={30} y={34} a={80} len={30} />
        <Leaf x={70} y={44} a={110} len={28} />
        <Leaf x={112} y={28} a={70} len={30} />
        <Leaf x={146} y={22} a={100} len={26} />
    </>
);

export default function Jungle() {
    return (
        <>
            <Ground back />
            <Ground />
            <Air side="l"><Vine /></Air>
            <Air side="r"><g transform="translate(160 0) scale(-1 1)"><Vine /></g></Air>
            <Corner side="l">
                <Leaf x={0} y={236} a={-70} len={150} dark />
                <Leaf x={0} y={236} a={-38} len={170} />
                <Leaf x={10} y={238} a={-12} len={140} dark />
                <Leaf x={60} y={240} a={-55} len={110} />
            </Corner>
            <Corner side="r">
                <path className="ks-branch" d="M240 150 Q170 140 70 166" />
                <g className="ks-bob">
                    <path className="ks-red" d="M118 152 L104 206 L124 200 Z" />
                    <ellipse className="ks-red" cx="128" cy="118" rx="24" ry="34" />
                    <path className="ks-blue" d="M142 104 Q164 128 146 156 Q132 138 142 104 Z" />
                    <circle className="ks-white" cx="118" cy="98" r="9" />
                    <circle className="ks-eye" cx="117" cy="98" r="4" />
                    <path className="ks-honey" d="M106 106 Q92 108 96 122 Q104 114 110 114 Z" />
                </g>
            </Corner>
        </>
    );
}
