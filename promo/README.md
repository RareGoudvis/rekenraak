# Promo video

`npm run promo:video` films the real app and renders one vertical Reel for Facebook (teachers, Flemish
primary): `promo/out/rekenraak-promo-9x16.mp4` (1080x1920, H.264 + AAC, 30 fps, yuv420p, faststart, ~42 s),
`promo/out/contact-sheet.png` (one frame per beat) and `promo/out/frames/` (three frames per beat, to review).
`promo/out/` is gitignored; `promo/out/work/` keeps the raw frames and the per-beat clips.

## Re-render

```bash
npm run promo:video                                   # starts its own dev server (a few minutes)
npm run promo:video -- --url http://localhost:5173/   # a dev server you already run
npm run promo:video -- --only spellen,inhoud          # re-film these beats, reuse the others from promo/out/work
npm run promo:video -- --only qr --draft              # just that beat's clip (promo/out/work/beat-qr.mp4), no final video
npm run promo:video -- --headed                       # watch the browser
```

Needs ffmpeg: PATH first, then winget's `Gyan.FFmpeg` folder under `%LOCALAPPDATA%\Microsoft\WinGet\Packages`, or
`FFMPEG=<path>`. Playwright's Chromium is already a devDependency.

## How it works

- Every beat opens its own Playwright context with the device's viewport (tablet 1180x820, phone 390x844,
  laptop 1440x900), Math.random seeded (the same mulberry32 as the other harnesses), every first-run card and
  banner marked seen, the games' sound and music off (`SOUND_KEY` / `MUSIC_KEY` = '0'), fullscreen stubbed (it
  would resize the headless window), a tap ring drawn where the finger lands, and Verborgen prent hidden.
- Frames come from a CDP screencast (`Page.startScreencast`, JPEG 90) at device scale 2: Chromium only sends
  2x frames with `--force-device-scale-factor=2`. Marks taken during the actions pick the windows that end up
  in the film; a window can be sped up (typing, waiting).
- Background, the drawn device frame (generic dark bezel, no logo) and the captions (Nunito from
  `@fontsource/nunito`) are HTML layers rendered to PNG; ffmpeg composes each shot, joins the beats with 0.25 s
  crossfades and lays `public/spelen/music/weide.mp3` (CC0, see its CREDITS.md) under it, looped, faded, at 0.55.
- Captions stay inside the 4:5 feed crop and clear of the top 250 px and bottom 350 px (`SAFE` in the script).

## The beats

| # | Beat | What is filmed |
|---|---|---|
| 1 | hook | the finished sheet from beat 2 as paper (nothing selected, editor buttons hidden) → Zeehondjes voeren (optellen tot 10) |
| 2 | werkblad | editor, Eenvoudig: Maaltafels → Tafel van 5, Klok en kalender → Analoge klok lezen (laptop; the inspector is cropped off) |
| 3 | qr | phone: the stappenhulp opened with the payload the sheet's footer QR carries, two steps, Nog meer van deze oefening → Start |
| 4 | oefenmodus | tablet: an Oefenmodus link (Analoge klok lezen), "half 9" typed as 9:30, steps, Nog eens proberen, 8:30 right |
| 5 | zelf | kind.html: leerjaar 3, scroll, Maaltafels, Welke tafels? 2, 5, 10 |
| 6 | spellen | Voetbal (goal), Zombies (blowdart), Race Benzine (petrol station), Pinguïntoren (break and splash), Ballonnen (optellen tot 20, pop), Kasteel (a shot) |
| 7 | inhoud | the kiosk at tafels, klok, breuken, kommagetallen (1 s each) |
| 8 | close | the app icon and wordmark, "Gratis · geen reclame · geen account", rekenraak.be |

Deviations from the storyboard: the stappenhulp shows no MAB picture on a phone (the app turns MAB off below
600 px wide, `mabFitsScreen`), so beat 3 shows the worked lines; the editor is filmed on a laptop, not a tablet.

## When a screen changes

Each beat is one function in `scripts/promo-video.mjs` (`beatWerkblad`, `beatQr`, `beatOefenmodus`, `beatZelf`,
`beatSpellen`, `beatInhoud`, `hookGame`, the `close` row). They find things by visible text and role, so:

- A renamed button, card or topic (e.g. "Nog eens proberen", "Tafel van 5", a `.zelf-topic` data-topic): change
  the text in that beat.
- A game's moment moved (more passes before a shot, a station later): the comments in `beatSpellen` name the rule
  and the file it comes from (voetbal/match.ts, race/benzine.ts, pinguintoren); adjust the off-camera answers.
- A failed step leaves `promo/out/work/failed-step.png`; re-film just that beat with `--only <beat>`.
- Captions and timings live in `BEATS` and in the `[from, to, speed]` windows of each beat.
- Seasonal game tiles follow `?spelDatum=` (fixed in `KIND`), so the film does not change with the calendar.
- Never film Verborgen prent (photo rights): `filmAids` hides its tile and thumbnails; keep it out of new beats.
