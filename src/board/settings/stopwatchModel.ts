import type { BoardWidget } from '../boardTypes';
import { bool, num, numList, oneOf, readProps, type ModelOf } from './propSchema';
import { TONES } from './tones';

// Defaults reproduce the pre-settings stopwatch: mm:ss.t counting up, black digits, no sound.
// Digit colour = the baseline accentkleur (props.accent).
export const STOPWATCH_SCHEMA = {
    precision: oneOf('tienden', ['seconden', 'tienden', 'honderdsten'] as const),
    direction: oneOf('op', ['op', 'af'] as const),
    fromSec: num(60, 1, 5999, true),          // start value when counting down
    bigDigits: bool(false),                    // digits fill the card, controls shrink
    soundAtStop: bool(false),
    tone: oneOf('piep', TONES),
    spaceKey: bool(false),                     // space bar = start/stop while the board has focus
    autoStart: bool(false),                    // starts running as soon as the card mounts
    showLaps: bool(false),
    laps: numList([], 0, 1e9, 99),             // lap split times in ms (content, not a setting)
};
export type StopwatchModel = ModelOf<typeof STOPWATCH_SCHEMA>;
export const STOPWATCH_CONTENT_KEYS = ['laps'] as const;

export const stopwatchProps = (w: BoardWidget): StopwatchModel => readProps(STOPWATCH_SCHEMA, w.props);

export function formatElapsed(ms: number, precision: StopwatchModel['precision']): { main: string; sub: string } {
    const t = Math.max(0, ms);
    const mm = String(Math.floor(t / 60000)).padStart(2, '0');
    const ss = String(Math.floor(t / 1000) % 60).padStart(2, '0');
    const sub = precision === 'tienden' ? `.${Math.floor(t / 100) % 10}`
        : precision === 'honderdsten' ? `.${String(Math.floor(t / 10) % 100).padStart(2, '0')}` : '';
    return { main: `${mm}:${ss}`, sub };
}
