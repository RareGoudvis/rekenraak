# Spelen scene kit

Shared scenery and effects for the game skins, drawn in the skins' style (flat fills, the `--spel-ink`
outline). Import from `../../scene` (the index). Every layer is `pointer-events: none`, sits `position:
absolute; inset: 0` in the nearest positioned parent, and honours `reducedMotion` (pass the skin's prop):
no loops, no bursts, instant states. `paused` (the help panel) freezes the moving layers.

- **`<Clouds />`** drifting cartoon clouds that wrap round: `count`, `speed` (s per crossing), `size` [min, max] px, `band` [top%, bottom%], `layer` far / mid / near (parallax), `tint`, `outline={false}` for soft clouds, `direction`, `seed`. Stack two for depth: `<Clouds layer="far" outline={false} count={3} /><Clouds layer="near" count={2} />`.
- **`<Snow />`** falling flakes: `density` (flakes), `falling` (false = the flakes in the air land, no new ones; true again = a new snowfall), `full` (already snowing at the start), `size`, `fall`, `seed`.
- **`<Burst kind x y />`** a one-shot at a point: `splash` (water drops), `sparkle` (twinkles), `smoke` (puffs), `pieces` (confetti, or debris with `color`). `spread` px, `count`, `seed`, `onDone`; remount with a new `key` to burst again.
- **`<Cracks stage />`** an overlay inside an HTML element (`aspect`, `shape` rect / ellipse, `radius`, `origin`, `seed`); stage 0 whole, 1 short cracks, 2 grown and branched (only the new parts draw in). **`<CrackLines x y width height stage />`** is the same as an SVG group inside a skin's own SVG (a block in a tower).
- **Motions** (CSS classes, HTML or SVG): `spel-shake` (a mistake), `spel-bounce` (happy hop; `spel-loop` keeps it going), `spel-wiggle` (a taunt), `spel-pop` (appear). They use the `translate` / `rotate` / `scale` properties, so they stack on an element's own transform. `replay(el, 'spel-shake')` plays one again.
- **Geometry** (`layout.ts`, pure and seeded): `cloudLayout`, `driftX` (a cloud's x at time t, wrapping), `snowLayout`, `burstParticles`, `crackLines`, for a skin that wants the numbers itself.
