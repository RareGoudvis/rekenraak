// Screenshots for the teacher manual (handleiding.html): drives the real app, the kiosk, the
// stappenhulp and Bordmodus the way a teacher or pupil clicks them, and writes one PNG per figure
// to public/handleiding/. Math.random is seeded in every page, so a re-run only changes a picture
// when the app itself changed. Not in the gate.
//
// Usage:
//   npm run handleiding:shots                                  # starts its own dev server
//   npm run handleiding:shots -- --url http://localhost:5173/  # use a server you already run
//   options: --only werkblad,sleutel,oefenmodus,zelf,bord (figure groups)  --headed  (env SHOTS_DEBUG=<dir>: a screenshot per failed step)
//
// The Oefenmodus figures (oefenmodus-*) are made in one function, shotsOefenmodus(), so they can be
// redone on their own (--only oefenmodus) when that screen changes.

import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startDevServer } from './lib/devServer.mjs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const EXTERNAL_URL = arg('url', '');
const ONLY = arg('only', '').split(',').filter(Boolean);
const HEADED = argv.includes('--headed');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'handleiding');
mkdirSync(OUT, { recursive: true });

const own = EXTERNAL_URL ? null : await startDevServer();
const BASE = (EXTERNAL_URL || own.url).replace(/\/+$/, '');
const browser = await chromium.launch({ headless: !HEADED });
let failed = 0;

// The same mulberry32 the dev harness uses (src/main.tsx), installed before any app code runs.
function seedScript(seed) {
    let a = seed;
    Math.random = () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Every first-run card, banner and modal already seen, so a figure shows the screen itself.
async function releaseVersion() {
    const page = await browser.newPage();
    await page.goto(`${BASE}/`);
    const v = await page.evaluate(async () => (await import('/src/config/version.ts')).RELEASE_VERSION);
    await page.close();
    return v;
}
const RELEASE = await releaseVersion();
function seenKeys({ release, mode }) {
    const keys = {
        rekenraak_tour_seen_v1: '1', rekenraak_release_seen_v1: release, rekenraak_upgrade_seen_v1: release,
        rekenraak_tryout_seen_v1: '1', rekenraak_eenvoudig_banner_seen_v1: '1', rekenraak_print_hint_seen_v1: '1',
        rekenraak_firstrun_oefenmodus_v1: '1', rekenraak_firstrun_bordmodus_v1: '1',
        rekenraak_betastrip_oefenmodus_v1: '1', rekenraak_betastrip_bordmodus_v1: '1',
        rekenraak_default_mode_v1: mode,
    };
    // Only on the first load of this context: a reload must keep what the script changed.
    if (!sessionStorage.getItem('handleiding-seeded')) {
        localStorage.clear();
        for (const [k, v] of Object.entries(keys)) localStorage.setItem(k, v);
        sessionStorage.setItem('handleiding-seeded', '1');
    }
}

async function context({ width = 1440, height = 900, mode = 'eenvoudig', seed = 11, mobile = false } = {}) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
    await ctx.addInitScript(seedScript, seed);
    await ctx.addInitScript(seenKeys, { release: RELEASE, mode });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('  [pageerror]', e.message));
    debugPage = page;
    return { ctx, page };
}

async function app(opts) {
    const c = await context(opts);
    await c.page.goto(`${BASE}/`);
    await c.page.waitForFunction(() => !!window.__rekenraak);
    await settle(c.page);
    return c;
}

const settle = (page, ms = 700) => page.waitForTimeout(ms);

async function shot(page, name, clip) {
    await page.mouse.move(0, 0);
    // Links show the dev server's random port; the figure shows the address a teacher sees.
    await page.evaluate(() => {
        const swap = (s) => s.replace(/(https?:\/\/)?localhost:\d+/g, 'rekenraak.be');
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) if (/localhost:\d+/.test(n.nodeValue)) n.nodeValue = swap(n.nodeValue);
        for (const input of document.querySelectorAll('input')) if (/localhost:\d+/.test(input.value)) input.value = swap(input.value);
    });
    await settle(page, 300);
    await page.screenshot({ path: join(OUT, `${name}.png`), ...(clip ? { clip } : {}) });
    console.log(`  ${name}.png`);
}

