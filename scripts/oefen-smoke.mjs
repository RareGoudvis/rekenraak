// Oefenmodus kiosk smoke (O24): one leaf per input kind, answered right through the real kiosk
// UI at two viewports, all the way to the Resultaten screen. Not in the gate: it needs a dev
// server (the in-page imports below resolve to the kiosk's own module instances).
//
// Usage:
//   npx vite --port 5478 --strictPort                       # another terminal; kill it afterwards
//   node scripts/oefen-smoke.mjs --url http://localhost:5478/ --out C:/Users/ruben/Downloads/oefen-check/smoke
//   options: --only number,drag (kinds)  --viewports 1280x800,1024x768  --seed 1234  --headed
//
// Per case: the link is made the way the builder makes it (listOefenLeaves → buildSessie, one
// row, limit 1 → encodeSessie), opened in a fresh context with Math.random seeded, Start, then
// the expected answer is read in the page (kioskFor(typeId).answerOf / kioskInteractOf) and
// entered with real clicks: keypad keys, choice buttons, taps on the card, the cells, the build
// tray, a mouse drag. Juist! must show, the run must end on the locked Resultaten screen with
// "1 van 1 juist", and no console error may appear. Writes <out>/index.json in the font-baseline
// shape (rows keyed leafId-w<viewport width>-s<0|1>: s0 = the card with the answer entered,
// s1 = the Resultaten screen) plus one PNG per row, so `npm run font:compare` diffs two runs.
// Exit code 1 when any case fails.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const URL = arg('url', 'http://localhost:5173/').replace(/\/+$/, '');
const OUT = arg('out', join('.', 'oefen-smoke-out'));
const SEED = Number(arg('seed', 1234));
const VIEWPORTS = arg('viewports', '1280x800,1024x768').split(',').map(v => v.split('x').map(Number));
const ONLY = arg('only', '').split(',').filter(Boolean);
const HEADED = argv.includes('--headed');

// One leaf per input kind; `over` = settings the teacher would pick in the builder row.
const CASES = [
    { kind: 'number', leafId: 'hr-std-optellen-nat', over: {} },
    { kind: 'number+rest', leafId: 'hr-std-delen-nat', over: { multiplicationMode: 'met_rest' } },
    // Herleidingen with "eenheden zelf schrijven": keypad number + a unit button.
    { kind: 'number+unit', leafId: 'herleidingen-lengte', over: { writeUnits: true } },
    { kind: 'time', leafId: 'klok-analoog-lezen', over: {} },
    { kind: 'choice', leafId: 'vergelijken-getallen', over: {} },
    { kind: 'tap', leafId: 'vergelijken-kiezen', over: {} },
    { kind: 'tap-multi', leafId: 'even-oneven-rooster', over: {} },
    { kind: 'order', leafId: 'getalbegrip-ordenen-nat', over: {} },
    { kind: 'fill-cells', leafId: 'cijferen-optellen-nat', over: {} },
    { kind: 'build', leafId: 'geld-tekenen', over: {} },
    { kind: 'drag', leafId: 'temperatuur-kleuren', over: {} },
].filter(c => !ONLY.length || ONLY.includes(c.kind));

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: !HEADED });

// ── Links, made in one page through the builder's own helpers ────────────────
async function makeLinks() {
    const page = await browser.newPage();
    await page.goto(`${URL}/oefenen.html`);
    const links = await page.evaluate(async (cases) => {
        const { listOefenLeaves, buildSessie } = await import('/src/components/oefenen/oefenBuild.ts');
        const { encodeSessie } = await import('/src/services/oefenen/session.ts');
        const leaves = listOefenLeaves();
        return cases.map(({ leafId, over, kind }) => {
            const leaf = leaves.find(l => l.id === leafId);
            if (!leaf) return { error: `${leafId} is not in the builder list` };
            const row = { key: 'r0', leaf, constraints: { ...leaf.constraints, ...over }, limit: 1, weight: 50 };
            const settings = { id: `smoke-${kind.replace(/\W/g, '')}`, createdAt: 0, title: `Smoke ${kind}`, mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false };
            const { sessie } = buildSessie([row], settings);
            if (sessie.types.length !== 1) return { error: 'buildSessie dropped the row' };
            const data = encodeSessie(sessie);
            return data ? { data, label: leaf.label } : { error: 'encodeSessie gave no link' };
        });
    }, CASES);
    await page.close();
    return links;
}

