// Duel games: screenshots of one duel game through a whole match, for a visual check (not in the gate).
// Per size × 1 / 2 spelers: play (with the clock rings, every level but Makkelijk), a right answer in flight, a wrong answer, the round
// card, the match card. The match is driven through window.__duel (dev builds, duel/duelStore.ts).
//
//   npm run dev -- --port 5401
//   node scripts/duel-shots.mjs --url http://localhost:5401/ --game kasteel --label Kasteel --out C:/tmp/duel-shots
//   options: --sizes 1280x800,1024x768  --players 1,2  --picks '{"niveau":"moeilijk","levens":"3"}'
//
// The picks go into the pre-start options (remembered per device), so Start begins exactly that match.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const arg = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const URL = arg('url', 'http://localhost:5173/').replace(/\/?$/, '/');
const GAME = arg('game', 'touwtrekken');
const LABEL = arg('label', GAME[0].toUpperCase() + GAME.slice(1));
const OUT = arg('out', 'duel-shots');
const SIZES = arg('sizes', '1280x800,1024x768').split(',').map(s => s.split('x').map(Number));
const PLAYERS = arg('players', '1,2').split(',');
const PICKS = JSON.parse(arg('picks', '{"niveau":"moeilijk","levens":"3","rondes":"3"}'));
const OPTIONS_KEY = 'rekenraak_spelen_opties_v1';
mkdirSync(OUT, { recursive: true });

const duel = (page, fn, ...args) => page.evaluate(([src, a]) => new Function('d', 'a', `return (${src})(d, a)`)(window.__duel, a), [fn.toString(), args]);
const phase = page => duel(page, d => (d ? d.getState().phase : 'loading'));
const waitPhase = async (page, want, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { if (want.includes(await phase(page))) return; await page.waitForTimeout(100); } throw new Error(`no phase ${want}`); };
const answer = (page, side, right) => duel(page, (d, [s, r]) => { const q = d.getState().sides[s].question; if (q) d.getState().answer(s, r ? q.answer : String(Number(q.answer) + 1)); }, side, right);

const browser = await chromium.launch();
const shots = [];
try {
    for (const [w, h] of SIZES) {
        for (const players of PLAYERS) {
            const page = await browser.newPage({ viewport: { width: w, height: h } });
            const name = step => join(OUT, `${GAME}-${players}p-${w}x${h}-${step}.png`);
            const shot = async step => { await page.screenshot({ path: name(step) }); shots.push(name(step)); };
            await page.goto(`${URL}kind.html`);
            await page.evaluate(([k, id, picks]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify({ [id]: picks })); }, [OPTIONS_KEY, GAME, { ...PICKS, spelers: players }]);
            await page.goto(`${URL}kind.html`);
            await page.getByRole('button', { name: 'Leerjaar 2', exact: true }).first().click();
            await page.getByRole('button', { name: /^Optellen/ }).first().click();
            const met = page.getByRole('button', { name: /^Met brug/ }); if (await met.count()) await met.first().click();
            { const way = page.getByRole('button', { name: 'Spelen', exact: true }); if (await way.count()) await way.click(); }
            await page.getByRole('group', { name: 'Kies een spel' }).getByRole('button', { name: new RegExp('^' + LABEL) }).first().click();
            await page.getByRole('button', { name: /^Start/ }).first().click();
            await waitPhase(page, ['ready', 'play']);
            await page.waitForTimeout(300);
            await shot('ready');
            await waitPhase(page, ['play']);
            await page.waitForTimeout(1500);
            await shot('play');
            await answer(page, 'left', true);
            await page.waitForTimeout(450);
            await shot('right');
            if (players === '2') await answer(page, 'right', false); else await answer(page, 'left', false);
            await page.waitForTimeout(300);
            await shot('wrong');
            // Left wins rounds until the match is over; the first round card and the match card are shot.
            let rounds = 0;
            while ((await phase(page)) !== 'matchEnd') {
                const p = await phase(page);
                if (p === 'play') { await answer(page, 'left', true); await page.waitForTimeout(800); continue; }
                if (p === 'roundEnd') {
                    await page.waitForFunction(() => window.__duel.getState().card, null, { timeout: 8000 });
                    await page.waitForTimeout(600);
                    if (rounds++ === 0) await shot('round');
                    await page.getByRole('button', { name: /Volgende ronde/ }).click();
                    await waitPhase(page, ['play']);
                    continue;
                }
                await page.waitForTimeout(100);
            }
            await page.waitForFunction(() => window.__duel.getState().card, null, { timeout: 8000 });
            await page.waitForTimeout(900);
            await shot('match');
            await page.close();
        }
    }
} finally {
    await browser.close();
}
console.log(shots.join('\n'));
