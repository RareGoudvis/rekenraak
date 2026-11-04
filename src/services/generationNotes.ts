// Teacher-facing notes a generator attaches when it could not do exactly what the settings ask.
// One source for the "Kleine reeks" wording: generateDispatch and the generators' own repeat fills use it.
export const countOefeningen = (n: number) => `${n} oefening${n === 1 ? '' : 'en'}`;

export function repeatNote(repeats: number): string | null {
    return repeats > 0 ? `Kleine reeks: ${countOefeningen(repeats)} kom${repeats === 1 ? 't' : 'en'} dubbel voor.` : null;
}

// SYNC: the wording of repeatNote above.
const REPEAT_NOTE = /\s*Kleine reeks: \d+ oefening(?:en)? kom(?:t|en) dubbel voor\./;

// Exercises that repeat an earlier one by content, ids ignored. SYNC: generateDispatch's defaultExerciseKey.
export function repeatsIn(items: unknown[]): number {
    const keys = new Set(items.map(ex => JSON.stringify(ex, (k, v) => (k === 'id' ? undefined : v))));
    return items.length - keys.size;
}

export function joinNotes(a: string | null, b: string | null): string | null {
    if (a && b && a.includes(b)) return a;   // generator and dedupe pass can report the same repeats
    return a && b ? `${a} ${b}` : (a ?? b);
}

// The dedupe pass recounts the repeats after its top-up, so a generator's own count is stale there.
export function withoutRepeatNote(note: string | null): string | null {
    return note ? note.replace(REPEAT_NOTE, '').trim() || null : null;
}
