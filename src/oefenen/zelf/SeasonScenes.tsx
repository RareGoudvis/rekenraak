import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Burst } from '../spelen/scene';
import { HEART_FLIGHT_MS, SCENE_MS, crossAt, cupidPlan, pickTiles, walkLine, type SceneId, type StripGeo } from './headerSeason';
import './seasonScenes.css';

// The seasonal header's scenes (headerSeason.ts SCENES): a short character moment along the strip, behind and between
// the leerjaar tiles. Pure CSS motion on a few elements; the geometry (px) comes from the tiles measured at the start.

const HEART = 'M12 21 C5 16 2 12.5 2 8.5 C2 5 4.6 3 7.3 3 C9.3 3 11 4.2 12 6 C13 4.2 14.7 3 16.7 3 C19.4 3 22 5 22 8.5 C22 12.5 19 16 12 21 Z';
const STAR = 'M12 1 L14.4 9.6 L23 12 L14.4 14.4 L12 23 L9.6 14.4 L1 12 L9.6 9.6 Z';

type Css = CSSProperties & Record<`--${string}`, string | number>;

/** How many of these moments (ms after mount) have passed: for the one-shot bursts along a scene. */
function useMarks(marks: readonly number[]): number {
    const [n, setN] = useState(0);
    const key = marks.join(',');
    useEffect(() => {
        const ids = key.split(',').filter(Boolean).map((ms, i) => window.setTimeout(() => setN(c => Math.max(c, i + 1)), Number(ms)));
        return () => ids.forEach(id => window.clearTimeout(id));
    }, [key]);
    return n;
}

/** Something crossing the strip from x0 to x1 (px), its box `w` × `h` with its bottom on `bottom`. */
function Run({ x0, x1, bottom, w, h, ms, delay = 0, className = '', children }: {
    x0: number; x1: number; bottom: number; w: number; h: number; ms: number; delay?: number; className?: string; children: ReactNode;
}) {
    const style: Css = { width: w, height: h, top: bottom - h, '--x0': `${x0}px`, '--x1': `${x1}px`, animationDuration: `${ms}ms`, animationDelay: `${delay}ms`, '--d': `${delay}ms` };
    return <div className={`zf-run ${className}`} style={style}>{children}</div>;
}

/** Something fixed in the strip (a ghost behind a tile, a flower at its edge). */
const At = ({ x, bottom, w, h, className = '', style, children }: { x: number; bottom: number; w: number; h: number; className?: string; style?: Css; children: ReactNode }) => (
    <div className={`zf-at ${className}`} style={{ left: x, top: bottom - h, width: w, height: h, ...style }}>{children}</div>
);

// ── The characters (flat fills, the ink outline; feet on the bottom of the viewBox) ──
function SintOnHorse() {
    return (
        <svg viewBox="0 0 150 110" className="zf-art">
            <path className="zf-grey zf-tail" d="M40 60 Q22 62 22 86 Q30 76 42 70 Z" />
            <g className="zf-leg is-a"><rect className="zf-white" x="44" y="70" width="8" height="34" rx="4" /></g>
            <g className="zf-leg is-b"><rect className="zf-white" x="92" y="70" width="8" height="34" rx="4" /></g>
            <path className="zf-white" d="M38 66 Q38 50 60 50 L92 50 Q108 50 106 68 Q104 80 86 80 L56 80 Q38 80 38 66 Z" />
            <path className="zf-white" d="M92 56 Q98 38 108 30 L118 36 Q110 48 104 64 Z" />
            <path className="zf-white" d="M104 28 Q114 20 126 26 Q134 32 130 40 Q120 44 110 40 Q104 36 104 28 Z" />
            <path className="zf-grey zf-ns" d="M100 34 Q104 24 112 22 Q108 30 106 40 Q102 46 98 52 Z" />
            <path className="zf-white" d="M108 24 L110 15 L115 23 Z" />
            <circle className="zf-eye" cx="118" cy="30" r="1.8" />
            <circle className="zf-night zf-ns" cx="128.4" cy="36" r="1.2" />
            <g className="zf-leg is-b"><rect className="zf-white" x="52" y="72" width="8" height="32" rx="4" /></g>
            <g className="zf-leg is-a"><rect className="zf-white" x="84" y="72" width="8" height="32" rx="4" /></g>
            <path className="zf-red" d="M54 50 Q74 46 92 50 L94 66 Q74 70 54 66 Z" />
            <path className="zf-gold zf-ns" d="M54.6 62 Q74 66 93.6 62 L94 66 Q74 70 54 66 Z" />
            {/* The Sint: red mantle, white beard, mijter and staff. */}
            <path className="zf-gold" d="M90 6 Q98 2 98 10 Q98 16 92 14" />
            <rect className="zf-gold" x="88.6" y="10" width="3.4" height="58" rx="1.7" transform="rotate(4 90 40)" />
            <path className="zf-red" d="M60 56 Q58 34 68 26 Q76 22 82 28 Q90 38 86 56 Z" />
            <path className="zf-white zf-ns" d="M70 30 L74 56 L78 30 Z" />
            <path className="zf-red" d="M80 34 Q88 36 90 30 L93 33 Q90 42 80 42 Z" />
            <circle className="zf-skin" cx="74" cy="20" r="7.6" />
            <path className="zf-white" d="M66 19 Q65 33 74 38 Q83 33 82 19 Q78 25 74 25 Q70 25 66 19 Z" />
            <circle className="zf-eye" cx="71.4" cy="18.6" r="1.1" />
            <circle className="zf-eye" cx="77" cy="18.6" r="1.1" />
            <path className="zf-red" d="M67 14 L67 5 Q74 -3 81 5 L81 14 Z" />
            <path className="zf-gold zf-ns" d="M72.8 4 h2.4 v3 h3 v2.4 h-3 v4 h-2.4 v-4 h-3 v-2.4 h3 Z" />
        </svg>
    );
}