// ── In-page reads (same module instances as the kiosk) ───────────────────────
// What is on the card and what the right answer is, from the descriptor.
async function readCard(page) {
    return page.evaluate(async () => {
        const { useOefenStore } = await import('/src/oefenen/useOefenStore.ts');
        const { kioskFor, kioskInputOf, kioskInteractOf } = await import('/src/services/oefenen/kiosk.ts');
        const { EMPTY_INTERACTION } = await import('/src/components/viewer/ViewerInteractionContext.tsx');
        const st = useOefenStore.getState();
        const cur = st.shown;
        if (!cur) return { error: `no exercise on screen (phase ${st.phase})` };
        const type = st.sessie.types[cur.slot];
        const d = kioskFor(type.typeId);
        const { exercise: ex, constraints: c } = cur;
        const input = kioskInputOf(d, ex, c);
        const out = { typeId: type.typeId, input, keys: d.keys?.(c) ?? [], accepted: d.answerOf(ex, c), choices: d.choicesOf?.(ex, c) ?? d.choices ?? [] };
        if (input !== 'interactive') return out;
        const ia = kioskInteractOf(d, c);
        const parts = ia.keys?.(ex, c) ?? [];
        const from = (s) => ia.fromState({ ...EMPTY_INTERACTION, ...s }, ex, c);
        const want = ia.answerOf(ex, c);
        Object.assign(out, { interact: ia.kind, want, parts });
        if (ia.kind === 'tap') out.tap = [parts.find(k => from({ selected: [k] }) === want)];
        if (ia.kind === 'tap-multi') {
            const wanted = want.split(' · ').map(s => s.trim()).filter(Boolean);
            out.tap = parts.filter(k => wanted.includes(from({ selected: [k] })));
        }
        if (ia.kind === 'order') {
            // ordenen: its display values sorted the way the operator reads.
            const { numValue } = await import('/src/services/math/answerKeys.ts');
            out.tap = [...parts].sort((a, b) => (numValue(ex.display[Number(a)]) - numValue(ex.display[Number(b)])) * (ex.operator === '<' ? 1 : -1));
        }
        if (ia.kind === 'fill-cells') {
            // Cijferen from its own numbers (carries too: the kiosk is strict), else the answer's parts.
            const { rightCells } = await import('/src/__tests__/helpers/fillCells.ts');
            out.cells = rightCells(type.typeId, d, ex, c);
        }
        if (ia.kind === 'build') out.pieces = ia.pieces?.(ex, c) ?? [];
        return out;
    });
}

const readState = (page) => page.evaluate(async () => {
    const { useOefenStore } = await import('/src/oefenen/useOefenStore.ts');
    const st = useOefenStore.getState();
    return { phase: st.phase, interaction: st.interaction, input: st.input };
});

// ── Entering the answer with real clicks ─────────────────────────────────────
const KEY_LABEL = { '-': '−' };

