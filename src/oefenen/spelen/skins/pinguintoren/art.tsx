import type { CSSProperties } from 'react';
import { CrackLines, type CrackStage } from '../../scene';
import { BH, type BlockLook, type Creature, type Mood } from './tower';

// Pinguïntoren's drawings, in SVG viewBox units: the penguin (one face per mood), an ice block with its
// frost or bubbles, the frozen creature, the halves of a broken block and the seal. Flat fills, ink outlines.

// A flipper hangs from its shoulder at this angle (0 = straight down, positive = out to the side).
const FLAP: Record<Mood, number> = { neutral: 18, smile: 22, grin: 48, dance: 128, worried: 12, scared: 78 };

function Flipper({ side, mood }: { side: -1 | 1; mood: Mood }) {
    return (
        <g transform={`translate(${side * 18} -42)`}>
            <g className={`pt-flap${side < 0 ? ' is-left' : ' is-right'}`}>
                <ellipse className="pt-flipper" cx="0" cy="14" rx="6" ry="15" transform={`rotate(${-side * FLAP[mood]})`} />
            </g>
        </g>
    );
}

function Eyes({ mood }: { mood: Mood }) {
    if (mood === 'grin' || mood === 'dance') {
        // Happy closed eyes: two little arches.
        return <><path className="pt-happy-eye" d="M-12.5 -46 Q-8 -52.5 -3.5 -46" /><path className="pt-happy-eye" d="M3.5 -46 Q8 -52.5 12.5 -46" /></>;
    }
    const big = mood === 'scared';
    const r = big ? 6.6 : 5;
    const look = mood === 'worried' ? [-1, 2] : mood === 'scared' ? [0, 0] : [1, 1];
    return (
        <>
            <circle className="pt-eye" cx="-8" cy="-47" r={r} />
            <circle className="pt-eye" cx="8" cy="-47" r={r} />
            <circle className="pt-pupil" cx={-8 + look[0]} cy={-47 + look[1]} r={big ? 1.9 : 2.4} />
            <circle className="pt-pupil" cx={8 + look[0]} cy={-47 + look[1]} r={big ? 1.9 : 2.4} />
            {(mood === 'worried' || mood === 'scared') && (
                // Brows up in the middle: worried; raised high: a fright.
                <>
                    <path className="pt-brow" d={big ? 'M-14 -57 L-4 -59.5' : 'M-13 -54 L-4 -56.5'} />
                    <path className="pt-brow" d={big ? 'M14 -57 L4 -59.5' : 'M13 -54 L4 -56.5'} />
                </>
            )}
        </>
    );
}

function Beak({ mood }: { mood: Mood }) {
    switch (mood) {
        case 'smile':
            return <><path className="pt-beak" d="M-6 -41 L6 -41 L0 -35 Z" /><path className="pt-smile" d="M-7.5 -39.5 Q0 -32 7.5 -39.5" /></>;
        case 'grin':
        case 'dance':
            // Wide open: the upper beak, the mouth and a little lower beak.
            return (
                <>
                    <path className="pt-mouth" d="M-7 -41 Q0 -27 7 -41 Z" />
                    <path className="pt-beak" d="M-7.5 -42 L7.5 -42 L0 -37.5 Z" />
                    <path className="pt-beak" d="M-3.6 -32.6 Q0 -30.4 3.6 -32.6 L0 -29.8 Z" />
                </>
            );
        case 'scared':
            return <><path className="pt-beak" d="M-5 -42 L5 -42 L0 -38 Z" /><ellipse className="pt-mouth" cx="0" cy="-34.5" rx="3.2" ry="3.6" /></>;
        default:
            return <path className="pt-beak" d="M-5 -41 L5 -41 L0 -34 Z" />;
    }
}

/** The penguin standing on (0, 0): feet down, about 44 × 62. */
export function Penguin({ mood }: { mood: Mood }) {
    const cheeks = mood === 'smile' || mood === 'grin' || mood === 'dance';
    return (
        <g className="pt-penguin-art">
            <ellipse className="pt-feet" cx="-10" cy="-3" rx="10" ry="5" />
            <ellipse className="pt-feet" cx="10" cy="-3" rx="10" ry="5" />
            <Flipper side={-1} mood={mood} />
            <Flipper side={1} mood={mood} />
            <ellipse className="pt-body" cx="0" cy="-32" rx="22" ry="30" />
            <ellipse className="pt-belly" cx="0" cy="-24" rx="15" ry="19" />
            {cheeks && <><ellipse className="pt-cheek" cx="-13.5" cy="-38" rx="4" ry="2.6" /><ellipse className="pt-cheek" cx="13.5" cy="-38" rx="4" ry="2.6" /></>}
            <Eyes mood={mood} />
            <Beak mood={mood} />
            {(mood === 'worried' || mood === 'scared') && <path className="pt-drop" d="M21 -62 Q25 -55 23.5 -52 Q21 -49.5 18.5 -52 Q17 -55 21 -62 Z" />}
        </g>
    );
}