function Piet() {
    return (
        <svg viewBox="0 0 60 100" className="zf-art">
            <g className="zf-leg is-a"><rect className="zf-purple" x="22" y="68" width="7" height="30" rx="3.5" /></g>
            <g className="zf-leg is-b"><rect className="zf-gold" x="31" y="68" width="7" height="30" rx="3.5" /></g>
            <path className="zf-blue" d="M16 48 Q14 72 30 72 Q46 72 44 48 Q40 38 30 38 Q20 38 16 48 Z" />
            <path className="zf-gold zf-ns" d="M22 44 L26 72 L30 72 L27 41 Z M34 41 L33 72 L37 71 L38 44 Z" />
            <g className="zf-arm"><path className="zf-blue" d="M42 46 Q52 42 54 32 L58 34 Q57 46 44 52 Z" /><circle className="zf-nutfill zf-thin" cx="56" cy="31" r="3.2" /></g>
            <path className="zf-white" d="M18 40 Q30 46 42 40 Q40 34 30 34 Q20 34 18 40 Z" />
            <circle className="zf-skin" cx="30" cy="24" r="10" />
            <path className="zf-soot zf-ns" d="M21 26 Q23 29 26 27 M35 29 Q37 31 39 28" />
            <circle className="zf-eye" cx="26.6" cy="23" r="1.3" />
            <circle className="zf-eye" cx="33.6" cy="23" r="1.3" />
            <path className="zf-mouth" d="M26 28 Q30 31.6 34 28" />
            <path className="zf-red" d="M18 18 Q20 6 32 7 Q44 8 43 17 Q31 13 18 18 Z" />
            <path className="zf-white zf-plume" d="M38 10 Q48 0 54 4 Q48 6 42 13 Z" />
        </svg>
    );
}

function Witch() {
    return (
        <svg viewBox="0 0 150 100" className="zf-art">
            <path className="zf-purple zf-cape" d="M64 40 Q86 40 104 58 Q92 60 86 70 Q78 60 64 64 Z" />
            <path className="zf-wood" d="M18 72 L128 62 L129 66 L19 76 Z" />
            <path className="zf-straw" d="M122 58 Q138 50 148 46 Q144 62 150 78 Q136 74 122 72 Z" />
            <path className="zf-wood zf-ns" d="M120 58 h5 v14 h-5 Z" />
            <g className="zf-leg is-a"><path className="zf-stripe" d="M58 68 L50 88 L56 90 L64 70 Z" /><path className="zf-night" d="M46 86 L58 88 L56 94 L42 92 Z" /></g>
            <path className="zf-night" d="M50 46 Q48 70 72 70 Q86 70 84 50 Q80 38 66 38 Q54 38 50 46 Z" />
            <path className="zf-green" d="M48 50 Q40 52 34 62 L38 66 Q44 58 52 56 Z" />
            <circle className="zf-greenskin" cx="62" cy="28" r="11" />
            <path className="zf-greenskin" d="M52 28 Q44 30 46 34 Q50 34 53 31 Z" />
            <circle className="zf-eye" cx="57" cy="26" r="1.6" />
            <circle className="zf-eye" cx="64" cy="25" r="1.6" />
            <path className="zf-mouth" d="M55 33 Q59 36 63 33" />
            <path className="zf-orange zf-hair" d="M68 22 Q78 26 76 40 Q72 34 70 32 Q72 38 68 42 Q66 34 66 28 Z" />
            <path className="zf-night" d="M46 20 Q62 12 80 18 L76 22 Q62 18 50 23 Z" />
            <path className="zf-night zf-hat" d="M52 19 L62 -6 Q66 -10 68 -4 L74 17 Q62 14 52 19 Z" />
            <path className="zf-purple zf-ns" d="M53.4 16 Q63 12 73 14.6 L73.8 17.4 Q62 14.6 52.6 18.6 Z" />
            {/* Her cat rides along at the back. */}
            <path className="zf-night" d="M100 60 Q98 48 106 46 L104 40 L109 44 L114 40 L113 47 Q118 52 114 60 Z" />
            <circle className="zf-gold zf-ns" cx="106.6" cy="49" r="1.4" />
            <circle className="zf-gold zf-ns" cx="111.4" cy="49" r="1.4" />
            <path className="zf-night zf-cattail" d="M114 58 Q124 56 122 46" fill="none" />
        </svg>
    );
}

function Ghost() {
    return (
        <svg viewBox="0 0 50 62" className="zf-art">
            <path className="zf-white" d="M5 60 L5 25 Q5 3 25 3 Q45 3 45 25 L45 60 L38.5 54 L31.8 60 L25 54 L18.2 60 L11.5 54 Z" />
            <path className="zf-white" d="M5 32 Q-1 30 0 24 Q4 26 6 27 Z M45 32 Q51 30 50 24 Q46 26 44 27 Z" />
            <ellipse className="zf-eye" cx="18" cy="24" rx="2.6" ry="3.6" />
            <ellipse className="zf-eye" cx="32" cy="24" rx="2.6" ry="3.6" />
            <ellipse className="zf-pink zf-ns" cx="13" cy="31" rx="3" ry="1.8" />
            <ellipse className="zf-pink zf-ns" cx="37" cy="31" rx="3" ry="1.8" />
            <ellipse className="zf-night zf-boo" cx="25" cy="34" rx="3.4" ry="4" />
        </svg>
    );
}