// SHOTS_DEBUG=<dir> keeps the stack and a screenshot of the page that failed.
let debugPage = null;
async function step(name, fn) {
    try { await fn(); } catch (e) {
        failed++;
        console.log(`! ${name}: ${e.message.split('\n')[0]}`);
        if (process.env.SHOTS_DEBUG) await debugPage?.screenshot({ path: join(process.env.SHOTS_DEBUG, `${name}-fail.png`) }).catch(() => {});
    }
}

// A few blocks a teacher would make, through the same store calls a sidebar click uses.
async function sampleSheet(page) {
    await page.evaluate(() => {
        const r = window.__rekenraak;
        r.clearBlocks();
        r.getState().updateHeader({ titel: 'Herhaling week 12' });
        r.addBlockFromType('hr-std-optellen', 'Optellen', { maxGetal: 100 }, { count: 6 });
        r.addBlockFromType('klok-kloklezen', 'Klok lezen', undefined, { count: 4 });
        r.addBlockFromType('cijferen-optellen-nat', 'Cijferen', undefined, { count: 4 });
    });
    await settle(page, 1200);
}

// Every inspector section closed, so the summaries show.
async function closeSections(page) {
    const open = page.locator('.insp-sec-head[aria-expanded="true"]');
    for (let i = await open.count(); i > 0; i--) { await open.first().click(); await settle(page, 250); }
}

// Selects a block the way a teacher does: a click on its empty right-hand side, not on the title.
async function selectBlock(page, index = 0) {
    const cell = page.locator('[data-block-id]').nth(index);
    const box = await cell.boundingBox();
    await cell.click({ position: { x: box.width - 30, y: box.height - 16 } });
    await settle(page);
}

const RIGHT = { x: 1076, y: 0, width: 364, height: 900 };

// ── Making a sheet ────────────────────────────────────────────────────────────
async function shotsWerkblad() {
    const { ctx, page } = await app({ mode: 'eenvoudig' });

    await step('eenvoudig-kaarten', async () => {
        await page.getByText('Optellen', { exact: true }).first().click();
        await settle(page, 1500);
        await shot(page, 'eenvoudig-kaarten', { x: 0, y: 0, width: 1010, height: 900 });
    });
    await step('eenvoudig-snel', async () => {
        await page.getByText('TE + TE', { exact: true }).click();
        await settle(page, 1500);
        await shot(page, 'eenvoudig-snel', { x: 286, y: 0, width: 1154, height: 620 });
    });

    await step('uitgebreid', async () => {
        await page.getByRole('button', { name: 'Uitgebreid', exact: true }).click();
        await settle(page);
        await page.getByText('Hoofdrekenen', { exact: true }).first().click();
        await settle(page);
        await shot(page, 'uitgebreid', { x: 0, y: 0, width: 286, height: 760 });
    });

    await step('overzicht', async () => {
        await sampleSheet(page);
        await selectBlock(page);
        await shot(page, 'overzicht');
    });

    await step('blok-knoppen', async () => {
        // The block plus its button rail, which runs past a short block.
        const box = await page.locator('[data-block-id]').first().boundingBox();
        const del = await page.getByRole('button', { name: 'Blok verwijderen' }).first().boundingBox();
        const bottom = Math.max(box.y + box.height, del.y + del.height) + 12;
        await shot(page, 'blok-knoppen', { x: box.x - 10, y: box.y - 10, width: del.x + del.width + 12 - (box.x - 10), height: bottom - (box.y - 10) });
    });

    await step('werkblad-lijst', async () => {
        await page.getByRole('button', { name: 'Werkblad', exact: true }).click();
        await settle(page);
        await shot(page, 'werkblad-lijst', { x: 0, y: 0, width: 286, height: 420 });
    });

    await step('paneel-opdracht', async () => {
        await closeSections(page);
        await shot(page, 'paneel-opdracht-dicht', { ...RIGHT, height: 500 });
        await page.locator('.insp-sec-head', { hasText: 'Wat oefenen ze' }).click();
        await settle(page);
        await shot(page, 'paneel-opdracht', RIGHT);
    });

    await step('paneel-blad', async () => {
        await page.getByRole('button', { name: 'Heel het blad', exact: true }).click();
        await settle(page);
        await closeSections(page);
        await shot(page, 'paneel-blad', { ...RIGHT, height: 500 });
    });

    await step('menu', async () => {
        await page.getByLabel('Menu: werkbladen, delen, instellingen').click();
        await settle(page, 400);
        await shot(page, 'menu', { x: 286, y: 0, width: 520, height: 660 });
        await page.keyboard.press('Escape');
        await page.mouse.click(700, 880);
        await settle(page, 300);
    });

    await step('bewaren', async () => {
        await page.getByLabel('Bewaren', { exact: true }).click();
        await settle(page, 400);
        await shot(page, 'bewaren', { x: 286, y: 0, width: 520, height: 230 });
        await page.keyboard.press('Escape');
        await page.mouse.click(700, 880);
        await settle(page, 300);
    });

    await step('afdrukken', async () => {
        await page.getByLabel('Afdrukken (Ctrl+P)').click();
        await settle(page, 400);
        await shot(page, 'afdrukken', { x: 700, y: 0, width: 380, height: 300 });
        await page.keyboard.press('Escape');
        await page.mouse.click(700, 880);
        await settle(page, 300);
    });

    await step('mijn-bladen', async () => {
        page.once('dialog', d => d.accept());
        await page.getByLabel('Bewaren', { exact: true }).click();
        await settle(page, 300);
        await page.getByRole('button', { name: /Bewaar in Mijn bladen/ }).click();
        await settle(page, 600);
        await page.getByLabel('Bewaren', { exact: true }).click();
        await settle(page, 300);
        await page.getByRole('button', { name: 'Mijn bladen', exact: true }).click();
        await settle(page, 1200);
        await shot(page, 'mijn-bladen');
        await page.getByRole('button', { name: 'Sluiten', exact: true }).click();
        await settle(page, 300);
    });

    await step('kant-en-klaar', async () => {
        await page.getByLabel('Menu: werkbladen, delen, instellingen').click();
        await settle(page, 300);
        await page.getByRole('button', { name: /Kant-en-klare bladen/ }).click();
        await settle(page, 1500);
        await shot(page, 'kant-en-klaar');
        await page.getByRole('button', { name: 'Sluiten', exact: true }).click();
        await settle(page, 300);
    });
    await ctx.close();
}