/** A frozen fish with round glasses, or a tiny grumpy crab, about 30 × 18 around (0, 0). */
export function FrozenCreature({ kind }: { kind: Creature }) {
    if (kind === 'fish') {
        return (
            <g className="pt-creature is-fish">
                <path className="pt-fish" d="M9 0 L18 -6.5 L17 0 L18 6.5 Z" />
                <path className="pt-fish" d="M-2 -6 Q2 -11.5 6 -6" />
                <ellipse className="pt-fish" cx="0" cy="0" rx="11.5" ry="7" />
                <path className="pt-fine" d="M3 -5 Q5.5 0 3 5" />
                {/* Round glasses on an old fish, and a grumpy mouth. */}
                <circle className="pt-glass" cx="-6.8" cy="-1.6" r="3" />
                <circle className="pt-glass" cx="-0.6" cy="-1.6" r="3" />
                <path className="pt-fine" d="M-3.8 -1.8 L-3.6 -1.8" />
                <circle className="pt-pupil" cx="-7.2" cy="-1.3" r="0.9" />
                <circle className="pt-pupil" cx="-1" cy="-1.3" r="0.9" />
                <path className="pt-fine" d="M-11 3.6 Q-9 2.2 -7 3.6" />
            </g>
        );
    }
    return (
        <g className="pt-creature is-crab">
            <path className="pt-fine" d="M-6 4 L-9 8 M-3 5 L-4.5 8.5 M3 5 L4.5 8.5 M6 4 L9 8" />
            <path className="pt-fine" d="M-8 0 L-12 -3 M8 0 L12 -3" />
            <path className="pt-crab" d="M-15.5 -6 A3.6 3.6 0 1 1 -9 -3.5 L-12.4 -4.4 Z" />
            <path className="pt-crab" d="M15.5 -6 A3.6 3.6 0 1 0 9 -3.5 L12.4 -4.4 Z" />
            <path className="pt-crab" d="M-9 5 Q-9.5 -6 0 -6 Q9.5 -6 9 5 Z" />
            <path className="pt-fine" d="M-3 -6 L-3.6 -10 M3 -6 L3.6 -10" />
            <circle className="pt-eye" cx="-3.6" cy="-11" r="2" />
            <circle className="pt-eye" cx="3.6" cy="-11" r="2" />
            <circle className="pt-pupil" cx="-3.4" cy="-10.6" r="0.9" />
            <circle className="pt-pupil" cx="3.4" cy="-10.6" r="0.9" />
            {/* Grumpy: brows down in the middle and a frown. */}
            <path className="pt-fine" d="M-6 -14.4 L-1.8 -12.8 M6 -14.4 L1.8 -12.8" />
            <path className="pt-fine" d="M-3 1.4 Q0 -1 3 1.4" />
        </g>
    );
}

function Deco({ look, x, y, w }: { look: BlockLook; x: number; y: number; w: number }) {
    switch (look.deco) {
        case 'frost': {
            // A frosty rim along the top: little rounded bumps.
            const bumps = Math.round((w - 10) / 9);
            const step = (w - 10) / bumps;
            let d = `M${x + 5} ${y + 3.5}`;
            for (let k = 0; k < bumps; k++) d += ` q${step / 2} ${k % 2 ? 4.5 : 3} ${step} 0`;
            return <><path className="pt-frost" d={d} /><circle className="pt-speck" cx={x + w * 0.22} cy={y + 15} r="1.3" /><circle className="pt-speck" cx={x + w * 0.8} cy={y + 18} r="1" /></>;
        }
        case 'bubbles':
            return (
                <>
                    <path className="pt-shine" d={`M${x + 9} ${y + 8} L${x + 22} ${y + 8}`} />
                    <circle className="pt-bubble" cx={x + w * 0.7} cy={y + 9} r="2.6" />
                    <circle className="pt-bubble" cx={x + w * 0.79} cy={y + 15.5} r="1.7" />
                    <circle className="pt-bubble" cx={x + w * 0.62} cy={y + 17.5} r="1.2" />
                </>
            );
        case 'snowcap':
            // Frost creeping in from the lower corner.
            return <path className="pt-frost-patch" d={`M${x + w - 3} ${y + BH - 3} L${x + w - 3} ${y + 11} Q${x + w - 9} ${y + 13} ${x + w - 10} ${y + 17} Q${x + w - 17} ${y + 18} ${x + w - 19} ${y + BH - 3} Z`} />;
        default:
            return <><path className="pt-shine" d={`M${x + 9} ${y + 8} L${x + 30} ${y + 8}`} /><path className="pt-shine is-dot" d={`M${x + 36} ${y + 8} L${x + 37} ${y + 8}`} /></>;
    }
}