function Sled({ santa }: { santa: boolean }) {
    return (
        <svg viewBox="0 0 220 100" className="zf-art">
            {/* The sled first, the reindeer pulling it in front. */}
            <path className="zf-cord is-dark" d="M108 66 Q134 60 160 60" />
            <path className="zf-gold zf-ns" d="M4 94 L112 94 Q122 94 122 86 L126 86 Q126 98 112 98 L4 98 Z" />
            <path className="zf-red" d="M12 60 L100 60 Q112 60 110 76 L106 88 L16 88 Q8 88 8 76 Z" />
            <path className="zf-gold zf-ns" d="M14 66 H104 V70 H13 Z" />
            {santa ? <>
                <path className="zf-wood" d="M16 60 Q14 34 34 32 Q50 32 48 60 Z" />
                <rect className="zf-red" x="26" y="40" width="14" height="14" rx="2" />
                <rect className="zf-gold zf-ns" x="31.4" y="40" width="3.2" height="14" />
                <path className="zf-red" d="M56 60 Q54 40 68 38 Q82 40 80 60 Z" />
                <path className="zf-red zf-wave" d="M78 46 Q88 40 90 28 L95 30 Q92 46 80 52 Z" />
                <circle className="zf-skin" cx="68" cy="30" r="8" />
                <path className="zf-white" d="M60 30 Q59 44 68 46 Q77 44 76 30 Q72 35 68 35 Q64 35 60 30 Z" />
                <circle className="zf-eye" cx="65.4" cy="28.6" r="1.1" />
                <circle className="zf-eye" cx="71" cy="28.6" r="1.1" />
                <path className="zf-red" d="M60 25 Q62 12 74 14 Q84 18 82 30 L78 28 Q78 22 74 22 Q66 20 60 25 Z" />
                <circle className="zf-white" cx="81" cy="31" r="3.6" />
                <rect className="zf-white" x="58" y="22.6" width="20" height="5" rx="2.5" />
            </> : <>
                <path className="zf-wood" d="M20 60 Q18 36 40 34 Q62 36 60 60 Z" />
                <rect className="zf-blue" x="62" y="42" width="18" height="18" rx="2" />
                <rect className="zf-gold zf-ns" x="69.4" y="42" width="3.2" height="18" />
                <rect className="zf-pinkdeep" x="82" y="48" width="14" height="12" rx="2" />
            </>}
            {/* The reindeer, galloping. */}
            <g className="zf-gallop">
                <g className="zf-leg is-a"><rect className="zf-wood" x="146" y="66" width="7" height="30" rx="3.5" /></g>
                <g className="zf-leg is-b"><rect className="zf-wood" x="184" y="66" width="7" height="30" rx="3.5" /></g>
                <path className="zf-wood" d="M140 64 Q140 50 158 50 L186 50 Q198 50 196 64 Q194 74 180 74 L154 74 Q140 74 140 64 Z" />
                <path className="zf-wood" d="M184 54 Q190 38 198 32 L206 38 Q200 48 196 62 Z" />
                <path className="zf-wood" d="M196 30 Q206 24 214 30 Q220 36 214 42 Q206 44 200 40 Q194 36 196 30 Z" />
                <path className="zf-antler" d="M198 28 Q194 16 186 12 M195 20 Q190 20 188 24 M204 26 Q206 14 214 10 M206 18 Q211 18 214 20" />
                <circle className="zf-eye" cx="206" cy="31" r="1.6" />
                <circle className="zf-red zf-nose" cx="216" cy="38" r="3.4" />
                <g className="zf-leg is-b"><rect className="zf-wood" x="154" y="66" width="7" height="30" rx="3.5" /></g>
                <g className="zf-leg is-a"><rect className="zf-wood" x="176" y="66" width="7" height="30" rx="3.5" /></g>
                <path className="zf-red" d="M176 50 L182 50 L180 74 L174 74 Z" />
                <circle className="zf-gold zf-thin" cx="178" cy="62" r="2.6" />
            </g>
        </svg>
    );
}

function Snowman() {
    return (
        <svg viewBox="0 0 80 110" className="zf-art">
            <g className="zf-sm-melt">
                <g className="zf-sm-base"><circle className="zf-white" cx="40" cy="86" r="22" /><path className="zf-shade zf-ns" d="M22 92 Q40 104 58 92 Q52 106 40 107 Q28 106 22 92 Z" /></g>
                <g className="zf-sm-arm is-l"><path className="zf-stick" d="M26 56 L8 46 M14 49 L10 42" /></g>
                <g className="zf-sm-arm is-r"><path className="zf-stick" d="M54 56 L72 44 M66 48 L72 50" /></g>
                <g className="zf-sm-mid"><circle className="zf-white" cx="40" cy="56" r="15" /><circle className="zf-night zf-ns" cx="40" cy="52" r="1.8" /><circle className="zf-night zf-ns" cx="40" cy="60" r="1.8" /></g>
                <g className="zf-sm-scarf"><path className="zf-red" d="M27 41 Q40 47 53 41 L53 46 Q40 52 27 46 Z" /><path className="zf-red" d="M44 46 L48 60 L54 58 L50 45 Z" /></g>
                <g className="zf-sm-head">
                    <circle className="zf-white" cx="40" cy="31" r="12" />
                    <g className="zf-sm-face"><circle className="zf-eye" cx="35.6" cy="28" r="1.6" /><circle className="zf-eye" cx="44.4" cy="28" r="1.6" />
                        <path className="zf-mouth" d="M34 36 Q40 40 46 36" /></g>
                    <g className="zf-sm-nose"><path className="zf-orange" d="M40 31 L53 33 L40 35 Z" /></g>
                </g>
                <g className="zf-sm-hat"><rect className="zf-night" x="30" y="6" width="20" height="14" rx="2" /><rect className="zf-night" x="25" y="18" width="30" height="4.6" rx="2.3" /><rect className="zf-red zf-ns" x="30.6" y="14" width="18.8" height="3" /></g>
            </g>
        </svg>
    );
}

