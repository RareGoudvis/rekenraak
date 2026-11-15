// Promo video: films the real app (editor, stappenhulp, Oefenmodus, Zelf oefenen, games) the way a teacher and a
// pupil click it, and renders one vertical 9:16 Reel (1080x1920, H.264, 30 fps) with captions, a drawn generic
// device frame and a CC0 game track. Frames come from a CDP screencast (crisper than recordVideo), Math.random is
// seeded, sound and music are off during capture. Not in the gate. See promo/README.md.
//
// Usage:
//   npm run promo:video                                   # starts its own dev server
//   npm run promo:video -- --url http://localhost:5173/   # a dev server you already run
//   --only spellen,inhoud   re-film only these beats (the others come from promo/out/work), then re-render the video
//   --headed                watch the browser
//   --draft                 with --only: film and render just those beats (promo/out/work/beat-<id>.mp4), no final video
// Output: promo/out/rekenraak-promo-9x16.mp4, promo/out/contact-sheet.png, promo/out/frames/<beat>-<n>.png.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { startDevServer } from './lib/devServer.mjs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const EXTERNAL_URL = arg('url', '');
const ONLY = arg('only', '').split(',').filter(Boolean);
const HEADED = argv.includes('--headed');
// --draft: film and render only the --only beats, no final video (quick iteration on one beat).
const DRAFT = argv.includes('--draft');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'promo', 'out');
const WORK = join(OUT, 'work');
const VIDEO = join(OUT, 'rekenraak-promo-9x16.mp4');

// The canvas, the frame rate, the capture scale (2 = retina-sharp frames, downscaled into the device).
const W = 1080, H = 1920, FPS = 30, DSF = 2;
// Facebook shows a Reel cropped to 4:5 (1080x1350, centred) in the feed, and its own buttons sit over the top
// ~250 px and the bottom ~350 px: every caption stays inside both.
const SAFE = { top: Math.max(250, (H - 1350) / 2) + 20, bottom: Math.min(H - 350, (H + 1350) / 2) - 10 };
const XFADE = 0.25;
// One cheerful CC0 loop from the games (public/spelen/music/CREDITS.md), modest under the pictures.
const MUSIC = join(ROOT, 'public', 'spelen', 'music', 'weide.mp3');
const MUSIC_GAIN = 0.55;
// Seasonal game tiles follow the date; a fixed day keeps the film the same all year (dev-only ?spelDatum=).
const KIND = '/kind.html?spelDatum=2026-10-15';

// ── ffmpeg ────────────────────────────────────────────────────────────────────
function findFfmpeg() {
    const tries = ['ffmpeg'];
    if (process.env.FFMPEG) tries.unshift(process.env.FFMPEG);
    // winget's Gyan.FFmpeg install, whatever version folder it unpacked to.
    const pkgs = join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Packages');
    if (existsSync(pkgs)) {
        for (const p of readdirSync(pkgs).filter(d => d.startsWith('Gyan.FFmpeg'))) {
            for (const v of readdirSync(join(pkgs, p)).filter(d => d.startsWith('ffmpeg-'))) tries.push(join(pkgs, p, v, 'bin', 'ffmpeg.exe'));
        }
    }
    for (const bin of tries) if (spawnSync(bin, ['-version'], { stdio: 'ignore' }).status === 0) return bin;
    throw new Error('ffmpeg not found: install it (winget install Gyan.FFmpeg) or put it on PATH, or set FFMPEG=<path to ffmpeg>.');
}
const FFMPEG = findFfmpeg();
function ff(args, what) {
    const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
    if (r.status !== 0) throw new Error(`ffmpeg failed (${what}):\n${r.stderr}`);
}
const fwd = p => p.replace(/\\/g, '/');

// ── Colours: the app's own tokens where it has them ──────────────────────────
const theme = readFileSync(join(ROOT, 'src', 'assets', 'theme.css'), 'utf8');
const token = (name, fallback) => theme.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1] ?? fallback;
const C = {
    accent: token('--accent', '#0A5FD0'),
    ink: '#14213D',
    blue: token('--accent-bewerkingen', '#007AFF'),
    green: token('--accent-metendrekenen', '#34C759'),
    orange: token('--accent-vraagstukken', '#FF9500'),
    purple: token('--accent-meetkunde', '#AF52DE'),
    red: token('--accent-getallenkennis', '#FF3B30'),
    pill: '#FFC531',
    bezel: '#1F2330',
};
const font = w => readFileSync(join(ROOT, 'node_modules', '@fontsource', 'nunito', 'files', `nunito-latin-${w}-normal.woff2`)).toString('base64');
const FONT_CSS = [700, 800, 900].map(w => `@font-face{font-family:Nunito;font-weight:${w};src:url(data:font/woff2;base64,${font(w)}) format('woff2')}`).join('');

// ── Devices: the capture viewport and where its screen sits on the canvas ────
const DEVICES = {
    // A landscape tablet, the kiosk's own layout (1180x820).
    tablet: { vw: 1180, vh: 820, sw: 948, bezel: 30, rOut: 54, rIn: 20, cy: 990 },
    // The editor on a laptop; the screen shows the sidebar and the sheet (the inspector is cropped off, too small to read).
    laptop: { vw: 1440, vh: 900, crop: { x: 0, y: 0, w: 1076, h: 900 }, sw: 920, bezel: 18, rOut: 22, rIn: 6, cy: 950 },
    // A phone for the stappenhulp, portrait.
    phone: { vw: 390, vh: 844, sh: 840, bezel: 16, rOut: 64, rIn: 50, cy: 975 },
    // A printed A4 sheet (a still): no bezel.
    paper: { vw: 794, vh: 1123, sh: 860, bezel: 0, rOut: 0, rIn: 0, cy: 975 },
};
function screenRect(d) {
    const vw = d.crop?.w ?? d.vw, vh = d.crop?.h ?? d.vh;
    const sw = d.sw ?? Math.round(d.sh * vw / vh / 2) * 2;
    const sh = d.sh ?? Math.round(d.sw * vh / vw / 2) * 2;
    const x = Math.round((W - sw) / 2), y = Math.round(d.cy - sh / 2);
    return { x, y, w: sw, h: sh, top: y - d.bezel, bottom: y + sh + d.bezel + (d === DEVICES.laptop ? 34 : 0) };
}

