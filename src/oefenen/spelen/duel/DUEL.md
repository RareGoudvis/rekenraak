# Duel games: how to build one

A duel = two sides on one screen (left Blauw, right Oranje), or 1 speler against the computer (the bot plays
the right side). The engine in this folder runs everything a duel shares: question streams, checking, lives,
points, the clock per sum (the four levels), the bot, rounds and best of, the HUD, keypads, the round and match cards, sounds
and music. A game supplies **a rule** (what an answer does) and **a scene** (the picture in the band on top).
Touwtrekken (`skins/touwtrekken/`) and Kasteel (`skins/kasteel/`) are the two worked examples.

## Files

| File | What |
|---|---|
| `types.ts` | `Side`, `DuelConfig`, `DuelRule`, `DuelEffect`, `DuelCtx`, `DuelFlight`, `DuelEventMap` |
| `rules.ts` | pure: `winsNeeded` / `matchWinnerOf`, `applyEffect`, `defaultRoundOver`, `hitRule`, `ropeRule`, `leadOf`, `DUEL_TIMING`, `SHARED_TRIES` |
| `bot.ts` | pure: `BOT` tuning table (a row per level), `botTurn(level, { lead, answerChars, paceMs, shared }, rng)`: it follows the pupil's pace (`nextPace`, the store keeps `paceMs` per side) and a rubber band on the lead; with a clock the store has it answer at the latest `BOT.beatClockMs` before the ring runs out; win rates per game and level in `spelen.bot.test.ts` |
| `../levels/` | shared with the solo games: `levels.ts` (`Level`, `levelOption`, `levelOf`), `clock.ts` (`clockMs(level, elapsedMs)`: the clock rule) |
| `duelStore.ts` | the zustand store `useDuelStore` (one match at a time); dev builds expose it as `window.__duel` |
| `options.ts` | `duelOptions(spec)` (the shared pre-start options), `MANIER_OPTION`, `duelConfigOf(chosen, extra)` |
| `useDuel.ts` | `useDuelMatch(meta, from, rule, extra?)`, `useDuelEvent(name, fn)` |
| `DuelScreen.tsx` | the whole screen around your scene; `DuelHud.tsx` its pieces; `teams.ts` names / colours |
| `DuelKeypad.tsx`, `duel.css` | the keypads and all shared styles (`duel-*` classes) |

## A new duel game in four files

```
skins/<id>/rule.ts      the DuelRule (pure, unit-tested) + your tuning constants
skins/<id>/<Name>.tsx   the screen: useDuelMatch + events -> your scene -> <DuelScreen>
skins/<id>/<id>.css     your scene; prefix your classes (tg-, kv-, rd-, mt-)
skins/<id>/sounds.ts    optional: your own sounds (see Sounds)
```

```tsx
// skins/taartgevecht/Taartgevecht.tsx
export default function Taartgevecht({ meta, from, onExit }: SkinScreenProps) {
    // Begins the match from the picked options before the first paint; stops it on unmount.
    const st = useDuelMatch(meta, from, TAART_RULE, { stream: 'shared', wrongLockMs: 2000 });
    const [splats, setSplats] = useState(0);
    useDuelEvent('damage', ({ side }) => setSplats(n => n + 1));
    return <DuelScreen meta={meta} onExit={onExit} className="tg-app" rightNote="Raak!"
        scene={<TaartScene sides={st.sides} flights={st.flights} phase={st.phase} winner={st.roundWinner} />} />;
}
```

Register it in `skins/registry.ts` (one entry, a `Screen`, no `Component`):

```ts
{
    meta: {
        id: 'taartgevecht', label: 'Taartgevecht', music: 'gek', input: 'keypad', timed: false, players: '1-2', round: {},
        accepts: KEYPAD_NUMBER, options: duelOptions({ extras: [] }),
        // null = your scene voices that moment itself (see Sounds)
        sounds: { correct: null, wrong: 'plop', miss: 'plop', win: 'jingle' },
    },
    icon: Cake,
    Screen: lazy(() => import('./taartgevecht/Taartgevecht')),
},
```

`players: '1-2'` puts the tile under "Samen spelen" with the two-pupils mark. Add a blurb in
`zelf/gameBlurbs.ts`. Nothing else in the shell changes.

## The options and the config