function Drummer() {
    return (
        <svg viewBox="0 0 70 100" className="zf-art">
            <g className="zf-leg is-a"><rect className="zf-blue-deep" x="26" y="70" width="8" height="28" rx="4" /></g>
            <g className="zf-leg is-b"><rect className="zf-blue-deep" x="36" y="70" width="8" height="28" rx="4" /></g>
            <path className="zf-red" d="M20 46 Q18 74 35 74 Q52 74 50 46 Q46 36 35 36 Q24 36 20 46 Z" />
            <circle className="zf-skin" cx="35" cy="26" r="10" />
            <circle className="zf-eye" cx="31.6" cy="25" r="1.3" />
            <circle className="zf-eye" cx="38.6" cy="25" r="1.3" />
            <path className="zf-mouth" d="M31 30 Q35 33 39 30" />
            <rect className="zf-blue-deep" x="26" y="4" width="18" height="16" rx="3" />
            <rect className="zf-gold" x="24" y="17" width="22" height="4" rx="2" />
            <path className="zf-pinkdeep zf-plume" d="M35 4 Q30 -6 38 -8 Q42 -2 37 4 Z" />
            <ellipse className="zf-gold" cx="35" cy="60" rx="16" ry="12" />
            <path className="zf-red zf-ns" d="M21 56 L27 66 L32 56 L38 66 L43 56 L49 62" />
            <ellipse className="zf-white" cx="35" cy="52" rx="16" ry="5" />
            <g className="zf-stick-l"><path className="zf-stick" d="M22 46 L28 50" /></g>
            <g className="zf-stick-r"><path className="zf-stick" d="M48 46 L42 50" /></g>
        </svg>
    );
}

function StiltWalker() {
    return (
        <svg viewBox="0 0 60 160" className="zf-art">
            <g className="zf-leg is-a"><rect className="zf-wood" x="20" y="70" width="5" height="88" rx="2.5" /><path className="zf-stripe" d="M18 70 h10 v34 h-10 Z" /></g>
            <g className="zf-leg is-b"><rect className="zf-wood" x="35" y="70" width="5" height="88" rx="2.5" /><path className="zf-stripe" d="M32 70 h10 v34 h-10 Z" /></g>
            <path className="zf-green" d="M14 42 Q12 74 30 74 Q48 74 46 42 Q42 32 30 32 Q18 32 14 42 Z" />
            <circle className="zf-gold zf-ns" cx="24" cy="50" r="2.6" /><circle className="zf-red zf-ns" cx="36" cy="58" r="2.6" /><circle className="zf-blue zf-ns" cx="28" cy="64" r="2.4" />
            <g className="zf-wave"><path className="zf-green" d="M44 42 Q54 34 54 22 L58 22 Q60 38 46 48 Z" /></g>
            <circle className="zf-skin" cx="30" cy="20" r="10" />
            <circle className="zf-red zf-ns" cx="30" cy="22" r="3" />
            <circle className="zf-eye" cx="26.4" cy="17.6" r="1.3" />
            <circle className="zf-eye" cx="33.6" cy="17.6" r="1.3" />
            <path className="zf-mouth" d="M25 25 Q30 29 35 25" />
            <path className="zf-purple" d="M19 13 L30 -8 L41 13 Q30 16 19 13 Z" />
            <circle className="zf-gold" cx="30" cy="-8" r="3.4" />
        </svg>
    );
}

function ConfettiKid() {
    return (
        <svg viewBox="0 0 60 100" className="zf-art">
            <g className="zf-leg is-a"><rect className="zf-purple" x="22" y="70" width="7" height="28" rx="3.5" /></g>
            <g className="zf-leg is-b"><rect className="zf-purple" x="31" y="70" width="7" height="28" rx="3.5" /></g>
            <path className="zf-gold" d="M16 48 Q14 74 30 74 Q46 74 44 48 Q40 38 30 38 Q20 38 16 48 Z" />
            <path className="zf-red zf-ns" d="M18 52 L42 52 L42 56 L17 56 Z M17 62 L43 62 L43 66 L17 66 Z" />
            <g className="zf-throw"><path className="zf-gold" d="M40 46 Q50 38 52 26 L57 28 Q56 42 44 52 Z" /><circle className="zf-pinkdeep zf-thin" cx="54" cy="24" r="4" /></g>
            <circle className="zf-skin" cx="30" cy="26" r="10" />
            <circle className="zf-eye" cx="26.6" cy="25" r="1.3" />
            <circle className="zf-eye" cx="33.6" cy="25" r="1.3" />
            <path className="zf-mouth" d="M25 30 Q30 34 35 30" />
            <path className="zf-blue" d="M19 20 Q20 10 30 10 Q40 10 41 20 Q30 16 19 20 Z" />
            <path className="zf-red zf-ns" d="M22 14 L38 14" />
        </svg>
    );
}

