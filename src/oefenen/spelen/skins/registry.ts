import { lazy } from 'react';
import { Balloon, Bird, Bomb, CarProfile, Egg, FlagPennant, Ghost, Gift, Hammer, Heart, Hexagon, Log, type Icon } from '@phosphor-icons/react';
import type { SkinAccepts, SkinEntry, SkinOption } from './types';
import { CastleTurret, ImageSquare, TreasureChest, TreeEvergreen } from '@phosphor-icons/react';
import { Fish } from '@phosphor-icons/react';
import { SoccerBall } from '@phosphor-icons/react';
import { WRONG_PENALTY_MS } from './bom/penalty';
import { HARTJES_OPTIONS, HARTJES_ROUND } from '../board/hartjes/hearts';

// Keypad skins take a typed number. Pinguïntoren, Bom and Race could take a pair (quotient + rest) once their
// keypad gets a second field; until then they say number only.
const KEYPAD_NUMBER: SkinAccepts = { kinds: ['number'] };
// Tap skins show the options on their targets: session distractors for a number, or the exercise's own choices.
// Measured 2026-11-14 at 1180×820: "89 991" stays readable on a balloon, mole and parcel (the label scales with the target).
const TAP_CHOICE: SkinAccepts = { kinds: ['number', 'choice'], maxAnswerChars: 5 };
// Tap skins that also draw content pictures (SpelSign, SpelChoiceFace): the klok's faces, times and phrases.
const TAP_PICTURES: SkinAccepts = { ...TAP_CHOICE, pictures: true };

// Bever, Zombies and Zeehondjes: the pupil picks Normaal or Moeilijk before the start (the skin reads options.niveau).
const NIVEAU: SkinOption = { id: 'niveau', label: 'Hoe moeilijk?', default: 'normaal', choices: [{ value: 'normaal', label: 'Normaal' }, { value: 'moeilijk', label: 'Moeilijk' }] };
// Zombies also has Makkelijk: Normaal's defence at a steady speed (zombies/walk.ts speedAt).
const ZOMBIE_NIVEAU: SkinOption = { ...NIVEAU, choices: [{ value: 'makkelijk', label: 'Makkelijk' }, ...NIVEAU.choices] };
// Kasteel: 1 speler against the computer (Normaal / Moeilijk) or 2 spelers on one screen (Samen tegelijk / Om beurten).
const KASTEEL_OPTIONS: SkinOption[] = [
    { id: 'spelers', label: 'Hoeveel spelers?', default: '1', choices: [{ value: '1', label: '1 speler' }, { value: '2', label: '2 spelers' }] },
    { id: 'levens', label: 'Levens per kasteel', default: '20', choices: [10, 20, 30].map(n => ({ value: String(n), label: `${n} levens` })) },
    { ...NIVEAU, when: { id: 'spelers', value: '1' } },
    { id: 'manier', label: 'Hoe spelen jullie?', default: 'samen', when: { id: 'spelers', value: '2' }, choices: [{ value: 'samen', label: 'Samen tegelijk' }, { value: 'beurt', label: 'Om beurten' }] },
];

