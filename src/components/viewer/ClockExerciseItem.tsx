import type { ClockExercise, MathBlock } from '../../services/math/types';
import type { ClockType, ExerciseMode, HandChoice } from '../../services/clock/clockTypes';
import AnalogClockSVG from './AnalogClockSVG';
import type { ClockConstraints } from '../../services/math/constraintTypes';
import { solutionText } from './solutionStyle';

interface Props {
    ex: ClockExercise;
    block: MathBlock;
    showSolutions: boolean;
}

// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text), not fixed px

// 13pt (the --sheet-size-math default) is 17.33 CSS px, so `px / 17.33` turns yesterday's
// fixed pixel geometry into a token factor that reproduces it exactly at the default slider.
// SYNC: same divisor in every viewer that scales an SVG figure.
const PX_PER_EM_AT_DEFAULT = 17.33;
const mathPx = (px: number) => `calc(var(--sheet-size-math) * ${(px / PX_PER_EM_AT_DEFAULT).toFixed(3)})`;

export default function ClockExerciseItem({ ex, block, showSolutions }: Props) {
    const c = block.constraints as ClockConstraints;
    // Own data: an exercise renders under the mode/clock-type/24h/hand it was generated
    // with, not whatever the block's settings drift to before Genereer runs again.
    const clockType = (ex.clockType ?? c.clockType ?? 'analoog') as ClockType;
    const exerciseMode = (ex.exerciseMode ?? c.exerciseMode ?? 'lezen') as ExerciseMode;
    const is24hour = ex.is24hour ?? c.is24hour ?? false;
    const handChoice = (ex.handChoice ?? c.handChoice ?? 'beide') as HandChoice;

    const clock = (showH: boolean, showM: boolean) => (
        <AnalogClockSVG hours={ex.hours} minutes={ex.minutes} showHourHand={showH} showMinuteHand={showM} is24hour={is24hour} size={110} />
    );

    const digitalBox = (
        <div style={{ border: '2px solid #000', padding: '5px 10px', fontFamily: 'Azeret Mono, monospace', fontSize: 'calc(var(--sheet-size-math) * 1.04)', fontWeight: 'normal', letterSpacing: '3px' }}>
            {ex.digitalText}
        </div>
    );

    const timeLabel = (
        <span style={{ fontSize: 'calc(var(--sheet-size-text) * 0.65)', fontWeight: 'normal', fontFamily: 'Azeret Mono, monospace', textAlign: 'center' }}>
            {ex.timeText}
        </span>
    );

    const blankLine = <div style={{ borderBottom: '1.5px solid #000', width: '90%', height: mathPx(18) }} />;
    // isMath: digitalText ("03:15") reads as math, timeText ("kwart over 3") reads as words
    const sol = (text: string, isMath = false) => (
        <span style={{ ...solutionText, fontSize: isMath ? 'calc(var(--sheet-size-math) * 0.7)' : 'calc(var(--sheet-size-text) * 0.6)' }}>{text}</span>
    );
    // Empty digital display for the pupil to fill in (matches the omzetten __:__ box).
    const emptyDigitalBox = (
        <div style={{ border: '2px solid #000', width: mathPx(65), height: mathPx(32), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Azeret Mono, monospace', fontSize: 'calc(var(--sheet-size-math) * 0.92)', letterSpacing: '2px', ...(showSolutions ? solutionText : { color: '#aaa' }) }}>
            {showSolutions ? ex.digitalText : '__:__'}
        </div>
    );

    let inner: React.ReactNode;

    if (exerciseMode === 'tekenen') {
        if (clockType === 'digitaal') {
            // Digitaal + tekenen = "tijd in woorden → digitale klok invullen": show the
            // time in words as the prompt and an EMPTY digital box to complete (was showing
            // the filled answer box + an analog clock — that's the omzetten exercise).
            inner = <>{timeLabel}{emptyDigitalBox}</>;
        } else {
            let showH = showSolutions, showM = showSolutions;
            if (!showSolutions) {
                showH = handChoice === 'minuut';
                showM = handChoice === 'uur';
            }
            inner = <>{timeLabel}{clock(showH, showM)}</>;
        }
    } else if (exerciseMode === 'lezen') {
        const display = clockType === 'analoog' ? clock(true, true) : digitalBox;
        inner = <>{display}{showSolutions ? sol(ex.timeText) : blankLine}</>;
    } else {
        if (clockType === 'analoog') {
            inner = (
                <>
                    {clock(true, true)}
                    {showSolutions
                        ? sol(ex.digitalText, true)
                        : <div style={{ border: '1.5px solid #000', width: mathPx(65), height: mathPx(28), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Azeret Mono, monospace', fontSize: 'calc(var(--sheet-size-math) * 0.7)', color: '#aaa' }}>__:__</div>
                    }
                </>
            );
        } else {
            inner = <>{digitalBox}{showSolutions ? sol(ex.timeText) : blankLine}</>;
        }
    }

    return (
        // fontSize here is the em base the clock SVG sizes itself against, so the face follows
        // the Lettergrootte slider; the DOM text inside keeps its own calc(token * f) sizes.
        <div className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '8px', boxSizing: 'border-box', fontSize: 'var(--sheet-size-math)' }}>
            {inner}
        </div>
    );
}