function Cupid() {
    return (
        <svg viewBox="0 0 90 80" className="zf-art">
            <g className="zf-cwing is-back"><path className="zf-white" d="M34 30 Q20 8 8 14 Q14 20 10 26 Q18 26 16 34 Q26 32 34 38 Z" /></g>
            <path className="zf-skin" d="M30 44 Q28 64 44 66 Q58 66 58 50 Q56 38 44 38 Q32 38 30 44 Z" />
            <path className="zf-pinkdeep" d="M30 50 Q44 58 58 48 L58 54 Q44 64 30 56 Z" />
            <g className="zf-leg is-a"><path className="zf-skin" d="M36 62 Q30 70 34 76 L39 74 Q37 70 42 64 Z" /></g>
            <g className="zf-leg is-b"><path className="zf-skin" d="M48 62 Q52 72 46 76 L43 72 Q46 70 44 64 Z" /></g>
            <circle className="zf-skin" cx="46" cy="26" r="13" />
            <path className="zf-gold" d="M33 24 Q32 10 46 11 Q60 10 59 24 Q56 16 52 18 Q48 13 44 17 Q38 14 33 24 Z" />
            <circle className="zf-eye" cx="45" cy="26" r="1.5" />
            <circle className="zf-eye" cx="53" cy="26" r="1.5" />
            <ellipse className="zf-pink zf-ns" cx="56" cy="31" rx="3" ry="2" />
            <path className="zf-mouth" d="M47 32 Q50 34.6 53 32" />
            <g className="zf-cwing is-front"><path className="zf-white" d="M40 34 Q30 14 18 18 Q24 24 20 30 Q28 30 26 38 Q34 36 40 40 Z" /></g>
            <g className="zf-bow">
                <path className="zf-bowline" d="M70 24 Q82 42 70 60" />
                <path className="zf-string" d="M70 24 L62 42 L70 60" />
                <path className="zf-skin" d="M54 44 Q60 40 64 42 L64 46 Q60 46 56 48 Z" />
                <path className="zf-stick" d="M60 42 L84 42" />
                <path className="zf-red zf-thin" d="M84 38 L90 42 L84 46 Z" />
            </g>
        </svg>
    );
}

function Bunny() {
    return (
        <svg viewBox="0 0 80 90" className="zf-art">
            <circle className="zf-white" cx="16" cy="58" r="7" />
            <path className="zf-white" d="M14 64 Q12 40 36 38 Q56 38 58 58 Q60 76 40 78 L22 78 Q14 76 14 64 Z" />
            <path className="zf-white zf-ear" d="M50 30 Q44 6 50 2 Q58 4 58 28 Z" />
            <path className="zf-white zf-ear is-b" d="M60 32 Q62 8 70 6 Q76 10 66 34 Z" />
            <path className="zf-pink zf-ns" d="M51.6 26 Q48 10 51 6 Q55 8 55.6 26 Z" />
            <circle className="zf-white" cx="58" cy="44" r="14" />
            <circle className="zf-eye" cx="62" cy="40" r="1.8" />
            <circle className="zf-pinkdeep zf-ns" cx="71" cy="46" r="2.2" />
            <ellipse className="zf-pink zf-ns" cx="64" cy="50" rx="3" ry="1.8" />
            <path className="zf-mouth" d="M66 51 Q69 53 71.6 50" />
            <path className="zf-white" d="M40 78 Q48 86 58 84 Q60 78 52 76 Z" />
            <path className="zf-wood" d="M24 54 L42 54 L40 70 L26 70 Z" />
            <path className="zf-wood zf-handle" d="M26 54 Q33 42 40 54" />
            <ellipse className="zf-sky zf-thin" cx="29" cy="53" rx="3.4" ry="4.4" />
            <ellipse className="zf-pink zf-thin" cx="36" cy="52" rx="3.4" ry="4.4" />
        </svg>
    );
}

const Egg = ({ tone }: { tone: number }) => (
    <svg viewBox="0 0 24 30" className="zf-art">
        <path className={['zf-sky', 'zf-pink', 'zf-yellow', 'zf-green'][tone % 4]} d="M12 1 C19 1 23 12 23 19 C23 26 18 29 12 29 C6 29 1 26 1 19 C1 12 5 1 12 1 Z" />
        <path className="zf-zig" d="M2 16 L6 13 L10 16 L14 13 L18 16 L22 13" />
    </svg>
);

function Butterfly({ tone }: { tone: number }) {
    const wing = ['zf-pinkdeep', 'zf-blue', 'zf-gold'][tone % 3];
    return (
        <svg viewBox="0 0 40 34" className="zf-art">
            <g className="zf-bfly-wing is-l"><path className={wing} d="M19 16 Q8 0 3 6 Q0 14 18 18 Z" /><path className={wing} d="M19 18 Q4 22 7 30 Q13 32 19 20 Z" /><circle className="zf-white zf-ns" cx="9" cy="9" r="2" /></g>
            <g className="zf-bfly-wing is-r"><path className={wing} d="M21 16 Q32 0 37 6 Q40 14 22 18 Z" /><path className={wing} d="M21 18 Q36 22 33 30 Q27 32 21 20 Z" /><circle className="zf-white zf-ns" cx="31" cy="9" r="2" /></g>
            <rect className="zf-night" x="18.4" y="10" width="3.2" height="18" rx="1.6" />
            <path className="zf-antenna" d="M19 11 Q16 4 13 3 M21 11 Q24 4 27 3" />
        </svg>
    );
}

function Flower({ tone }: { tone: number }) {
    const petal = ['zf-pinkdeep', 'zf-white', 'zf-gold', 'zf-purple'][tone % 4];
    return (
        <svg viewBox="0 0 30 60" className="zf-art">
            <g className="zf-stem"><path className="zf-stalk" d="M15 60 Q13 40 15 22" /><path className="zf-green" d="M15 44 Q6 40 4 34 Q12 34 15 40 Z" /></g>
            <g className="zf-bloom">
                {[0, 72, 144, 216, 288].map(a => <ellipse key={a} className={petal} cx="15" cy="10" rx="4.6" ry="7" transform={`rotate(${a} 15 17)`} />)}
                <circle className="zf-gold" cx="15" cy="17" r="4.4" />
            </g>
        </svg>
    );
}

