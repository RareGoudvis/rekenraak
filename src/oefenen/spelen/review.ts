import { fnv1a } from '../../services/oefenen/session';
import type { OefenSessie } from '../../services/oefenen/types';
import type { KioskFixed } from '../useOefenStore';
import type { SpelQuestion } from './spelQuestion';

/** Nakijken after a game: the same session content, its round = exactly these questions (same numbers, same order), run in the Oefenen kiosk. */
export function reviewOf(s: OefenSessie, questions: readonly SpelQuestion[]): { sessie: OefenSessie; items: KioskFixed[] } {
    const items = questions.map(q => ({ slot: q.slot, exercise: q.exercise, exerciseKey: q.key, constraints: q.constraints }));
    const rest: OefenSessie = { ...s };
    // A review is counted, never timed.
    delete rest.timerMin;
    return {
        // zelf- prefix: Terug naar begin and Andere oefening work as in every Zelf oefenen run.
        sessie: { ...rest, id: `zelf-${fnv1a(`nakijken|${s.id}`)}`, title: 'Nakijken', total: items.length, mode: 'afwisselen', allowRepeatType: true },
        items,
    };
}
