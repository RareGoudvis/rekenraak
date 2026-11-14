import { Cheek, Cloud, Eye, Prent, Tube } from './parts';
import { F } from './palette';

// A frog on a kick scooter, a scarf flying behind.
export default function Kikker() {
    return (
        <Prent label="kikker">
            <rect className="ns" x="0" y="0" width="400" height="300" style={F.sky} />
            <Cloud x={40} y={34} s={0.8} />
            <Cloud x={300} y={24} s={0.6} />
            <path d="M-10 216 Q120 200 230 212 Q330 222 410 206 L410 262 L-10 262 Z" style={F.grass} />
            <rect x="-10" y="262" width="420" height="50" style={F.grey} />
            <path className="ns" d="M30 284 L70 284 M120 284 L160 284 M210 284 L250 284 M300 284 L340 284" style={{ fill: 'none', stroke: 'var(--pf-white)', strokeWidth: 5 }} />
            <path d="M16 132 L58 132 M6 160 L46 160 M20 188 L60 188" style={F.none} />
            {/* The scarf flies back from the neck. */}
            <path d="M150 150 Q110 128 70 142 Q90 154 74 168 Q114 160 152 170 Z" style={F.red} />
            {/* The scooter: stem and handlebar, deck, wheels. */}
            <Tube d="M282 232 L306 96" w={10} color="grey-dark" />
            <Tube d="M290 96 L330 96" w={10} color="grey-dark" />
            <circle cx="132" cy="250" r="14" style={F.greyDark} />
            <circle cx="290" cy="250" r="14" style={F.greyDark} />
            <circle className="ns" cx="132" cy="250" r="5" style={F.white} />
            <circle className="ns" cx="290" cy="250" r="5" style={F.white} />
            <rect x="106" y="224" width="186" height="14" rx="7" style={F.blue} />
            {/* The frog: back leg and foot on the deck, body, belly, arms to the handlebar. */}
            <ellipse cx="160" cy="206" rx="34" ry="20" style={F.green} />
            <ellipse cx="150" cy="222" rx="26" ry="7" style={F.green} />
            <ellipse cx="236" cy="222" rx="24" ry="7" style={F.green} />
            <ellipse cx="196" cy="180" rx="56" ry="46" style={F.green} />
            <ellipse cx="200" cy="190" rx="34" ry="28" style={F.mint} />
            <Tube d="M232 162 Q262 128 296 98" w={16} color="green" />
            <circle cx="298" cy="96" r="12" style={F.green} />
            {/* The head with its eyes on top and a wide smile. */}
            <circle cx="164" cy="84" r="25" style={F.green} />
            <circle cx="226" cy="84" r="25" style={F.green} />
            <ellipse cx="195" cy="122" rx="66" ry="42" style={F.green} />
            <path className="ns" d="M148 98 L242 98 L242 110 L148 110 Z" style={F.green} />
            <Eye x={164} y={84} r={16} dx={4} />
            <Eye x={226} y={84} r={16} dx={4} />
            <path d="M152 124 Q195 164 238 124" style={F.white} />
            <Cheek x={146} y={136} />
            <Cheek x={244} y={136} />
        </Prent>
    );
}
