import { Air, Corner, Ground, Hill } from './parts';

// A small round monster with wings, floating in a top corner.
const Flyer = ({ x, y, cls }: { x: number; y: number; cls: string }) => (
    <g transform={`translate(${x} ${y})`}>
        <ellipse className="ks-white" cx="-20" cy="-6" rx="12" ry="7" />
        <ellipse className="ks-white" cx="20" cy="-6" rx="12" ry="7" />
        <circle className={cls} cx="0" cy="0" r="18" />
        <circle className="ks-white" cx="0" cy="-3" r="7" />
        <circle className="ks-eye" cx="1" cy="-2" r="3" />
        <path className="ks-mouth" d="M-6 8 Q0 12 6 8" />
    </g>
);

// Leerjaar 2: soft, round, friendly monsters peeking from behind the hills.

export default function Monsters() {
    return (
        <>
            <Ground back />
            <Ground />
            <Corner side="l">
                <path className="ks-teal" d="M88 92 L80 58 L104 84 Z M152 84 L170 56 L166 94 Z" />
                <circle className="ks-teal" cx="128" cy="160" r="76" />
                <circle className="ks-white" cx="104" cy="132" r="17" />
                <circle className="ks-white" cx="152" cy="132" r="17" />
                <circle className="ks-eye" cx="108" cy="136" r="7" />
                <circle className="ks-eye" cx="148" cy="136" r="7" />
                <path className="ks-mouth" d="M110 168 Q128 182 146 168" />
                <Hill d="M-4 244 V184 Q60 150 132 180 Q200 206 244 236 V244 Z" top="M-4 184 Q60 150 132 180 Q200 206 244 236" />
            </Corner>
            <Corner side="r">
                <g className="ks-bob">
                    <path className="ks-stem" d="M124 70 Q120 44 132 30" />
                    <circle className="ks-honey" cx="133" cy="28" r="9" />
                    <ellipse className="ks-pink" cx="124" cy="150" rx="66" ry="74" />
                    <circle className="ks-white" cx="124" cy="126" r="24" />
                    <circle className="ks-eye" cx="128" cy="130" r="10" />
                    <path className="ks-mouth" d="M104 166 Q124 180 144 166" />
                </g>
                <Hill d="M-4 236 Q40 170 120 176 Q200 186 244 176 V244 H-4 Z" top="M-4 236 Q40 170 120 176 Q200 186 244 176" />
            </Corner>
            <Air side="l"><Flyer x={60} y={40} cls="ks-teal" /></Air>
            <Air side="r"><g className="ks-bob"><Flyer x={100} y={40} cls="ks-pink" /></g></Air>
        </>
    );
}