function IceCart() {
    return (
        <svg viewBox="0 0 130 110" className="zf-art">
            <path className="zf-stalk" d="M64 50 L64 14" />
            <path className="zf-red zf-umbrella" d="M30 18 Q64 -6 98 18 Z" />
            <path className="zf-white zf-ns" d="M52 6 Q58 2 64 2 L64 18 L46 18 Z M76 6 Q72 3 64 2 L82 18 Z" />
            <circle className="zf-skin" cx="64" cy="38" r="9" />
            <circle className="zf-eye" cx="61" cy="37" r="1.2" />
            <circle className="zf-eye" cx="67" cy="37" r="1.2" />
            <path className="zf-mouth zf-smile" d="M60 42 Q64 45 68 42" />
            <rect className="zf-white" x="54" y="26" width="20" height="6" rx="3" />
            <g className="zf-oops"><path className="zf-red zf-thin" d="M78 18 L82 18 L81 30 L79 30 Z" /><circle className="zf-red zf-thin" cx="80" cy="34" r="1.8" /></g>
            <rect className="zf-white" x="22" y="48" width="84" height="40" rx="6" />
            <path className="zf-pink zf-ns" d="M26 48 h12 v40 h-12 Z M50 48 h12 v40 h-12 Z M74 48 h12 v40 h-12 Z" />
            <rect className="zf-rim" x="22" y="48" width="84" height="40" rx="6" />
            <rect className="zf-blue" x="18" y="44" width="92" height="7" rx="3.5" />
            <g className="zf-cone">
                <path className="zf-wood" d="M90 44 L96 28 L102 44 Z" />
                <circle className="zf-pinkdeep" cx="96" cy="26" r="6" />
            </g>
            <path className="zf-stalk" d="M106 60 L122 54" />
            <g className="zf-wheel" style={{ transformOrigin: '36px 94px' }}><circle className="zf-night" cx="36" cy="94" r="12" /><path className="zf-spoke" d="M36 84 V104 M26 94 H46" /></g>
            <g className="zf-wheel" style={{ transformOrigin: '92px 94px' }}><circle className="zf-night" cx="92" cy="94" r="12" /><path className="zf-spoke" d="M92 84 V104 M82 94 H102" /></g>
        </svg>
    );
}

function Gull() {
    return (
        <svg viewBox="0 0 70 44" className="zf-art">
            <g className="zf-gwing is-back"><path className="zf-grey" d="M36 20 Q30 2 14 4 Q24 12 26 22 Z" /></g>
            <path className="zf-white" d="M14 26 Q20 16 36 18 Q50 20 58 26 Q46 34 30 32 Q18 32 14 26 Z" />
            <path className="zf-grey" d="M58 26 L68 22 L66 30 Z" />
            <circle className="zf-white" cx="18" cy="20" r="7" />
            <path className="zf-gold" d="M11 20 L2 23 L11 24 Z" />
            <circle className="zf-eye" cx="16" cy="18" r="1.2" />
            <g className="zf-gull-cone"><path className="zf-wood" d="M0 22 L5 34 L9 24 Z" /><circle className="zf-pinkdeep" cx="4" cy="20" r="4.2" /></g>
            <g className="zf-gwing is-front"><path className="zf-grey" d="M34 22 Q38 4 54 2 Q46 12 44 24 Z" /></g>
        </svg>
    );
}

// ── The scenes ──────────────────────────────────────────────────────────────
interface SceneProps { geo: StripGeo; seed: number; ms: number }

function SintScene({ geo, ms }: SceneProps) {
    const { feet, size } = walkLine(geo);
    const hh = size * 1.02, hw = hh * 150 / 110;
    const ph = size * 0.74, pw = ph * 0.6;
    const x0 = -hw - pw * 2.4, x1 = geo.w + 10;
    // The Piet's throws: three moments along his run, pepernoten flying up from where he is.
    const lag = 700;
    const throws = [0.38, 0.55, 0.72].map(f => ({ at: lag + f * ms * 0.9, x: x0 + (x1 - x0) * f + pw * 0.8 }));
    const n = useMarks(throws.map(t => t.at));
    return <>
        <Run x0={x0} x1={x1} bottom={feet + 2} w={hw} h={hh} ms={ms * 0.9} className="zf-trot"><SintOnHorse /></Run>
        <Run x0={x0 - pw * 0.4} x1={x1 - hw * 0.4} bottom={feet} w={pw} h={ph} ms={ms * 0.9} delay={lag} className="zf-hop is-piet"><Piet /></Run>
        {throws.slice(0, n).map((t, i) => <Burst key={i} kind="pieces" className="zf-nuts" x={t.x} y={feet - ph * 0.7} spread={size * 0.45} count={7} seed={i + 4} color="var(--zf-nut)" />)}
    </>;
}

function WitchScene({ geo, ms }: SceneProps) {
    const { top, sky, tile } = walkLine(geo);
    const h = sky, w = h * 1.5;
    const x0 = geo.w + 10, x1 = -w - 10;
    const bottom = top + tile * 0.32;
    // Her trail: sparkles left where she passes.
    const trail = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map(f => ({ x: geo.w * (1 - f), at: crossAt(geo.w * (1 - f) + w * 0.8, x0, x1, ms) }));
    return <>
        <Run x0={x0} x1={x1} bottom={bottom} w={w} h={h} ms={ms} className="zf-swoop"><Witch /></Run>
        {trail.map((t, i) => (
            <i key={i} className="zf-spark" style={{ left: t.x, top: bottom - h * (0.45 + 0.25 * (i % 2)), animationDelay: `${t.at}ms` }}><svg viewBox="0 0 24 24"><path d={STAR} /></svg></i>
        ))}
    </>;
}

