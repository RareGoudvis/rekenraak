import { useId, type CSSProperties, type ReactNode } from 'react';
import { Burst, Snow } from '../spelen/scene';
import { BAND, driftLayout, eggLayout, type DriftKind, type Season } from './headerSeason';
import './seasonHeader.css';

// The drawings of the Zelf home's seasonal header (headerSeason.ts; wired by useSeasonHeader.tsx): a band of particles
// behind the leerjaar tiles, a hat on one tile and one toy beside them. Everything stays inside the strip.

const HEART = 'M12 21 C5 16 2 12.5 2 8.5 C2 5 4.6 3 7.3 3 C9.3 3 11 4.2 12 6 C13 4.2 14.7 3 16.7 3 C19.4 3 22 5 22 8.5 C22 12.5 19 16 12 21 Z';
const STAR = 'M12 1 L14.4 9.6 L23 12 L14.4 14.4 L12 23 L9.6 14.4 L1 12 L9.6 9.6 Z';

/** A bat in flight (60 × 60): the toy, and small for the one flitting along the strip. */
function Bat() {
    return (
        <g className="zf-bat">
            <path className="zf-wing is-l zf-night" d="M25 29 C19 19 9 17 2 23 C7 25 8 30 6 35 C11 32 14 34 15 40 C18 35 21 35 25 37 Z" />
            <path className="zf-wing is-r zf-night" d="M35 29 C41 19 51 17 58 23 C53 25 52 30 54 35 C49 32 46 34 45 40 C42 35 39 35 35 37 Z" />
            <path className="zf-night" d="M23 23 L23.5 13 L28 19 Q30 18.4 32 19 L36.5 13 L37 23 Q40 31 36 38 Q30 44 24 38 Q20 31 23 23 Z" />
            <circle className="zf-gold zf-ns" cx="26.8" cy="25.5" r="2.8" />
            <circle className="zf-gold zf-ns" cx="33.2" cy="25.5" r="2.8" />
            <circle className="zf-eye" cx="27.3" cy="26" r="1.2" />
            <circle className="zf-eye" cx="33.7" cy="26" r="1.2" />
            <path className="zf-white zf-thin" d="M27.6 31.4 L28.6 34.4 L29.6 31.6 Z M30.4 31.6 L31.4 34.4 L32.4 31.4 Z" />
            <path className="zf-mouth" d="M26.6 31 Q30 33 33.4 31" />
        </g>
    );
}

