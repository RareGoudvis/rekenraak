import { lazy } from 'react';
import { Balloon, Bird, Bomb, CarProfile, Egg, FlagPennant, Ghost, Gift, Hammer, Heart, Hexagon, Log, type Icon } from '@phosphor-icons/react';
import type { SkinAccepts, SkinEntry, SkinOption } from './types';
import { CastleTurret, ImageSquare, TreasureChest, TreeEvergreen } from '@phosphor-icons/react';
import { Fish } from '@phosphor-icons/react';
import { SoccerBall } from '@phosphor-icons/react';
import { Meteor } from '@phosphor-icons/react';
import { Robot } from '@phosphor-icons/react';
import { Cake } from '@phosphor-icons/react';
import { BOM_LEVEL_ROUNDS, WRONG_PENALTY_MS } from './bom/penalty';
import { HARTJES_OPTIONS, HARTJES_ROUND, SPOOKHUIS_OPTIONS } from '../board/hartjes/hearts';
import { MANIER_OPTION, duelOptions } from '../duel/options';
import { BugBeetle } from '@phosphor-icons/react';
import { WINNEN_OPTION } from './kikkers/rule';
import { MagicWand } from '@phosphor-icons/react';
import { TOVER } from './tovenaarsduel/rule';
import { Storefront } from '@phosphor-icons/react';
import { FireTruck } from '@phosphor-icons/react';
import { PersonSimpleSki } from '@phosphor-icons/react';
import { Flashlight as FlashlightIcon } from '@phosphor-icons/react';
import { Joystick } from '@phosphor-icons/react';
import { GRIJP } from './grijp/claw';
import { HIVE_BOARDS, hasBoss } from '../board/honingraat/hiveLevels';
import { LEVELS, levelOption } from '../levels/levels';
import { FishSimple } from '@phosphor-icons/react';
import { TANK_GOAL } from './aquarium/tank';
import { ROUND_SECONDS as FRITUUR_SECONDS } from './frituur/rule';
import { Truck } from '@phosphor-icons/react';
import { TRUCK } from './monstertrucks/rule';
import { Horse } from '@phosphor-icons/react';
import { JOUST_OPTIONS } from './steekspel/rule';
import { CloudLightning } from '@phosphor-icons/react';
import { DRAAK } from './drakenrace/rule';
import { Waves } from '@phosphor-icons/react';
import { WILD } from './wildwaterrace/rule';

// Keypad skins take a typed number. Pinguïntoren, Bom and Race could take a pair (quotient + rest) once their
// keypad gets a second field; until then they say number only.
const KEYPAD_NUMBER: SkinAccepts = { kinds: ['number'] };
// Tap skins show the options on their targets: session distractors for a number, or the exercise's own choices.
// Measured 2026-11-14 at 1180×820: "89 991" stays readable on a balloon, mole and parcel (the label scales with the target).
const TAP_CHOICE: SkinAccepts = { kinds: ['number', 'choice'], maxAnswerChars: 5 };
// Tap skins that also draw content pictures (SpelSign, SpelChoiceFace): the klok's faces, times and phrases.
const TAP_PICTURES: SkinAccepts = { ...TAP_CHOICE, pictures: true };
// maxWordChars (Frans, measured 2026-11-18 at 844×390): Ballonnen, Zeehondjes and Mollen widen a word's label past the
// target and take any; a window (Brandweer, 7), a present on the belt (8), a prize tag (Grijpmachine, 6) and a gate
// plate (Skislalom, 6) sit too close to their neighbours for that, so they take the short words only.

