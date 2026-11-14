import { lazy } from 'react';
import { Balloon, Bird, CarProfile, Ghost, type Icon } from '@phosphor-icons/react';
import type { SkinEntry } from './types';

// The game picker's tiles, in order. A new skin = one entry here + its component file; the
// session, the shell and the picker never change. No Component = shown as "binnenkort".
export const SKINS: readonly (SkinEntry & { icon: Icon })[] = [
    {
        // A climb to 20 blocks (a mistake takes one off); 30 questions at most, so a round always ends.
        meta: { id: 'pinguintoren', label: 'Pinguïntoren', input: 'keypad', timed: false, round: { questions: 30, goal: 20 } },
        icon: Bird,
        Component: lazy(() => import('./pinguintoren/Pinguintoren')),
    },
    {
        meta: { id: 'ballonnen', label: 'Ballonnen', input: 'choice', timed: false, round: { questions: 20 } },
        icon: Balloon,
        Component: lazy(() => import('./ballonnen/Ballonnen')),
    },
    {
        // About 3 minutes; the zombies speed up with the streak (progress.streak).
        meta: { id: 'zombies', label: 'Zombies', input: 'keypad', timed: true, round: { seconds: 180 } },
        icon: Ghost,
        Component: lazy(() => import('./zombies/Zombies')),
    },
    {
        // To the finish (Race's own end, onFinish); no countdown: the time is the score. 60 questions at most, unseen.
        meta: { id: 'race', label: 'Race', input: 'keypad', timed: false, round: { cap: 60 } },
        icon: CarProfile,
        Component: lazy(() => import('./race/Race')),
    },
];

export const skinById = (id: string) => SKINS.find(s => s.meta.id === id) ?? null;
