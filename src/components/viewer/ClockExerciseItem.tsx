import type { ClockExercise, MathBlock } from '../../services/math/types';
import type { ClockType, ExerciseMode, HandChoice } from '../../services/clock/clockTypes';
import AnalogClockSVG from './AnalogClockSVG';
import type { ClockConstraints } from '../../services/math/constraintTypes';
import { SOL, solutionText } from './solutionStyle';
import { ANSWER_LINE_H, useShowScaffold } from './BlockWidthContext';
import { useViewerInteraction } from './ViewerInteractionContext';
import ClockDragFace from './ClockDragFace';

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
// The face's viewBox size on the sheet and on the kiosk card alike.
const CLOCK_SIZE = 110;
const mathPx = (px: number) => `calc(var(--sheet-size-math) * ${(px / PX_PER_EM_AT_DEFAULT).toFixed(3)})`;

export default function ClockExerciseItem({ ex, block, showSolutions }: Props) {
    const c = block.constraints as ClockConstraints;
    // Own data: an exercise renders under the mode/clock-type/24h/hand it was generated
    // with, not whatever the block's settings drift to before Genereer runs again.
    const clockType = (ex.clockType ?? c.clockType ?? 'analoog') as ClockType;
    const exerciseMode = (ex.exerciseMode ?? c.exerciseMode ?? 'lezen') as ExerciseMode;
    const is24hour = ex.is24hour ?? c.is24hour ?? false;
    const handChoice = (ex.handChoice ?? c.handChoice ?? 'beide') as HandChoice;
    // Oefenmodus: the pupil sets the hands on the card (kiosk only; null on the sheet).
    const ctx = useViewerInteraction();
    // Oefenmodus card: the time is typed as uu:mm, the line for it in words is not asked.
    const scaffold = useShowScaffold();

    const clock = (showH: boolean, showM: boolean, redH = false, redM = false) => (
        <AnalogClockSVG hours={ex.hours} minutes={ex.minutes} showHourHand={showH} showMinuteHand={showM} is24hour={is24hour} size={CLOCK_SIZE}
            hourHandColor={redH ? SOL : undefined} minuteHandColor={redM ? SOL : undefined} />
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

    const blankLine = scaffold ? <div style={{ borderBottom: '1.5px solid #000', width: '90%', height: ANSWER_LINE_H }} /> : null;
    // isMath: digitalText ("03:15") reads as math, timeText ("kwart over 3") reads as words
    // The key sits in the SAME slot the pupil writes in (the line for words, the __:__ box for digits), so it
    // lines up with the writing line instead of hugging the clock above it.
    const sol = (text: string, isMath = false) => (
        <div style={isMath
            ? { width: mathPx(65), height: mathPx(28), display: 'flex', alignItems: 'center', justifyContent: 'center' }
            : { width: '90%', height: ANSWER_LINE_H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <span style={{ ...solutionText, fontSize: isMath ? 'calc(var(--sheet-size-math) * 0.7)' : 'calc(var(--sheet-size-text) * 0.6)', lineHeight: 1.2, textAlign: 'center' }}>{text}</span>
        </div>
    );
    // Empty digital display for the pupil to fill in (matches the omzetten __:__ box).
    // 84x40 (was 65x32, owner review R3): the old box's edges sat too close to the digits
    // for a pupil to write inside — bigger so the box itself has margin, not just the text.
    const emptyDigitalBox = (
        <div style={{ border: '2px solid #000', width: mathPx(84), height: mathPx(40), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Azeret Mono, monospace', fontSize: 'calc(var(--sheet-size-math) * 0.92)', letterSpacing: '2px', ...(showSolutions ? solutionText : { color: '#aaa' }) }}>
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
        } else if (ctx?.kind === 'drag') {
            inner = <>{timeLabel}<ClockDragFace ex={ex} c={block.constraints as Record<string, unknown>} ctx={ctx} is24hour={is24hour} size={CLOCK_SIZE} /></>;
        } else {
            let showH = showSolutions, showM = showSolutions;
            if (!showSolutions) {
                showH = handChoice === 'minuut';
                showM = handChoice === 'uur';
            }
            // The key draws the asked hands red; a hand printed as a given stays black.
            inner = <>{timeLabel}{clock(showH, showM, showSolutions && handChoice !== 'minuut', showSolutions && handChoice !== 'uur')}</>;
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
