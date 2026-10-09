import type { BoardWidget } from '../boardTypes';
import { bool, color, custom, isHex, num, oneOf, readProps, type ModelOf } from './propSchema';
import { TONES } from './tones';

export interface PosterLevel { title: string; desc: string; color: string; }

// The owner's classroom noise poster (levels 0-4), the default rows of the poster mode.
export const DEFAULT_POSTER_LEVELS: PosterLevel[] = [
    { title: 'Stilte', desc: 'Muisstil: iedereen is stil.', color: '#facc15' },
    { title: 'Fluisterstem', desc: 'Fluisteren: één persoon kan je horen.', color: '#4ade80' },
    { title: 'Groepjesstem', desc: 'Enkel jouw groepje kan je horen.', color: '#38bdf8' },
    { title: 'Klasstem', desc: 'Gewone stem bij klasopdrachten.', color: '#fb923c' },
    { title: 'Luide stem', desc: 'Deze kan je gebruiken bij presentaties.', color: '#ef4444' },
];
export const MAX_POSTER_LEVELS = 8;

const parseLevels = (v: unknown): PosterLevel[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const rows = v.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
        .map(r => ({
            title: typeof r.title === 'string' ? r.title.slice(0, 60) : '',
            desc: typeof r.desc === 'string' ? r.desc.slice(0, 160) : '',
            color: isHex(r.color) ? r.color : '#e5e7eb',
        }))
        .slice(0, MAX_POSTER_LEVELS);
    return rows.length ? rows : undefined;
};

// Defaults reproduce the pre-settings widget: the tap-a-level poster. 'meter' listens to the
// microphone (nothing is recorded or sent; the level is computed live in the browser).
export const GELUID_SCHEMA = {
    mode: oneOf('poster', ['poster', 'meter'] as const),
    level: num(0, 0, MAX_POSTER_LEVELS - 1, true),        // poster: the active row (content)
    posterLevels: custom<PosterLevel[]>(DEFAULT_POSTER_LEVELS, parseLevels),
    showDesc: bool(true),
    sensitivity: num(5, 1, 10, true),                     // meter: mic gain
    warnAt: num(50, 5, 95, true),                         // meter: % where orange starts
    alarmAt: num(75, 10, 100, true),                      // meter: % where red starts
    display: oneOf('balk', ['balk', 'verkeerslicht', 'smiley'] as const),
    quietColor: color('#22c55e'),
    warnColor: color('#f59e0b'),
    alarmColor: color('#ef4444'),
    peakHold: bool(true),
    alarmSound: bool(false),
    alarmTone: oneOf('piep', TONES),
    alarmFlash: bool(true),
    muted: bool(false),                                   // visual only: never a sound
    calibration: num(0, 0, 80),                           // room noise floor subtracted from the level
};
export type GeluidModel = ModelOf<typeof GELUID_SCHEMA>;
export const GELUID_CONTENT_KEYS = ['level'] as const;

export function geluidProps(w: BoardWidget): GeluidModel {
    const m = readProps(GELUID_SCHEMA, w.props);
    // A crossed pair (warn above alarm) would make red unreachable; keep orange below red.
    if (m.warnAt >= m.alarmAt) m.warnAt = Math.max(5, m.alarmAt - 5);
    m.level = Math.min(m.level, m.posterLevels.length - 1);
    return m;
}

export type Band = 'stil' | 'let-op' | 'te-luid';
export const bandOf = (level: number, m: GeluidModel): Band =>
    level >= m.alarmAt ? 'te-luid' : level >= m.warnAt ? 'let-op' : 'stil';
export const bandColor = (b: Band, m: GeluidModel) =>
    b === 'te-luid' ? m.alarmColor : b === 'let-op' ? m.warnColor : m.quietColor;

// RMS (0..1) → 0..100: a 60 dB window whose floor slides with the sensitivity (5 = -60 dBFS).
export function rmsToLevel(rms: number, sensitivity: number, calibration = 0): number {
    if (rms <= 0) return 0;
    const db = 20 * Math.log10(rms);
    const floor = -60 - (sensitivity - 5) * 4;
    const raw = ((db - floor) / -floor) * 100;
    const out = raw - calibration;
    return Math.max(0, Math.min(100, out));
}
