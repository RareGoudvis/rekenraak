// TODO K1: thin stand-ins for the services/oefenen API (session/scheduler/stats/check/kiosk)
// until oefen/k1-core lands; same names and signatures, deleted on the swap.
import { decompressFromEncodedURIComponent } from 'lz-string';
import { REGISTRY } from '../config/exerciseRegistry';
import { LEAF_BY_ID } from '../config/appstructure';
import type { MathBlock, Equation, ProcentExercise, AfrondenExercise, VergelijkenExercise } from '../services/math/types';
import type {
    KioskAnswer, KioskDescriptor, KioskInput, OefenHistoryEntry, OefenRun, OefenSessie, OefenStats,
    OefenSummaryRow, OefenType,
} from '../services/oefenen/types';

export function decodeSessie(hash: string): OefenSessie {
    const data = hash.replace(/^#?oefen=/, '');
    const json = data ? decompressFromEncodedURIComponent(data) : null;
    if (!json) throw new Error('Deze oefenlink is ongeldig (kan niet gelezen worden).');
    const s = JSON.parse(json) as OefenSessie;
    if (s.v > 1) throw new Error(`Deze oefenlink komt uit een nieuwere versie (v${s.v}). Werk de app bij om ze te openen.`);
    return s;
}

const plain = (x: number) => String(Number(x.toFixed(9)));
const spell = (x: number) => { const d = plain(x); const c = d.replace('.', ','); return c === d ? [d] : [c, d]; };
const num = (v: unknown) => (typeof v === 'number' ? v : 0);

const STUB: Record<string, KioskDescriptor> = {};
const hr: KioskDescriptor = {
    input: 'number',
    inputOf: (ex) => {
        const eq = ex as Equation;
        if (eq.remainder !== undefined) return 'number+rest';
        return eq.missingIndex !== undefined || eq.missingTerm === 'operand1' || eq.missingTerm === 'operand2' ? 'missing-operand' : 'number';
    },
    keys: (c) => (c.numberType === 'decimal' ? [','] : c.numberType === 'geheel' ? ['-'] : c.numberType === 'rational' ? ['/', ' '] : []),
    answerOf: (ex) => {
        const eq = ex as Equation;
        if (eq.remainder !== undefined) return [plain(num(eq.answer)), String(eq.remainder)];
        const idx = eq.missingIndex ?? (eq.missingTerm === 'operand1' ? 0 : eq.missingTerm === 'operand2' ? 1 : undefined);
        return spell(num(idx !== undefined ? eq.operands[idx] : eq.answer));
    },
    display: (ex) => {
        const eq = ex as Equation;
        const glyph: Record<string, string> = { '+': '+', '-': '−', x: '×', ':': ':' };
        return `${eq.operands.map(o => (typeof o === 'number' ? plain(o) : '?')).join(` ${glyph[eq.operator]} `)} = ${eq.remainder !== undefined ? '? r ?' : '?'}`;
    },
};
for (const t of ['hr-std-optellen', 'hr-std-aftrekken', 'hr-std-vermenigvuldigen', 'hr-std-delen']) STUB[t] = hr;
STUB['procenten'] = {
    input: 'number',
    answerOf: (ex, c) => spell(c.subType === 'welk-percent' ? (ex as ProcentExercise).percent : (ex as ProcentExercise).answer),
    display: (ex) => `${(ex as ProcentExercise).percent} % van ${(ex as ProcentExercise).base} = ?`,
};
STUB['afronden'] = {
    input: 'number',
    keys: (c) => (c.numberType === 'decimal' ? [','] : []),
    answerOf: (ex) => {
        const e = ex as AfrondenExercise;
        const w: Record<string, number> = { E: 1, T: 10, H: 100, D: 1000, TD: 10000, t: 0.1, h: 0.01 };
        const step = w[e.targetKey ?? 'T'] ?? 10;
        return spell(Math.round((e.number ?? 0) / step) * step);
    },
    display: (ex) => `${(ex as AfrondenExercise).number} ≈ ?`,
};
STUB['vergelijken'] = {
    input: 'choice',
    choices: ['<', '=', '>'],
    answerOf: (ex) => { const e = ex as VergelijkenExercise; const a = e.a ?? 0, b = e.b ?? 0; return [a < b ? '<' : a > b ? '>' : '=']; },
    display: (ex) => `${(ex as VergelijkenExercise).a} ? ${(ex as VergelijkenExercise).b}`,
};

export function kioskFor(typeId: string): KioskDescriptor | null {
    return STUB[typeId] ?? null;
}

export function kioskInputOf(d: KioskDescriptor, ex: unknown, c: Record<string, unknown>): KioskInput {
    return d.inputOf?.(ex, c) ?? d.input;
}

const madeOf = (history: OefenHistoryEntry[], slot: number) => history.filter(h => h.slot === slot).length;

export function plannedTotal(s: OefenSessie): number | null {
    if (s.total) return s.total;
    return s.types.every(t => t.limit) ? s.types.reduce((n, t) => n + (t.limit ?? 0), 0) : null;
}

export function nextType(s: OefenSessie, history: OefenHistoryEntry[], rng: () => number = Math.random): { slot: number; type: OefenType } | null {
    const pool = s.types.map((type, slot) => ({ slot, type })).filter(({ slot, type }) => !type.limit || madeOf(history, slot) < type.limit);
    if (pool.length === 0) return null;
    const prev = history[history.length - 1]?.slot;
    const options = pool.length >= 2 ? pool.filter(p => p.slot !== prev) : pool;
    return options[Math.floor(rng() * options.length)];
}

export function nextExercise(_s: OefenSessie, type: OefenType, seenKeys: string[] | Set<string>, _rng?: () => number):
    { exercise: unknown; key: string; constraints: Record<string, unknown>; repeat: boolean } | null {
    const def = REGISTRY[type.typeId];
    if (!def) return null;
    const leaf = LEAF_BY_ID[type.leafId] as { defaultConstraints?: Record<string, unknown> } | undefined;
    const constraints = { ...(def.defaultConstraints(type.typeId) as Record<string, unknown>), ...(leaf?.defaultConstraints ?? {}), ...type.constraints };
    const seen = new Set(seenKeys);
    for (let i = 0; i < 20; i++) {
        const block: MathBlock = {
            id: 'kiosk', typeId: type.typeId, instructionText: '', instructionMode: 'geen', layoutPreset: 'inline-short',
            steppedLines: 3, numberOfExercises: 1, totalPoints: 0, verticalSpacing: 14, constraints, exercises: [],
        };
        const list = def.generate(block) as unknown[];
        const exercise = list[0];
        if (!exercise) continue;
        const { id: _id, ...rest } = exercise as Record<string, unknown>;
        const key = `${type.typeId}:${JSON.stringify(rest)}`;
        if (!seen.has(key) || i === 19) return { exercise, key, constraints, repeat: seen.has(key) };
    }
    return null;
}

export function isDone(s: OefenSessie, stats: OefenStats, _now?: number): boolean {
    const total = plannedTotal(s);
    return total !== null && stats.history.length >= total;
}

export function emptyStats(s: OefenSessie): OefenStats {
    const perType: OefenStats['perType'] = {};
    s.types.forEach((_t, i) => { perType[i] = { made: 0, correct: 0, wrong: 0, errors: [] }; });
    return { startedAt: Date.now(), perType, history: [] };
}

export function recordAnswer(stats: OefenStats, slot: number, typeId: string, exercise: unknown, given: KioskAnswer, correct: boolean, ms: number, constraints: Record<string, unknown>): OefenStats {
    const d = kioskFor(typeId);
    const row = stats.perType[slot] ?? { made: 0, correct: 0, wrong: 0, errors: [] };
    const { id: _id, ...rest } = exercise as Record<string, unknown>;
    const next = {
        made: row.made + 1, correct: row.correct + (correct ? 1 : 0), wrong: row.wrong + (correct ? 0 : 1),
        errors: correct ? row.errors : [...row.errors, {
            exercise: d?.display(exercise, constraints) ?? '?',
            given: Array.isArray(given) ? `${given[0]} r ${given[1]}` : given,
            expected: (() => { const a = d?.answerOf(exercise, constraints) ?? []; return d && kioskInputOf(d, exercise, constraints) === 'number+rest' ? `${a[0]} r ${a[1]}` : a[0] ?? ''; })(),
            at: Date.now(),
        }],
    };
    return { ...stats, perType: { ...stats.perType, [slot]: next }, history: [...stats.history, { slot, typeId, exerciseKey: `${typeId}:${JSON.stringify(rest)}`, correct, ms }] };
}

const runsKey = (id: string) => `rekenraak_oefen_${id}`;

export function loadRuns(id: string): OefenRun[] {
    try { return JSON.parse(localStorage.getItem(runsKey(id)) ?? '[]') as OefenRun[]; } catch { return []; }
}

export function saveRun(id: string, run: OefenRun): void {
    const runs = loadRuns(id).filter(r => r.index !== run.index);
    runs.push(run);
    runs.sort((a, b) => a.index - b.index);
    try { localStorage.setItem(runsKey(id), JSON.stringify(runs.slice(-5))); } catch { /* full or blocked */ }
}

export function clearRuns(id: string): void {
    try { localStorage.removeItem(runsKey(id)); } catch { /* blocked */ }
}

export function summary(stats: OefenStats, s: OefenSessie): OefenSummaryRow[] {
    return s.types.map((t, slot) => {
        const r = stats.perType[slot] ?? { made: 0, correct: 0, wrong: 0, errors: [] };
        return { slot, typeId: t.typeId, label: t.label, ...r, pct: r.made ? Math.round((100 * r.correct) / r.made) : null };
    });
}

export function checkAnswer(d: KioskDescriptor, ex: unknown, c: Record<string, unknown>, given: KioskAnswer): boolean {
    const want = d.answerOf(ex, c);
    const norm = (v: string) => v.trim().replace(/\s+/g, ' ');
    if (Array.isArray(given)) return given.length === want.length && given.every((g, i) => norm(g) === want[i]);
    return want.includes(norm(given));
}
