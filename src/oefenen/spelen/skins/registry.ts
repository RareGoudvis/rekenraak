import { lazy } from 'react';
import { Balloon, Bird, Bomb, CarProfile, Egg, FlagPennant, Ghost, Gift, Hammer, Log, type Icon } from '@phosphor-icons/react';
import type { SkinAccepts, SkinEntry, SkinOption } from './types';
import { ImageSquare, TreeEvergreen } from '@phosphor-icons/react';

// Keypad skins take a typed number. Pinguïntoren, Bom and Race could take a pair (quotient + rest) once their
// keypad gets a second field; until then they say number only.
const KEYPAD_NUMBER: SkinAccepts = { kinds: ['number'] };
// Tap skins show the options on their targets: session distractors for a number, or the exercise's own choices.
const TAP_CHOICE: SkinAccepts = { kinds: ['number', 'choice'], maxAnswerChars: 4 };

// Bever and Zombies: the pupil picks Normaal or Moeilijk before the start (the skin reads options.niveau).
const NIVEAU: SkinOption = { id: 'niveau', label: 'Hoe moeilijk?', default: 'normaal', choices: [{ value: 'normaal', label: 'Normaal' }, { value: 'moeilijk', label: 'Moeilijk' }] };

// The game picker's tiles, in order. A new skin = one entry here + its component file; the
// session, the shell and the picker never change. No Component (or Screen) = shown as "binnenkort".
export const SKINS: readonly (SkinEntry & { icon: Icon })[] = [
    {
        // A climb to 20 blocks (a mistake takes one off); 30 questions at most, so a round always ends.
        meta: { id: 'pinguintoren', label: 'Pinguïntoren', input: 'keypad', timed: false, round: { questions: 30, goal: 20 }, sounds: { correct: 'plok', wrong: 'splash' }, accepts: KEYPAD_NUMBER },
        icon: Bird,
        Component: lazy(() => import('./pinguintoren/Pinguintoren')),
    },
    {
        meta: { id: 'ballonnen', label: 'Ballonnen', input: 'choice', timed: false, round: { questions: 20 }, sounds: { correct: 'pop', wrong: 'plop' }, accepts: TAP_CHOICE },
        icon: Balloon,
        Component: lazy(() => import('./ballonnen/Ballonnen')),
    },
    {
        // About 3 minutes; the zombies speed up with the streak (progress.streak). Survivors behind barricades
        // (zombies/defence.ts); all caught = the early end. The skin voices a barricade or a catch itself (miss: null).
        meta: {
            id: 'zombies', label: 'Zombies', input: 'keypad', timed: true, round: { seconds: 180 }, canFail: true, winTitle: 'Gered!', options: [NIVEAU], accepts: KEYPAD_NUMBER,
            sounds: { correct: 'poef', wrong: 'plop', miss: null, barricade: 'krak', caught: 'wahwah', win: 'cheer', fail: 'wahwah' },
        },
        icon: Ghost,
        Component: lazy(() => import('./zombies/Zombies')),
        Ending: lazy(() => import('./zombies/Zombies').then(m => ({ default: m.ZombiesEnding }))),
    },
    {
        // N right before the clock runs out; a mistake costs only time (goalKeep). The pupil picks tijd and doel.
        meta: {
            id: 'bom', label: 'Bom', input: 'keypad', timed: true, round: { seconds: 180, goal: 10, goalKeep: true }, winTitle: 'Ontmanteld!', accepts: KEYPAD_NUMBER,
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
    {
        // 3 minutes; the water rises with the clock and a wave per mistake (bever/water.ts). Over the dam = the early end.
        meta: {
            id: 'bever', label: 'Bever', input: 'keypad', timed: true, round: { seconds: 180 }, canFail: true, winTitle: 'De dam houdt!', options: [NIVEAU], accepts: KEYPAD_NUMBER,
            sounds: { correct: 'plok', wrong: 'whoosh', win: 'cheer', fail: 'blub' },
        },
        icon: Log,
        Component: lazy(() => import('./bever/Bever')),
        Ending: lazy(() => import('./bever/Bever').then(m => ({ default: m.BeverEnding }))),
    },
    {
        // To the finish (Race's own end, onFinish); no countdown: the time is the score. 60 questions at most, unseen.
        meta: { id: 'race', label: 'Race', input: 'keypad', timed: false, round: { cap: 60 }, sounds: { correct: 'pop', wrong: 'plop' }, accepts: KEYPAD_NUMBER },
        icon: CarProfile,
        Component: lazy(() => import('./race/Race')),
    },
    {
        // Two pupils on one screen: its own session and screen (two question streams, no Nakijken).
        meta: { id: 'touwtrekken', label: 'Touwtrekken', input: 'keypad', timed: false, players: 2, round: {}, accepts: KEYPAD_NUMBER },
        icon: FlagPennant,
        Screen: lazy(() => import('./touwtrekken/Touwtrekken')),
    },
    {
        // A funny animal under 4 × 4 tiles: each right answer flips one away (random order), 16 show it all. A mistake
        // never puts one back (goalKeep); 30 questions at most. Never the same picture twice in a row (prent/pick.ts).
        meta: {
            id: 'prent', label: 'Verborgen prent', input: 'keypad', timed: false, round: { questions: 30, goal: 16, goalKeep: true },
            winTitle: 'Daar is de prent!', accepts: KEYPAD_NUMBER, sounds: { correct: 'pop', wrong: 'plop', win: 'cheer' },
        },
        icon: ImageSquare,
        Component: lazy(() => import('./prent/Prent')),
        Ending: lazy(() => import('./prent/Prent').then(m => ({ default: m.PrentEnding }))),
    },
    {
        // Sinterklaas: parcels on a belt over the roof, the right one down the chimney. A parcel falling off the
        // belt's end is a miss (pakjesband/belt.ts: about 12 s per sum).
        meta: {
            id: 'pakjesband', label: 'Pakjesband', input: 'choice', timed: false, round: { questions: 20 }, season: 'sinterklaas', accepts: TAP_CHOICE,
            sounds: { correct: 'whoomp', wrong: 'boing', miss: 'plop' },
        },
        icon: Gift,
        Component: lazy(() => import('./pakjesband/Pakjesband')),
    },
    {
        // Kerst: a bare fir tree; each right answer hangs the next bauble or garland, the 15th is the star on top.
        // A mistake never takes one off (goalKeep); 30 questions at most. The finished tree lights up.
        meta: {
            id: 'kerstboom', label: 'Kerstboom versieren', input: 'keypad', timed: false, round: { questions: 30, goal: 15, goalKeep: true }, season: 'kerst',
            winTitle: 'De boom is klaar!', accepts: KEYPAD_NUMBER, sounds: { correct: 'sparkle', wrong: 'plop', win: 'jingle' },
        },
        icon: TreeEvergreen,
        Component: lazy(() => import('./kerstboom/Kerstboom')),
        Ending: lazy(() => import('./kerstboom/Kerstboom').then(m => ({ default: m.KerstboomEnding }))),
    },
    {
        // Pasen: nine eggs in the grass, the answer and eight distractors (choiceCount). Untimed. Number only:
        // an exercise's own choices are too few for nine eggs.
        meta: {
            id: 'eieren', label: 'Eieren zoeken', input: 'choice', choiceCount: 9, timed: false, round: { questions: 15 }, season: 'pasen',
            accepts: { kinds: ['number'], maxAnswerChars: 4 }, sounds: { correct: 'piep', wrong: 'plop' },
        },
        icon: Egg,
        Component: lazy(() => import('./eieren/Eieren')),
    },
    {
        // Two minutes; the moles pop up a little quicker with the streak (mollen/moles.ts).
        meta: { id: 'mollen', label: 'Mollen meppen', input: 'choice', timed: true, round: { seconds: 120 }, accepts: TAP_CHOICE, sounds: { correct: 'bonk', wrong: 'plop' } },
        icon: Hammer,
        Component: lazy(() => import('./mollen/Mollen')),
    },
];

export const skinById = (id: string) => SKINS.find(s => s.meta.id === id) ?? null;