// ── The answer key: oplossingen + tussenstappen, and the stappenhulp QR ──────
async function shotsSleutel() {
    const { ctx, page } = await app({ mode: 'oefeningen' });
    await page.evaluate(() => {
        const r = window.__rekenraak;
        r.addBlockFromType('hr-std-optellen', 'Optellen', { maxGetal: 100, bridges: { E: 'REQUIRED', T: 'FORBIDDEN' } }, { count: 4 });
        r.updateDocSettings({ tutorQr: true });
    });
    await settle(page, 1200);
    await selectBlock(page);

    await step('oplossingen', async () => {
        await page.getByText('Verbetersleutel', { exact: true }).first().click();
        await settle(page);
        await page.getByRole('button', { name: 'Basis', exact: true }).first().click();
        await settle(page);
        await page.getByRole('button', { name: /genereer opnieuw|Genereer oefeningen/ }).click();
        await settle(page, 600);
        await page.getByLabel('Oplossingen tonen').click();
        await settle(page, 1000);
        await shot(page, 'oplossingen', { x: 286, y: 0, width: 1154, height: 620 });
    });

    await step('stappenhulp-qr', async () => {
        await page.getByLabel('Oplossingen verbergen').click();
        await page.mouse.click(1200, 880);
        await settle(page, 800);
        const foot = page.locator('.tutor-qr-foot').first();
        await foot.scrollIntoViewIfNeeded();
        await settle(page, 500);
        const box = await foot.boundingBox();
        await shot(page, 'stappenhulp-qr', { x: box.x - 24, y: box.y - 24, width: box.width + 48, height: box.height + 48 });
    });

    await step('stappenhulp-telefoon', async () => {
        const payload = await page.evaluate(async () => {
            const { encodeTutorPage } = await import('/src/services/oefenen/tutorPayload.ts');
            const { stepsFor } = await import('/src/services/stepsAvailability.ts');
            const blocks = window.__rekenraak.getState().blocks;
            return encodeTutorPage(blocks.map((b, i) => ({ block: b, n: i + 1, title: b.instructionText ?? '' })), (b, ex) => stepsFor(b.typeId, ex, b.constraints) !== null);
        });
        const phone = await context({ width: 390, height: 700, mobile: true });
        await phone.page.goto(`${BASE}/tutor.html#t=${payload}`);
        await settle(phone.page, 1200);
        await shot(phone.page, 'stappenhulp-lijst');
        await phone.page.locator('.tutor-quiet ~ * button, main button').first().click();
        await settle(phone.page, 600);
        for (let i = 0; i < 2; i++) {
            const more = phone.page.getByRole('button', { name: /stap/ }).first();
            if (await more.count()) { await more.click(); await settle(phone.page, 400); }
        }
        await shot(phone.page, 'stappenhulp-stappen');
        await phone.ctx.close();
    });
    await ctx.close();
}

