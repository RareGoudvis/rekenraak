import type { SkinChoices } from '../types';

// Kasteel (1 player): your castle against the computer's. Pure, so the tuning is testable. Time is play time:
// "Hoe los ik dit op?" pauses it (and every stone in the air). A stone does its damage when it lands.

export type KasteelLevel = 'normaal' | 'moeilijk';
// me = the pupil's castle (left), foe = the computer's (right).
export type Who = 'me' | 'foe';

// THE tuning table. Checked with a simulated L2 pupil (an answer every 6–8 s, 80 % right, kasteel.test):
// with 20 lives Normaal wins about 90 % of rounds, Moeilijk a little over half (tight).
export const KASTEEL = {
    lives: [10, 20, 30],
    livesDefault: 20,
    // Every this many right in a row (help not counted) launches a big stone.
    bigEvery: 5,
    damage: { stone: 1, big: 2, foe: 1 },
    // The computer's clock: its first shot after firstMs of play, then one every everyMs.
    levels: {
        normaal: { firstMs: 25_000, everyMs: 15_000 },
        moeilijk: { firstMs: 20_000, everyMs: 10_000 },
    },
    // A stone's flight.
    flightMs: 900,
    // A castle at 0 crumbles this long before the round ends.
    endMs: 2200,
    // The hidden question cap: every answer costs one castle a life, so 2 × 30 lives ends well before it.
    cap: 90,
    // 2 players: the time limit per life (20 lives = 5 minutes); then the castle with more lives left wins.
    duelSecondsPerLife: 15,
} as const;

export interface Shot { id: number; by: Who; big: boolean; lands: number }

export interface Siege {
    lives: number;
    mine: number;
    theirs: number;
    // Play time in ms (help excluded).
    t: number;
    // Clock shots the computer has fired.
    clock: number;
    // Stones in the air.
    shots: Shot[];
    next: number;
    // A castle reached 0: who won, and when (play time).
    over: { winner: Who; at: number } | null;
}

export const levelOf = (o: SkinChoices): KasteelLevel => (o.niveau === 'moeilijk' ? 'moeilijk' : 'normaal');

export function livesOf(o: SkinChoices): number {
    const n = Number(o.levens);
    return (KASTEEL.lives as readonly number[]).includes(n) ? n : KASTEEL.livesDefault;
}

export const siegeOf = (lives: number): Siege => ({ lives, mine: lives, theirs: lives, t: 0, clock: 0, shots: [], next: 1, over: null });

/** A right answer's stone: big on every bigEvery-th in a row, never for an answer met hulp. */
export const isBig = (streak: number, helped: boolean) => !helped && streak > 0 && streak % KASTEEL.bigEvery === 0;

export const damageOf = (s: Pick<Shot, 'by' | 'big'>) => (s.by === 'foe' ? KASTEEL.damage.foe : s.big ? KASTEEL.damage.big : KASTEEL.damage.stone);

/** Play time of the computer's n-th clock shot (0-based). */
export const clockShotAt = (level: KasteelLevel, n: number) => KASTEEL.levels[level].firstMs + n * KASTEEL.levels[level].everyMs;

/** A stone leaves now (a right answer: by me; a mistake: by the foe). Nothing once a castle is down. */
export function launch(s: Siege, by: Who, big = false, flightMs: number = KASTEEL.flightMs): Siege {
    if (s.over) return s;
    return { ...s, shots: [...s.shots, { id: s.next, by, big: by === 'me' && big, lands: s.t + flightMs }], next: s.next + 1 };
}

export interface SiegeStep { siege: Siege; fired: Shot[]; landed: Shot[] }

/** Play time moves on by dt: the computer's clock shots leave, stones land (in order) and do their damage. */
export function advance(s: Siege, level: KasteelLevel, dt: number, flightMs: number = KASTEEL.flightMs): SiegeStep {
    if (dt <= 0) return { siege: s, fired: [], landed: [] };
    const t = s.t + dt;
    // Down: only the crumbling time runs on.
    if (s.over) return { siege: { ...s, t }, fired: [], landed: [] };
    let { clock, next } = s;
    const shots = [...s.shots];
    const fired: Shot[] = [];
    for (let at = clockShotAt(level, clock); at <= t; at = clockShotAt(level, clock)) {
        const shot: Shot = { id: next++, by: 'foe', big: false, lands: at + flightMs };
        shots.push(shot);
        fired.push(shot);
        clock++;
    }
    let { mine, theirs } = s;
    let over: Siege['over'] = null;
    const landed: Shot[] = [];
    for (const shot of shots.filter(x => x.lands <= t).sort((a, b) => a.lands - b.lands)) {
        landed.push(shot);
        if (shot.by === 'me') theirs = Math.max(0, theirs - damageOf(shot));
        else mine = Math.max(0, mine - damageOf(shot));
        if (theirs === 0 || mine === 0) { over = { winner: theirs === 0 ? 'me' : 'foe', at: shot.lands }; break; }
    }
    return { siege: { ...s, t, clock, next, mine, theirs, over, shots: over ? [] : shots.filter(x => x.lands > t) }, fired, landed };
}

/** The castle is down and has crumbled long enough: time to end the round. */
export const endDue = (s: Siege) => !!s.over && s.t >= s.over.at + KASTEEL.endMs;
