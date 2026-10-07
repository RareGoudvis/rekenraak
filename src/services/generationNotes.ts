// Teacher-facing notes a generator attaches when it could not do exactly what the settings ask.
// SYNC: the duplicate wording mirrors shortNote() in generateDispatch.ts ("Kleine reeks: …").
export const countOefeningen = (n: number) => `${n} oefening${n === 1 ? '' : 'en'}`;

export function repeatNote(repeats: number): string | null {
    return repeats > 0 ? `Kleine reeks: ${countOefeningen(repeats)} kom${repeats === 1 ? 't' : 'en'} dubbel voor.` : null;
}
