import { Air, Corner, Ground } from './parts';

const Puff = ({ x, y }: { x: number; y: number }) => (
    <g transform={`translate(${x} ${y})`}>
        <circle className="ks-white" cx="-16" cy="4" r="12" />
        <circle className="ks-white" cx="16" cy="4" r="12" />
        <circle className="ks-white" cx="0" cy="-4" r="16" />
    </g>
);

// Leerjaar 3: lava land, the friendly kind: a smiling cartoon volcano under a warm sky, a puff of cloud, round stones.

export default function Lava() {
    return (
        <>
            <Ground back />
            <Ground />
            <Corner side="l">
                <ellipse className="ks-rock" cx="70" cy="214" rx="46" ry="26" />
                <ellipse className="ks-rock" cx="140" cy="222" rx="30" ry="18" />
                <ellipse className="ks-rock" cx="30" cy="226" rx="22" ry="14" />
            </Corner>
            <Air side="l"><Puff x={50} y={36} /><Puff x={122} y={52} /></Air>
            <Air side="r"><circle className="ks-sun" cx="110" cy="38" r="26" /></Air>
            <Corner side="r">
                <g className="ks-bob">
                    <circle className="ks-white" cx="110" cy="46" r="16" />
                    <circle className="ks-white" cx="132" cy="38" r="20" />
                    <circle className="ks-white" cx="152" cy="50" r="14" />
                </g>
                <path className="ks-terra" d="M20 236 L92 92 Q122 76 152 92 L224 236 Z" />
                <path className="ks-lava" d="M90 96 Q122 78 154 96 L160 112 Q153 124 146 112 Q138 134 128 114 Q121 126 113 112 Q104 130 96 112 Q88 122 84 108 Z" />
                <circle className="ks-eye" cx="104" cy="160" r="6" />
                <circle className="ks-eye" cx="140" cy="160" r="6" />
                <ellipse className="ks-cheek" cx="92" cy="178" rx="9" ry="6" />
                <ellipse className="ks-cheek" cx="152" cy="178" rx="9" ry="6" />
                <path className="ks-mouth" d="M106 180 Q122 196 138 180" />
            </Corner>
        </>
    );
}
