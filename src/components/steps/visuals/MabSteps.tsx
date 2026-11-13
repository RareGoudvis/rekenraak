import type { CSSProperties, ReactNode } from 'react';
import type { Equation } from '../../../services/math/types';
import { mabPlan, type MabCluster, type MabPicture, type MabPieceState } from '../../../services/steps/mabSteps';
import type { StepsVisualProps } from '../stepsVisual';
import './mab.css';

// MAB pieces above the hoofdrekenen steps, following the revealed lines. A light SVG in the sheet's Dienes look
// (MabBlocksSVG: a staaf shows its ten cells, a plaat its hundred) but drawn with theme tokens, sized for a side panel.
// SYNC: the piece shapes follow MabBlocksSVG.tsx (KioskPieceShape).

// fives: a wider gap after every fifth piece in a row (the MAB way to count a row of ten at a glance).
interface Spec { w: number; h: number; gap: number; per: number; fives?: boolean }
// viewBox units; the SVG scales to the panel. Index = place (E, T, H, D).
const SPECS: Spec[] = [
    { w: 10, h: 10, gap: 2, per: 10, fives: true },
    { w: 6, h: 40, gap: 3, per: 10, fives: true },
    { w: 30, h: 30, gap: 3, per: 3 },
    { w: 34, h: 34, gap: 3, per: 1 },
];
const FIVE_GAP = 5;
// The +/− mat stacks E and T in rows of five (taller, so the pieces stay big in a narrow panel); groups use rows of ten.
const specOf = (place: number, stable?: boolean): Spec => (stable && place < 2 ? { ...SPECS[place], per: 5, fives: false } : SPECS[place]);
const xIn = (s: Spec, k: number) => k * (s.w + s.gap) + (s.fives && k >= 5 ? FIVE_GAP : 0);
const COL_GAP = 10, PAD = 7, CLUSTER_GAP = 14, PLUS_W = 18, ROW_GAP = 12, MAX_ROW_W = 360, EMPTY_FRAME = 44;

const colSize = (s: Spec, count: number) => {
    if (count <= 0) return { w: 0, h: 0 };
    return { w: xIn(s, Math.min(count, s.per) - 1) + s.w, h: Math.ceil(count / s.per) * (s.h + s.gap) - s.gap };
};

interface Placed { x: number; y: number; w: number; h: number }

// Where each piece of a cluster sits, relative to the cluster's top-left, plus the cluster's size.
function layoutCluster(c: MabCluster, stableMax: number[]) {
    // Stable: each column as wide as it ever gets, so the pieces never shift sideways; the height follows today's pieces.
    const specs = [0, 1, 2, 3].map(p => specOf(p, c.stable));
    const widths = c.pieces.map((p, i) => colSize(specs[i], c.stable ? stableMax[i] : p.length).w);
    const pad = c.frame ? PAD : 0;
    let x = pad, h = 0;
    const at: Placed[][] = [[], [], [], []];
    for (const place of [3, 2, 1, 0]) {
        if (widths[place] === 0) continue;
        const s = specs[place];
        at[place] = c.pieces[place].map((_, i) => ({ x: x + xIn(s, i % s.per), y: pad + Math.floor(i / s.per) * (s.h + s.gap), w: s.w, h: s.h }));
        x += widths[place] + COL_GAP;
        h = Math.max(h, colSize(s, c.pieces[place].length).h);
    }
    const w = x === pad ? EMPTY_FRAME : x - COL_GAP + pad;
    return { at, w, h: h === 0 ? EMPTY_FRAME : h + 2 * pad };
}

function Piece({ place, state, r }: { place: number; state: MabPieceState; r: Placed }) {
    const cls = `sv-mab-p is-${state} is-p${place}`;
    const cells: ReactNode[] = [];
    if (place === 1) for (let j = 1; j < 10; j++) cells.push(<line key={j} x1={r.x} x2={r.x + r.w} y1={r.y + (j * r.h) / 10} y2={r.y + (j * r.h) / 10} />);
    if (place === 2) for (let j = 1; j < 10; j++) {
        cells.push(<line key={`v${j}`} x1={r.x + (j * r.w) / 10} x2={r.x + (j * r.w) / 10} y1={r.y} y2={r.y + r.h} />);
        cells.push(<line key={`h${j}`} y1={r.y + (j * r.h) / 10} y2={r.y + (j * r.h) / 10} x1={r.x} x2={r.x + r.w} />);
    }
    const body = place === 3 ? (() => {
        // A blok: front face, top and side in a light oblique view.
        const d = 8, f = r.w - d;
        const x = r.x, y = r.y + d;
        return (
            <>
                <path d={`M${x} ${y} l${d} ${-d} h${f} l${-d} ${d} z`} />
                <path d={`M${x + f} ${y} l${d} ${-d} v${f} l${-d} ${d} z`} />
                <rect x={x} y={y} width={f} height={f} />
            </>
        );
    })() : <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={place === 0 ? 1 : 0.5} />;
    return (
        <g className={cls}>
            {body}
            {cells.length > 0 && <g className="sv-mab-cells">{cells}</g>}
            {state === 'gone' && <line className="sv-mab-cross" x1={r.x - 1} y1={r.y + r.h + 1} x2={r.x + r.w + 1} y2={r.y - 1} />}
        </g>
    );
}