// ── Oefenmodus: everything in one place, so these figures can be redone together ──
async function shotsOefenmodus() {
    const { ctx, page } = await app({ mode: 'oefeningen' });
    let link = '';
    // The Oefenmodus workspace: catalogue left, the session with samples in the middle, settings right.
    await step('oefenmodus-kiezen', async () => {
        await page.getByRole('button', { name: /^Oefenmodus/ }).first().click();
        await settle(page, 1000);
        const side = page.locator('.oefen-sidebar');
        await side.getByText('Hoofdrekenen', { exact: true }).click();
        await settle(page, 500);
        // Optellen and Aftrekken (standaardprocedure) are open: their first rows are the natuurlijke getallen.
        await side.getByText('Natuurlijke getallen', { exact: true }).nth(0).click();
        await settle(page, 800);
        await side.getByText('Natuurlijke getallen', { exact: true }).nth(1).click();
        await settle(page, 800);
        await page.getByLabel('Naam van de sessie').fill('Optellen en aftrekken');
        await settle(page, 600);
        await shot(page, 'oefenmodus-kiezen');
    });
    await step('oefenmodus-sessie', async () => {
        const insp = page.locator('aside[aria-label=Instellingen]');
        await insp.getByRole('button', { name: 'Hele sessie', exact: true }).click();
        await settle(page);
        await shot(page, 'oefenmodus-sessie', { x: 1076, y: 0, width: 364, height: 680 });
    });
    await step('oefenmodus-delen', async () => {
        await page.locator('header').getByRole('button', { name: 'Delen', exact: true }).click();
        await settle(page, 1000);
        link = await page.evaluate(() => [...document.querySelectorAll('a')].map(a => a.href).find(h => h.includes('#oefen=')) ?? '');
        await shot(page, 'oefenmodus-delen');
    });
    await ctx.close();
    if (!link) return;

    const tablet = await context({ width: 1024, height: 768, mobile: true, seed: 5 });
    const p = tablet.page;
    await step('oefenmodus-leerling', async () => {
        await p.goto(link);
        await settle(p, 1200);
        await p.getByRole('button', { name: /Start/ }).first().click();
        await settle(p, 1200);
        await shot(p, 'oefenmodus-leerling');
    });
    await step('oefenmodus-stappen', async () => {
        await answerRight(p);
        await wrongUntilSteps(p);
        await shot(p, 'oefenmodus-stappen');
    });
    await step('oefenmodus-resultaten', async () => {
        await p.getByRole('button', { name: 'Resultaten' }).click();
        await settle(p, 800);
        await shot(p, 'oefenmodus-resultaten');
    });
    await tablet.ctx.close();
}

// The sum on the kiosk card, worked out from its text, typed and checked.
async function answerRight(p) {
    const text = await p.evaluate(() => document.body.innerText);
    const m = text.match(/(\d+)\s*([+−-])\s*(\d+)\s*=/);
    if (!m) return;
    const value = m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]);
    await p.keyboard.type(String(value));
    await p.keyboard.press('Enter');
    await settle(p, 1500);
}

