// ============================================================================
// CLOCK EXERCISE TYPES & DUTCH TIME FORMATTING
// ============================================================================

export interface ClockExercise {
    id: string;
    hours: number;        // 1-12 (12h mode) or 0-23 (24h mode)
    minutes: number;      // 0-59
    timeText: string;     // Dutch: "kwart over 3", "25 voor 1"
    digitalText: string;  // "03:15", "12:35"
    isManuallyEdited: boolean;
}

export type TimeCategory =
    | 'uren'          // on the hour
    | 'halve_uren'    // half hours (30 min)
    | 'kwartier_over' // 15 min past
    | 'kwartier_voor' // 45 min (15 before next)
    | 'nauwkeurig_5'  // to 5-minute precision
    | 'nauwkeurig_1'; // to 1-minute precision

export type MinuteDirection = 'over' | 'voor' | 'beide';
export type ClockType = 'analoog' | 'digitaal';
export type ExerciseMode = 'lezen' | 'tekenen' | 'omzetten';
export type HandChoice = 'uur' | 'minuut' | 'beide';

// ============================================================================
// TIME FORMATTING
// ============================================================================

export function formatTimeText(hours: number, minutes: number, is24hour: boolean): string {
    const displayHour = is24hour ? hours : hours; // 12h: caller passes 1-12 already
    // Next-hour reference for 'half/kwart voor/… voor'. In 24h keep it in 24h space
    // (23 → 24, never 0) so 23:30 reads "half 24", not the nonsensical "half 0".
    const nextHour = is24hour
        ? ((hours + 1) % 24 === 0 ? 24 : (hours + 1) % 24)
        : (hours === 12 ? 1 : hours + 1);

    if (minutes === 0) return `${displayHour} uur`;
    if (minutes === 15) return `kwart over ${displayHour}`;
    if (minutes === 30) return `half ${nextHour}`;
    if (minutes === 45) return `kwart voor ${nextHour}`;
    if (minutes < 30) return `${minutes} over ${displayHour}`;
    return `${60 - minutes} voor ${nextHour}`;
}

export function formatDigitalTime(hours: number, minutes: number): string {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