function GhostsScene({ geo, seed }: SceneProps) {
    const picks = pickTiles(seed, 3);
    return <>{picks.map((ti, i) => {
        const t = geo.tiles[ti];
        const w = t.w * 0.5, h = w * 62 / 50;
        // Hidden behind the tile, then up until its eyes clear the tile's top (never past the strip's edge).
        const hidden = t.y + t.h * 0.12;
        const peek = Math.max(2, t.y - h * 0.62) - hidden;
        return (
            <At key={ti} x={t.x + t.w / 2 - w / 2 + (i - 1) * t.w * 0.08} bottom={hidden + h} w={w} h={h} className="zf-ghost" style={{ animationDelay: `${i * 380}ms`, '--d': `${i * 380}ms`, '--peek': `${peek}px` }}>
                <Ghost />
                {i === 1 && <b className="zf-boo-say" style={{ animationDelay: `${i * 380}ms` }}>Boe!</b>}
            </At>
        );
    })}</>;
}

function SledScene({ geo, ms, santa }: SceneProps & { santa: boolean }) {
    const { top, sky, tile } = walkLine(geo);
    const h = sky * 1.2, w = h * 2.2;
    const x0 = -w - 10, x1 = geo.w + 10;
    const bottom = top + tile * 0.42;
    const trail = [0.2, 0.4, 0.6, 0.8].map(f => ({ x: geo.w * f, at: crossAt(geo.w * f - w * 0.1, x0, x1, ms) }));
    return <>
        <Run x0={x0} x1={x1} bottom={bottom} w={w} h={h} ms={ms} className="zf-glide"><Sled santa={santa} /></Run>
        {trail.map((t, i) => (
            <i key={i} className="zf-spark is-white" style={{ left: t.x, top: bottom - h * (0.5 + 0.25 * (i % 2)), animationDelay: `${t.at}ms` }}><svg viewBox="0 0 24 24"><path d={STAR} /></svg></i>
        ))}
    </>;
}

function SnowmanScene({ geo }: SceneProps) {
    const { top, tile } = walkLine(geo);
    // Puppet style on tile 1's left edge: he builds himself on the tiles' top line, his base just behind the tile.
    const t0 = geo.tiles[0];
    const bottom = top + tile * 0.38;
    const h = Math.min(bottom - 4, tile * 1.1), w = h * 80 / 110;
    const x = Math.max(2, t0.x - w * 0.5);
    return <At x={x} bottom={bottom} w={w} h={h} className="zf-snowman"><Snowman /></At>;
}

function ParadeScene({ geo, ms }: SceneProps) {
    const { feet, size, tile } = walkLine(geo);
    const kh = size * 0.78, kw = kh * 0.6;
    const dh = size * 0.82, dw = dh * 0.7;
    const sBottom = feet + tile * 0.5, sh = sBottom - 4, sw = sh * 60 / 160;
    const gap = size * 0.25;
    const x1 = geo.w + 10;
    // The confetti kid leads; the drummer and the stilt walker follow.
    const lead = { x0: -kw - 10, x1: x1 + dw + sw + gap * 2 };
    const pops = [0.3, 0.5, 0.7].map(f => ({ at: f * ms, x: lead.x0 + (lead.x1 - lead.x0) * f + kw * 0.9 }));
    const n = useMarks(pops.map(p => p.at));
    const at = (back: number) => ({ x0: lead.x0 - back, x1: lead.x1 - back });
    return <>
        <Run {...at(sw + dw + gap * 2)} bottom={sBottom} w={sw} h={sh} ms={ms} className="zf-march is-stilts"><StiltWalker /></Run>
        <Run {...at(dw + gap)} bottom={feet} w={dw} h={dh} ms={ms} className="zf-march"><Drummer /></Run>
        <Run {...lead} bottom={feet} w={kw} h={kh} ms={ms} className="zf-march"><ConfettiKid /></Run>
        {pops.slice(0, n).map((p, i) => <Burst key={i} kind="pieces" x={p.x} y={feet - kh * 0.85} spread={size * 0.6} count={14} seed={i + 9} />)}
    </>;
}

function CupidScene({ geo, seed }: SceneProps) {
    const plan = cupidPlan(geo, seed);
    const { size, top, tile } = walkLine(geo);
    const h = plan.w * 80 / 90;
    const cTop = Math.max(2, top + tile * 0.3 - h);
    const bowPull = plan.shots.map(s => `zf-pull 420ms ease-out ${Math.max(0, s.at - 260)}ms both`).join(', ');
    const hs = Math.max(12, size * 0.22);
    return <>
        <Run x0={plan.x0} x1={plan.x1} bottom={cTop + h} w={plan.w} h={h} ms={plan.run} className="zf-fly">
            <div className="zf-cupid" style={{ '--pull': bowPull } as Css}><Cupid /></div>
        </Run>
        {plan.shots.map((s, i) => (
            <i key={i} className="zf-arrow-heart"
                style={{ width: hs, height: hs, '--hx0': `${s.x0 - hs / 2}px`, '--hy0': `${cTop + h * 0.5}px`, '--hx1': `${s.x1 - hs / 2}px`, '--hy1': `${s.y1}px`, animationDelay: `${s.at}ms`, animationDuration: `${HEART_FLIGHT_MS}ms` } as Css}>
                <svg viewBox="0 0 24 24"><path d={HEART} /></svg>
            </i>
        ))}
    </>;
}