function Picture({ pic, stableMax }: { pic: MabPicture; stableMax: number[] }) {
    // Lay the clusters out in rows, wrapping at the panel width.
    const laid = pic.clusters.map(c => ({ c, ...layoutCluster(c, stableMax) }));
    const rows: { items: (typeof laid[number] & { x: number })[]; w: number; h: number }[] = [];
    for (const item of laid) {
        let row = rows[rows.length - 1];
        const lead = item.c.plus ? PLUS_W : 0;
        if (!row || item.c.newRow || (row.items.length > 0 && row.w + CLUSTER_GAP + lead + item.w > MAX_ROW_W)) { row = { items: [], w: 0, h: 0 }; rows.push(row); }
        const x = row.items.length ? row.w + CLUSTER_GAP + lead : lead;
        row.items.push({ ...item, x });
        row.w = x + item.w;
        row.h = Math.max(row.h, item.h);
    }
    const width = Math.max(...rows.map(r => r.w), 1);
    let y = 0;
    const out: ReactNode[] = [];
    rows.forEach((row, ri) => {
        const ox = (width - row.w) / 2;
        row.items.forEach((it, ci) => {
            const cx = ox + it.x, cy = y;
            const key = `${ri}-${ci}`;
            out.push(
                <g key={key} transform={`translate(${cx} ${cy})`}>
                    {it.c.plus && <text x={-PLUS_W / 2 - CLUSTER_GAP / 2} y={it.h / 2 + 6} textAnchor="middle" className="sv-mab-plus">+</text>}
                    {it.c.frame && <rect x={0} y={0} width={it.w} height={it.h} rx={8} className={`sv-mab-frame is-${it.c.frame}`} />}
                    {it.c.pieces.map((list, place) => list.map((state, i) => <Piece key={`${place}-${i}`} place={place} state={state} r={it.at[place][i]} />))}
                    {(it.c.rings ?? []).map(({ place, from }) => {
                        const box = it.at[place].slice(from, from + 10);
                        if (!box.length) return null;
                        const x0 = Math.min(...box.map(b => b.x)), y0 = Math.min(...box.map(b => b.y));
                        const x1 = Math.max(...box.map(b => b.x + b.w)), y1 = Math.max(...box.map(b => b.y + b.h));
                        return <rect key={`r${place}`} x={x0 - 3} y={y0 - 3} width={x1 - x0 + 6} height={y1 - y0 + 6} rx={4} className="sv-mab-ring" />;
                    })}
                </g>,
            );
        });
        y += row.h + ROW_GAP;
    });
    const height = Math.max(y - ROW_GAP, 1);
    return (
        <svg className="sv-mab-svg" viewBox={`-4 -4 ${width + 8} ${height + 8}`} style={{ '--mab-w': `${width + 8}px` } as CSSProperties} aria-hidden>
            {out}
        </svg>
    );
}

// Kiosk: data is the exercise; stappenhulp: the sum item's equation. Revealed 0 = the sum before any line.
export default function MabSteps({ data, lines, revealed }: StepsVisualProps<Equation>) {
    const plan = mabPlan(data, lines);
    if (!plan) return null;
    let pic = plan.initial;
    for (let i = 0; i < Math.min(revealed, plan.stages.length); i++) pic = plan.stages[i] ?? pic;
    // Stable columns: the widest a place gets over the whole plan, so the +/− mat never shifts.
    const stableMax = [0, 1, 2, 3].map(p => Math.max(0, ...[plan.initial, ...plan.stages].flatMap(s => (s?.clusters ?? []).filter(c => c.stable).map(c => c.pieces[p].length))));
    return (
        <figure className="sv-mab" aria-label="MAB-blokjes">
            <Picture pic={pic} stableMax={stableMax} />
            {pic.captions.length > 0 && <figcaption className="sv-mab-cap">{pic.captions.map(c => <span key={c}>{c}</span>)}</figcaption>}
        </figure>
    );
}
