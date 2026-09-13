import type { MathBlock } from '../math/types';
import type { ClockExercise, TimeCategory, MinuteDirection, ClockType, ExerciseMode, HandChoice } from './clockTypes';
import { formatTimeText, formatDigitalTime } from './clockTypes';
import type { ClockConstraints } from '../math/constraintTypes';

export function generateClockExercises(block: MathBlock): ClockExercise[] {
    const { numberOfExercises } = block;
    const {
        clockType = 'analoog' as ClockType,
        exerciseMode = 'lezen' as ExerciseMode,
        is24hour = false,
        // Match the registry/config default so a block built without merged defaults
        // isn't silently restricted to whole hours only.
        timeTypes = ['uren', 'halve_uren', 'kwartier_over', 'kwartier_voor'] as TimeCategory[],
        minuteDirection = 'beide' as MinuteDirection,
        handChoice = 'beide' as HandChoice,
    } = block.constraints as ClockConstraints;

    // Build the set of valid minutes from selected time categories
    const validMinutes = new Set<number>();

    if (timeTypes.includes('uren')) validMinutes.add(0);
    if (timeTypes.includes('halve_uren')) validMinutes.add(30);
    if (timeTypes.includes('kwartier_over')) validMinutes.add(15);
    if (timeTypes.includes('kwartier_voor')) validMinutes.add(45);

    if (timeTypes.includes('nauwkeurig_5')) {
        for (const m of [5, 10, 20, 25, 35, 40, 50, 55]) {
            if (minuteDirection === 'over' && m >= 30) continue;
            if (minuteDirection === 'voor' && m < 30) continue;
            validMinutes.add(m);
        }
    }

    if (timeTypes.includes('nauwkeurig_1')) {
        for (let m = 1; m <= 59; m++) {
            if (m % 5 === 0) continue; // covered by other categories
            if (minuteDirection === 'over' && m >= 30) continue;
            if (minuteDirection === 'voor' && m < 30) continue;
            validMinutes.add(m);
        }
    }

    if (validMinutes.size === 0) return [];

    // Build pool of all (hour, minute) pairs in the hour range
    const hourStart = is24hour ? 0 : 1;
    const hourCount = is24hour ? 24 : 12;
    const allTimes: { hours: number; minutes: number }[] = [];

    for (let h = hourStart; h < hourStart + hourCount; h++) {
        for (const m of validMinutes) {
            allTimes.push({ hours: h, minutes: m });
        }
    }

    // Shuffle and pick
    const shuffled = [...allTimes].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(numberOfExercises, shuffled.length));

    return selected.map(({ hours, minutes }) => ({
        id: Math.random().toString(36).substring(2, 9),
        hours,
        minutes,
        timeText: formatTimeText(hours, minutes, is24hour),
        digitalText: formatDigitalTime(hours, minutes),
        // Own data: a later mode/clock-type/handChoice drift must never change what an
        // already-generated exercise asks the pupil to do (see BUGS.md, stale settings).
        exerciseMode,
        clockType,
        is24hour,
        handChoice,
        isManuallyEdited: false,
    }));
}
