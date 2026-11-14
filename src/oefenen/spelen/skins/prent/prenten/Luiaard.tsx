import { useId } from 'react';
import { Cheek, HappyEye, Prent, Sun, Tube } from './parts';
import { F } from './palette';

// A sloth asleep in a striped hammock between two trees, one long arm dangling.
const HAMMOCK = 'M96 158 Q200 312 304 158 Q200 234 96 158 Z';

export default function Luiaard() {
    const clip = `pr-hammock-${useId().replace(/:/g, '')}`;
    return (
        <Prent label="luiaard">
            <defs><clipPath id={clip}><path d={HAMMOCK} /></clipPath></defs>
            <rect className="ns" x="0" y="0" width="400" height="300" style={F.sky} />
            <Sun x={206} y={44} r={24} />
            <path d="M-10 256 Q200 240 410 256 L410 310 L-10 310 Z" style={F.grass} />
            {/* Two trees with round crowns, the ropes. */}
            <rect x="26" y="70" width="30" height="200" rx="6" style={F.wood} />
            <rect x="344" y="70" width="30" height="200" rx="6" style={F.wood} />
            <circle cx="40" cy="58" r="44" style={F.green} />
            <circle cx="360" cy="58" r="44" style={F.green} />
            <path d="M56 118 L98 158 M344 118 L302 158" style={F.none} />
            {/* The sloth lies in it: a round tummy above the hammock's edge, the head on the left. */}
            <ellipse cx="214" cy="178" rx="80" ry="36" style={F.fur} />
            <ellipse cx="222" cy="172" rx="42" ry="20" style={F.cream} />
            <Tube d="M262 168 Q290 150 304 132" w={20} color="fur" />
            <path d="M300 124 L308 112 M306 130 L318 122 M310 136 L322 134" style={F.none} />
            <g transform="translate(0 -14)">
                <circle cx="126" cy="150" r="42" style={F.fur} />
                <ellipse cx="128" cy="156" rx="32" ry="26" style={F.cream} />
                <ellipse cx="113" cy="152" rx="14" ry="9" transform="rotate(-18 113 152)" style={F.brown} />
                <ellipse cx="143" cy="152" rx="14" ry="9" transform="rotate(18 143 152)" style={F.brown} />
                <g style={{ stroke: 'var(--pf-white)', strokeWidth: 3 }}>
                    <HappyEye x={113} y={152} r={6} />
                    <HappyEye x={143} y={152} r={6} />
                </g>
                <ellipse className="ns" cx="128" cy="166" rx="7" ry="5" style={F.ink} />
                <path d="M118 175 Q128 182 138 175" style={F.none} />
                <Cheek x={104} y={170} rx={6} ry={4} />
                <Cheek x={152} y={170} rx={6} ry={4} />
            </g>
            {/* The hammock's front with its stripes. */}
            <path d={HAMMOCK} style={F.blue} />
            <g clipPath={`url(#${clip})`}>
                <path className="ns" d="M80 176 Q200 262 320 176 M80 200 Q200 290 320 200" style={{ fill: 'none', stroke: 'var(--pf-white)', strokeWidth: 9 }} />
            </g>
            <path d={HAMMOCK} style={F.none} />
            {/* An arm hugging the tummy, the other dangling over the edge with three claws. */}
            <Tube d="M174 178 Q206 192 240 180" w={18} color="fur" />
            <Tube d="M200 200 Q214 232 208 258" w={20} color="fur" />
            <path d="M200 266 L198 278 M208 268 L208 280 M216 266 L218 278" style={F.none} />
        </Prent>
    );
}