// A wrong answer on purpose (the steps panel only comes after a fout), then two steps shown.
async function wrongUntilSteps(p) {
    const steps = p.getByRole('button', { name: 'Toon de stappen' });
    for (let tries = 0; !(await steps.count()) && tries < 6; tries++) {
        const next = p.getByRole('button', { name: 'Volgende oefening' });
        if (await next.count()) { await next.click(); await settle(p, 800); }
        await p.keyboard.type('1');
        await p.keyboard.press('Enter');
        await settle(p, 1600);
    }
    await steps.click();
    await settle(p, 500);
    await p.getByRole('button', { name: /volgende stap/ }).click().catch(() => {});
    await settle(p, 600);
}

// ── Zelf oefenen (kind.html): the pupil picks, the MAB help after a fout ─────
async function shotsZelf() {
    const { ctx, page: p } = await context({ width: 1024, height: 768, mobile: true, seed: 3 });
    await step('zelf', async () => {
        await p.goto(`${BASE}/kind.html`);
        await settle(p, 1200);
        await p.getByRole('button', { name: '2', exact: true }).click();
        await settle(p, 500);
        await shot(p, 'zelf-onderwerp');
        await p.getByRole('button', { name: 'Optellen', exact: true }).click();
        await settle(p, 500);
        await p.getByRole('button', { name: /Met brug/ }).first().click();
        await settle(p, 500);
        // + and − at leerjaar 1–3 ask Oefenen or Spelen first (beta).
        await p.getByRole('button', { name: 'Oefenen', exact: true }).click();
        await settle(p, 300);
        await p.getByRole('button', { name: '5 oefeningen' }).click();
        await settle(p, 300);
        await shot(p, 'zelf-hoeveel');
        await p.getByRole('button', { name: /Begin met oefenen/ }).click();
        await settle(p, 1200);
        await wrongUntilSteps(p);
        await shot(p, 'zelf-mab');
        await p.getByRole('button', { name: /Terug naar begin/ }).click();
        await settle(p, 400);
        await shot(p, 'zelf-terug', { x: 0, y: 0, width: 1024, height: 56 });
    });
    await ctx.close();
}

// ── Bordmodus ─────────────────────────────────────────────────────────────────
async function shotsBord() {
    const { ctx, page } = await context({ width: 1440, height: 900, mode: 'oefeningen' });
    await step('bordmodus', async () => {
        await page.goto(`${BASE}/bord.html`);
        await settle(page, 1500);
        await page.getByRole('button', { name: 'Toevoegen' }).click();
        await settle(page, 900);
        await shot(page, 'bordmodus-toevoegen');
        await page.getByRole('button', { name: 'Waarde van cijfer' }).first().click();
        await settle(page, 900);
        await page.getByRole('button', { name: 'Toevoegen' }).click();
        await settle(page, 600);
        await page.getByText('Rekentool', { exact: true }).click();
        await settle(page, 600);
        await page.getByRole('button', { name: 'Honderdveld', exact: true }).click();
        await settle(page, 900);
        // Off the first card by its title bar, then a pen circle around 45, the way a teacher marks the board.
        await page.mouse.move(260, 106);
        await page.mouse.down();
        await page.mouse.move(600, 140, { steps: 8 });
        await page.mouse.move(960, 160, { steps: 8 });
        await page.mouse.up();
        await settle(page, 400);
        await page.getByRole('button', { name: 'Pen', exact: true }).click();
        await page.mouse.move(1086 + 34, 394);
        await page.mouse.down();
        for (let i = 0; i <= 26; i++) await page.mouse.move(1086 + 34 * Math.cos(i / 4), 394 + 22 * Math.sin(i / 4), { steps: 2 });
        await page.mouse.up();
        await settle(page, 500);
        await shot(page, 'bordmodus');
    });
    await ctx.close();
}

const GROUPS = { werkblad: shotsWerkblad, sleutel: shotsSleutel, oefenmodus: shotsOefenmodus, zelf: shotsZelf, bord: shotsBord };
try {
    for (const [name, run] of Object.entries(GROUPS)) if (!ONLY.length || ONLY.includes(name)) await run();
} finally {
    await browser.close();
    own?.stop();
}
console.log(failed ? `\n${failed} figure(s) failed` : `\nAll figures written to ${OUT}`);
process.exit(failed ? 1 : 0);
