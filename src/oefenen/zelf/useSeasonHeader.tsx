import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { Leerjaar } from '../../config/gradePresets';
import { pickerToday } from '../spelen/seasons';
import { play, unlockSound } from '../spelen/sound';
import {
    CHICK_PEEP_MS, SCENE_MS, TOY_LABEL, TOY_SOUND, TRICK_MS, geoOr, headerSeasonOf, headerSeed, sceneAt, sceneCues, sceneWaits, wornTile,
    type SceneId, type StripGeo,
} from './headerSeason';
import { SeasonBand, SeasonBlush, SeasonToyArt, SeasonWear, type Trick } from './SeasonHeader';
import SeasonScene from './SeasonScenes';

// The Zelf home's seasonal header, wired for the leerjaar bar: today's set (read once per visit), its band and hat, a
// scene along the strip every 10 to 15 s, and the one toy whose tap plays a trick (a soft sound when game sound is on)
// and starts the next scene at once. Only the toy takes taps.

export interface SeasonHeaderFx {
    className: string;
    barRef: RefObject<HTMLElement | null>;
    band: ReactNode;
    // What a tile wears or shows: the hat on the worn tile, a blush when cupid's heart lands.
    tile(g: Leerjaar): ReactNode;
    toy: ReactNode;
}

// Enough waits for a long visit; after the last they start over.
const PLANNED_SCENES = 48;

/** The tiles' boxes in the strip's padding box (the band's frame), px. */
function measureStrip(bar: HTMLElement | null): StripGeo {
    if (!bar) return geoOr(null);
    const r = bar.getBoundingClientRect();
    const ox = r.left + bar.clientLeft, oy = r.top + bar.clientTop;
    const tiles = [...bar.querySelectorAll('.zelf-year')].map(el => {
        const t = el.getBoundingClientRect();
        return { x: t.left - ox, y: t.top - oy, w: t.width, h: t.height };
    });
    return geoOr({ w: bar.clientWidth, h: bar.clientHeight, tiles });
}

/** The header's season for this visit (read once), with its band, hat, scenes and toy; null outside every season. */
export function useSeasonHeader(grade: Leerjaar | null, today?: Date): SeasonHeaderFx | null {
    const [{ season, seed }] = useState(() => {
        const at = today ?? pickerToday();
        return { season: headerSeasonOf(at), seed: headerSeed(at) };
    });
    const [trick, setTrick] = useState<Trick>({ n: 0, on: false, x: 0, y: 0, s: 60 });
    const [scene, setScene] = useState<{ id: SceneId; n: number; geo: StripGeo } | null>(null);
    const [shiver, setShiver] = useState(false);
    const [blush, setBlush] = useState<Record<number, number>>({});
    const barRef = useRef<HTMLElement>(null);
    const toyRef = useRef<HTMLButtonElement>(null);
    const timers = useRef<{ off?: number; peep?: number }>({});
    // Starts the next scene now (a toy tap); set by the scheduler while it runs.
    const kick = useRef<(() => void) | null>(null);

    useEffect(() => {
        const t = timers.current;
        return () => { window.clearTimeout(t.off); window.clearTimeout(t.peep); };
    }, []);

    // The scenes: seeded waits, one at a time; each may set off tile reactions.
    useEffect(() => {
        if (!season) return;
        const waits = sceneWaits(seed, PLANNED_SCENES, season);
        const ids = new Set<number>();
        const later = (fn: () => void, ms: number) => { const id = window.setTimeout(() => { ids.delete(id); fn(); }, ms); ids.add(id); return id; };
        let i = 0, running = false, next = 0;
        const start = () => {
            const id = sceneAt(season, i);
            const geo = measureStrip(barRef.current);
            const sceneSeed = seed + i * 7919;
            running = true;
            setScene({ id, n: i, geo });
            for (const c of sceneCues(id, geo, sceneSeed)) {
                if (c.kind === 'shiver') { later(() => setShiver(true), c.at); later(() => setShiver(false), c.at + c.ms); }
                else if (c.tile !== undefined) {
                    const tile = c.tile;
                    later(() => setBlush(b => ({ ...b, [tile]: (b[tile] ?? 0) + 1 })), c.at);
                    later(() => setBlush(b => { const { [tile]: _gone, ...rest } = b; return rest; }), c.at + c.ms);
                }
            }
            later(() => { running = false; setScene(null); }, SCENE_MS[id]);
            i++;
            next = later(start, waits[i % waits.length]);
        };
        next = later(start, waits[0]);
        kick.current = () => {
            if (running) return;
            window.clearTimeout(next);
            ids.delete(next);
            start();
        };
        return () => { ids.forEach(id => window.clearTimeout(id)); kick.current = null; };
    }, [season, seed]);

    if (!season) return null;

    const tap = () => {
        unlockSound();
        play(TOY_SOUND[season]);
        const t = timers.current;
        window.clearTimeout(t.peep);
        if (season === 'pasen') t.peep = window.setTimeout(() => play('piep'), CHICK_PEEP_MS);
        // The toy's middle-top in the strip (its offset parent): where its confetti or hearts come from.
        const el = toyRef.current;
        const x = el ? el.offsetLeft + el.offsetWidth / 2 : 0;
        const y = el ? el.offsetTop + el.offsetHeight * 0.3 : 0;
        const s = el?.offsetWidth || 60;
        setTrick(p => ({ n: p.n + 1, on: true, x, y, s }));
        window.clearTimeout(t.off);
        t.off = window.setTimeout(() => setTrick(p => ({ ...p, on: false })), TRICK_MS[season]);
        kick.current?.();
    };

    const worn = wornTile(grade, seed);
    return {
        className: ` has-fx zf-${season}${shiver ? ' is-shiver' : ''}`,
        barRef,
        band: (
            <SeasonBand season={season} seed={seed} trick={trick}
                scene={scene && <SeasonScene key={scene.n} id={scene.id} geo={scene.geo} seed={seed + scene.n * 7919} santa={season === 'kerst'} />} />
        ),
        tile: g => <>
            {g === worn && <SeasonWear season={season} />}
            {blush[g - 1] ? <SeasonBlush key={blush[g - 1]} /> : null}
        </>,
        toy: (
            <button ref={toyRef} type="button" className={`zf-toy is-${season}${trick.on ? ' is-trick' : ''}`} aria-label={TOY_LABEL[season]} onClick={tap}>
                {/* A fresh element per tap: the trick plays again from the start. */}
                <span key={trick.n} className="zf-toy-art" aria-hidden><SeasonToyArt season={season} /></span>
            </button>
        ),
    };
}
