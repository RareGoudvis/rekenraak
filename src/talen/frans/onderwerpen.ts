import type { Person } from './verbs';

// Who does it: a French pronoun or one or two first names (owner 2026-11-18: the pupil writes French, so the question
// shows the French subject: "tu (hebt)", "Jos et Lien (hebben)"); its Dutch is the pronoun of a Dutch answer.

export interface Onderwerp {
    // In Dutch: "jij", "men", "Jos", "Jos en Lien".
    nl: string;
    // As the question shows it and the full answer starts: "tu", "on", "Jos", "Jos et Lien".
    fr: string;
    person: Person;
}

// Flemish first names whose gender a pupil knows at a glance; one name = il / elle, two = ils (elles for two girls).
export const BOYS: readonly string[] = ['Jos', 'Lars', 'Wout', 'Jonas', 'Milan', 'Seppe', 'Arne', 'Kobe'];
export const GIRLS: readonly string[] = ['Lien', 'Fien', 'Lotte', 'Emma', 'Noor', 'Hanne', 'Elise', 'Nina'];

export const PRONOUNS: readonly Onderwerp[] = [
    { nl: 'ik', fr: 'je', person: 0 },
    { nl: 'jij', fr: 'tu', person: 1 },
    { nl: 'hij', fr: 'il', person: 2 },
    { nl: 'zij', fr: 'elle', person: 2 },
    // Op.stap lists on; Dutch says men.
    { nl: 'men', fr: 'on', person: 2 },
    { nl: 'wij', fr: 'nous', person: 3 },
    { nl: 'jullie', fr: 'vous', person: 4 },
    { nl: 'zij', fr: 'ils', person: 5 },
    { nl: 'zij', fr: 'elles', person: 5 },
];

const pick = <T>(list: readonly T[], rng: () => number): T => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

// How often a 3rd person is a name instead of a pronoun: the names are the "overeenkomst" the goal is about.
const NAME_SHARE = 0.5;

/** A subject for this person: a pronoun, or for the 3rd persons sometimes one or two names. */
export function drawOnderwerp(person: Person, rng: () => number): Onderwerp {
    const pronouns = PRONOUNS.filter(p => p.person === person);
    if ((person !== 2 && person !== 5) || rng() >= NAME_SHARE) return pick(pronouns, rng);
    if (person === 2) {
        const name = rng() < 0.5 ? pick(BOYS, rng) : pick(GIRLS, rng);
        return { nl: name, fr: name, person };
    }
    // Two names: a boy and a girl, two boys (ils) or two girls (elles).
    const kind = pick(['mixed', 'boys', 'girls'] as const, rng);
    const first = kind === 'girls' ? pick(GIRLS, rng) : pick(BOYS, rng);
    const pool = kind === 'boys' ? BOYS : GIRLS;
    const second = pick(pool.filter(n => n !== first), rng);
    return { nl: `${first} en ${second}`, fr: `${first} et ${second}`, person };
}

/** The French pronoun the subject stands for (the grammar line): names count as il / elle / ils / elles. */
export function pronounOf(o: Onderwerp): string {
    if (o.person !== 2 && o.person !== 5) return o.fr;
    if (PRONOUNS.some(p => p.fr === o.fr)) return o.fr;
    if (o.person === 2) return BOYS.includes(o.fr) ? 'il' : 'elle';
    const names = o.fr.split(' et ');
    return names.every(n => GIRLS.includes(n)) ? 'elles' : 'ils';
}
