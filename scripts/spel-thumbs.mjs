// Spelen thumbnails: regenerates public/spelen/thumbs/<skinId>.webp (a game picture) and oefen-<topic>.webp (an Oefenmodus picture)
// at 480x300, with NO sum, keypad, HUD, score or per-item number in them: a topic card must never show a sum that is wrong for it.
//
// Usage (dev server must already be running; re-run when a skin's look changes):
//   npm run dev
//   npm run spel:thumbs                                  # every game + every topic
//   npm run spel:thumbs -- --only ballonnen,oefen-geld --url http://localhost:5602/ --raw C:/tmp/thumbs-raw
//   --out <dir> writes the webps elsewhere (default public/spelen/thumbs); --raw <dir> also keeps the full-size PNGs.
//
// Every skin hides its own numbers through SKIN_CSS (selectors per skin id, kept here so the skin folders stay untouched);
// COMMON_CSS hides the shared chrome (keypad, HUD, sum). A new skin = one GAMES row and, if its scene shows numbers, one SKIN_CSS line.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const arg = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const URL = arg('url', 'http://localhost:5173/').replace(/\/?$/, '/');
const OUT = arg('out', 'public/spelen/thumbs');
const RAW = arg('raw', '');
const ONLY = arg('only', '').split(',').filter(Boolean);
// --dump prints every element that shows a digit (class chain), to write a skin's SKIN_CSS line from.
const DUMP = argv.includes('--dump');

// id, label on its card, right answers given before the shot (some progress in the scene; 0 = idle; -1 = a board, no sums asked)
const GAMES = [
    ['pinguintoren', 'Pinguïntoren', 6], ['ballonnen', 'Ballonnen', 1], ['zeehond', 'Zeehondjes voeren', 0], ['zombies', 'Zombies', 2],
    ['bom', 'Bom', 3], ['bever', 'Bever', 5], ['race', 'Race', 3], ['voetbal', 'Voetbal', 3], ['touwtrekken', 'Touwtrekken', -1],
    ['kasteel', 'Kasteel', 6], ['hartjes', 'Hartjes koppelen', -1], ['honingraat', 'Honingraat', -1], ['prent', 'Verborgen prent', 8],
    ['schatkist', 'Schatkist', 2], ['pakjesband', 'Pakjesband', 1], ['kerstboom', 'Kerstboom versieren', 9], ['eieren', 'Eieren zoeken', 2], ['mollen', 'Mollen meppen', 1],
];

// Shared chrome that carries numbers. Every skin marks its numbers with .kiosk-math and its sum sign as <prefix>-sign;
// the hint badges ("1, 2, 3") are <prefix>-key; the keypad is .spel-keypad (Touwtrekken: .tt-keypad).
const COMMON_CSS = `
.spel-keypad, .tt-keypad, .spel-topbar,
.kiosk-math, [class$="-sign"], [class*="-sign "], [class$="-key"]:not(.kiosk-key) { visibility: hidden !important; }
`;
// Per-skin extras: what shows a number without .kiosk-math (svg texts, HUD, scores, hint notes).
const SKIN_CSS = {
    pinguintoren: '.pt-goal-num { display: none !important; }',
    bom: '.bom-display text { display: none !important; }',
    race: '.rc-clock { visibility: hidden !important; }',
    voetbal: '.vb-hud { visibility: hidden !important; }',
    kasteel: '.ks-bar-text { display: none !important; }',
    touwtrekken: '.tt-half [class*="score"], .tt-half [class*="pts"] { visibility: hidden !important; }',
    schatkist: '.sk-parchment { visibility: hidden !important; }',
    zeehond: '.zh-count { visibility: hidden !important; }',
    hartjes: '.hj-text { visibility: hidden !important; }',
    honingraat: '.hx-top, .hx-sum { visibility: hidden !important; }',
};
// Keypad games lay out as world + 440px panel; on a wide window the world turns 16:10 (1200x746), so its box is the picture.
const WIDE = new Set(['pinguintoren', 'bom', 'bever', 'race', 'voetbal', 'kasteel', 'prent', 'schatkist', 'kerstboom']);
// Skins without a -world box: the street, 16:10 (zombies).
const CLIPS = { zombies: { x: 0, y: 74, width: 742, height: 464 } };
// A narrower window pulls the zombies' track into that 742px: the camp and the zombies in one picture.
const NARROW = new Set(['zombies']);
const NARROW_VIEWPORT = { width: 760, height: 820 };
const WIDE_VIEWPORT = { width: 1640, height: 820 };

// The oefen-* pictures: the Oefenmodus screen with the exercise blurred (shapes stay, digits do not); a prompt with a digit in it is blurred too.
const OEFEN_CSS = `
.kiosk-card-inner { filter: blur(7px) !important; }
`;

// y: below the topbar; the picture is the 16:10 scene area.
const CLIP = { x: 0, y: 72, width: 1180, height: 737 };
const slugOf = topicId => topicId.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

mkdirSync(OUT, { recursive: true });
if (RAW) mkdirSync(RAW, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 });
const narrowCtx = await browser.newContext({ viewport: NARROW_VIEWPORT, deviceScaleFactor: 1 });
const wideCtx = await browser.newContext({ viewport: WIDE_VIEWPORT, deviceScaleFactor: 1 });

// 480x300 webp from the PNG, done in the browser (no image library in the repo).
async function save(page, png, name) {
    if (RAW) writeFileSync(join(RAW, `${name}.png`), png);
    const webp = await page.evaluate(async src => {
        const img = new Image(); img.src = src; await img.decode();
        const c = document.createElement('canvas'); c.width = 480; c.height = 300;
        const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, 480, 300);
        return c.toDataURL('image/webp', 0.82);
    }, 'data:image/png;base64,' + png.toString('base64'));
    const buf = Buffer.from(webp.split(',')[1], 'base64');
    writeFileSync(join(OUT, `${name}.webp`), buf);
    return `${name} ${Math.round(buf.length / 1024)} KB`;
}

