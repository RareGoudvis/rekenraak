import { Air, Corner, Ground } from './parts';

// Leerjaar 6: the desert: dunes, a cactus with a flower, a camel, a mild sun at the edge.

export default function Woestijn() {
    return (
        <>
            <Ground back />
            <Ground />
            <Air side="l"><path className="ks-trail" d="M40 40 q8 -8 16 0 q8 -8 16 0 M96 26 q6 -6 12 0 q6 -6 12 0" /></Air>
            <Air side="r"><g className="ks-bob"><circle className="ks-sun" cx="110" cy="40" r="28" /></g></Air>
            <Corner side="l">
                <rect className="ks-cactus" x="46" y="112" width="24" height="64" rx="12" />
                <rect className="ks-cactus" x="46" y="150" width="60" height="22" rx="11" />
                <rect className="ks-cactus" x="152" y="86" width="24" height="62" rx="12" />
                <rect className="ks-cactus" x="118" y="126" width="58" height="22" rx="11" />
                <rect className="ks-cactus" x="92" y="58" width="44" height="182" rx="22" />
                <path className="ks-vein" d="M106 96 v10 M122 120 v10 M106 160 v10 M122 196 v10" />
                <circle className="ks-pink" cx="114" cy="56" r="10" />
            </Corner>
            <Corner side="r">
                <rect className="ks-sand-dark" x="64" y="160" width="12" height="62" rx="5" />
                <rect className="ks-sand-dark" x="84" y="160" width="12" height="62" rx="5" />
                <rect className="ks-sand-dark" x="136" y="160" width="12" height="62" rx="5" />
                <rect className="ks-sand-dark" x="156" y="160" width="12" height="62" rx="5" />
                <ellipse className="ks-sand-dark" cx="114" cy="122" rx="30" ry="28" />
                <ellipse className="ks-sand-dark" cx="114" cy="150" rx="62" ry="28" />
                <path className="ks-sand-dark" d="M160 140 L186 86 L204 92 L180 154 Z" />
                <ellipse className="ks-sand-dark" cx="202" cy="84" rx="20" ry="12" />
                <circle className="ks-eye" cx="206" cy="80" r="2.5" />
                <path className="ks-stem" d="M52 146 Q40 160 44 176" />
            </Corner>
        </>
    );
}
