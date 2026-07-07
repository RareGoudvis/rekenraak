import type { ClockExercise, MathBlock } from '../../services/math/types';
import type { ClockType, ExerciseMode, HandChoice } from '../../services/clock/clockTypes';
import AnalogClockSVG from './AnalogClockSVG';

interface Props {
    ex: ClockExercise;
    block: MathBlock;
    showSolutions: boolean;
}

export default function ClockExerciseItem({ ex, block, showSolutions }: Props) {
    const clockType = (block.constraints.clockType || 'analoog') as ClockType;
    const exerciseMode = (block.constraints.exerciseMode || 'lezen') as ExerciseMode;
    const is24hour = block.constraints.is24hour || false;
    const handChoice = (block.constraints.handChoice || 'beide') as HandChoice;

    const clock = (showH: boolean, showM: boolean) => (
        <AnalogClockSVG hours={ex.hours} minutes={ex.minutes} showHourHand={showH} showMinuteHand={showM} is24hour={is24hour} size={110} />
    );

    const digitalBox = (
        <div style={{ border: '2px solid #000', padding: '5px 10px', fontFamily: 'Azeret Mono, monospace', fontSize: '18px', fontWeight: 'normal', letterSpacing: '3px' }}>
            {ex.digitalText}
        </div>
    );

    const timeLabel = (
        <span style={{ fontSize: '13px', fontWeight: 'normal', fontFamily: 'Azeret Mono, monospace', textAlign: 'center' }}>
            {ex.timeText}
        </span>
    );

    const blankLine = <div style={{ borderBottom: '1.5px solid #000', width: '90%', height: '18px' }} />;
    const sol = (text: string) => <span style={{ color: '#e11d48', fontWeight: 'normal', fontSize: '12px' }}>{text}</span>;
    // Empty digital display for the pupil to fill in (matches the omzetten __:__ box).
    const emptyDigitalBox = (
        <div style={{ border: '2px solid #000', width: '65px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Azeret Mono, monospace', fontSize: '16px', letterSpacing: '2px', color: showSolutions ? '#e11d48' : '#aaa' }}>
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
                        ? sol(ex.digitalText)
                        : <div style={{ border: '1.5px solid #000', width: '65px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Azeret Mono, monospace', fontSize: '12px', color: '#aaa' }}>__:__</div>
                    }
                </>
            );
        } else {
            inner = <>{digitalBox}{showSolutions ? sol(ex.timeText) : blankLine}</>;
        }
    }

    return (
        <div className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '8px', boxSizing: 'border-box' }}>
            {inner}
        </div>
    );
}