async function toTopics(page, grade) {
    await page.goto(`${URL}kind.html`);
    await page.evaluate(() => { try { localStorage.clear(); } catch { /* private mode */ } });
    await page.goto(`${URL}kind.html`);
    await page.getByRole('button', { name: `Leerjaar ${grade}`, exact: true }).first().click();
}

const out = [];
for (const [id, label, rights] of GAMES) {
    if (ONLY.length && !ONLY.includes(id)) continue;
    const page = await (WIDE.has(id) ? wideCtx : NARROW.has(id) ? narrowCtx : ctx).newPage();
    try {
        await toTopics(page, 2);
        await page.getByRole('button', { name: /^Optellen/ }).first().click();
        const met = page.getByRole('button', { name: /^Met brug/ }); if (await met.count()) await met.first().click();
        await page.getByRole('group', { name: 'Kies een spel' }).getByRole('button', { name: new RegExp('^' + label) }).first().click();
        await page.waitForTimeout(600);
        const samen = page.getByRole('button', { name: /^Samen tegelijk/ }); if (await samen.count()) { await samen.first().click(); await page.waitForTimeout(300); }
        for (let k = 0; k < 2; k++) {
            const st = page.getByRole('button', { name: /^(Start|Begin|Speel|Spelen|Start het spel|Begin het spel)/ });
            if (await st.count()) { await st.first().click(); await page.waitForTimeout(500); }
        }
        await page.waitForTimeout(1500);
        for (let i = 0; i < rights; i++) {
            await page.waitForFunction(() => /\d+ [+−-] \d+ = \?/.test(document.body.innerText.replace(/\s+/g, ' ')), null, { timeout: 8000 }).catch(() => { });
            const m = /(\d+) ([+−-]) (\d+) = \?/.exec((await page.locator('body').innerText()).replace(/\s+/g, ' ')); if (!m) break;
            const ans = m[2] === '+' ? +m[1] + +m[3] : +m[1] - +m[3];
            const grp = page.getByRole('group', { name: 'Kies het antwoord' });
            if (await grp.count()) {
                const btns = grp.getByRole('button'); const n = await btns.count(); let idx = 0;
                for (let j = 0; j < n; j++) if ((await btns.nth(j).innerText()).replace(/\s/g, '').includes(String(ans))) { idx = j; break; }
                await btns.nth(idx).click({ force: true }).catch(() => { });
            } else { for (const ch of String(ans)) await page.keyboard.press(ch); await page.keyboard.press('Enter'); }
            await page.waitForTimeout(1400);
        }
        await page.waitForTimeout(id === 'ballonnen' || id === 'zeehond' ? 1500 : 700);
        if (DUMP) {
            console.log(`== ${id}`);
            console.log((await page.evaluate(() => [...document.querySelectorAll('body *')]
                .filter(e => !e.children.length && /\d/.test(e.textContent ?? '') && e.getBoundingClientRect().width > 0)
                .map(e => { const cls = (el) => `${el.tagName.toLowerCase()}${[...el.classList].map(c => '.' + c).join('')}`; const chain = []; for (let x = e, i = 0; x && i < 3; x = x.parentElement, i++) chain.push(cls(x)); return `${JSON.stringify(e.textContent.trim().slice(0, 14))} <- ${chain.join(' < ')}`; })
                .filter((v, i, a) => a.indexOf(v) === i))).join('\n'));
        }
        await page.addStyleTag({ content: COMMON_CSS + (SKIN_CSS[id] ?? '') });
        await page.waitForTimeout(150);
        const world = WIDE.has(id) ? await page.locator('[class$="-world"]').first().boundingBox() : null;
        out.push(await save(page, await page.screenshot({ clip: CLIPS[id] ?? world ?? CLIP }), id));
    } catch (e) { out.push(`${id} ERR ${e.message.split('\n')[0].slice(0, 100)}`); }
    await page.close();
}

// One Oefenmodus picture per topic: its first oefening's first exercise. Most topics live at leerjaar 4, Splitsen only at 1.
const done = new Set();
for (const grade of [4, 1]) {
    const probe = await ctx.newPage();
    await toTopics(probe, grade);
    const topicIds = await probe.locator('.zelf-topic').evaluateAll(els => els.map(e => e.dataset.topic));
    await probe.close();
    for (const topicId of topicIds) {
        const name = `oefen-${slugOf(topicId)}`;
        if (done.has(name) || (ONLY.length && !ONLY.includes(name))) continue;
        done.add(name);
        const page = await ctx.newPage();
        try {
            await toTopics(page, grade);
            await page.locator(`.zelf-topic[data-topic="${topicId}"]`).click();
            await page.waitForTimeout(300);
            const begin = page.getByRole('button', { name: /Begin met oefenen/ });
            if (!(await begin.count())) { await page.locator('.zelf-choice:not(.zelf-range-btn)').first().click(); await page.waitForTimeout(300); }
            await begin.first().click();
            await page.waitForTimeout(1200);
            await page.addStyleTag({ content: OEFEN_CSS });
            await page.evaluate(() => document.querySelectorAll('.kiosk-instruction').forEach(e => { if (/\d/.test(e.textContent ?? '')) e.style.filter = 'blur(6px)'; }));
            await page.waitForTimeout(150);
            out.push(await save(page, await page.screenshot({ clip: CLIP }), name));
        } catch (e) { out.push(`${name} ERR ${e.message.split('\n')[0].slice(0, 100)}`); }
        await page.close();
    }
}
console.log(out.join('\n'));
await browser.close();