function BunnyScene({ geo, seed, ms }: SceneProps) {
    const { feet, size } = walkLine(geo);
    const h = size * 0.8, w = h * 80 / 90;
    const x0 = -w - 10, x1 = geo.w + 10, run = ms * 0.82;
    const eggs = pickTiles(seed, 4).map((ti, i) => {
        const t = geo.tiles[ti];
        const ew = Math.max(12, t.w * 0.22), eh = ew * 1.25;
        return { key: ti, tone: i, x: t.x + t.w / 2 - ew / 2, bottom: t.y + t.h * 0.86, w: ew, h: eh, out: (i % 2 ? -1 : 1) * (t.w / 2 + ew * 0.15), at: crossAt(t.x + t.w / 2, x0, x1, run) };
    });
    return <>
        {eggs.map(e => (
            <At key={e.key} x={e.x} bottom={e.bottom} w={e.w} h={e.h} className="zf-hidden-egg" style={{ '--out': `${e.out}px`, animationDelay: `${e.at}ms` }}><Egg tone={e.tone} /></At>
        ))}
        <Run x0={x0} x1={x1} bottom={feet} w={w} h={h} ms={run} className="zf-bounce-run"><Bunny /></Run>
    </>;
}

function ButterflyScene({ geo, ms }: SceneProps) {
    const { top, tile, sky } = walkLine(geo);
    const bw = Math.max(22, sky * 0.62), bh = bw * 34 / 40;
    const flights = [{ y: top, d: 0, dir: 1 }, { y: top + tile * 0.25, d: 900, dir: 1 }, { y: top + tile * 0.1, d: 400, dir: -1 }];
    return <>{flights.map((f, i) => (
        <Run key={i} x0={f.dir > 0 ? -bw : geo.w + bw} x1={f.dir > 0 ? geo.w + bw : -bw * 2} bottom={f.y} w={bw} h={bh} ms={ms * 0.85 - f.d} delay={f.d} className={`zf-flutter-run${f.dir < 0 ? ' is-back' : ''}`}>
            <div className="zf-flutterpath" style={{ animationDelay: `${-i * 0.5}s` }}><Butterfly tone={i} /></div>
        </Run>
    ))}</>;
}

function FlowersScene({ geo }: SceneProps) {
    const room = Math.min(...geo.tiles.map(t => t.y));
    return <>{geo.tiles.flatMap((t, ti) => [0.16, 0.84].map((f, j) => {
        const h = Math.max(16, Math.min(t.h * 0.42, room + t.h * 0.12 - 2)), w = h / 2;
        return (
            <At key={`${ti}${j}`} x={t.x + t.w * f - w / 2} bottom={t.y + t.h * 0.12} w={w} h={h} className="zf-sprout" style={{ animationDelay: `${ti * 160 + j * 80}ms`, '--d': `${ti * 160 + j * 80}ms` }}>
                <Flower tone={ti * 2 + j} />
            </At>
        );
    }))}</>;
}

function IceScene({ geo, ms }: SceneProps) {
    const { size, top, tile } = walkLine(geo);
    // Raised so its counter is just behind the tiles: the ice-cream man and the cone show above them.
    const feet = top + tile * 0.6, h = feet - 2, w = h * 130 / 110;
    const x0 = -w - 10, x1 = geo.w + 10;
    // The gull meets the cone halfway: where the cart is then, at the cone's place on it.
    const grab = 0.5;
    const cone = { x: x0 + (x1 - x0) * grab + w * 96 / 130, y: feet + 4 - h + h * 26 / 110 };
    const gh = Math.max(16, size * 0.36), gw = gh * 70 / 44;
    const gullMs = 3000;
    const style: Css = {
        width: gw, height: gh, animationDuration: `${gullMs}ms`, animationDelay: `${ms * grab - gullMs / 2}ms`, '--d': `${ms * grab - gullMs / 2}ms`,
        '--gx0': `${geo.w + gw}px`, '--gy0': '-10px', '--gx1': `${cone.x - gw * 0.05}px`, '--gy1': `${cone.y - gh * 0.5}px`, '--gx2': `${cone.x - geo.w * 0.4}px`, '--gy2': `${-gh * 1.4}px`,
    };
    return <>
        <Run x0={x0} x1={x1} bottom={feet + 4} w={w} h={h} ms={ms} className="zf-ride" ><IceCart /></Run>
        <div className="zf-gull" style={style}><Gull /></div>
    </>;
}

/** One scene, running once from its mount (the hook unmounts it after SCENE_MS). */
export default function SeasonScene({ id, geo, seed, santa }: { id: SceneId; geo: StripGeo; seed: number; santa: boolean }) {
    const props = { geo, seed, ms: SCENE_MS[id] };
    const body = {
        sint: <SintScene {...props} />, witch: <WitchScene {...props} />, ghosts: <GhostsScene {...props} />,
        sled: <SledScene {...props} santa={santa} />, snowman: <SnowmanScene {...props} />, parade: <ParadeScene {...props} />,
        cupid: <CupidScene {...props} />, bunny: <BunnyScene {...props} />, butterflies: <ButterflyScene {...props} />,
        flowers: <FlowersScene {...props} />, icecream: <IceScene {...props} />,
    }[id];
    return <div className={`zf-scene is-${id}`} style={{ '--scene': `${props.ms}ms` } as Css} aria-hidden>{body}</div>;
}