`duelOptions(spec)` gives, in order: **spelers** (1 / 2, default 2; `spec.players: 1` preselects 1),
**levens** (5 / 10 / 15 / 20 / 25, default 10; rename with `spec.lives = { label, unit, choices, default }`),
**niveau** (`levelOption({ clock: true })`: Makkelijk / Normaal / Moeilijk / Onmogelijk with their clock and flame
icons, default Normaal, a whole line; shown for 1 and 2 spelers), **rondes** (1 / 3 / 5, default 3),
then `spec.extras` (your own `SkinOption`s; use `when: { id: 'spelers', value: '2' }` for a 2-only option).
`MANIER_OPTION` is the "Elk een eigen som / Samen één som" extra for games that offer both streams.

`useDuelMatch` turns the picks into a `DuelConfig` (`duelConfigOf`); its 4th argument overrides fields:

| field | meaning |
|---|---|
| `players` | 1 = the bot on the right |
| `level` | `makkelijk` = no clock; `normaal` / `moeilijk` / `onmogelijk` = a clock per sum per side from the shared rule (`levels/clock.ts`): 12 s through the round's first minute, then −1 s every 60 / 45 / 30 s, floor 8 / 6 / 4 s. Elapsed = the round's play time (a pause does not count); every round starts again at 12 s. 1 speler: the level also picks the bot's row (gentle / normal / stronger / strongest); 2 spelers: only the clock |
| `lives` | per side at the start of every round |
| `bestOf` | 1 / 3 / 5 |
| `stream` | `'own'` each side its own sums; `'shared'` one sum, both type at once, first right answer takes it |
| `roundSeconds` | a round clock (Touwtrekken 120, Kikkers Op tijd 120); at 0 `roundOver(view, true)` decides |
| `wrongLockMs` | shared: a wrong answer locks that keypad this long (default 2000), then it may try again; 2 wrong tries (`SHARED_TRIES`) or a time-out = out for that sum; both out = the answer shows, next sum |
| `readyMs` | the "Ronde N" banner (default 1400; tests pass 0) |
| `rng` | the bot's randomness (tests) |

Own stream: after an answer the side sees a flash (right 700 ms, wrong 1500 ms with the answer), then its next
sum. The flash is the cost of a wrong answer unless your rule adds one.

## The rule

All hooks are optional and pure; they get a `DuelCtx` and return a `DuelEffect`.

```ts
interface DuelCtx { side; other; me; them; streak; level; round; config }   // me / them: { lives, points, streak, right, wrong, flags }
interface DuelEffect {
    damage?: { left?: n; right?: n };            // lives off (negative = back on); never below 0, never over rule.maxLives
    points?: { left?: n; right?: n };
    flags?:  { left?: { guard: 1 }; ... };       // your per-side memory, merged; 0 clears; reset every round
    launch?: { ms; to?; tag?; data?; effect? };  // something flies; its effect applies when it lands
    tag?: string;                                // carried on the damage / points / effect events ('special', 'blocked')
}
```

| hook | when | absent = |
|---|---|---|
| `right(ctx)` | a right answer (`ctx.streak` already counts it) | the other side −1 life |
| `wrong(ctx)` | a wrong answer | nothing |
| `timeout(ctx)` | the sum's time ran out (every level but Makkelijk) | `wrong` |
| `land(ctx, flight)` | a launch arrives (`ctx.side` = who launched) | `flight.effect` |
| `roundOver(view, timeUp)` | after every effect, and at the round clock | a side at 0 lives loses (both = draw); at the clock more lives, then more points, else a draw |
| `maxLives(config)` | lives ceiling | none |
| `cardMs` | your round-win moment before the scoreboard card | 1600 ms |

The examples from the brief:

```ts
// Robotduel: punch; 3 in a row = special for 2; a wrong answer drops your guard: the next hit on you counts double.
right: ({ other, streak, them }) => {
    const hit = (streak % 3 === 0 ? 2 : 1) * (them.flags.guard ? 2 : 1);
    return { damage: { [other]: hit }, flags: { [other]: { guard: 0 } }, tag: streak % 3 === 0 ? 'special' : undefined };
},
wrong: ({ side }) => ({ flags: { [side]: { guard: 1 } } }),

// Meteorietenregen: a meteor flies 3 s; 2 in a row raise a shield (max 2) that eats one meteor on landing.
right: ({ side, other, streak, me }) => ({
    launch: { ms: 3000, tag: 'meteor', effect: { damage: { [other]: 1 } } },
    ...(streak % 2 === 0 && { flags: { [side]: { shield: Math.min(2, (me.flags.shield ?? 0) + 1) } } }),
}),
land: ({ them }, f) => (them.flags.shield
    ? { flags: { [f.to]: { shield: them.flags.shield - 1 } }, tag: 'blocked' }
    : f.effect),

// Kikkers: points per bug, the round to 25 (or the clock); lives = mistakes.
wrong: ({ side }) => ({ damage: { [side]: 1 } }),
roundOver: (v, timeUp) => /* 25 points wins, else defaultRoundOver(v, timeUp) */,
```

