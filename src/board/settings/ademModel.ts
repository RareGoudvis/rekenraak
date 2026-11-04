import type { BoardWidget } from '../boardTypes';
import { bool, color, num, oneOf, readProps, text, type ModelOf } from './propSchema';

// Defaults reproduce the pre-settings breathing guide: 4-4-4 circle in sky blue, endless,
// Dutch guide text, silent.
export const ADEM_COLOR = '#0ea5e9';
export const ADEM_SCHEMA = {
    inSec: num(4, 1, 20),
    holdSec: num(4, 0, 20),                 // hold after breathing in
    outSec: num(4, 1, 20),
    holdOutSec: num(0, 0, 20),              // hold after breathing out (box breathing = 4-4-4-4)
    cycles: num(0, 0, 50, true),            // 0 = endless
    shape: oneOf('cirkel', ['cirkel', 'vierkant', 'bloem'] as const),
    color: color(''),                       // '' = accent, else ADEM_COLOR
    guideText: bool(true),
    labelIn: text('Adem in…', 40),
    labelHold: text('Houd vast…', 40),
    labelOut: text('Adem uit…', 40),
    soundCue: bool(false),                  // soft tone at every phase change
    speed: num(1, 0.5, 2),                  // >1 = every phase shorter
};
export type AdemModel = ModelOf<typeof ADEM_SCHEMA>;
export const ADEM_CONTENT_KEYS = [] as const;

export const ademProps = (w: BoardWidget): AdemModel => readProps(ADEM_SCHEMA, w.props);

export type AdemPhase = 'in' | 'vast' | 'uit' | 'leeg';

// The phase after `phase`, skipping zero-length holds; `wraps` = a full breath just ended.
export function nextAdemPhase(phase: AdemPhase, p: AdemModel): { phase: AdemPhase; wraps: boolean } {
    if (phase === 'in') return { phase: p.holdSec > 0 ? 'vast' : 'uit', wraps: false };
    if (phase === 'vast') return { phase: 'uit', wraps: false };
    if (phase === 'uit') return p.holdOutSec > 0 ? { phase: 'leeg', wraps: false } : { phase: 'in', wraps: true };
    return { phase: 'in', wraps: true };
}

export function ademPhaseSec(phase: AdemPhase, p: AdemModel): number {
    const s = phase === 'in' ? p.inSec : phase === 'vast' ? p.holdSec : phase === 'uit' ? p.outSec : p.holdOutSec;
    return s / p.speed;
}
