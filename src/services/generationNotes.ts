// Teacher-facing notes a generator attaches when it could not do exactly what the settings ask.
// One source for the "Kleine reeks" wording: generateDispatch and the generators' own repeat fills use it.
export const countOefeningen = (n: number) => `${n} oefening${n === 1 ? '' : 'en'}`;

export function repeatNote(repeats: number): string | null {
    return repeats > 0 ? `Kleine reeks: ${countOefeningen(repeats)} kom${repeats === 1 ? 't' : 'en'} dubbel voor.` : null;
}
