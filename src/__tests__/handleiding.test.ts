import { describe, test, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { HELP_TOPICS, HANDLEIDING_URL } from '../components/layout/helpTopics';

// The teacher manual (handleiding.html) is hand-written; its figures come from
// `npm run handleiding:shots`. The gate checks the parts that break silently: a missing or
// orphaned figure, a table-of-contents or in-app help link to a section that is gone, and the
// page dropping out of the build, the sitemap or the other pages' tabs.
const ROOT = join(__dirname, '..', '..');
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8');
const html = existsSync(join(ROOT, 'handleiding.html')) ? read('handleiding.html') : '';
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const FIG_DIR = join(ROOT, 'public', 'handleiding');

describe('handleiding.html', () => {
    test('the page exists and is a Vite input', () => {
        expect(html.length).toBeGreaterThan(0);
        expect(read('vite.config.ts')).toMatch(/handleiding:\s*resolve\([^)]*'handleiding\.html'\)/);
    });

    test('every figure exists, with its real size, and every PNG is used', () => {
        const imgs = [...html.matchAll(/<img src="\/handleiding\/([^"]+)"[^>]*width="(\d+)" height="(\d+)"/g)];
        expect(imgs.length).toBeGreaterThan(10);
        expect(imgs.length).toBe((html.match(/<img /g) ?? []).length);
        for (const [, file, w, h] of imgs) {
            const png = join(FIG_DIR, file);
            expect(existsSync(png), file).toBe(true);
            const buf = readFileSync(png);
            expect([buf.readUInt32BE(16), buf.readUInt32BE(20)], file).toEqual([Number(w), Number(h)]);
        }
        const used = new Set(imgs.map(m => m[1]));
        const orphans = readdirSync(FIG_DIR).filter(f => !used.has(f));
        expect(orphans).toEqual([]);
    });

    test('every table-of-contents row points to a section', () => {
        const nav = html.slice(html.indexOf('id="handleiding-nav"'), html.indexOf('</nav>', html.indexOf('id="handleiding-nav"')));
        const anchors = [...nav.matchAll(/href="#([^"]+)"/g)].map(m => m[1]);
        expect(anchors.length).toBeGreaterThan(10);
        expect(anchors.filter(a => !ids.has(a))).toEqual([]);
    });

    test('every in-app help topic links to a section of the page', () => {
        expect(HANDLEIDING_URL).toBe('/handleiding.html');
        expect(HELP_TOPICS.filter(t => !ids.has(t.anchor)).map(t => t.id)).toEqual([]);
    });

    test('the other static pages and the sitemap link to it', () => {
        for (const page of ['about.html', 'faq.html', 'oefeningen.html']) {
            expect(read(page), page).toContain('<a class="seg-btn" href="/handleiding.html">Handleiding</a>');
        }
        expect(read('public/sitemap.xml')).toContain('<loc>https://www.rekenraak.be/handleiding.html</loc>');
    });

    test('teacher text without em dashes', () => {
        expect(html).not.toContain('—');
        for (const t of HELP_TOPICS) expect([t.title, ...t.bullets].join(' ')).not.toContain('—');
    });
});
