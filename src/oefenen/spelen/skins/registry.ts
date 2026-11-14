import { lazy } from 'react';
import { Balloon, Bird, Bomb, Ghost, type Icon } from '@phosphor-icons/react';
import type { SkinEntry } from './types';

// The game picker's tiles, in order. A new skin = one entry here + its component file; the
// session, the shell and the picker never change. No Component = shown as "binnenkort".
export const SKINS: readonly (SkinEntry & { icon: Icon })[] = [
    {
        // A climb to 20 blocks (a mistake takes one off); 30 questions at most, so a round always ends.
        meta: { id: 'pinguintoren', label: 'Pinguïntoren', input: 'keypad', timed: false, round: { questions: 30, goal: 20 }, sounds: { correct: 'plok', wrong: 'splash' } },
        icon: Bird,
        Component: lazy(() => import('./pinguintoren/Pinguintoren')),
    },
    {
        meta: { id: 'ballonnen', label: 'Ballonnen', input: 'choice', timed: false, round: { questions: 20 }, sounds: { correct: 'pop', wrong: 'plop' } },
        icon: Balloon,
        Component: lazy(() => import('./ballonnen/Ballonnen')),
    },
    {
        // About 3 minutes; the zombies speed up with the streak (progress.streak).
        meta: { id: 'zombies', label: 'Zombies', input: 'keypad', timed: true, round: { seconds: 180 }, sounds: { correct: 'poef', wrong: 'plop', miss: 'boing' } },
        icon: Ghost,
        Component: lazy(() => import('./zombies/Zombies')),
    },
    {
        // N right before the clock runs out; a mistake costs only time (goalKeep). The pupil picks tijd and doel.
        meta: {
            id: 'bom', label: 'Bom', input: 'keypad', timed: true, round: { seconds: 180, goal: 10, goalKeep: true }, winTitle: 'Ontmanteld!',
            options: [
                { id: 'tijd', label: 'Hoe lang?', default: '3', choices: [{ value: '3', label: '3 minuten', round: { seconds: 180 } }, { value: '5', label: '5 minuten', round: { seconds: 300 } }] },
                { id: 'doel', label: 'Hoeveel juist?', default: '10', choices: [10, 20, 50].map(n => ({ value: String(n), label: `${n} juist`, round: { goal: n } })) },
            ],
            sounds: { correct: 'snip', wrong: 'plop', win: 'cheer', lost: 'puf' },
        },
        icon: Bomb,
        Component: lazy(() => import('./bom/Bom')),
        Ending: lazy(() => import('./bom/Bom').then(m => ({ default: m.BomEnding }))),
    },
];

export const skinById = (id: string) => SKINS.find(s => s.meta.id === id) ?? null;