// ── The hat on one tile (60 × 40 above the number; the pumpkin sits in the tile's corner) ──
const WEAR: Record<Season, ReactNode> = {
    halloween: <>
        <ellipse className="zf-orange" cx="13" cy="23" rx="9" ry="10.5" />
        <ellipse className="zf-orange" cx="27" cy="23" rx="9" ry="10.5" />
        <ellipse className="zf-orange" cx="20" cy="23" rx="9.5" ry="11.5" />
        <path className="zf-green" d="M18.6 12.4 Q18.4 7 22.6 4.6 L24 6.8 Q21.2 8.6 21.6 12.2 Z" />
        <path className="zf-night zf-ns" d="M13.4 20.6 L16.6 17 L18 21.4 Z M26.6 20.6 L23.4 17 L22 21.4 Z M13 26 L16 28.6 L18.4 26.4 L20.6 29 L23 26.4 L25 28.6 L27.4 26 Q20 33 13 26 Z" />
    </>,
    sinterklaas: <>
        <path className="zf-red" d="M19 38 L18 18 Q19 8 30 2 Q41 8 42 18 L41 38 Z" />
        <path className="zf-gold" d="M18.5 30.5 H41.5 L41 38 H19 Z" />
        <path className="zf-gold zf-thin" d="M28.4 9 h3.2 v5.2 h5 v3.2 h-5 v8 h-3.2 v-8 h-5 v-3.2 h5 Z" />
    </>,
    // The tip hangs to the left, away from the chosen tile's check.
    kerst: <g transform="matrix(-1 0 0 1 60 0)">
        <path className="zf-red" d="M14 32 C16 16 28 6 42 8 C50 9 54 16 52.5 24 L47.5 23.5 C46.5 18 42 15.5 37.5 16.5 C43 21 46 27 46 32 Z" />
        <rect className="zf-white" x="11" y="28.5" width="38" height="9.5" rx="4.75" />
        <circle className="zf-white" cx="50" cy="25.5" r="5.2" />
    </g>,
    winter: <>
        <path className="zf-blue" d="M14 33 Q14 12 30 11 Q46 12 46 33 Z" />
        <path className="zf-white zf-ns" d="M14.8 24 Q30 18.5 45.2 24 L45.7 28.4 Q30 23 14.3 28.4 Z" />
        <rect className="zf-blue-deep" x="12" y="29.5" width="36" height="8.5" rx="3.5" />
        <circle className="zf-white" cx="30" cy="9" r="5.6" />
    </>,
    carnaval: <g transform="rotate(14 31 38)">
        <path className="zf-purple" d="M20 37 L31 6 L42 37 Q31 40.5 20 37 Z" />
        <circle className="zf-gold zf-ns" cx="28.4" cy="24" r="2.2" />
        <circle className="zf-gold zf-ns" cx="34.6" cy="30.6" r="2.2" />
        <circle className="zf-gold zf-ns" cx="31.6" cy="16" r="1.8" />
        <circle className="zf-pinkdeep zf-ns" cx="25.4" cy="32.4" r="1.9" />
        <circle className="zf-pinkdeep zf-ns" cx="35" cy="21" r="1.7" />
        <path className="zf-gold" d="M31 1 L32.6 4.6 L36.4 5 L33.6 7.6 L34.4 11.4 L31 9.4 L27.6 11.4 L28.4 7.6 L25.6 5 L29.4 4.6 Z" />
    </g>,
    valentijn: <>
        <path className="zf-cord" d="M11 39 Q30 27 49 39" />
        <path className="zf-spring" d="M20 33.6 Q15 27 19.5 20" />
        <path className="zf-spring" d="M40 33.6 Q45 27 40.5 20" />
        <path className="zf-red" d="M19.5 20.5 C13 16 11 13 11 10 C11 7.4 13 6 15 6 C16.8 6 18.4 7 19.5 8.8 C20.6 7 22.2 6 24 6 C26 6 28 7.4 28 10 C28 13 26 16 19.5 20.5 Z" />
        <path className="zf-red" d="M40.5 20.5 C34 16 32 13 32 10 C32 7.4 34 6 36 6 C37.8 6 39.4 7 40.5 8.8 C41.6 7 43.2 6 45 6 C47 6 49 7.4 49 10 C49 13 47 16 40.5 20.5 Z" />
    </>,
    pasen: <>
        <ellipse className="zf-white" cx="22" cy="19" rx="6.6" ry="17" transform="rotate(-14 22 19)" />
        <ellipse className="zf-pink zf-ns" cx="22.2" cy="20" rx="3" ry="12" transform="rotate(-14 22.2 20)" />
        <path className="zf-white" d="M35 35 Q36 20 40 12 Q44 4 49 6 Q53 9 47 18 Q42 26 41 36 Z" />
        <path className="zf-pink zf-ns" d="M39.2 32 Q39.6 22 42.6 15 Q45.4 9.4 47.4 10 Q48.6 11.4 45 17.6 Q42 23 41.6 31 Z" />
        <path className="zf-cord is-pink" d="M10 39 Q30 29 50 39" />
    </>,
    lente: <g transform="translate(-2 2)">
        <path className="zf-green" d="M16 28 Q8 30 6 36 Q14 37 17 30 Z" />
        {[0, 60, 120, 180, 240, 300].map(a => (
            <ellipse key={a} className="zf-white" cx="16" cy="12" rx="3.8" ry="7" transform={`rotate(${a} 16 19)`} />
        ))}
        <circle className="zf-gold" cx="16" cy="19" r="4.6" />
    </g>,
    zomer: <>
        <path className="zf-night" d="M5 7 H27 Q28.5 19 17 20 Q6 20 5 7 Z" />
        <path className="zf-night" d="M33 7 H55 Q54 20 43 20 Q31.5 19 33 7 Z" />
        <path className="zf-cord is-dark" d="M27 9.5 Q30 7 33 9.5" />
        <path className="zf-shine" d="M9 10 L12.5 10 M37 10 L40.5 10" />
    </>,
};

