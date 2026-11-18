import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Leerjaar } from '../../config/gradePresets';
import { pickerToday } from '../spelen/seasons';
import { play, unlockSound } from '../spelen/sound';
import { CHICK_PEEP_MS, TOY_LABEL, TOY_SOUND, TRICK_MS, headerSeasonOf, headerSeed, wornTile } from './headerSeason';
import { SeasonBand, SeasonToyArt, SeasonWear, type Trick } from './SeasonHeader';

// The Zelf home's seasonal header, wired for the leerjaar bar: today's set (read once per visit), its band and hat,
// and the one toy that does a trick when tapped (a soft sound when game sound is on). Only the toy takes taps.

export interface SeasonHeaderFx {
    className: string;
    band: ReactNode;
    wornOn: Leerjaar;
    wear: ReactNode;
    toy: ReactNode;
}

/** The header's season for this visit (read once), with its band, hat and toy; null outside every season. */
export function useSeasonHeader(grade: Leerjaar | null, today?: Date): SeasonHeaderFx | null {
    const [{ season, seed }] = useState(() => {
        const at = today ?? pickerToday();
        return { season: headerSeasonOf(at), seed: headerSeed(at) };
    });
    const [trick, setTrick] = useState<Trick>({ n: 0, on: false, x: 0, y: 0 });
    const toyRef = useRef<HTMLButtonElement>(null);
    const timers = useRef<{ off?: number; peep?: number }>({});
    useEffect(() => {
        const t = timers.current;
        return () => { window.clearTimeout(t.off); window.clearTimeout(t.peep); };
    }, []);
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
        setTrick(p => ({ n: p.n + 1, on: true, x, y }));
        window.clearTimeout(t.off);
        t.off = window.setTimeout(() => setTrick(p => ({ ...p, on: false })), TRICK_MS[season]);
    };

    return {
        className: ` has-fx zf-${season}`,
        band: <SeasonBand season={season} seed={seed} trick={trick} />,
        wornOn: wornTile(grade, seed),
        wear: <SeasonWear season={season} />,
        toy: (
            <button ref={toyRef} type="button" className={`zf-toy is-${season}${trick.on ? ' is-trick' : ''}`} aria-label={TOY_LABEL[season]} onClick={tap}>
                {/* A fresh element per tap: the trick plays again from the start. */}
                <span key={trick.n} className="zf-toy-art" aria-hidden><SeasonToyArt season={season} /></span>
            </button>
        ),
    };
}
