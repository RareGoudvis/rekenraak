// The per-cell fit checks bignum-audit.mjs and full-sweep.mjs share: run in the page after
// leafWalk settled a cell, they measure what a teacher would see go wrong (the "te breed"
// banner, a scaled inner that scrolls, content sticking out of the cell, overlapping text)
// and screenshot the cell plus whatever sticks out of it. One copy, so a check moves once.

import { join } from 'node:path';

/** Every fit measurement of the first cell on the sheet, plus the overlapping-text report. */
export async function probeCell(page) {
    return page.evaluate(() => {
        const cell = document.querySelector('[data-block-id]');
        if (!cell) return { probeError: 'no cell' };
        cell.scrollIntoView({ block: 'start' });
        const inner = cell.querySelector('[data-scaled-inner]');
        const cr = cell.getBoundingClientRect();
        const round = (n) => Math.round(n * 10) / 10;
        const describe = (el) => {
            const cls = typeof el.className === 'string' ? el.className : el.getAttribute?.('class') ?? '';
            const txt = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
            return `${el.tagName.toLowerCase()}${cls ? `.${cls.trim().split(/\s+/).join('.')}` : ''}${txt ? ` "${txt}"` : ''}`;
        };

        const warn = cell.querySelector('.cell-hoverflow-warn');
        const innerOverflowPx = inner ? inner.scrollWidth - inner.clientWidth : 0;

        // Visible part of an element: its rect cut by every ancestor (inside the inner) that
        // clips. An svg clips by default, so a label inside an svg can only escape as far
        // as the svg itself does.
        const clipOf = new Map();
        const visibleRect = (el) => {
            const r = el.getBoundingClientRect();
            const clip = clipOf.get(el.parentElement) ?? { l: -Infinity, t: -Infinity, r: Infinity, b: Infinity };
            const box = { l: Math.max(r.left, clip.l), t: Math.max(r.top, clip.t), r: Math.min(r.right, clip.r), b: Math.min(r.bottom, clip.b) };
            const cs = getComputedStyle(el);
            let own = clip;
            if (cs.overflowX !== 'visible') own = { ...own, l: Math.max(own.l, r.left), r: Math.min(own.r, r.right) };
            if (cs.overflowY !== 'visible') own = { ...own, t: Math.max(own.t, r.top), b: Math.min(own.b, r.bottom) };
            clipOf.set(el, own);
            const hidden = cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0;
            return { box, hidden, empty: r.width === 0 && r.height === 0 };
        };

        const outside = [];
        let worst = 0, worstDir = '';
        const offenders = new Set();
        if (inner) {
            for (const el of inner.querySelectorAll('*')) {
                const { box, hidden, empty } = visibleRect(el);
                if (hidden || empty || box.r <= box.l || box.b <= box.t) continue;
                const over = { left: cr.left - box.l, right: box.r - cr.right, top: cr.top - box.t, bottom: box.b - cr.bottom };
                const [dir, px] = Object.entries(over).sort((a, b) => b[1] - a[1])[0];
                if (px <= 1) continue;
                offenders.add(el);
                if (px > worst) { worst = px; worstDir = dir; }
                // Outermost offenders only: a wide grid drags every child with it.
                if (!offenders.has(el.parentElement)) outside.push({ el: describe(el), dir, px: round(px) });
            }
        }

        // Text boxes, grouped per exercise (a grid item of a .print-row), for the overlap report.
        const groupOf = (node) => {
            let el = node.parentElement;
            while (el && el !== inner) {
                if (el.parentElement?.classList.contains('print-row')) return el;
                if (el.classList?.contains('print-row')) return el;
                el = el.parentElement;
            }
            return inner;
        };
        const boxes = [];
        if (inner) {
            const walker = document.createTreeWalker(inner, NodeFilter.SHOW_TEXT);
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
                if (!n.textContent.trim()) continue;
                const parent = n.parentElement;
                const cs = getComputedStyle(parent);
                if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
                const inSvg = parent instanceof SVGElement;
                const rects = inSvg ? [parent.getBoundingClientRect()] : (() => {
                    const range = document.createRange(); range.selectNodeContents(n);
                    return [...range.getClientRects()];
                })();
                for (const r of rects) if (r.width > 0 && r.height > 0) boxes.push({ n, g: groupOf(n), r, text: n.textContent.trim().slice(0, 24) });
            }
        }
        const overlaps = [];
        for (let i = 0; i < boxes.length && overlaps.length < 10; i++) {
            for (let j = i + 1; j < boxes.length && overlaps.length < 10; j++) {
                const a = boxes[i], b = boxes[j];
                if (a.n === b.n || a.g !== b.g) continue;
                const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
                const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
                if (w > 2 && h > 2) overlaps.push({ a: a.text, b: b.text, w: round(w), h: round(h) });
            }
        }

        return {
            effWidth: Number(cell.dataset.width) || null,
            cellWidthPx: round(cr.width),
            hoverflowWarn: warn ? warn.innerText.split('\n')[0] : null,
            innerOverflowPx,
            outsidePx: round(worst),
            outsideDir: worstDir,
            outside: outside.slice(0, 5),
            outsideCount: offenders.size,
            overlaps,
            // Read back so the verdict can prove the requested max reached the block unfloored.
            blockConstraints: window.__rekenraak.getState().blocks[0]?.constraints ?? null,
        };
    });
}

/** Screenshot of the first cell plus whatever sticks out of it; returns the file name or throws. */
export async function shootCell(page, dir, file) {
    const clip = await page.evaluate(() => {
        const cell = document.querySelector('[data-block-id]');
        const inner = cell.querySelector('[data-scaled-inner]') ?? cell;
        let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
        for (const el of [cell, ...inner.querySelectorAll('*')]) {
            const x = el.getBoundingClientRect();
            if (x.width === 0 && x.height === 0) continue;
            l = Math.min(l, x.left); t = Math.min(t, x.top); r = Math.max(r, x.right); b = Math.max(b, x.bottom);
        }
        const vw = window.innerWidth, vh = window.innerHeight;
        const x0 = Math.max(0, l - 12), y0 = Math.max(0, t - 12);
        return { x: x0, y: y0, width: Math.min(vw, r + 12) - x0, height: Math.min(vh, b + 12) - y0 };
    });
    if (!(clip.width > 0 && clip.height > 0)) throw new Error('empty clip');
    await page.screenshot({ path: join(dir, file), clip });
    return file;
}