/** The season's hat, inside the worn tile (aria-hidden, untappable: a tap on it lands on the tile). */
export function SeasonWear({ season }: { season: Season }) {
    const corner = season === 'halloween';
    return (
        <svg className={`zf-wear zf-art is-${season}${corner ? ' is-corner' : ' is-hat'}`} viewBox={corner ? '0 0 40 36' : '0 0 60 40'} aria-hidden>
            {WEAR[season]}
        </svg>
    );
}

// ── The toy (60 × 60) ───────────────────────────────────────────────────────
function Globe({ inside }: { inside: 'tree' | 'snowman' }) {
    const clip = useId();
    return <>
        <defs><clipPath id={clip}><circle cx="30" cy="27" r="21" /></clipPath></defs>
        <path className="zf-wood" d="M13 49 H47 L51 58 H9 Z" />
        <circle className="zf-glass" cx="30" cy="27" r="21" />
        <g clipPath={`url(#${clip})`}>
            <path className="zf-white zf-ns" d="M6 40 Q30 33 54 40 V50 H6 Z" />
            {inside === 'tree' ? <>
                <path className="zf-wood zf-thin" d="M28 35 h4 v5 h-4 Z" />
                <path className="zf-green zf-thin" d="M30 12 L40 36 Q30 39 20 36 Z" />
                <circle className="zf-red zf-ns" cx="27" cy="27" r="1.6" />
                <circle className="zf-gold zf-ns" cx="33" cy="31" r="1.6" />
                <path className="zf-gold zf-thin" d="M30 7.6 L31.4 10.6 L34.4 11 L32.2 13 L32.8 16 L30 14.4 L27.2 16 L27.8 13 L25.6 11 L28.6 10.6 Z" />
            </> : <>
                <circle className="zf-white zf-thin" cx="30" cy="34" r="7" />
                <circle className="zf-white zf-thin" cx="30" cy="22.6" r="5.2" />
                <path className="zf-orange zf-ns" d="M30 23 L35 24.2 L30 25.2 Z" />
                <circle className="zf-eye" cx="28.2" cy="21.4" r="0.9" />
                <circle className="zf-eye" cx="31.6" cy="21.4" r="0.9" />
                <path className="zf-night zf-thin" d="M25.6 18.4 H34.4 V16.6 H32.6 V12.6 H27.4 V16.6 H25.6 Z" />
            </>}
            <g className="zf-globe-flakes">
                {[[18, 16], [42, 14], [24, 8], [38, 26], [16, 30], [44, 34], [33, 9]].map(([x, y]) => <circle key={x} className="zf-white zf-ns" cx={x} cy={y} r="1.5" />)}
            </g>
        </g>
        <circle className="zf-rim" cx="30" cy="27" r="21" />
        <path className="zf-shine" d="M15.5 21 Q17.5 12 25 9" />
    </>;
}

/** The toy's drawing (its moving parts carry the classes the tricks animate). */
export const SeasonToyArt = ({ season }: { season: Season }) => TOY[season];