// ── Browser helpers ───────────────────────────────────────────────────────────
const own = EXTERNAL_URL ? null : await startDevServer();
const BASE = (EXTERNAL_URL || own.url).replace(/\/+$/, '');
// The screencast sends frames at the window's device pixels only when the scale is forced (else 1x CSS pixels).
const browser = await chromium.launch({ headless: !HEADED, args: [`--force-device-scale-factor=${DSF}`] });
const plainBrowser = await chromium.launch();
const errors = [];
// The page a failure happened on, for its screenshot.
let lastPage = null;
const wait = ms => new Promise(r => setTimeout(r, ms));

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
// Every first-run card, banner and modal already seen; the games' sound and music off (both default on).
function seenKeys({ release, sound, music }) {
    if (sessionStorage.getItem('promo-seeded')) return;
    localStorage.clear();
    const keys = {
        rekenraak_tour_seen_v1: '1', rekenraak_release_seen_v1: release, rekenraak_upgrade_seen_v1: release,
        rekenraak_tryout_seen_v1: '1', rekenraak_eenvoudig_banner_seen_v1: '1', rekenraak_print_hint_seen_v1: '1',
        rekenraak_firstrun_oefenmodus_v1: '1', rekenraak_firstrun_bordmodus_v1: '1',
        rekenraak_betastrip_oefenmodus_v1: '1', rekenraak_betastrip_bordmodus_v1: '1',
        rekenraak_default_mode_v1: 'eenvoudig', [sound]: '0', [music]: '0',
    };
    for (const [k, v] of Object.entries(keys)) localStorage.setItem(k, v);
    sessionStorage.setItem('promo-seeded', '1');
}
// A tap ring where the finger lands, so every action reads on screen; and Verborgen prent (photo rights) never shows.
function filmAids() {
    // Fullscreen would resize the headless window (800x600) mid-shot; the film shows the tablet's own screen anyway.
    Element.prototype.requestFullscreen = function () { return Promise.resolve(); };
    addEventListener('pointerdown', e => {
        const d = document.createElement('div');
        d.style.cssText = `position:fixed;left:${e.clientX - 28}px;top:${e.clientY - 28}px;width:56px;height:56px;border-radius:50%;`
            + 'background:rgba(20,33,61,.25);border:3px solid rgba(255,255,255,.95);box-shadow:0 0 0 2px rgba(20,33,61,.4);pointer-events:none;z-index:2147483647';
        document.documentElement.appendChild(d);
        d.animate([{ transform: 'scale(.55)', opacity: 1 }, { transform: 'scale(1.35)', opacity: 0 }], { duration: 600, easing: 'ease-out' }).onfinish = () => d.remove();
    }, true);
    const style = () => {
        const s = document.createElement('style');
        s.textContent = 'img[src*="thumbs/prent"]{visibility:hidden!important}button[aria-label^="Verborgen prent"]{display:none!important}';
        document.head.appendChild(s);
    };
    if (document.head) style(); else addEventListener('DOMContentLoaded', style);
}

const RELEASE = readFileSync(join(ROOT, 'src', 'config', 'releaseNotes.ts'), 'utf8').match(/version:\s*'([^']+)'/)[1];
const KEYS = {
    release: RELEASE,
    sound: readFileSync(join(ROOT, 'src', 'oefenen', 'spelen', 'sound.ts'), 'utf8').match(/SOUND_KEY = '([^']+)'/)[1],
    music: readFileSync(join(ROOT, 'src', 'oefenen', 'spelen', 'music.ts'), 'utf8').match(/MUSIC_KEY = '([^']+)'/)[1],
};