async function pressKeys(page, text) {
    for (const ch of text) {
        const key = ch === ' '
            ? page.locator('.kiosk-keypad button[aria-label="spatie"]')
            : page.locator('.kiosk-keypad button.kiosk-key').filter({ hasText: new RegExp(`^${(KEY_LABEL[ch] ?? ch).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
        if (await key.count() !== 1) throw new Error(`no keypad key for '${ch}'`);
        await key.click();
    }
}

// The first accepted spelling the keypad can type (',' types as '.' too).
function typeableSpelling(accepted, keys) {
    const ok = (s) => [...s].every(ch => /\d/.test(ch) || keys.includes(ch) || (ch === '.' && keys.includes(',')));
    const s = accepted.find(ok);
    if (s === undefined) throw new Error(`none of [${accepted}] typeable with keys [${keys}]`);
    return s.replace('.', ',');
}

// Fewest pieces worth exactly `target` within each piece's max (bounded change-making).
function makeUp(target, pieces) {
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const unit = pieces.reduce((g, p) => gcd(g, p.value), 0) || 1;
    if (target % unit) return null;
    const n = target / unit;
    const best = new Array(n + 1).fill(Infinity), via = new Array(n + 1).fill(-1), from = new Array(n + 1).fill(-1);
    best[0] = 0;
    pieces.forEach((p, i) => {
        const step = p.value / unit;
        const relax = (v) => { if (best[v - step] + 1 < best[v]) { best[v] = best[v - step] + 1; via[v] = i; from[v] = v - step; } };
        if (p.max === undefined) for (let v = step; v <= n; v++) relax(v);
        else for (let k = 0; k < p.max; k++) for (let v = n; v >= step; v--) relax(v);
    });
    if (best[n] === Infinity) return null;
    const counts = new Map();
    for (let v = n; v > 0; v = from[v]) counts.set(pieces[via[v]].key, (counts.get(pieces[via[v]].key) ?? 0) + 1);
    return [...counts];
}

// A real mouse drag: press on the handle, slide along the line through it (vertical first,
// then horizontal) until the store holds the wanted value, release there.
async function dragTo(page, key, want) {
    const surface = page.locator('.kiosk-card [data-kiosk-drag]').first();
    const box = await surface.boundingBox();
    if (!box) throw new Error('no drag surface');
    const handle = page.locator(`.kiosk-card [data-kiosk-handle="${key}"]`).first();
    const hb = (await handle.count()) ? await handle.boundingBox() : null;
    const x0 = hb ? hb.x + hb.width / 2 : box.x + box.width / 2;
    const y0 = hb ? hb.y + hb.height / 2 : box.y + box.height / 2;
    const value = async () => (await readState(page)).interaction.drag?.[key];
    for (const axis of ['y', 'x']) {
        await page.mouse.move(x0, y0);
        await page.mouse.down();
        const [lo, hi] = axis === 'y' ? [box.y, box.y + box.height] : [box.x, box.x + box.width];
        for (let p = lo; p <= hi; p += 1) {
            await page.mouse.move(axis === 'x' ? p : x0, axis === 'y' ? p : y0);
            if (String(await value()) === want) { await page.mouse.up(); return; }
        }
        await page.mouse.up();
    }
    throw new Error(`no drag along the handle reaches ${want} (last ${await value()})`);
}

async function enter(page, card) {
    const check = page.locator('.kiosk-key-check, .kiosk-check-wide').first();
    if (card.input === 'choice') {
        const right = card.accepted.find(a => card.choices.includes(a));
        await page.locator('.kiosk-choice').filter({ hasText: new RegExp(`^${right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();
    } else if (card.input === 'number+rest' || card.input === 'time' || card.input === 'multi-number') {
        const fields = page.locator('.kiosk-fields input');
        const values = card.input === 'time'
            ? card.accepted[0].split(':')
            : card.input === 'number+rest' ? card.accepted : card.accepted.map(a => a.split('|')[0]);
        for (let i = 0; i < values.length; i++) {
            await fields.nth(i).click();
            await pressKeys(page, card.input === 'time' ? values[i] : typeableSpelling([values[i]], card.keys));
        }
    } else if (card.input === 'number+unit') {
        await page.locator('.kiosk-fields input').first().click();
        await pressKeys(page, typeableSpelling([card.accepted[0]], card.keys));
        await page.getByRole('radiogroup', { name: 'Kies de eenheid' }).getByRole('radio', { name: card.accepted[1], exact: true }).click();
    } else if (card.input === 'text') {
        await page.locator('.kiosk-fields input').first().fill(card.accepted[0]);
    } else if (card.input === 'interactive') {
        if (card.tap) {
            if (card.tap.some(k => k === undefined)) throw new Error(`no part gives ${card.want}`);
            for (const k of card.tap) await page.locator(`.kiosk-card [data-kiosk-key="${k}"]`).first().click();
        } else if (card.cells) {
            for (const [k, v] of Object.entries(card.cells)) {
                if (!v) continue;
                await page.locator(`.kiosk-card input[data-kiosk-cell][data-kiosk-key="${k}"]`).click();
                await pressKeys(page, v);
            }
        } else if (card.pieces) {
            const laid = makeUp(Number(card.want), card.pieces);
            if (!laid) throw new Error(`the tray cannot make ${card.want}`);
            for (const [k, n] of laid) for (let i = 0; i < n; i++) await page.locator(`[data-tray-key="${k}"]`).click();
        } else if (card.interact === 'drag') {
            if (card.parts.length !== 1) throw new Error(`drag smoke handles one handle, got ${card.parts}`);
            await dragTo(page, card.parts[0], card.want);
        } else throw new Error(`no recipe for ${card.interact}`);
    } else {
        await page.locator('.kiosk-fields input').first().click();
        await pressKeys(page, typeableSpelling(card.accepted, card.keys));
    }
    if (await check.isDisabled()) throw new Error('Controleer stays disabled after the answer');
    return check;
}

// ── One case at one viewport ─────────────────────────────────────────────────
async function runCase(c, link, [w, h]) {
    const base = { leafId: c.leafId, path: `oefenmodus › ${c.kind}`, typeId: '', width: w };
    const rows = [];
    const errors = [];
    const context = await browser.newContext({ viewport: { width: w, height: h } });
    // mulberry32: the same exercise every run, so two runs diff cleanly.
    await context.addInitScript((seed) => {
        let a = seed >>> 0;
        Math.random = () => {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }, SEED);
    const page = await context.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    const shot = async (solutions, locator) => {
        const name = `${c.leafId}-w${w}-s${solutions}.png`;
        await locator.screenshot({ path: join(OUT, name) });
        const box = await locator.boundingBox();
        return { ...base, solutions, cellHeightPx: Math.round(box.height), intrinsicPx: Math.round(box.width), text: await locator.innerText(), screenshot: name, consoleErrors: [...errors] };
    };
    try {
        if (link.error) throw new Error(link.error);
        await page.goto(`${URL}/oefenen.html#oefen=${link.data}`);
        await page.getByRole('button', { name: 'Start' }).click();
        await page.locator('.kiosk-card').waitFor();
        const card = await readCard(page);
        if (card.error) throw new Error(card.error);
        base.typeId = card.typeId;
        const kind = card.input === 'interactive' ? card.interact : card.input === 'missing-operand' ? 'number' : card.input;
        if (kind !== c.kind) throw new Error(`expected input kind ${c.kind}, the card asks ${kind}`);
        const check = await enter(page, card);
        rows.push(await shot(0, page.locator('.oefen-app')));
        await check.click();
        const verdict = (await page.locator('.kiosk-feedback-text').innerText()).trim();
        if (!/^Juist/.test(verdict)) throw new Error(`feedback "${verdict}" for ${JSON.stringify(card.want ?? card.accepted)}`);
        // The flash goes on by itself; limit 1 ends the run on the locked Resultaten screen.
        await page.locator('.kiosk-stats-total').waitFor({ timeout: 5000 });
        const total = (await page.locator('.kiosk-stats-total').innerText()).trim();
        if (!/\b1 van 1 juist\b/.test(total)) throw new Error(`Resultaten says "${total}"`);
        rows.push(await shot(1, page.locator('.oefen-app')));
        if (errors.length) throw new Error(`console: ${errors.join(' | ')}`);
        console.log(`  ok    ${c.kind.padEnd(11)} ${c.leafId} @${w}x${h}: ${verdict} → ${total}`);
        return rows.map(r => ({ ...r, kind: c.kind, ok: true }));
    } catch (err) {
        const name = `${c.leafId}-w${w}-fail.png`;
        try { await page.screenshot({ path: join(OUT, name) }); } catch { /* page gone */ }
        console.log(`  FAIL  ${c.kind.padEnd(11)} ${c.leafId} @${w}x${h}: ${err.message}`);
        return [...rows.map(r => ({ ...r, kind: c.kind, ok: false })), { ...base, solutions: rows.length, kind: c.kind, ok: false, error: err.message, screenshot: name, consoleErrors: [...errors] }];
    } finally {
        await context.close();
    }
}

const t0 = Date.now();
const links = await makeLinks();
const rows = [];
for (const [w, h] of VIEWPORTS) {
    console.log(`viewport ${w}x${h}`);
    for (let i = 0; i < CASES.length; i++) rows.push(...await runCase(CASES[i], links[i], [w, h]));
}
await browser.close();

const failed = rows.filter(r => r.error);
writeFileSync(join(OUT, 'index.json'), JSON.stringify({ url: URL, seed: SEED, widths: VIEWPORTS.map(([w]) => w), viewports: VIEWPORTS.map(v => v.join('x')), leafCount: CASES.length, rows }, null, 2));
console.log(`\n${CASES.length} kinds × ${VIEWPORTS.length} viewports: ${CASES.length * VIEWPORTS.length - failed.length} ok, ${failed.length} failed in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${OUT}`);
process.exit(failed.length ? 1 : 0);