const TOY: Record<Season, ReactNode> = {
    halloween: <svg viewBox="0 0 60 60" className="zf-art"><Bat /></svg>,
    sinterklaas: <svg viewBox="0 0 60 60" className="zf-art">
        <g className="zf-box">
            <rect className="zf-red" x="11" y="28" width="38" height="28" rx="3" />
            <rect className="zf-gold zf-thin" x="26" y="28" width="8" height="28" />
        </g>
        <g className="zf-lid">
            <path className="zf-gold" d="M30 20 C22 8 12 12 17.6 18.6 C20 21 25 21 30 20 Z" />
            <path className="zf-gold" d="M30 20 C38 8 48 12 42.4 18.6 C40 21 35 21 30 20 Z" />
            <rect className="zf-red" x="8" y="19" width="44" height="10" rx="3" />
            <rect className="zf-gold zf-thin" x="26" y="19" width="8" height="10" />
        </g>
    </svg>,
    kerst: <svg viewBox="0 0 60 60" className="zf-art"><g className="zf-globe"><Globe inside="tree" /></g></svg>,
    winter: <svg viewBox="0 0 60 60" className="zf-art"><g className="zf-globe"><Globe inside="snowman" /></g></svg>,
    carnaval: <svg viewBox="0 0 60 60" className="zf-art">
        <g className="zf-streamers">
            <path className="zf-streamer is-red" d="M36 28 Q38 16 46 17 Q53 18 49 9" />
            <path className="zf-streamer is-blue" d="M38 31 Q48 26 52 32 Q56 38 58 30" />
            <path className="zf-streamer is-gold" d="M34 26 Q30 14 36 8" />
        </g>
        <g className="zf-popper">
            <path className="zf-purple" d="M6 56 L20 26 L36 42 Z" />
            <path className="zf-gold zf-ns" d="M13.6 39.6 L23.8 49.6 L20.4 51.2 L12 43.2 Z M17.6 31.4 L29.4 43 L26.4 44.6 L16 34.6 Z" />
            <ellipse className="zf-gold" cx="28" cy="34" rx="11.6" ry="4.6" transform="rotate(45 28 34)" />
        </g>
    </svg>,
    valentijn: <svg viewBox="0 0 60 60" className="zf-art">
        <g className="zf-heart">
            <path className="zf-red" d="M30 53 C14 41 5 33 5 22 C5 13 12 7.5 19.5 7.5 C24.5 7.5 28 10.5 30 14.6 C32 10.5 35.5 7.5 40.5 7.5 C48 7.5 55 13 55 22 C55 33 46 41 30 53 Z" />
            <path className="zf-shine" d="M12.5 19 Q13.6 13.4 19 12.6" />
            <ellipse className="zf-eye" cx="22.6" cy="26" rx="1.9" ry="2.5" />
            <ellipse className="zf-eye" cx="37.4" cy="26" rx="1.9" ry="2.5" />
            <ellipse className="zf-pink zf-ns" cx="17.6" cy="31.6" rx="3.4" ry="2.2" />
            <ellipse className="zf-pink zf-ns" cx="42.4" cy="31.6" rx="3.4" ry="2.2" />
            <path className="zf-mouth" d="M26 31.4 Q30 35.6 34 31.4" />
        </g>
    </svg>,
    pasen: <svg viewBox="0 0 60 60" className="zf-art">
        <g className="zf-egg">
            <g className="zf-chick">
                <circle className="zf-yellow" cx="30" cy="31" r="11" />
                <path className="zf-yellow zf-thin" d="M28 20.6 Q28.6 16 31 17 Q30 18.4 31.6 20.4" />
                <circle className="zf-eye" cx="26.4" cy="29" r="1.4" />
                <circle className="zf-eye" cx="33.6" cy="29" r="1.4" />
                <path className="zf-orange zf-thin" d="M27.4 32.4 L30 36 L32.6 32.4 Z" />
            </g>
            <path className="zf-sky" d="M14 36 L19 32 L24 37 L30 32 L36 37 L41 32 L46 36 C46 49 39 57 30 57 C21 57 14 49 14 36 Z" />
            <path className="zf-pinkdeep zf-ns" d="M15.6 44 Q30 48 44.4 44 L43.6 47.6 Q30 51.6 16.4 47.6 Z" />
            <g className="zf-egg-top">
                <path className="zf-sky" d="M14 36 C14 19 21 7 30 7 C39 7 46 19 46 36 L41 32 L36 37 L30 32 L24 37 L19 32 Z" />
                <circle className="zf-gold zf-ns" cx="24" cy="20" r="2.4" />
                <circle className="zf-pinkdeep zf-ns" cx="35" cy="17" r="2.2" />
                <circle className="zf-gold zf-ns" cx="37" cy="27" r="2.2" />
                <circle className="zf-pinkdeep zf-ns" cx="22.6" cy="29" r="1.8" />
            </g>
        </g>
    </svg>,
    lente: <svg viewBox="0 0 60 60" className="zf-art">
        <g className="zf-bee">
            <ellipse className="zf-wingb is-l" cx="30" cy="17" rx="7" ry="10.5" transform="rotate(-22 30 17)" />
            <ellipse className="zf-wingb is-r" cx="40" cy="18" rx="6" ry="9" transform="rotate(24 40 18)" />
            <path className="zf-night" d="M51 33 L57.6 35 L51 37.4 Z" />
            <ellipse className="zf-gold" cx="35" cy="35" rx="16" ry="12.5" />
            <path className="zf-night zf-ns" d="M30.6 23.2 Q26.4 35 30.6 46.8 L36 47.4 Q31.6 35 36 22.6 Z M41.4 24 Q38 35 41.4 46 L45.6 43.6 Q43 35 45.6 26.4 Z" />
            <ellipse className="zf-rim" cx="35" cy="35" rx="16" ry="12.5" />
            <circle className="zf-gold" cx="15.5" cy="33" r="9.5" />
            <path className="zf-cord is-dark" d="M12 24.4 Q10 18 6.4 17 M17.6 24 Q19 17.6 22.6 15.6" />
            <circle className="zf-night zf-ns" cx="6.4" cy="17" r="1.8" />
            <circle className="zf-night zf-ns" cx="22.6" cy="15.6" r="1.8" />
            <circle className="zf-eye" cx="12.6" cy="31.4" r="1.4" />
            <ellipse className="zf-pink zf-ns" cx="10" cy="35.6" rx="2.2" ry="1.4" />
            <path className="zf-mouth" d="M11.4 37.4 Q14 39.6 16.6 37.2" />
        </g>
    </svg>,
    zomer: <svg viewBox="0 0 60 60" className="zf-art">
        <g className="zf-ball">
            <circle className="zf-white" cx="30" cy="30" r="24" />
            <path className="zf-red zf-ns" d="M30 6 A24 24 0 0 0 30 54 C15 44 15 16 30 6 Z" />
            <path className="zf-gold zf-ns" d="M30 6 C15 16 15 44 30 54 C23 44 23 16 30 6 Z" />
            <path className="zf-blue zf-ns" d="M30 6 A24 24 0 0 1 30 54 C45 44 45 16 30 6 Z" />
            <path className="zf-green zf-ns" d="M30 6 C45 16 45 44 30 54 C37 44 37 16 30 6 Z" />
            <path className="zf-seam" d="M30 6 C15 16 15 44 30 54 M30 6 C23 16 23 44 30 54 M30 6 C45 16 45 44 30 54 M30 6 C37 16 37 44 30 54" />
            <circle className="zf-rim" cx="30" cy="30" r="24" />
            <path className="zf-shine" d="M13 23 Q15.6 14.4 23 11" />
        </g>
    </svg>,
};

