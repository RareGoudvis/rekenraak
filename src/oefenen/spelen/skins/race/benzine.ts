// Benzine: the race without a finish. Three jerrycans are the lives; a counted mistake costs one, the last one
// gone = the car sputters to a stop (the friendly early end). Petrol stations after 10 answers, each next gap 5 longer
// (10, 25, 45, 70, 100, …): the car pulls in, "Maak je klaar!", one timed sum, right fills all cans again. Pure and
// time-driven (ms), so the whole state machine is testable without a browser.

export const FUEL = {
    cans: 3,
    // The first station after this many answers; each next gap `grow` longer (owner 2026-11-15: 10, 25, 45, 70, 100, …).
    first: 10,
    grow: 5,
    // Pulling in (the car glides to the pump), then "Maak je klaar!", then the timed sum.
    pullMs: 1500,
    readyMs: 1000,
    // 12 s: a leerjaar 1 pupil types a two-digit answer in time, and it still feels like a hurry.
    askMs: 12_000,
    // The fuel flowing in, and the car rolling to a stop on an empty tank.
    refillMs: 1600,
    sputterMs: 1800,
    // After the stop, a moment to see it before the end screen.
    emptyMs: 1200,
} as const;

// drive = on the road; pull → ready → ask = the station; refill = the cans filling (driving on);
// sputter → empty = out of fuel (the round ends after empty).
export type FuelPhase = 'drive' | 'pull' | 'ready' | 'ask' | 'refill' | 'sputter' | 'empty';

export interface Fuel {
    cans: number;
    phase: FuelPhase;
    // Ms spent in this phase (the loop adds only unpaused time).
    ms: number;
    // Stations reached, and how many of them filled the cans.
    stations: number;
    refills: number;
    // How the last station ended (the badge): null while none ended yet.
    lastStation: 'vol' | 'mis' | 'laat' | null;
}

export const startFuel = (): Fuel => ({ cans: FUEL.cans, phase: 'drive', ms: 0, stations: 0, refills: 0, lastStation: null });

/** The answer count after which station k (0-based) comes: 10, 25, 45, 70, 100, … (gaps 10, 15, 20, …). */
export const stationAfter = (k: number) => FUEL.first * (k + 1) + FUEL.grow * k * (k + 1) / 2;

/** Which station this answer count is (0-based), or -1 when it is none. */
export function stationIndex(answered: number): number {
    for (let k = 0; stationAfter(k) <= answered; k++) if (stationAfter(k) === answered) return k;
    return -1;
}

/** The question with this index (= answers before it) is a station question. */
export const isStationQuestion = (index: number) => stationIndex(index) >= 0;

/** How far to the next station: the answers since the last one, out of the gap (the HUD's little bar). */
export function stationProgress(answered: number): { done: number; of: number } {
    let k = 0;
    while (stationAfter(k) <= answered) k++;
    const from = k === 0 ? 0 : stationAfter(k - 1);
    return { done: answered - from, of: stationAfter(k) - from };
}

const to = (f: Fuel, phase: FuelPhase, patch: Partial<Fuel> = {}): Fuel => ({ ...f, ...patch, phase, ms: 0 });

/** A station question is on screen: pull in (only from the road; never while the tank runs out). */
export const fuelStation = (f: Fuel): Fuel => (f.phase === 'drive' || f.phase === 'refill' ? to(f, 'pull', { stations: f.stations + 1 }) : f);

/** Time passes (unpaused ms): pull → ready → ask, refill → drive, sputter → empty. ask waits for an answer or the miss. */
export function fuelTick(f: Fuel, dtMs: number): Fuel {
    const ms = f.ms + Math.max(0, dtMs);
    if (f.phase === 'pull' && ms >= FUEL.pullMs) return to(f, 'ready');
    if (f.phase === 'ready' && ms >= FUEL.readyMs) return to(f, 'ask');
    if (f.phase === 'refill' && ms >= FUEL.refillMs) return to(f, 'drive');
    if (f.phase === 'sputter' && ms >= FUEL.sputterMs) return to(f, 'empty');
    return { ...f, ms };
}

/** What is left of the station's timed sum (ms); 0 outside ask once it ran out. */
export const askLeft = (f: Fuel) => (f.phase === 'ask' ? Math.max(0, FUEL.askMs - f.ms) : FUEL.askMs);

/** The keypad takes an answer: on the road and at the pump's timed sum, not while pulling in or running dry. */
export const fuelTakesAnswers = (f: Fuel) => f.phase === 'drive' || f.phase === 'refill' || f.phase === 'ask';

/** A right answer: at the pump all cans full again. */
export const fuelRight = (f: Fuel): Fuel =>
    f.phase === 'ask' ? to(f, 'refill', { cans: FUEL.cans, refills: f.refills + 1, lastStation: 'vol' }) : f;

/** A wrong answer (late = the station's time ran out). At the pump: no refill, drive on. On the road a counted one
 *  costs a can (met hulp costs nothing); the last can gone = sputter. */
export function fuelWrong(f: Fuel, counted: boolean, late = false): Fuel {
    if (f.phase === 'ask') return to(f, 'drive', { lastStation: late ? 'laat' : 'mis' });
    if (!counted || (f.phase !== 'drive' && f.phase !== 'refill')) return f;
    const cans = Math.max(0, f.cans - 1);
    return cans === 0 ? to(f, 'sputter', { cans }) : { ...f, cans };
}

/** The car stands still at the pump or with an empty tank. */
export const fuelHoldsCar = (f: Fuel) => f.phase === 'ready' || f.phase === 'ask' || f.phase === 'empty';

/** "1,25 km": metres as kilometres with two decimals (Flemish comma). */
export const formatKm = (m: number) => `${(Math.max(0, Math.floor(m / 10)) / 100).toFixed(2).replace('.', ',')} km`;
