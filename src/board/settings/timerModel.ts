import type { BoardWidget } from '../boardTypes';
import { bool, color, num, numList, oneOf, readProps, type ModelOf } from './propSchema';
import { TONES } from './tones';

// Defaults reproduce the pre-settings timer: green pie, mm:ss, flashes at zero, silent,
// duration set in the panel only.
export const TIMER_GREEN = '#16a34a';
export const TIMER_SCHEMA = {
    durationSec: num(300, 5, 5999, true),
    color: color(''),                                     // '' = accent, else TIMER_GREEN
    presets: numList([1, 2, 5, 10, 15], 0.25, 99, 12),   // minutes, teacher-editable quick picks
    showPresets: bool(false),                             // the quick picks also on the card
    inputMode: oneOf('paneel', ['paneel', 'draaien', 'toetsen'] as const),
    progress: oneOf('taart', ['taart', 'ring', 'balk', 'zandloper'] as const),
    warnEnabled: bool(false),                             // colour switches near the end
    warnSec: num(60, 5, 3600, true),
    warnColor: color('#dc2626'),
    endSound: oneOf('geen', ['geen', ...TONES] as const),
    endRepeat: num(1, 1, 5, true),
    flashOnEnd: bool(true),
    display: oneOf('mmss', ['mmss', 'minuten', 'geen'] as const),
    autoRestart: bool(false),
    allowPause: bool(true),
};
export type TimerModel = ModelOf<typeof TIMER_SCHEMA>;
export const TIMER_CONTENT_KEYS = [] as const;

export const timerProps = (w: BoardWidget): TimerModel => readProps(TIMER_SCHEMA, w.props);

export function formatRemaining(sec: number, display: TimerModel['display']): string {
    const s = Math.max(0, Math.round(sec));
    if (display === 'geen') return '';
    // Minutes-only rounds UP: "1 min" stays until the last minute really starts.
    if (display === 'minuten') return s > 60 ? `${Math.ceil(s / 60)} min` : `${s} s`;
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export const presetLabel = (min: number) => (min < 1 ? `${Math.round(min * 60)} s` : `${min} min`);