// The four levels about time (levels/clock.ts): Zombies, Bever, Zeehondjes, Mollen and Pinguïntoren read options.niveau.
const TIME_LEVELS: SkinOption = levelOption({ clock: true });
// The game picker's tiles, in order. A new skin = one entry here + its component file; the
// session, the shell and the picker never change. No Component (or Screen) = shown as "binnenkort".
export const SKINS: readonly (SkinEntry & { icon: Icon })[] = [
    {
        // A climb to 20 blocks (a mistake takes one off); 30 questions at most, so a round always ends. The skin
        // voices its mistakes and time-outs (wrong, miss: null): a crack (barricade), the splash of a break (hit), else a plop (nomatch).
        meta: { id: 'pinguintoren', music: 'ijs', label: 'Pinguïntoren', input: 'keypad', timed: false, round: { questions: 30, goal: 20 }, options: [TIME_LEVELS], sounds: { correct: 'plok', wrong: null, miss: null, nomatch: 'plop', barricade: 'krak', hit: 'splash' }, accepts: KEYPAD_NUMBER },
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
            id: 'zeehond', label: 'Zeehondjes voeren', input: 'choice', timed: false, round: { questions: 15 }, options: [TIME_LEVELS],
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
            id: 'zombies', label: 'Zombies', input: 'keypad', timed: true, round: { seconds: 180 }, canFail: true, winTitle: 'Gered!', options: [TIME_LEVELS], accepts: KEYPAD_NUMBER,
            sounds: { correct: 'poef', wrong: 'plop', miss: null, barricade: 'krak', caught: 'wahwah', win: 'cheer', fail: 'wahwah' },
        },
        icon: Ghost,
        Component: lazy(() => import('./zombies/Zombies')),
        Ending: lazy(() => import('./zombies/Zombies').then(m => ({ default: m.ZombiesEnding }))),
    },
    {
        // N right before the clock runs out; a counted mistake costs time per level (goalKeep, bom/penalty.ts), Onmogelijk's
        // third mistake goes PUF (onFail). The pupil picks tijd, doel and the level (flames only: not about a clock per sum).
        meta: {
            music: 'tikken',
            id: 'bom', label: 'Bom', input: 'keypad', timed: true, round: { seconds: 180, goal: 10, goalKeep: true, wrongPenaltyMs: WRONG_PENALTY_MS }, winTitle: 'Ontmanteld!', accepts: KEYPAD_NUMBER,
            canFail: true, failTitle: 'PUF! Drie foutjes.',
            options: [
                { id: 'tijd', label: 'Hoe lang?', default: '3', choices: [{ value: '3', label: '3 minuten', round: { seconds: 180 } }, { value: '5', label: '5 minuten', round: { seconds: 300 } }] },
                { id: 'doel', label: 'Hoeveel juist?', default: '10', choices: [10, 20, 50].map(n => ({ value: String(n), label: `${n} juist`, round: { goal: n } })) },
                levelOption({ clock: false, rounds: BOM_LEVEL_ROUNDS }),
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
            id: 'bever', label: 'Bever', input: 'keypad', timed: true, round: { seconds: 180 }, canFail: true, winTitle: 'De dam houdt!', options: [TIME_LEVELS], accepts: KEYPAD_NUMBER,
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
        // the black bears the ball (their passes and shot come on wrong answers); every level but Makkelijk rings each sum
        // with the shared clock (levels/clock.ts), too late (onMiss) = a wrong answer.
        meta: {
            music: 'sport',
            id: 'voetbal', label: 'Voetbal', input: 'keypad', timed: true, round: { seconds: 180, cap: 200 }, accepts: KEYPAD_NUMBER,
            options: [{ id: 'tijd', label: 'Hoe lang?', default: '3', choices: [{ value: '3', label: '3 minuten', round: { seconds: 180 } }, { value: '5', label: '5 minuten', round: { seconds: 300 } }] }, levelOption({ clock: true })],
            sounds: { correct: 'tok', wrong: 'plop', miss: null, win: 'cheer', caught: 'plof', whistle: 'fluit' },
        },
        icon: SoccerBall,
        Component: lazy(() => import('./voetbal/Voetbal')),
        Ending: lazy(() => import('./voetbal/Voetbal').then(m => ({ default: m.VoetbalEnding }))),
    },
    {
        // A duel (duel/ engine, DUEL.md): 1 speler against the computer or 2 on one screen; levens = how many steps
        // the flag must go, 2 minutes per round, best of 1 / 3 / 5. No help and no Nakijken.
        meta: {
            id: 'touwtrekken', music: 'zacht', label: 'Touwtrekken', input: 'keypad', timed: false, players: '1-2', round: {}, accepts: KEYPAD_NUMBER,
            options: duelOptions({ lives: { label: 'Hoe ver trekken?' }, extras: [MANIER_OPTION] }),
            sounds: { correct: 'plok', wrong: 'plop', miss: 'plop', win: 'jingle' },
        },
        icon: FlagPennant,
        Screen: lazy(() => import('./touwtrekken/Touwtrekken')),
    },
    {
        // A duel (duel/ engine, DUEL.md): 1 speler against the computer or 2 on one screen. A right answer fires that
        // side's catapult (kasteel/rule.ts: 3 in a row = a big stone, 2 lives); the stone's hit is the skin's 'hit' cue.
        meta: {
            music: 'kasteel', id: 'kasteel', label: 'Kasteel', input: 'keypad', timed: false, players: '1-2', round: {}, accepts: KEYPAD_NUMBER,
            options: duelOptions({ players: 1, extras: [MANIER_OPTION] }),
            sounds: { correct: 'zwoesj', wrong: 'plop', miss: 'plop', hit: 'blok', win: 'jingle' },
        },
        icon: CastleTurret,
        Screen: lazy(() => import('./kasteel/Kasteel')),
    },
    {
        // A duel on Mars (meteorietenregen/rule.ts): a right answer launches a meteor at the other base, 2 in a row raise
        // a shield (at most 2) that eats one meteor; 0 lives = the base explodes. The scene voices the launch (correct: null).
        meta: {
            music: 'race', id: 'meteorietenregen', label: 'Meteorietenregen', input: 'keypad', timed: false, players: '1-2', round: {}, accepts: KEYPAD_NUMBER,
            options: duelOptions(), sounds: { correct: null, wrong: 'plop', miss: 'plop', win: 'jingle' },
        },
        icon: Meteor,
        Screen: lazy(() => import('./meteorietenregen/Meteorietenregen')),
    },
    {
        // A duel (duel/ engine, DUEL.md): own sums each; a right answer is a punch (robotduel/rule.ts: 3 in a row = a
        // special for 2, a wrong answer drops the guard so the next hit counts double). The skin voices its moments.
        meta: {
            music: 'race', id: 'robotduel', label: 'Robotduel', input: 'keypad', timed: false, players: '1-2', round: {}, accepts: KEYPAD_NUMBER,
            options: duelOptions(), sounds: { correct: null, wrong: null, miss: null, win: 'jingle' },
        },
        icon: Robot,
        Screen: lazy(() => import('./robotduel/Robotduel')),
    },
    {
        // A duel (DUEL.md) on one shared sum: the first right answer throws a cream pie (taartgevecht/rule.ts); the scene voices
        // the throw, the splat and the dizzy lock itself (taartgevecht/sounds.ts).
        meta: {
            id: 'taartgevecht', label: 'Taartgevecht', music: 'gek', input: 'keypad', timed: false, players: '1-2', round: {}, accepts: KEYPAD_NUMBER,
            options: duelOptions(), sounds: { correct: null, wrong: null, miss: 'plop', win: 'jingle' },
        },
        icon: Cake,
        Screen: lazy(() => import('./taartgevecht/Taartgevecht')),
    },
    {
        // A duel (duel/ engine, DUEL.md): a right answer = a tongue snap at a bug (fly 1, beetle 2, golden dragonfly 5),
        // a mistake costs a life; Hoe winnen? = 2 minutes or the first to 25 (kikkers/rule.ts). The scene voices its own moments.
        meta: {
            id: 'kikkers', music: 'weide', label: 'Kikkers en vliegjes', input: 'keypad', timed: false, players: '1-2', round: {}, accepts: KEYPAD_NUMBER,
            options: duelOptions({ extras: [WINNEN_OPTION] }),
            sounds: { correct: null, wrong: null, miss: null, win: 'jingle' },
        },
        icon: BugBeetle,
        Screen: lazy(() => import('./kikkers/Kikkers')),
    },
    {
        // A duel (DUEL.md): own sums each; every right answer casts a spell by itself, by the streak (tovenaarsduel/rule.ts:
        // IJspijl 1, Vuurbal 2, Bliksem 3, then a Schild). Big hits, so the lives are 20 / 30 / 40. The scene voices its moments.
        meta: {
            music: 'griezel', id: 'tovenaarsduel', label: 'Tovenaarsduel', input: 'keypad', timed: false, players: '1-2', round: {}, accepts: KEYPAD_NUMBER,
            options: duelOptions({ lives: { choices: TOVER.lives.choices, default: TOVER.lives.default } }),
            sounds: { correct: null, wrong: null, miss: null, win: null },
        },
        icon: MagicWand,
        Screen: lazy(() => import('./tovenaarsduel/Tovenaarsduel')),
    },
    {
        // An obstacle-course duel (DUEL.md, course/): every sum is the next obstacle, a clear = +1, a crash nothing, a catch-up
        // turbo (monstertrucks/rule.ts). No lives: the levens row is the course's length. The scene voices its moments.
        meta: {
            music: 'race', id: 'monstertrucks', label: 'Monstertrucks', input: 'keypad', timed: false, players: '1-2', round: {}, accepts: KEYPAD_NUMBER,
            options: duelOptions({ lives: TRUCK.finish }),
            sounds: { correct: null, wrong: null, miss: null, win: 'jingle' },
        },
        icon: Truck,
        Screen: lazy(() => import('./monstertrucks/Monstertrucks')),
    },
    {
        // A tilt duel (DUEL.md): a one-minute joust, each right answer gears that knight up; at the end they charge and the
        // most right answers wins the tilt, the same = a draw (steekspel/rule.ts). One joust = one round, no levens row.
        // The scene voices its moments.
        meta: {
            music: 'kasteel', id: 'steekspel', label: 'Steekspel', input: 'keypad', timed: false, players: '1-2', round: {}, accepts: KEYPAD_NUMBER,
            options: JOUST_OPTIONS,
            sounds: { correct: null, wrong: null, miss: null, win: 'jingle' },
        },
        icon: Horse,
        Screen: lazy(() => import('./steekspel/Steekspel')),
    },
    {
        // Valentijn: memory with 4 / 6 / 8 sums and their answers on 8 / 12 / 16 hearts (Makkelijk / Normaal / Moeilijk;
        // Onmogelijk = 16 hearts and 10 wrong guesses per board, then the friendly end), 2 boards. A sum card turned
        // first and then a wrong answer, twice for the same sum, logs that sum once (board/session.ts) and breaks its
        // heart (the skin voices it: hit). Answers up to 5 characters ("10/12") fit a card; breuken pair a picture with its
        // breuk, or a breuk with its vereenvoudigde breuk. Hearts only: the footballs are Voetbalkaartjes. A pair's big heart bursts: launch.
        meta: {
            music: 'zacht',
            id: 'hartjes', label: 'Hartjes koppelen', input: 'board', timed: false, season: 'valentijn', options: HARTJES_OPTIONS,
            canFail: true, failTitle: 'Oei! Geen kansen meer. Nog eens?',
            round: { board: HARTJES_ROUND }, accepts: { kinds: ['number', 'choice'], maxAnswerChars: 5, pictures: true, board: 'pairs' },
            sounds: { correct: 'ting', wrong: null, flip: 'flip', nomatch: 'plop', hit: 'krak', launch: 'sparkle' },
        },
        icon: Heart,
        Component: lazy(() => import('../board/hartjes/Hartjes')),
        Ending: lazy(() => import('../board/hartjes/Hartjes').then(m => ({ default: m.HartjesEnding }))),
    },
    {
        // Lente: 13 sums, find every one that makes the target (3–5), on a honeycomb, a flower meadow, a comb again. A
        // wrong cell is a mistake at once. Cards whose answers rarely repeat (tot 1000) get "groter dan" a round number.
        // Gelijkwaardige breuken: "zoek alle breuken die gelijk zijn aan 1/2" (content/breuken/breukComb.ts).
        // The levels (board/honingraat/hive.ts): Makkelijk three boards, no wasp; Normaal three boards and after every
        // meadow a wasp battle (1 of 3 right); Moeilijk five boards, 2 of 3; Onmogelijk five, all right and the wasps grow
        // per battle (1, 2 …). A wasp can claim the nest (canFail). Moeilijk and Onmogelijk end with the Wespenkoningin
        // (board/honingraat/boss.ts): the round's finale, she can fly off with the honey (canFail).
        meta: {
            music: 'weide',
            id: 'honingraat', label: 'Honingraat', input: 'board', timed: false, season: 'lente', canFail: true,
            round: { board: { kind: 'target', boards: 3, size: 13, strikes: 1 } }, accepts: { kinds: ['number', 'choice'], ops: ['+', '-'], pictures: true, board: 'target' },
            options: [levelOption({ clock: false, rounds: Object.fromEntries(LEVELS.map(l => [l, { board: { kind: 'target', boards: HIVE_BOARDS[l], size: 13, strikes: 1, ...(hasBoss(l) && { finale: true }) } }])) })],
            winTitle: 'Alle honing is binnen!', failTitle: 'Oei! De wesp heeft het nest. Nog eens?',
            sounds: { correct: 'drup', wrong: 'bzz', barricade: 'krak', launch: 'zwoesj', hit: 'pop', lost: 'boing', win: 'cheer', fail: 'wahwah' },
        },
        icon: Hexagon,
        Component: lazy(() => import('../board/honingraat/Honingraat')),
        Ending: lazy(() => import('../board/honingraat/Honingraat').then(m => ({ default: m.HoningraatEnding }))),
    },
    {
        // Year-round: Hartjes koppelen's board with footballs (board/voetbalkaartjes/), a Wij – Zij scoreboard on top. A pair
        // kicks a ball into a net (tok, then launch as it goes in); a sum's logged mistake flattens its ball (caught).
        // The levels and Onmogelijk's friendly end are Hartjes koppelen's.
        meta: {
            music: 'sport',
            id: 'voetbalkaartjes', label: 'Voetbalkaartjes', input: 'board', timed: false, options: HARTJES_OPTIONS,
            canFail: true, failTitle: 'Oei! Geen kansen meer. Nog eens?',
            round: { board: HARTJES_ROUND }, accepts: { kinds: ['number', 'choice'], maxAnswerChars: 5, pictures: true, board: 'pairs' },
            sounds: { correct: 'tok', wrong: null, flip: 'flip', nomatch: 'plop', caught: 'whoosh', launch: 'zwoesj' },
        },
        icon: SoccerBall,
        Component: lazy(() => import('../board/voetbalkaartjes/Voetbalkaartjes')),
        Ending: lazy(() => import('../board/voetbalkaartjes/Voetbalkaartjes').then(m => ({ default: m.VoetbalkaartjesEnding }))),
    },
    {
        // Halloween: Hartjes koppelen's memory (same round and accepts) on the floor of a dark haunted place, read by a
        // flashlight that follows the pointer (board/spookhuis/). One of three places per round (spookhuis/pick.ts); a
        // visitor turns a lone open card back now and then (never a mistake). Pairs and mistakes are voiced by the skin.
        meta: {
            music: 'griezel',
            id: 'spookhuis', label: 'Spookhuis', input: 'board', timed: false, season: 'halloween', options: SPOOKHUIS_OPTIONS,
            round: { board: HARTJES_ROUND }, accepts: { kinds: ['number', 'choice'], maxAnswerChars: 5, pictures: true, board: 'pairs' },
            sounds: { correct: 'ting', wrong: null, flip: 'flip', nomatch: 'plop' },
        },
        icon: FlashlightIcon,
        Component: lazy(() => import('../board/spookhuis/Spookhuis')),
        Ending: lazy(() => import('../board/spookhuis/Spookhuis').then(m => ({ default: m.SpookhuisEnding }))),
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
            id: 'pakjesband', label: 'Speelgoedfabriek', input: 'choice', timed: false, round: { questions: 20 }, accepts: { ...TAP_PICTURES, maxWordChars: 8 },
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
        // Two minutes; the moles pop up a little quicker with the streak and stay up as long as the level's clock says (mollen/moles.ts).
        meta: { id: 'mollen', music: 'gek', label: 'Mollen meppen', input: 'choice', timed: true, round: { seconds: 120 }, options: [TIME_LEVELS], accepts: TAP_PICTURES, sounds: { correct: 'bonk', wrong: 'nana' } },
        icon: Hammer,
        Component: lazy(() => import('./mollen/Mollen')),
    },
    {
        // 5 minutes at the counter (frituur/rule.ts): the first customer's bubble holds the sum. A right answer serves
        // them, a wrong order walks them off, an empty patience bar too (onMiss). The bar is the shared clock (levels/clock.ts);
        // Makkelijk has none. Too many walk-offs (WALK_OFFS: 6 / 5 / 4) close the frituur: the friendly fail; Makkelijk never.
        // Score = customers helped, the best per card and level on this device. The scene voices its own moments (frituur/sounds.ts).
        meta: {
            music: 'gek',
            id: 'frituur', label: 'Frituur', input: 'keypad', timed: true, round: { seconds: FRITUUR_SECONDS }, accepts: KEYPAD_NUMBER, canFail: true,
            failTitle: 'De frituur gaat dicht! Nog eens?', options: [levelOption({ clock: true })],
            sounds: { correct: null, wrong: null, miss: null, fail: 'wahwah' },
        },
        icon: Storefront,
        Component: lazy(() => import('./frituur/Frituur')),
        Ending: lazy(() => import('./frituur/Frituur').then(m => ({ default: m.FrituurEnding }))),
    },
    {
        // 3 minutes; the four options burn in four windows of a 3 × 3 block. The fire level (brandweer/fire.ts) rises with
        // the clock and per mistake, each window sprayed out cools it; a block fully out = the next one, too hot = the early end.
        // The levels: Makkelijk = the fire never jumps and nothing collapses; otherwise the window clocks are the shared clock.
        // Five characters, like the other tap targets (measured 2026-11-17: "89 991" fits a window at 1024 × 768). The scene
        // voices its own spray, dribble, siren and pets (correct / wrong: null).
        meta: {
            id: 'brandweer', music: 'tikken', label: 'Brandweer', input: 'choice', choiceCount: 4, timed: true, round: { seconds: 180 }, canFail: true,
            options: [levelOption({ clock: true })],
            winTitle: 'Alles geblust!', failTitle: 'Oei! Het brandt te hard. Nog eens?', accepts: { ...TAP_CHOICE, maxWordChars: 7 },
            sounds: { correct: null, wrong: null, win: 'cheer', fail: 'wahwah' },
        },
        icon: FireTruck,
        Component: lazy(() => import('./brandweer/Brandweer')),
        Ending: lazy(() => import('./brandweer/Brandweer').then(m => ({ default: m.BrandweerEnding }))),
    },
    {
        // Two minutes down a slope: each sum on a gate with three flags (choiceCount). Right = a speed step, 3 in a row a
        // jump; wrong = a tumble back to step 1; a gate reached unanswered slips past (slalom/run.ts). The score is the
        // metres with a best per card and level on this device (onReport, "Wis mijn scores"). The scene voices its moments.
        // The levels: a step-1 gate takes the shared clock (slalom/run.ts paceOf); Makkelijk's tumble costs no speed. On
        // Moeilijk / Onmogelijk each fall costs a piece of gear (run.ts GEAR_ORDER); the last ski = the friendly end in a snowbank.
        meta: {
            id: 'slalom', music: 'ijs', label: 'Skislalom', input: 'choice', choiceCount: 3, timed: true, round: { seconds: 120 }, season: 'winter', accepts: { ...TAP_CHOICE, maxWordChars: 6 },
            options: [levelOption({ clock: true })], canFail: true, failTitle: 'Plof, in de sneeuw! Nog eens?',
            sounds: { correct: null, wrong: null, fail: null },
        },
        icon: PersonSimpleSki,
        Component: lazy(() => import('./slalom/Slalom')),
        Ending: lazy(() => import('./slalom/Slalom').then(m => ({ default: m.SlalomEnding }))),
    },
    {
        // A claw machine in one of five arcades (grijp/machines.ts, never the same twice in a row): 15 coins, the four
        // options on the tags of four prizes. The claw grabs the tapped one before the answer counts (grijp/claw.ts):
        // right = onto the Gewonnen shelf, wrong = it slips back onto the heap. Untimed. Five characters fit a tag
        // (measured 2026-11-17: "89 991" at 1024 × 768); tags hold clock faces and breuk pictures. The scene voices itself.
        // The levels: a clock ring per sum (the shared clock); time up = a mistake (onMiss) and the claw drops by itself on
        // a prize that is not the answer, which slips away. Makkelijk has no clock.
        meta: {
            id: 'grijp', music: 'gek', label: 'Grijpmachine', input: 'choice', timed: false, round: { questions: GRIJP.questions }, accepts: { ...TAP_PICTURES, maxWordChars: 6 },
            options: [levelOption({ clock: true })],
            sounds: { correct: null, wrong: null },
        },
        icon: Joystick,
        Component: lazy(() => import('./grijp/Grijpmachine')),
        Ending: lazy(() => import('./grijp/Grijpmachine').then(m => ({ default: m.GrijpEnding }))),
    },
    {
        // Zomer (calm): each right answer drops the next fish, plant or decoration into the tank (aquarium/tank.ts), the
        // 20th fills it; one round in 10 that is a rare white goldfish (its own end title). A single mistake never costs
        // (goalKeep); two in a row and the cat scoops the newest fish out (onSetback: one off the climb, the next right
        // answer drops a fresh one in). 30 questions at most. The scene voices its own moments (aquarium/sounds.ts).
        meta: {
            id: 'aquarium', music: 'zee', label: 'Aquarium', input: 'keypad', timed: false, round: { questions: 30, goal: TANK_GOAL, goalKeep: true }, season: 'zomer',
            winTitle: 'Het aquarium is vol!', accepts: KEYPAD_NUMBER, sounds: { correct: null, wrong: null, win: 'jingle' },
        },
        icon: FishSimple,
        Component: lazy(() => import('./aquarium/Aquarium')),
        Ending: lazy(() => import('./aquarium/Aquarium').then(m => ({ default: m.AquariumEnding }))),
    },
    {
        // An obstacle-course duel (DUEL.md, course/): every sum is the next obstacle, a clear = +1, a crash nothing; 3 in a row
        // send the storm into the other lane (a crash into it: back 1), a catch-up tailwind; levens = the course
        // (drakenrace/rule.ts). The first at the gong wins the round. The scene voices its moments (drakenrace/sounds.ts).
        meta: {
            id: 'drakenrace', music: 'kasteel', label: 'Drakenrace', input: 'keypad', timed: false, players: '1-2', round: {}, accepts: KEYPAD_NUMBER,
            options: duelOptions({ lives: { label: 'Hoe ver vliegen?', choices: DRAAK.course.choices, default: DRAAK.course.default } }),
            sounds: { correct: null, wrong: null, miss: null, win: 'jingle' },
        },
        icon: CloudLightning,
        Screen: lazy(() => import('./drakenrace/Drakenrace')),
    },
    {
        // An obstacle-course duel (DUEL.md, course/) on the zomer shelf: every sum is the next obstacle on the river, a clear
        // = +1, a crash nothing, a catch-up wave; levens = the course (wildwaterrace/rule.ts). The first raft over the
        // waterfall wins. The scene voices its moments.
        meta: {
            id: 'wildwaterrace', music: 'rivier', label: 'Wildwaterrace', input: 'keypad', timed: false, players: '1-2', round: {}, accepts: KEYPAD_NUMBER, season: 'zomer',
            options: duelOptions({ lives: { label: 'Hoe ver varen?', choices: WILD.course.choices, default: WILD.course.default } }),
            sounds: { correct: null, wrong: null, miss: null, win: 'jingle' },
        },
        icon: Waves,
        Screen: lazy(() => import('./wildwaterrace/Wildwaterrace')),
    },
];

export const skinById = (id: string) => SKINS.find(s => s.meta.id === id) ?? null;
