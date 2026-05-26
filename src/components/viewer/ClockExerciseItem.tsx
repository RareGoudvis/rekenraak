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
        <div style={{ border: '2px solid #000', padding: '5px 10px', fontFamily: 'Azeret Mono, monospace', fontSize: '18px', fontWeight: 'bold', letterSpacing: '3px' }}>
            {ex.digitalText}
        </div>
    );

    const timeLabel = (
        <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'Azeret Mono, monospace', textAlign: 'center' }}>
            {ex.timeText}
        </span>
    );

    const blankLine = <div style={{ borderBottom: '1.5px solid #000', width: '90%', height: '18px' }} />;
    const sol = (text: string) => <span style={{ color: '#e11d48', fontWeight: 'bold', fontSize: '12px' }}>{text}</span>;

    let inner: React.ReactNode;

    if (exerciseMode === 'tekenen') {
        let showH = showSolutions, showM = showSolutions;
        if (!showSolutions) {
            showH = handChoice === 'minuut';
            showM = handChoice === 'uur';
        }
        inner = <>{clockType === 'digitaal' ? digitalBox : timeLabel}{clock(showH, showM)}</>;
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '8px', boxSizing: 'border-box' }}>
            {inner}
        </div>
    );
}