**A race** has no lives: reuse the levens row as the course with
`duelOptions({ lives: { label: 'Hoe ver …?', choices, default } })`, move with `points`, and end the round in `roundOver`
when a side's points reach `config.lives`. Streak effects read `streak` from the ctx (every 3rd in a row); keep a
knock-back mild or a faster bot runs away with Normaal.

**A timed round** (Steekspel): no levens row; the round runs on the engine's round clock (`extra.roundSeconds`, the
one-minute joust) and `roundOver(v, timeUp)` decides on time up (most points wins, a tie = a draw).

**An obstacle course** (Monstertrucks, Drakenrace, Wildwaterrace) builds on `../course/`: `courseRule(spec)` (a clear
= +1 tag `clear`, a wrong answer or a time-out = a crash tag `crash`, the first through `config.lives` obstacles wins;
`spec.catchUp` = +1 more on every 3rd in a row of a side behind, tag `turbo`; `spec.right` / `spec.crash` add a game's
own, as Drakenrace's storm), `courseKind(kinds, round, index)` (the varied course both lanes race) and
`useCourse({ w, holdOf, onContact, onFinish })`: a frame loop that steps each lane from the store (`stepLane`, pure:
the obstacle appears past the band's edge with each new sum and reaches the vehicle as the sum's clock runs out;
Makkelijk rolls up and waits in front of it; an answer rushes the vehicle in, `COURSE.rushMs` at most, and the contact
is the clear or the crash; a crash stands still `COURSE.stopMs`; the round's winner drives on to its finish). It moves
the groups you bind (`vehicleRef`, `obstacleRef`, `finishRef`, `groundRef`, `layerRef`, `wheelRef`, `motionRef`) and
hands React only the moments (`obstacles`, `vehicles[side].outcome / n / go / waiting`, `finish`). `CourseBar` is the
race map at the top of the band, `useBandWidth(h)` the scene's width from the band's shape. Screen tests fake
`requestAnimationFrame` with the timers (`spelen.monstertrucks.test.tsx`).

A rule may read your component's refs (Kikkers: which bug is nearest) because hooks run synchronously inside
`answer()`. For things that happen without an answer (a bug flies off, a hazard), call
`useDuelStore.getState().effect(by, effect)`: the same path, events and round check.

## State you draw from (`useDuelStore()` / `st` from `useDuelMatch`)

`phase` (`idle` · `ready` · `play` · `roundEnd` · `matchEnd`), `round`, `config`, `sides.left|right`
(`lives`, `points`, `streak`, `right`, `wrong`, `flags`, `wins`, `totalRight`, `question`, `feedback`, `locked`,
`out`, `limitMs`), `flights` (in the air: `id`, `from`, `to`, `tag`, `startedAt`, `landsAt`, `data`),
`roundWinner`, `matchWinner`, `card` (the scoreboard / match card is up), `paused` (see below).

Flights are state: draw each one from `startedAt` to `landsAt` with a CSS animation keyed by `id` (Kasteel's
stones). The engine lands it on time; your scene never decides a hit.

## Events (`useDuelEvent(name, fn)`)

`roundStart {round}` · `play {round}` · `right {side, given, streak, ms}` · `wrong {side, given, expected}` ·
`timeout {side, expected}` · `effect {by, cause, effect}` · `damage {side, by, amount, lives, tag}` ·
`points {side, amount, points, tag}` · `launch {flight}` · `land {flight}` (just before its damage) ·
`roundEnd {winner, round, wins}` · `matchEnd {winner, wins}`. Reset your scene's own counters on `roundStart`.

## The screen (`<DuelScreen>`)

Props: `meta`, `onExit`, `scene` (fills `.duel-world`, absolutely positioned), `className` (your root class;
set `--duel-scene-h` for the band's share, default 46 %, `--duel-left` / `--duel-right` for team colours),
`teams` (names / colours over Blauw / Oranje, Jij / Computer), `hearts` (false when your scene shows lives),
`points` (the score counts the round's points instead of its right answers), `score` (false when your scene's
own HUD shows the score: Robotduel's bars, Kasteel's life bars, both with `ScoreStar` / a chip),
`rightNote` ("Raak!"), `cardArt` (a picture on the cards).

It brings: the top bar (Terug, names + round dots + "Ronde N", the round clock, sound), the lives (hearts) and
the round's score (a star) in the band's top corners, the "Ronde N" / "Start!" banner, two halves in the team
colours (no name pill: the colour says whose half it is) with the sum (the clock ring beside it, on the
outer edge), the note and a keypad (1 speler: the computer's face on the right, the left keypad also takes the
keyboard), the round card ("Volgende ronde") and the match card (trophy, confetti, "Nog eens", "Ander spel").
Music: `meta.music` while playing. The halves never shrink under their content (a keypad of 48 px keys), so on
a low screen the band gives way: a big `--duel-scene-h` is safe. Looks checked at 1280×800, 1920×1080 and
1024×768.

A phone held upright (`UPRIGHT_PHONE`, kiosk/RotatePrompt.tsx) gets "Draai je toestel" over the duel and the
engine pauses (`pause()` / `resume()`, ready and play only): every timer keeps what it had left, and on resume
the deadlines, `roundEndsAt` and the flights shift by the pause; answers and effects wait; `.duel-app.is-paused`
stops the scene's CSS animations. A scene's own JS loop (Kikkers' bugs) runs on; it cannot change the match
while paused.

## Sounds

DuelScreen plays `meta.sounds` cues: `correct` on right, `wrong` on wrong, `miss` on a time-out, `win` at the
match end (1 speler lost: `lost`), and a cheer for a won round. Set a cue to `null` to voice it yourself.
Your own sounds: build a `Recipe` from `tone` / `noise` (exported by `sound.ts`) in your folder and play it
with `playRecipe(recipe)` (same on / off and soft master as every game sound). Never edit sound.ts for them.

## Tests

Pure logic in `rule.ts` gets unit tests (see `spelen.duel.test.tsx` for the engine, `spelen.kasteel.test.tsx`
for a game). Drive the store with fake timers:

```ts
du().begin({ meta, from, rule: MY_RULE, config: { players: 2, level: 'makkelijk', lives: 3, bestOf: 3, stream: 'own', readyMs: 0 } });
// level 'makkelijk' = no clock per sum, so a test can wait without time-outs; 'normaal' and up time out after 12 s.
du().answer('left', du().sides.left.question!.answer);
vi.advanceTimersByTime(DUEL_TIMING.flashRight);
```

A screen test renders `<MyGame meta={resolveMeta(meta, { spelers: '2' })} from={from} onExit={fn} />`, then
`act(() => vi.advanceTimersByTime(DUEL_TIMING.readyMs))`. For a deterministic bot in a screen test set
`useDuelStore.setState(s => ({ config: { ...s.config, rng: () => 0.5 } }))` before the ready time ends (never
mock `Math.random`: the exercise generators loop on it).

## Playwright

`scripts/duel-shots.mjs` plays a whole match and shoots ready / play / right / wrong / round card / match card
per size and player count (picks go into the remembered options, so Start begins that match):

```
npm run dev -- --port 5401
node scripts/duel-shots.mjs --url http://localhost:5401/ --game taartgevecht --label Taartgevecht --out C:/tmp/<you>-scratch/shots \
  --sizes 1280x800,1024x768 --players 1,2 --picks '{"niveau":"onmogelijk","levens":"5","rondes":"3"}'
```

By hand in a page: `window.__duel.getState()` (dev builds) has `answer(side, given)`, `effect(by, e)`,
`nextRound()`; e.g. `const d = __duel.getState(); d.answer('left', d.sides.left.question.answer)`.

## Thumbnails

Add a `GAMES` row in `scripts/spel-thumbs.mjs` (`['taartgevecht', 'Taartgevecht', 2]`: right answers before the
shot) and run `npm run spel:thumbs -- --only taartgevecht --url http://localhost:5401/`. The script hides the
keypads, HUD, hearts, banner and cards and lets the scene band fill the picture (`DUEL_CSS`); add a `SKIN_CSS`
line if your scene shows numbers. Look at the PNG (`--raw <dir>`) before committing the webp.