interface IceBlockProps {
    look: BlockLook;
    // The block's left and top (its middle is the tower's middle plus its own offset).
    x: number;
    y: number;
    crack?: CrackStage;
    crackSeed?: number;
    className?: string;
    reducedMotion?: boolean;
}

export function IceBlock({ look, x, y, crack = 0, crackSeed = 5, className = '', reducedMotion }: IceBlockProps) {
    const w = look.width;
    return (
        <g className={`pt-block${className ? ` ${className}` : ''}`}>
            <rect className={`pt-ice is-${look.shade}`} x={x} y={y} width={w} height={BH} rx={look.corner} />
            {look.creature ? (
                <>
                    <g transform={`translate(${x + w / 2} ${y + BH / 2 + 1})`}><FrozenCreature kind={look.creature} /></g>
                    {/* The ice in front of it: it is frozen in, not stuck on. */}
                    <rect className={`pt-ice is-${look.shade} is-glaze`} x={x} y={y} width={w} height={BH} rx={look.corner} />
                    <path className="pt-shine" d={`M${x + 8} ${y + 7} L${x + 18} ${y + 7}`} />
                </>
            ) : <Deco look={look} x={x} y={y} w={w} />}
            <CrackLines x={x} y={y} width={w} height={BH} stage={crack} seed={crackSeed} reducedMotion={reducedMotion} />
        </g>
    );
}

/** A broken block: its two halves fly apart sideways and drop into the sea (CSS: pt-half). */
export function BlockHalves({ look, x, y, i }: { look: BlockLook; x: number; y: number; i: number }) {
    const w = look.width;
    const m = x + w / 2;
    const left = `M${x} ${y} L${m + 4} ${y} L${m - 3} ${y + BH * 0.45} L${m + 3} ${y + BH * 0.7} L${m - 1} ${y + BH} L${x} ${y + BH} Z`;
    const right = `M${m + 4} ${y} L${x + w} ${y} L${x + w} ${y + BH} L${m - 1} ${y + BH} L${m + 3} ${y + BH * 0.7} L${m - 3} ${y + BH * 0.45} Z`;
    // The lower block flies a little further and faster: it was hit first.
    const reach = 92 + (1 - i) * 10;
    return (
        <>
            <path className={`pt-half pt-ice is-${look.shade}`} d={left} style={{ '--hx': `${-reach}px`, '--hr': `${-50 - i * 20}deg`, '--hd': `${i * 60}ms` } as CSSProperties} />
            <path className={`pt-half pt-ice is-${look.shade}`} d={right} style={{ '--hx': `${reach}px`, '--hr': `${44 + i * 22}deg`, '--hd': `${i * 60 + 30}ms` } as CSSProperties} />
            {look.creature && (
                // The frozen creature pops out and tumbles into the sea on its own.
                <g className="pt-tumble" style={{ '--hx': '-40px', '--hr': '-200deg', '--hd': '60ms' } as CSSProperties}>
                    <g transform={`translate(${m} ${y + BH / 2})`}><FrozenCreature kind={look.creature} /></g>
                </g>
            )}
        </>
    );
}

/** The seal's head and shoulders out of the water: (0, 0) is the waterline under it. */
export function Seal() {
    return (
        <g className="pt-seal-art">
            <path className="pt-seal" d="M-11 10 L-11 -11 Q-11 -25 0 -25 Q11 -25 11 -11 L11 10 Z" />
            <g className="pt-seal-face">
                <circle className="pt-pupil" cx="-4.6" cy="-17" r="1.9" />
                <circle className="pt-pupil" cx="4.6" cy="-17" r="1.9" />
                <circle className="pt-glint" cx="-4" cy="-17.7" r="0.6" />
                <circle className="pt-glint" cx="5.2" cy="-17.7" r="0.6" />
                <ellipse className="pt-muzzle" cx="-3" cy="-11" rx="3.6" ry="2.7" />
                <ellipse className="pt-muzzle" cx="3" cy="-11" rx="3.6" ry="2.7" />
                <ellipse className="pt-pupil" cx="0" cy="-13.4" rx="2.2" ry="1.5" />
            </g>
            <path className="pt-ripple" d="M-17 0 Q-14 -3 -11 -1.2 M11 -1.2 Q14 -3 17 0" />
        </g>
    );
}