// ── The band behind the tiles ───────────────────────────────────────────────
const DRIFT_ART: Record<DriftKind, ReactNode> = {
    confetti: null,
    petal: null,
    heart: <svg viewBox="0 0 24 24"><path d={HEART} /></svg>,
    glint: <svg viewBox="0 0 24 24"><path d={STAR} /></svg>,
};

// Valentijn's trick: a few small hearts rising from the toy (px out, px up, ms late).
const PUFF: readonly [number, number, number][] = [[-20, -34, 0], [-8, -46, 90], [6, -40, 40], [18, -30, 130], [0, -24, 200]];

// The toy's last tap: how many so far, whether it still plays, and where the toy sits in the strip (px).
export interface Trick { n: number; on: boolean; x: number; y: number }

/** The band behind the tiles: the season's particles, and the toy's trick when it reaches the strip. */
export function SeasonBand({ season, seed, trick }: { season: Season; seed: number; trick: Trick }) {
    const spec = BAND[season];
    const drifts = spec.drift ? driftLayout(spec.drift, seed) : [];
    const eggs = spec.eggs ? eggLayout(spec.eggs, seed) : [];
    const kind = spec.drift?.kind;
    const at = { left: trick.x, top: trick.y };
    return (
        <div className={`zf-band${trick.on ? ' is-trick' : ''}`} aria-hidden>
            {spec.web && (
                <svg className="zf-web" viewBox="0 0 40 40">
                    <path d="M0 0 L40 6 M0 0 L30 24 M0 0 L8 40 M0 0 L22 36 M10 1.5 Q8 6 2 8 M20 3 Q17 12 4 16 M30 4.5 Q26 18 6 24" />
                </svg>
            )}
            {spec.snow && <Snow density={spec.snow} full size={[4, 8]} fall={[5, 9]} seed={seed % 997} />}
            {kind && drifts.map(d => (
                <span key={d.key} className={`zf-drift is-${kind}`}
                    style={{ left: `${d.left}%`, top: kind === 'glint' ? `${d.top}%` : undefined, animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` } as CSSProperties}>
                    <i className={`zf-p is-tone-${d.tone}`} style={{ width: d.size, height: d.size, '--sway': `${d.sway}px`, '--rot': `${d.rot}deg`, animationDelay: `${d.delay}s` } as CSSProperties}>
                        {DRIFT_ART[kind]}
                    </i>
                </span>
            ))}
            {eggs.map(e => (
                <i key={e.key} className={`zf-peek is-tone-${e.tone}`}
                    style={{ left: `${e.left}%`, width: e.size, height: e.size * 1.3, '--rot': `${e.rot}deg`, animationDuration: `${e.dur}s`, animationDelay: `${e.delay}s` } as CSSProperties} />
            ))}
            {spec.cross === 'bat' && <span className="zf-cross is-bat"><i><svg viewBox="0 0 60 60" className="zf-art"><Bat /></svg></i></span>}
            {spec.cross === 'nuts' && (
                <span className="zf-cross is-nuts">{[0, 1, 2].map(i => <i key={i} className="zf-nut" style={{ left: i * 16, animationDelay: `${-i * 0.18}s` }} />)}</span>
            )}
            {trick.n > 0 && season === 'carnaval' && <Burst key={trick.n} kind="pieces" x={at.left} y={at.top} spread={40} count={14} seed={trick.n} />}
            {trick.n > 0 && season === 'sinterklaas' && (
                <Burst key={trick.n} kind="pieces" className="zf-nuts" x={at.left} y={at.top} spread={34} count={9} seed={trick.n} color="var(--zf-nut)" />
            )}
            {trick.n > 0 && season === 'valentijn' && (
                <span key={trick.n} className="zf-puff" style={at}>
                    {PUFF.map(([dx, dy, ms]) => (
                        <i key={dx} style={{ '--dx': `${dx}px`, '--dy': `${dy}px`, animationDelay: `${ms}ms` } as CSSProperties}><svg viewBox="0 0 24 24"><path d={HEART} /></svg></i>
                    ))}
                </span>
            )}
        </div>
    );
}