// The game picker's tiles, in order. A new skin = one entry here + its component file; the
// session, the shell and the picker never change. No Component (or Screen) = shown as "binnenkort".
export const SKINS: readonly (SkinEntry & { icon: Icon })[] = [
    {
        // A climb to 20 blocks (a mistake takes one off); 30 questions at most, so a round always ends. The skin
        // voices its mistakes (wrong: null): a crack (barricade), the splash of a break (hit), else a plop (miss).
        meta: { id: 'pinguintoren', music: 'ijs', label: 'Pinguïntoren', input: 'keypad', timed: false, round: { questions: 30, goal: 20 }, sounds: { correct: 'plok', wrong: null, miss: 'plop', barricade: 'krak', hit: 'splash' }, accepts: KEYPAD_NUMBER },
        icon: Bird,
        Component: lazy(() => import('./pinguintoren/Pinguintoren')),
        Ending: lazy(() => import('./pinguintoren/Pinguintoren').then(m => ({ default: m.PinguintorenEnding }))),
    },
    {
        meta: { id: 'ballonnen', music: 'weide', label: 'Ballonnen', input: 'choice', timed: false, round: { questions: 20 }, sounds: { correct: 'pop', wrong: 'pfff', flip: 'piep' }, accepts: TAP_PICTURES },
        icon: Balloon,
        Component: lazy(() => import('./ballonnen/Ballonnen')),
    },
    {
        // Calm, for the youngest: four seals on ice floes hold up the options; the right one gets a fish (15 sums,
        // untimed). Answers up to 5 characters and pack pictures (a clock face on the sign). Moeilijk: the floes drift.
        meta: {
            music: 'weide',
            id: 'zeehond', label: 'Zeehondjes voeren', input: 'choice', timed: false, round: { questions: 15 }, options: [NIVEAU],
            accepts: { kinds: ['number', 'choice'], pictures: true, maxAnswerChars: 5 }, sounds: { correct: 'ork', wrong: 'plons' },
        },
        icon: Fish,
        Component: lazy(() => import('./zeehond/Zeehond')),
        Ending: lazy(() => import('./zeehond/Zeehond').then(m => ({ default: m.ZeehondEnding }))),
    },
    {
        // About 3 minutes; the zombies speed up with the streak (progress.streak). Survivors behind barricades
        // (zombies/defence.ts); all caught = the early end. The skin voices a barricade or a catch itself (miss: null).
        meta: {
            music: 'griezel',
            id: 'zombies', label: 'Zombies', input: 'keypad', timed: true, round: { seconds: 180 }, canFail: true, winTitle: 'Gered!', options: [ZOMBIE_NIVEAU], accepts: KEYPAD_NUMBER,
            sounds: { correct: 'poef', wrong: 'plop', miss: null, barricade: 'krak', caught: 'wahwah', win: 'cheer', fail: 'wahwah' },
        },
        icon: Ghost,
        Component: lazy(() => import('./zombies/Zombies')),
        Ending: lazy(() => import('./zombies/Zombies').then(m => ({ default: m.ZombiesEnding }))),
    },
    {
        // N right before the clock runs out; a counted mistake costs 3 s of the clock (goalKeep). The pupil picks tijd and doel.
        meta: {
            music: 'tikken',
            id: 'bom', label: 'Bom', input: 'keypad', timed: true, round: { seconds: 180, goal: 10, goalKeep: true, wrongPenaltyMs: WRONG_PENALTY_MS }, winTitle: 'Ontmanteld!', accepts: KEYPAD_NUMBER,
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
            music: 'rivier',
            id: 'bever', label: 'Bever', input: 'keypad', timed: true, round: { seconds: 180 }, canFail: true, winTitle: 'De dam houdt!', options: [NIVEAU], accepts: KEYPAD_NUMBER,
            sounds: { correct: 'plok', wrong: 'whoosh', win: 'cheer', fail: 'blub' },
        },
        icon: Log,
        Component: lazy(() => import('./bever/Bever')),
        Ending: lazy(() => import('./bever/Bever').then(m => ({ default: m.BeverEnding }))),
    },
    {
        // Tijdrit: to the finish (Race's own end, onFinish), the time is the score; 60 questions at most, unseen.
        // Benzine: three jerrycans, petrol stations, the distance is the score; an empty tank = the early end (onFail).
        meta: {
            id: 'race', music: 'race', label: 'Race', input: 'keypad', timed: false, round: { cap: 60 }, canFail: true, failTitle: 'De tank is leeg!', accepts: KEYPAD_NUMBER,
            options: [{ id: 'modus', label: 'Welke race?', default: 'tijdrit', choices: [{ value: 'tijdrit', label: 'Tijdrit', round: { cap: 60 } }, { value: 'benzine', label: 'Benzine', round: { cap: 80 } }] }],
            sounds: { correct: 'pop', wrong: 'plop', fail: 'puf' },
        },
        icon: CarProfile,
        Component: lazy(() => import('./race/Race')),
        Ending: lazy(() => import('./race/Race').then(m => ({ default: m.RaceEnding }))),
    },
    {
        // A match of 3 or 5 minutes in two halves (a short "Rust!" holds the clock). Right answers pass, a wrong one hands
        // the black bears the ball (their passes and shot come on wrong answers); our shot has its own 10 s ring (onMiss).
        meta: {
            music: 'sport',
            id: 'voetbal', label: 'Voetbal', input: 'keypad', timed: true, round: { seconds: 180, cap: 200 }, accepts: KEYPAD_NUMBER,
            options: [{ id: 'tijd', label: 'Hoe lang?', default: '3', choices: [{ value: '3', label: '3 minuten', round: { seconds: 180 } }, { value: '5', label: '5 minuten', round: { seconds: 300 } }] }],
            sounds: { correct: 'tok', wrong: 'plop', miss: null, win: 'cheer', caught: 'plof', whistle: 'fluit' },
        },
        icon: SoccerBall,
        Component: lazy(() => import('./voetbal/Voetbal')),
        Ending: lazy(() => import('./voetbal/Voetbal').then(m => ({ default: m.VoetbalEnding }))),
    },
    {
        // Two pupils on one screen: its own session and screen (two question streams, no Nakijken).
        meta: { id: 'touwtrekken', music: 'zacht', label: 'Touwtrekken', input: 'keypad', timed: false, players: 2, round: {}, accepts: KEYPAD_NUMBER },
        icon: FlagPennant,
        Screen: lazy(() => import('./touwtrekken/Touwtrekken')),
    },
    {
        // 1 speler: a catapult duel with the computer's castle (kasteel/siege.ts: its clock, the lives, the tuning); your castle
        // at 0 = the early end, theirs = won (onFinish). The hidden cap never comes first: every answer costs a castle a life.
        // 2 spelers: its own screen on the duel store (first to knock the other castle to 0). Each right answer launches
        // (correct), a stone hitting a wall is the skin's 'hit' cue, the computer's clock shot its 'launch' cue.
        meta: {
            music: 'kasteel',
            id: 'kasteel', label: 'Kasteel', input: 'keypad', timed: true, players: '1-2', round: { cap: 90 }, canFail: true, accepts: KEYPAD_NUMBER,
            winTitle: 'Kasteel veroverd!', failTitle: 'Oei! Je kasteel is om. Nog eens?', options: KASTEEL_OPTIONS,
            sounds: { correct: 'zwoesj', wrong: 'plop', launch: 'zwoesj', hit: 'blok', win: 'jingle', fail: 'puf' },
        },
        icon: CastleTurret,
        Component: lazy(() => import('./kasteel/Kasteel')),
        Screen: lazy(() => import('./kasteel/KasteelDuel')),
        screenWhen: { id: 'spelers', value: '2' },
        Ending: lazy(() => import('./kasteel/Kasteel').then(m => ({ default: m.KasteelEnding }))),
    },
    {
        // Valentijn: memory with 6 sums and their answers on 12 hearts (Moeilijk: 8 on 16), 2 boards. A sum card turned
        // first and then a wrong answer, twice for the same sum, logs that sum once (board/session.ts) and breaks its
        // heart (the skin voices it: hit; a ball going flat: caught). Answers up to 5 characters ("10/12") fit a card;
        // breuken pair a picture with its breuk, or a breuk with its vereenvoudigde breuk. Voetballen is a look option.
        meta: {
            music: 'zacht',
            id: 'hartjes', label: 'Hartjes koppelen', input: 'board', timed: false, season: 'valentijn', options: HARTJES_OPTIONS,
            round: { board: HARTJES_ROUND }, accepts: { kinds: ['number', 'choice'], maxAnswerChars: 5, pictures: true, board: 'pairs' },
            sounds: { correct: 'ting', wrong: null, flip: 'flip', nomatch: 'plop', hit: 'krak', caught: 'whoosh' },
        },
        icon: Heart,
        Component: lazy(() => import('../board/hartjes/Hartjes')),
    },
    {
        // Lente: 13 sums, find every one that makes the target (3–5), on a honeycomb, a flower meadow, a comb again. A
        // wrong cell is a mistake at once. Cards whose answers rarely repeat (tot 1000) get "groter dan" a round number.
        // Gelijkwaardige breuken: "zoek alle breuken die gelijk zijn aan 1/2" (content/breuken/breukComb.ts).
        // Moeilijk: five boards, and a wasp now and then (board/honingraat/hive.ts) that can claim the nest (canFail).
        meta: {
            music: 'weide',
            id: 'honingraat', label: 'Honingraat', input: 'board', timed: false, season: 'lente', canFail: true,
            round: { board: { kind: 'target', boards: 3, size: 13, strikes: 1 } }, accepts: { kinds: ['number', 'choice'], ops: ['+', '-'], pictures: true, board: 'target' },
            options: [{ ...NIVEAU, choices: [NIVEAU.choices[0], { ...NIVEAU.choices[1], round: { board: { kind: 'target', boards: 5, size: 13, strikes: 1 } } }] }],
            winTitle: 'Alle honing is binnen!', failTitle: 'Oei! De wesp heeft het nest. Nog eens?',
            sounds: { correct: 'drup', wrong: 'bzz', barricade: 'krak', launch: 'zwoesj', hit: 'pop', lost: 'boing', win: 'cheer', fail: 'wahwah' },
        },
        icon: Hexagon,
        Component: lazy(() => import('../board/honingraat/Honingraat')),
        Ending: lazy(() => import('../board/honingraat/Honingraat').then(m => ({ default: m.HoningraatEnding }))),
    },
    {
        // A funny animal under 4 × 4 tiles: each right answer flips one away (random order), 16 show it all. A mistake
        // never puts one back (goalKeep); 30 questions at most. Never the same picture twice in a row (prent/pick.ts).
        meta: {
            music: 'zacht',
            id: 'prent', label: 'Verborgen prent', input: 'keypad', timed: false, round: { questions: 30, goal: 16, goalKeep: true },
            winTitle: 'Daar is de prent!', accepts: KEYPAD_NUMBER, sounds: { correct: 'pop', wrong: 'plop', win: 'cheer' },
        },
        icon: ImageSquare,
        Component: lazy(() => import('./prent/Prent')),
        Ending: lazy(() => import('./prent/Prent').then(m => ({ default: m.PrentEnding }))),
    },
    {
        // Each right answer reveals the last digit of its answer; four make the lock's code, typed on the same keypad.
        // Three chests end the round (the skin's onFinish); a wrong sum or code costs nothing. 60 questions at most, unseen.
        // Met tijd (3 / 5 minuten): chests until the clock runs out (resolveMeta makes the round timed).
        // Chest open = the skin's 'win' cue, a wrong code = its 'lost' cue (the session never ends this round as won or lost).
        meta: {
            music: 'zee',
            id: 'schatkist', label: 'Schatkist', input: 'keypad', timed: false, round: { cap: 60 }, accepts: { kinds: ['number'], digits: true },
            options: [{ id: 'tijd', label: 'Hoe lang?', default: 'geen', choices: [{ value: 'geen', label: 'Zonder tijd' }, { value: '3', label: '3 minuten', round: { seconds: 180 } }, { value: '5', label: '5 minuten', round: { seconds: 300 } }] }],
            sounds: { correct: 'snip', wrong: 'plop', win: 'jingle', lost: 'boing' },
        },
        icon: TreasureChest,
        Component: lazy(() => import('./schatkist/Schatkist')),
        Ending: lazy(() => import('./schatkist/Schatkist').then(m => ({ default: m.SchatkistEnding }))),
    },
    {
        // Speelgoedfabriek (year-round; id kept for links and thumbs): presents on a belt, the right one into the crate.
        // The rightmost present reaching the belt's end is a miss (pakjesband/belt.ts: about 12 s per sum). Mistakes heat
        // the machine's pressure gauge, right answers cool it (pakjesband/pressure.ts); too hot = it sputters (canFail).
        meta: {
            music: 'fabriek',
            id: 'pakjesband', label: 'Speelgoedfabriek', input: 'choice', timed: false, round: { questions: 20 }, accepts: TAP_PICTURES,
            canFail: true, winTitle: 'Alle pakjes zijn klaar!', failTitle: 'Oei! De machine sputtert. Nog eens?',
            sounds: { correct: 'ting', wrong: 'boing', miss: 'plop', win: 'cheer', fail: 'puf' },
        },
        icon: Gift,
        Component: lazy(() => import('./pakjesband/Pakjesband')),
        Ending: lazy(() => import('./pakjesband/Pakjesband').then(m => ({ default: m.FabriekEnding }))),
    },
    {
        // Kerst: a bare fir tree; each right answer hangs the next bauble or garland, the 15th is the star on top.
        // A mistake never takes one off (goalKeep); two in a row knock a bauble to the floor (hit = its tink). 30 questions at most.
        meta: {
            music: 'kerst',
            id: 'kerstboom', label: 'Kerstboom versieren', input: 'keypad', timed: false, round: { questions: 30, goal: 15, goalKeep: true }, season: 'kerst',
            winTitle: 'De boom is klaar!', accepts: KEYPAD_NUMBER, sounds: { correct: 'sparkle', wrong: 'plop', win: 'jingle', hit: 'ting' },
        },
        icon: TreeEvergreen,
        Component: lazy(() => import('./kerstboom/Kerstboom')),
        Ending: lazy(() => import('./kerstboom/Kerstboom').then(m => ({ default: m.KerstboomEnding }))),
    },
    {
        // Pasen: nine eggs in the grass, the answer and eight distractors (choiceCount). Untimed. Number only:
        // an exercise's own choices are too few for nine eggs, and nine clock faces are too many to read. Four characters:
        // "89 991" sticks out past the egg (measured 2026-11-14). Digits only: an egg prints a bare number (no € 5,50, no −3).
        meta: {
            music: 'weide',
            id: 'eieren', label: 'Eieren zoeken', input: 'choice', choiceCount: 9, timed: false, round: { questions: 15 }, season: 'pasen',
            accepts: { kinds: ['number'], maxAnswerChars: 4, digits: true }, sounds: { correct: 'piep', wrong: 'plof' },
        },
        icon: Egg,
        Component: lazy(() => import('./eieren/Eieren')),
    },
    {
        // Two minutes; the moles pop up a little quicker with the streak (mollen/moles.ts).
        meta: { id: 'mollen', music: 'gek', label: 'Mollen meppen', input: 'choice', timed: true, round: { seconds: 120 }, accepts: TAP_PICTURES, sounds: { correct: 'bonk', wrong: 'nana' } },
        icon: Hammer,
        Component: lazy(() => import('./mollen/Mollen')),
    },
];

export const skinById = (id: string) => SKINS.find(s => s.meta.id === id) ?? null;