async function context(device, { seed = 7 } = {}) {
    const d = DEVICES[device];
    const touch = device !== 'laptop';
    const ctx = await browser.newContext({ viewport: { width: d.vw, height: d.vh }, deviceScaleFactor: DSF, hasTouch: touch, isMobile: device === 'phone' });
    await ctx.addInitScript(seedScript, seed);
    await ctx.addInitScript(seenKeys, KEYS);
    await ctx.addInitScript(filmAids);
    const page = await ctx.newPage();
    lastPage = page;
    page.on('pageerror', e => errors.push(`${device}: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`${device} console: ${m.text()}`); });
    return { ctx, page };
}

// A real tap in the middle of what the pupil sees.
async function tap(page, locator, pause = 260) {
    try { await locator.waitFor({ state: 'visible', timeout: 8000 }); } catch (e) {
        await page.screenshot({ path: join(WORK, 'failed-step.png') }).catch(() => {});
        throw new Error(`${e.message.split('\n')[0]} (screen: promo/out/work/failed-step.png)`);
    }
    let box = await locator.boundingBox();
    const vp = page.viewportSize();
    // Below the fold (a scrolling panel): scroll it into view smoothly first, as a finger would.
    if (box.y < 0 || box.y + box.height > vp.height) {
        await locator.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        await wait(550);
        box = await locator.boundingBox();
    }
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await wait(pause);
}
const key = (page, ch) => page.locator('.kiosk-keypad button').filter({ hasText: new RegExp(`^\\s*${ch === ',' ? ',' : ch}\\s*$`) }).first();
async function tapNumber(page, text, pause = 230) {
    for (const ch of text) await tap(page, key(page, ch), pause);
}
const check = page => tap(page, page.getByRole('button', { name: 'Controleer', exact: true }), 120);

// Smooth scrolling, the way a finger flicks a list.
async function flick(page, dy, steps = 14, x = 590, y = 500) {
    await page.mouse.move(x, y);
    for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await wait(28); }
}

// ── Recording: CDP screencast frames with their timestamps ───────────────────
class Recorder {
    constructor(page, name) { this.page = page; this.name = name; this.frames = []; this.marks = {}; }
    async start() {
        this.dir = join(WORK, 'frames', this.name);
        rmSync(this.dir, { recursive: true, force: true });
        mkdirSync(this.dir, { recursive: true });
        this.cdp = await this.page.context().newCDPSession(this.page);
        this.cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
            const file = join(this.dir, `${String(this.frames.length).padStart(5, '0')}.jpg`);
            writeFileSync(file, Buffer.from(data, 'base64'));
            const now = Date.now() / 1000;
            this.frames.push({ file, t: metadata.timestamp ?? now, rt: now });
            this.cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
        });
        const vp = this.page.viewportSize();
        await this.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: vp.width * DSF, maxHeight: vp.height * DSF, everyNthFrame: 1 });
        for (let i = 0; i < 50 && !this.frames.length; i++) await wait(20);
        this.mark('start');
        return this;
    }
    mark(name) { this.marks[name] = Date.now() / 1000; return this.marks[name]; }
    async stop() {
        this.mark('end');
        await wait(120);
        await this.cdp.send('Page.stopScreencast').catch(() => {});
        await this.cdp.detach().catch(() => {});
        // Marks are node time, frames browser time: the median offset puts both on one clock.
        const offs = this.frames.map(f => f.rt - f.t).sort((a, b) => a - b);
        this.offset = offs.length ? offs[Math.floor(offs.length / 2)] : 0;
        return this;
    }
    // A mark on the frames' clock, plus seconds.
    at(name, plus = 0) {
        if (!(name in this.marks)) throw new Error(`${this.name}: no mark '${name}'`);
        return this.marks[name] - this.offset + plus;
    }
    // [from, to, speed] parts → one file per output frame (what was on screen at that moment).
    timeline(parts) {
        const out = [];
        for (const [a, b, speed = 1] of parts) {
            const n = Math.max(1, Math.round((b - a) / speed * FPS));
            for (let i = 0; i < n; i++) {
                const t = a + i / FPS * speed;
                let k = 0;
                while (k + 1 < this.frames.length && this.frames[k + 1].t <= t) k++;
                out.push(this.frames[k].file);
            }
        }
        return out;
    }
}

// ── Captions, background and device frame, drawn as HTML ─────────────────────
let layerPage = null;
async function drawLayer(html, file, transparent) {
    if (!layerPage) layerPage = await (await plainBrowser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
    await layerPage.setContent(`<!doctype html><html><head><style>${FONT_CSS}
        *{box-sizing:border-box;margin:0}html,body{width:${W}px;height:${H}px;overflow:hidden;background:${transparent ? 'transparent' : '#fff'}}
        body{font-family:Nunito,system-ui,sans-serif;color:${C.ink};position:relative}</style></head><body>${html}</body></html>`);
    await layerPage.evaluate(() => document.fonts.ready);
    await layerPage.screenshot({ path: file, omitBackground: transparent });
}

// *word* = in the accent colour.
const rich = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*([^*]+)\*/g, `<span style="color:${C.accent}">$1</span>`);
const nieuwPill = `<span style="display:inline-block;background:${C.pill};color:${C.ink};font-weight:900;font-size:40px;line-height:1;padding:12px 26px 13px;border-radius:999px;margin-bottom:18px;box-shadow:0 4px 0 rgba(20,33,61,.18)">Nieuw</span>`;

function backgroundHtml(device, tint) {
    const r = device ? screenRect(DEVICES[device]) : null;
    const d = device ? DEVICES[device] : null;
    const blob = (x, y, s, c, o) => `<div style="position:absolute;left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px;border-radius:50%;background:${c};opacity:${o};filter:blur(40px)"></div>`;
    const shadow = r ? `<div style="position:absolute;left:${r.x - d.bezel}px;top:${r.y - d.bezel}px;width:${r.w + 2 * d.bezel}px;height:${r.h + 2 * d.bezel}px;border-radius:${d.rOut}px;box-shadow:0 34px 70px rgba(20,33,61,.28),0 8px 18px rgba(20,33,61,.18);background:${C.bezel}"></div>` : '';
    return `<div style="position:absolute;inset:0;background:linear-gradient(170deg,${tint[0]} 0%,${tint[1]} 100%)"></div>
        ${blob(120, 330, 420, C.pill, 0.35)}${blob(980, 520, 380, C.green, 0.22)}${blob(60, 1500, 460, C.blue, 0.16)}${blob(1000, 1700, 420, C.orange, 0.2)}
        ${shadow}`;
}

function bezelHtml(device) {
    const d = DEVICES[device];
    if (!d.bezel) return '';
    const r = screenRect(d);
    const ox = r.x - d.bezel, oy = r.y - d.bezel, ow = r.w + 2 * d.bezel, oh = r.h + 2 * d.bezel;
    const rr = (x, y, w, h, rad) => `M${x + rad},${y}H${x + w - rad}A${rad},${rad} 0 0 1 ${x + w},${y + rad}V${y + h - rad}A${rad},${rad} 0 0 1 ${x + w - rad},${y + h}H${x + rad}A${rad},${rad} 0 0 1 ${x},${y + h - rad}V${y + rad}A${rad},${rad} 0 0 1 ${x + rad},${y}Z`;
    // A plain camera dot on the bezel: no logo, no buttons that copy a brand.
    const cam = device === 'phone' ? { x: W / 2, y: oy + d.bezel / 2 + 1, r: 4 } : device === 'tablet' ? { x: W / 2, y: oy + d.bezel / 2, r: 5 } : { x: W / 2, y: oy + d.bezel / 2, r: 3.5 };
    const base = device === 'laptop'
        ? `<path d="M${ox - 60},${oy + oh} H${ox + ow + 60} l-18,26 a14,14 0 0 1 -12,8 H${ox - 30} a14,14 0 0 1 -12,-8 Z" fill="#C9CFDA"/><rect x="${W / 2 - 70}" y="${oy + oh}" width="140" height="9" rx="4" fill="#AEB5C2"/>`
        : '';
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0">
        <path fill-rule="evenodd" fill="${C.bezel}" d="${rr(ox, oy, ow, oh, d.rOut)} ${rr(r.x, r.y, r.w, r.h, d.rIn)}"/>
        <path fill="none" stroke="rgba(255,255,255,.14)" stroke-width="2" d="${rr(ox + 3, oy + 3, ow - 6, oh - 6, Math.max(0, d.rOut - 3))}"/>
        <circle cx="${cam.x}" cy="${cam.y}" r="${cam.r}" fill="#3B4152"/>${base}</svg>`;
}

// Top caption between the safe top and the device, bottom caption between the device and the safe bottom.
function captionHtml(device, { top, bottom, nieuw = false, topSize = 72, bottomSize = 54, middle = null }) {
    const r = device ? screenRect(DEVICES[device]) : { top: 820, bottom: 1120 };
    const box = (y0, y1, inner, size, weight) => `<div style="position:absolute;left:90px;right:90px;top:${y0}px;height:${y1 - y0}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-size:${size}px;font-weight:${weight};line-height:1.12;letter-spacing:-.5px">${inner}</div>`;
    const topInner = `${nieuw ? nieuwPill : ''}<div>${rich(top ?? '')}</div>`;
    return (top ? box(SAFE.top, r.top - 30, topInner, topSize, 900) : '')
        + (bottom ? box(r.bottom + 26, SAFE.bottom, `<div>${rich(bottom)}</div>`, bottomSize, 800) : '')
        + (middle ?? '');
}

// ── Rendering one shot / one beat ─────────────────────────────────────────────
const TINTS = [['#EAF3FF', '#FDF6E7'], ['#F2F7FF', '#EAF7EE'], ['#EEF3FF', '#F7EEFB'], ['#EAF4FF', '#FFF3E6'], ['#FFF6E9', '#EAF3FF'], ['#EAF7EE', '#EAF3FF'], ['#F7EEFB', '#EAF3FF'], ['#EAF3FF', '#EAF3FF']];

async function renderShot(beatIdx, shotIdx, beat, shot) {
    const dir = join(WORK, 'shots');
    mkdirSync(dir, { recursive: true });
    const tag = `${beat.id}-${shotIdx}`;
    const device = shot.device;
    const bg = join(dir, `${tag}-bg.png`), bez = join(dir, `${tag}-bezel.png`), cap = join(dir, `${tag}-cap.png`);
    await drawLayer(backgroundHtml(device === 'none' ? null : device, TINTS[beatIdx % TINTS.length]) + (shot.backHtml ?? ''), bg, false);
    await drawLayer(device === 'none' ? '' : bezelHtml(device), bez, true);
    await drawLayer(captionHtml(device === 'none' ? null : device, { ...beat.caption, ...(shot.caption ?? {}) }), cap, true);

    const out = join(dir, `${tag}.mp4`);
    const D = shot.duration;
    const inputs = ['-loop', '1', '-framerate', String(FPS), '-t', String(D), '-i', bg];
    let screen = '';
    if (shot.files) {
        const list = join(dir, `${tag}.ffconcat`);
        const lines = ['ffconcat version 1.0'];
        for (let i = 0; i < shot.files.length;) {
            let j = i; while (j + 1 < shot.files.length && shot.files[j + 1] === shot.files[i]) j++;
            lines.push(`file '${fwd(shot.files[i])}'`, `duration ${((j - i + 1) / FPS).toFixed(5)}`);
            i = j + 1;
        }
        lines.push(`file '${fwd(shot.files.at(-1))}'`);
        writeFileSync(list, lines.join('\n'));
        inputs.push('-f', 'concat', '-safe', '0', '-i', list);
        screen = 'concat';
    } else if (shot.still) {
        inputs.push('-loop', '1', '-framerate', String(FPS), '-t', String(D), '-i', shot.still);
        screen = 'still';
    }
    inputs.push('-loop', '1', '-framerate', String(FPS), '-t', String(D), '-i', bez);
    inputs.push('-loop', '1', '-framerate', String(FPS), '-t', String(D), '-i', cap);
    const iBez = screen ? 2 : 1, iCap = iBez + 1;
    const fade = shot.captionFade === false ? '' : ',fade=t=in:st=0:d=0.35:alpha=1';
    let g = '';
    if (screen) {
        const d = DEVICES[device], r = screenRect(d), k = d.crop;
        const crop = k ? `crop=iw*${k.w}/${d.vw}:ih*${k.h}/${d.vh}:iw*${k.x}/${d.vw}:ih*${k.y}/${d.vh},` : '';
        g += `[1:v]fps=${FPS},${crop}scale=${r.w}:${r.h}:flags=lanczos,setsar=1,format=rgba[s];[0:v][s]overlay=${r.x}:${r.y}:eof_action=repeat[a];`;
    } else g += '[0:v]null[a];';
    g += `[a][${iBez}:v]overlay[b];[${iCap}:v]format=rgba${fade}[c];[b][c]overlay,scale=out_range=tv:out_color_matrix=bt709,format=yuv420p[v]`;
    ff([...inputs, '-filter_complex', g, '-map', '[v]', '-t', String(D), '-r', String(FPS), '-c:v', 'libx264', '-crf', '12', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', out], tag);
    return out;
}

async function renderBeat(beatIdx, beat) {
    const clips = [];
    for (const [i, shot] of beat.shots.entries()) clips.push(await renderShot(beatIdx, i, beat, { ...shot, captionFade: i === 0 ? shot.captionFade : false }));
    const out = join(WORK, `beat-${beat.id}.mp4`);
    const list = join(WORK, `beat-${beat.id}.txt`);
    writeFileSync(list, clips.map(c => `file '${fwd(c)}'`).join('\n'));
    ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out], `beat ${beat.id}`);
    const dur = beat.shots.reduce((s, x) => s + x.duration, 0);
    writeFileSync(join(WORK, `beat-${beat.id}.json`), JSON.stringify({ duration: dur }));
    console.log(`  beat ${beat.id}: ${dur.toFixed(2)} s`);
}

// A shot from a recording: parts are [from, to, speed] on the recording's clock.
const filmed = (device, rec, parts, extra = {}) => {
    const files = rec.timeline(parts);
    return { device, files, duration: files.length / FPS, ...extra };
};

// ── App helpers shared by the beats ───────────────────────────────────────────
async function editor({ seed = 11 } = {}) {
    const c = await context('laptop', { seed });
    await c.page.goto(`${BASE}/`);
    await c.page.waitForFunction(() => !!window.__rekenraak);
    await wait(900);
    return c;
}

// The URL the footer QR of the first page encodes, read from the QR component's own props.
async function footerQrPayload(page) {
    return page.evaluate(async () => {
        const svg = document.querySelector('.tutor-qr-foot svg[aria-label="QR-code voor de stappenhulp"]');
        if (!svg) throw new Error('no stappenhulp QR on the sheet');
        let f = svg[Object.keys(svg).find(k => k.startsWith('__reactFiber$'))];
        while (f && !(f.memoizedProps && 'payload' in f.memoizedProps)) f = f.return;
        const { payload, lean, more } = f.memoizedProps;
        const m = await import('/src/components/sheet/tutorQrPick.ts');
        return m.tutorQrPayloadOf(m.tutorQrPick(payload, lean ?? null, more ?? null), { payload, lean, more });
    });
}

// The game's question and its answer, from the game's own store.
const spelState = page => page.evaluate(async () => {
    const { useSpelStore } = await import('/src/oefenen/spelen/useSpelStore.ts');
    const s = useSpelStore.getState();
    return { phase: s.phase, key: s.question?.key ?? null, answer: s.question?.answer ?? null };
});
async function nextQuestion(page, prevKey) {
    for (let i = 0; i < 80; i++) {
        const s = await spelState(page);
        if (s.phase === 'play' && s.key && s.key !== prevKey) return s;
        await wait(100);
    }
    throw new Error('the game asked no new question');
}
// Off camera: answered at once with the keyboard, to get the game where the shot happens.
async function quickAnswers(page, n, prev = null) {
    let key = prev;
    for (let i = 0; i < n; i++) {
        const s = await nextQuestion(page, key);
        await page.keyboard.type(s.answer, { delay: 30 });
        await page.keyboard.press('Enter');
        key = s.key;
    }
    return key;
}
// A near miss, never the answer: one too many on a small answer, a few too few on a bigger one.
const slip = answer => String(Number(answer) + (Number(answer) > 20 ? -Number(answer) / Math.max(2, Math.round(Math.sqrt(Number(answer)))) | 0 : 1));

// To a topic in Zelf oefenen (kind.html), a game started, its options picked.
async function startGame(page, { grade, topic, tafels, range, game, options = [] }) {
    await page.goto(`${BASE}${KIND}`);
    await wait(900);
    await page.getByRole('button', { name: `Leerjaar ${grade}`, exact: true }).click();
    await wait(500);
    await page.locator(`.zelf-topic[data-topic="${topic}"]`).click();
    await wait(500);
    if (range) { await page.getByRole('button', { name: range, exact: true }).click(); await wait(300); }
    if (tafels) {
        await page.getByRole('button', { name: 'Geen', exact: true }).click();
        for (const t of tafels) await page.getByRole('button', { name: `Tafel van ${t}`, exact: true }).click();
    }
    const choice = page.getByRole('button', { name: /^Met brug|^Zonder brug/ });
    if (!tafels && await choice.count()) await choice.first().click();
    await page.getByRole('group', { name: 'Kies een spel' }).getByRole('button', { name: new RegExp(`^${game}`) }).click();
    await wait(600);
    for (const o of options) { await page.getByRole('button', { name: o, exact: true }).click(); await wait(150); }
    const start = page.getByRole('button', { name: /^Start/ });
    if (await start.count()) await start.first().click();
    await wait(1200);
}

// To a Zelf oefenen exercise in the kiosk ("Begin met oefenen").
async function startZelf(page, { grade, topic, choice, tafels, range }) {
    await page.goto(`${BASE}${KIND}`);
    await wait(900);
    await page.getByRole('button', { name: `Leerjaar ${grade}`, exact: true }).click();
    await wait(500);
    await page.locator(`.zelf-topic[data-topic="${topic}"]`).click();
    await wait(500);
    if (range) { await page.getByRole('button', { name: range, exact: true }).click(); await wait(300); }
    if (tafels) {
        await page.getByRole('button', { name: 'Geen', exact: true }).click();
        for (const t of tafels) await page.getByRole('button', { name: `Tafel van ${t}`, exact: true }).click();
    }
    const begin = page.getByRole('button', { name: /Begin met oefenen/ });
    if (choice || !(await begin.count()) || await begin.isDisabled()) {
        const pick = choice ? page.locator('.zelf-choice:not(.zelf-range-btn)', { hasText: choice }) : page.locator('.zelf-choice:not(.zelf-range-btn)');
        await pick.first().click();
        await wait(300);
    }
    await begin.click();
    await wait(1400);
}

// ── The beats ─────────────────────────────────────────────────────────────────
// Each films what it needs and returns its shots; a shot is a timeline of frames (or a still) in one device.

// 2 · Werkblad: Eenvoudig, two cards, the sheet fills. Also keeps the finished page as the hook's paper still.
async function beatWerkblad() {
    const { ctx, page } = await editor();
    await page.evaluate(() => { window.__rekenraak.clearBlocks(); window.__rekenraak.getState().updateHeader({ titel: 'Herhaling' }); });
    await wait(700);
    const rec = await new Recorder(page, 'werkblad').start();
    await wait(700);
    await tap(page, page.getByText('Maaltafels', { exact: true }).first(), 700);
    rec.mark('card1');
    await tap(page, page.getByText('Tafel van 5', { exact: true }).first(), 1100);
    await page.getByText('Klok en kalender', { exact: true }).first().scrollIntoViewIfNeeded();
    await tap(page, page.getByText('Klok en kalender', { exact: true }).first(), 700);
    await tap(page, page.getByText('Analoge klok lezen', { exact: true }).first(), 100);
    // The pointer off the sheet (into the cropped-off inspector), so no hover outline shows on the new page.
    await page.mouse.move(1300, 880);
    await wait(1400);
    rec.mark('filled');
    await wait(300);
    await rec.stop();
    // The finished page as paper, for the hook.
    const still = join(WORK, 'paper.png');
    // As it prints: nothing selected, the editor's buttons hidden, in a window tall enough for the whole page.
    // (No stappenhulp QR here: its taller footer pushes the klok block of this sheet to page 2.)
    await page.evaluate(() => window.__rekenraak.getState().setActiveSelection('document'));
    await page.setViewportSize({ width: 1440, height: 1500 });
    await wait(1500);
    await page.addStyleTag({ content: '.no-print{visibility:hidden!important}' });
    await wait(1200);
    await page.locator('.page-sheet').first().screenshot({ path: still });
    await ctx.close();
    return [filmed('laptop', rec, [[rec.at('start', 0.2), rec.at('card1', -0.2), 1.1], [rec.at('card1', -0.2), rec.at('filled', 0.5), 1]])];
}

// 3 · QR → stappen: a sheet with the stappenhulp QR, its payload opened on a phone, steps, Nog meer.
async function beatQr() {
    const ed = await editor({ seed: 21 });
    await ed.page.evaluate(() => {
        const r = window.__rekenraak;
        r.clearBlocks();
        r.getState().setSelectedGrade(2);
        r.addBlockFromType('hr-std-optellen', 'Optellen', { maxGetal: 100, bridges: { E: 'REQUIRED', T: 'FORBIDDEN' } }, { count: 8 });
        r.updateDocSettings({ tutorQr: true });
    });
    await wait(1500);
    const payload = await footerQrPayload(ed.page);
    await ed.ctx.close();

    const { ctx, page } = await context('phone', { seed: 21 });
    await page.goto(`${BASE}/tutor.html#t=${payload}`);
    await wait(1400);
    const rec = await new Recorder(page, 'qr').start();
    await wait(800);
    await tap(page, page.locator('main button').nth(2), 900);
    await tap(page, page.getByRole('button', { name: /Toon de eerste stap/ }), 900);
    await tap(page, page.getByRole('button', { name: /Toon de volgende stap/ }), 1100);
    rec.mark('more');
    await tap(page, page.getByRole('link', { name: /Nog meer van deze oefening/ }).first(), 1300);
    await tap(page, page.getByRole('button', { name: /Start/ }).first(), 1500);
    await rec.stop();
    await ctx.close();
    return [filmed('phone', rec, [[rec.at('start', 0.1), rec.at('more', 0), 1], [rec.at('more', 0), rec.at('end', -0.1), 1.1]])];
}

// The Oefenmodus link a teacher shares: one klok row (OefenWire v1, packText), made in the page itself.
async function oefenLink(page, leafId, title) {
    return page.evaluate(async ({ leafId, title }) => {
        const { packText } = await import('/src/services/oefenen/packText.ts');
        return '/oefenen.html#oefen=' + packText(JSON.stringify([1, 'promo', Math.floor(Date.now() / 60000), 0, [[leafId]], title]));
    }, { leafId, title });
}
const kioskAnswer = page => page.evaluate(async () => {
    const { useOefenStore } = await import('/src/oefenen/useOefenStore.ts');
    const { REGISTRY } = await import('/src/config/exerciseRegistry.ts');
    const s = useOefenStore.getState();
    const t = s.sessie.types[s.shown.slot];
    return REGISTRY[t.typeId].kiosk.answerOf(s.shown.exercise, s.shown.constraints)[0];
});

// 4 · Oefenmodus: a klok exercise, the classic "half" slip, the steps, Nog eens proberen, right.
async function beatOefenmodus() {
    const { ctx, page } = await context('tablet', { seed: 5 });
    await page.goto(`${BASE}${KIND}`);
    await wait(600);
    await page.goto(BASE + await oefenLink(page, 'klok-analoog-lezen', 'Klok'));
    await wait(1000);
    await page.getByRole('button', { name: /Start/ }).first().click();
    await wait(1300);
    const answer = await kioskAnswer(page);
    const [h, m] = answer.split(':');
    // "half 9" read as 9:30: the hour the word names instead of the hour the small hand passed.
    const wrongH = m === '30' ? String(Number(h) + 1) : String((Number(h) % 12) + 1);
    const rec = await new Recorder(page, 'oefenmodus').start();
    await wait(700);
    await tapNumber(page, wrongH);
    await tap(page, page.getByLabel('min', { exact: true }), 200);
    await tapNumber(page, m);
    await check(page);
    await wait(1000);
    rec.mark('fout');
    await tap(page, page.getByRole('button', { name: /Toon de (stappen|blokjes)/ }), 1300);
    const reveal = page.getByRole('button', { name: /Toon het antwoord|Toon de volgende stap/ });
    if (await reveal.count()) await tap(page, reveal.first(), 1000);
    rec.mark('retry');
    await tap(page, page.getByRole('button', { name: /Nog eens proberen/ }), 500);
    await tapNumber(page, h);
    await tap(page, page.getByLabel('min', { exact: true }), 200);
    await tapNumber(page, m);
    await check(page);
    await wait(1100);
    await rec.stop();
    await ctx.close();
    return [filmed('tablet', rec, [[rec.at('start', 0.2), rec.at('fout', 0), 1.45], [rec.at('fout', 0), rec.at('retry', 0), 1.25], [rec.at('retry', 0), rec.at('end', -0.15), 1.45]])];
}

// 5 · Zelf oefenen: leerjaar tiles → a topic → Welke tafels?
async function beatZelf() {
    const { ctx, page } = await context('tablet', { seed: 3 });
    await page.goto(`${BASE}${KIND}`);
    await wait(1200);
    const rec = await new Recorder(page, 'zelf').start();
    await wait(600);
    await tap(page, page.getByRole('button', { name: 'Leerjaar 3', exact: true }), 700);
    await flick(page, 640);
    await wait(500);
    await tap(page, page.locator('.zelf-topic[data-topic="Hoofdrekenen · Maaltafels"]'), 900);
    rec.mark('tafels');
    await tap(page, page.getByRole('button', { name: 'Geen', exact: true }), 300);
    for (const t of [2, 5, 10]) await tap(page, page.getByRole('button', { name: `Tafel van ${t}`, exact: true }), 300);
    await wait(500);
    await rec.stop();
    await ctx.close();
    return [filmed('tablet', rec, [[rec.at('start', 0.1), rec.at('tafels', 0), 1.1], [rec.at('tafels', 0), rec.at('end', -0.1), 1]])];
}

// One game moment: setup off camera, then the pupil's answer and what the game does with it.
async function gameShot(name, setup, moment, { before = 0.15, after = 1.0, seed = 9, speed = 1 } = {}) {
    const { ctx, page } = await context('tablet', { seed });
    await setup(page);
    const rec = await new Recorder(page, name).start();
    await wait(300);
    rec.mark('in');
    await moment(page, rec);
    rec.mark('out');
    await wait(after * 1000 + 200);
    await rec.stop();
    await ctx.close();
    return filmed('tablet', rec, [[rec.at('in', -before), rec.at('out', after), speed]]);
}
const TAFELS = { grade: 3, topic: 'Hoofdrekenen · Maaltafels', tafels: [2, 3, 4, 5, 10] };
// Types the answer on the keypad like a pupil, then Controleer.
async function keypadAnswer(page, text) { await tapNumber(page, text, 200); await check(page); }
async function tapChoice(page, answer) {
    const btn = page.getByRole('group', { name: 'Kies het antwoord' }).getByRole('button').filter({ hasText: new RegExp(`^\\s*${answer}\\s*$`) }).first();
    await tap(page, btn, 100);
}

// 6 · Spellen: one moment per game.
async function beatSpellen() {
    const shots = [];
    // Voetbal: four passes off camera, the fifth right answer is the shot: a goal.
    shots.push(await gameShot('voetbal', async page => {
        await startGame(page, { ...TAFELS, game: 'Voetbal' });
        const k = await quickAnswers(page, 4);
        await wait(900);
        page.k = (await nextQuestion(page, k));
    }, async page => { await keypadAnswer(page, page.k.answer); }, { after: 0.9 }));
    // Zombies: a right answer, the blowdart knocks a zombie down.
    shots.push(await gameShot('zombies', async page => {
        await startGame(page, { ...TAFELS, game: 'Zombies', options: ['Normaal'] });
        const k = await quickAnswers(page, 2);
        await wait(2500);
        page.k = await nextQuestion(page, k);
    }, async page => { await keypadAnswer(page, page.k.answer); }, { after: 1.0 }));
    // Race (Benzine): ten answers off camera, then the petrol station's sum and the cans filling.
    shots.push(await gameShot('race', async page => {
        await startGame(page, { ...TAFELS, game: 'Race', options: ['Benzine'] });
        const k = await quickAnswers(page, 10);
        page.k = await nextQuestion(page, k);
        // The car pulls in (1.5 s) and 'Maak je klaar!' (1 s) before the station's sum takes answers (race/benzine.ts).
        await wait(1300);
    }, async page => { await wait(1300); await keypadAnswer(page, page.k.answer); }, { before: 0.05, after: 1.2, speed: 1.4 }));
    // Pinguïntoren: a tower built off camera (a first slip only cracks a block), then a second slip: the blocks break and splash.
    shots.push(await gameShot('pinguintoren', async page => {
        await startGame(page, { ...TAFELS, game: 'Pinguïntoren' });
        const s = await nextQuestion(page, await quickAnswers(page, 6));
        await page.keyboard.type(slip(s.answer));
        await page.keyboard.press('Enter');
        await wait(2000);
        page.k = await nextQuestion(page, null);
    }, async page => { await keypadAnswer(page, slip(page.k.answer)); }, { after: 1.3 }));
    // Ballonnen (optellen tot 20, leerjaar 1): the right balloon pops.
    shots.push(await gameShot('ballonnen', async page => {
        await startGame(page, { grade: 1, topic: 'Hoofdrekenen · Optellen', range: 'tot 20', game: 'Ballonnen' });
        const k = await quickAnswers(page, 0);
        page.k = await nextQuestion(page, k);
        await wait(1600);
    }, async page => { await wait(250); await tapChoice(page, page.k.answer); }, { before: 0.1, after: 0.9 }));
    // Kasteel (1 speler): a right answer launches the stone; it hits the other castle.
    shots.push(await gameShot('kasteel', async page => {
        await startGame(page, { ...TAFELS, game: 'Kasteel', options: ['1 speler'] });
        const k = await quickAnswers(page, 2);
        await wait(1200);
        page.k = await nextQuestion(page, k);
    }, async page => { await keypadAnswer(page, page.k.answer); }, { after: 1.2 }));
    return shots;
}

// The hook's game: Zeehondjes voeren with optellen tot 10, a seal gets its fish.
async function hookGame() {
    return gameShot('hook', async page => {
        await startGame(page, { grade: 1, topic: 'Hoofdrekenen · Optellen', range: 'tot 10', game: 'Zeehondjes voeren', options: ['Normaal'] });
        page.k = await nextQuestion(page, null);
        await wait(900);
    }, async page => { await wait(200); await tapChoice(page, page.k.answer); }, { before: 0.1, after: 1.0, seed: 4 });
}

// The answer on the kiosk's keypad, or the choice button that says it.
async function kioskTapAnswer(page, answer) {
    if (await key(page, answer[0]).count()) return tapNumber(page, answer, 150);
    const choice = page.locator('.kiosk-choices button, [role=radiogroup] button, [role=radio]').filter({ hasText: answer }).first();
    if (await choice.count()) await tap(page, choice, 150);
}

// 7 · Inhoud: quick flashes of the kiosk at four topics.
async function beatInhoud() {
    const flashes = [
        // type = the pupil taps the answer during the flash (keypad topics).
        ['tafels', 'Tafels', { ...TAFELS, tafels: [6, 7, 8] }, true],
        ['klok', 'Klok', { grade: 3, topic: 'Klok en kalender', choice: 'Klok lezen' }, false],
        ['breuken', 'Breuken', { grade: 3, topic: 'Breuken', choice: 'Breuk in een figuur' }, false],
        ['komma', 'Kommagetallen', { grade: 5, topic: 'Kommagetallen en procenten', choice: 'Kommagetallen' }, true],
    ];
    const shots = [];
    for (const [id, label, where, type] of flashes) {
        const { ctx, page } = await context('tablet', { seed: 13 });
        await startZelf(page, where);
        const answer = type ? await kioskAnswer(page) : '';
        const rec = await new Recorder(page, `inhoud-${id}`).start();
        await wait(250);
        if (type) await kioskTapAnswer(page, answer);
        await wait(Math.max(200, 1150 - (Date.now() / 1000 - rec.marks.start) * 1000));
        await rec.stop();
        await ctx.close();
        shots.push(filmed('tablet', rec, [[rec.at('start', 0.05), rec.at('start', 1.05)]], { caption: { bottom: `*${label}*` } }));
    }
    return shots;
}

// The app's own icon (public/favicon.svg), large.
const appIcon = () => readFileSync(join(ROOT, 'public', 'favicon.svg'), 'utf8').replace(/width="64" height="64"/, 'width="190" height="190" style="filter:drop-shadow(0 8px 14px rgba(20,33,61,.25))"');

// 8 · Close: the app's own wordmark, read from the editor so it follows the app.
async function closeLogo() {
    const { ctx, page } = await editor();
    const svg = await page.evaluate(() => {
        const el = document.querySelector('svg[aria-label="rekenraak"]');
        const css = getComputedStyle(document.documentElement);
        return el.outerHTML.replace(/var\((--[a-z-]+)\)/g, (_, n) => css.getPropertyValue(n).trim());
    });
    await ctx.close();
    return svg.replace(/style="[^"]*"/, 'style="width:820px;height:auto;display:block"');
}

const BEATS = [
    {
        id: 'hook', caption: { top: 'Rekenen oefenen:', topSize: 80 },
        film: async () => {
            const game = await hookGame();
            return [
                { device: 'paper', still: join(WORK, 'paper.png'), duration: 1.35, caption: { bottom: 'op *papier*,' } },
                { ...game, duration: Math.min(game.duration, 1.9), files: game.files.slice(0, Math.round(1.9 * FPS)), caption: { bottom: 'op de *tablet* en *spelend*' } },
            ];
        },
    },
    { id: 'werkblad', caption: { top: 'Maak een *werkblad*', bottom: 'in een paar klikken' }, film: beatWerkblad },
    { id: 'qr', caption: { nieuw: true, top: 'Scan de *QR-code*', bottom: 'en zie elke som stap voor stap', bottomSize: 50 }, film: beatQr },
    { id: 'oefenmodus', caption: { top: '*Oefenmodus*', bottom: 'Fout? De stappen helpen meteen', bottomSize: 50 }, film: beatOefenmodus },
    { id: 'zelf', caption: { nieuw: true, top: 'Leerlingen kiezen zelf', bottom: 'wat ze *oefenen*' }, film: beatZelf },
    { id: 'spellen', caption: { nieuw: true, top: '*18* rekenspelletjes', bottom: 'van leerjaar 1 tot 6' }, film: beatSpellen },
    { id: 'inhoud', caption: { top: 'Sommen, tafels, klok, breuken en meer', topSize: 66 }, film: beatInhoud },
    {
        id: 'close', caption: {},
        film: async () => {
            const logo = await closeLogo();
            const mid = `<div style="position:absolute;left:0;right:0;top:${SAFE.top}px;height:${SAFE.bottom - SAFE.top}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:60px">
                <div style="display:flex;flex-direction:column;align-items:center;gap:28px">${appIcon()}${logo}</div>
                <div style="font-size:60px;font-weight:900;line-height:1.2">Gratis · geen reclame ·<br>geen account</div>
                <div style="font-size:66px;font-weight:900;color:#fff;background:${C.accent};padding:18px 44px 22px;border-radius:999px;box-shadow:0 6px 0 rgba(20,33,61,.22)">rekenraak.be</div></div>`;
            return [{ device: 'none', duration: 3.6, caption: { middle: mid } }];
        },
    },
];

// ── Main ──────────────────────────────────────────────────────────────────────
mkdirSync(WORK, { recursive: true });
const want = b => !ONLY.length || ONLY.includes(b.id);
let failed = false;
try {
    // The hook reuses the werkblad's paper still: film werkblad first when the hook is wanted and no still exists.
    const order = [...BEATS].sort((a, b) => (a.id === 'werkblad' ? -1 : b.id === 'werkblad' ? 1 : 0));
    for (const beat of order) {
        const cached = existsSync(join(WORK, `beat-${beat.id}.mp4`));
        const needed = DRAFT ? want(beat) : want(beat) || !cached || (beat.id === 'werkblad' && want({ id: 'hook' }) && !existsSync(join(WORK, 'paper.png')));
        if (!needed) continue;
        console.log(`filming ${beat.id}…`);
        beat.shots = await beat.film();
        await renderBeat(BEATS.indexOf(beat), beat);
    }
} catch (e) {
    failed = true;
    console.error(e);
    await lastPage?.screenshot({ path: join(WORK, 'failed-step.png') }).catch(() => {});
} finally {
    await browser.close();
    await plainBrowser.close();
    own?.stop();
}
if (failed) process.exit(1);
if (DRAFT) { console.log(errors.length ? [...new Set(errors)].join('\n') : 'no page errors'); process.exit(0); }

// The beats joined with short crossfades, the music under it, faded in and out.
const durs = BEATS.map(b => JSON.parse(readFileSync(join(WORK, `beat-${b.id}.json`), 'utf8')).duration);
const total = durs.reduce((s, d) => s + d, 0) - XFADE * (BEATS.length - 1);
const inputs = BEATS.flatMap(b => ['-i', join(WORK, `beat-${b.id}.mp4`)]);
let g = '', prev = '0:v', offset = 0;
const starts = [0];
for (let i = 1; i < BEATS.length; i++) {
    offset += durs[i - 1] - XFADE;
    starts.push(offset);
    const outLabel = i === BEATS.length - 1 ? 'v' : `x${i}`;
    g += `[${prev}][${i}:v]xfade=transition=fade:duration=${XFADE}:offset=${offset.toFixed(3)}${i === BEATS.length - 1 ? ',format=yuv420p' : ''}[${outLabel}];`;
    prev = outLabel;
}
const mi = BEATS.length;
g += `[${mi}:a]atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.6,afade=t=out:st=${(total - 1.6).toFixed(3)}:d=1.6,volume=${MUSIC_GAIN}[a]`;
ff([...inputs, '-stream_loop', '-1', '-i', MUSIC, '-filter_complex', g, '-map', '[v]', '-map', '[a]', '-t', total.toFixed(3),
    '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', VIDEO], 'final video');

// Review frames (three per beat) and the contact sheet (the middle one of each beat).
const FRAMES = join(OUT, 'frames');
rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
const mids = [];
BEATS.forEach((b, i) => {
    const s = starts[i] + (i ? XFADE : 0), e = starts[i] + durs[i] - XFADE;
    [0.2, 0.5, 0.85].forEach((f, k) => {
        const file = join(FRAMES, `${String(i + 1).padStart(2, '0')}-${b.id}-${k + 1}.png`);
        ff(['-ss', (s + (e - s) * f).toFixed(3), '-i', VIDEO, '-frames:v', '1', file], `frame ${b.id}`);
        if (k === 1) mids.push(file);
    });
});
const sheetCtx = await (await chromium.launch()).newContext({ viewport: { width: 4 * 270 + 5 * 16, height: 2 * (480 + 40) + 3 * 16 }, deviceScaleFactor: 1 });
const sheetPage = await sheetCtx.newPage();
await sheetPage.setContent(`<!doctype html><html><body style="margin:0;padding:16px;background:#222;display:grid;grid-template-columns:repeat(4,270px);gap:16px;font:600 18px system-ui;color:#eee">${mids.map((f, i) => `<figure style="margin:0"><img style="width:270px;height:480px;display:block" src="data:image/png;base64,${readFileSync(f).toString('base64')}"><figcaption style="height:24px;padding-top:8px">${i + 1} · ${BEATS[i].id}</figcaption></figure>`).join('')}</body></html>`);
await sheetPage.screenshot({ path: join(OUT, 'contact-sheet.png') });
await sheetCtx.browser().close();

console.log(`\n${VIDEO}\n  ${total.toFixed(2)} s, ${W}x${H} @ ${FPS} fps, music: ${MUSIC.split(/[\\/]/).pop()}`);
console.log(`  contact sheet: ${join(OUT, 'contact-sheet.png')}`);
if (errors.length) { console.log(`\n${errors.length} page error(s):`); for (const e of [...new Set(errors)]) console.log('  ' + e); }
