import { groepjesProps, makeGroups, type GroepjesProps } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

// Groepjesmaker on top of groepjesProps/makeGroups: where the names come from, how a group
// is labelled, a persisted result (survives a reload) with lockable groups, and text export.

export interface GroepjesModel extends GroepjesProps {
    source: 'klas' | 'eigen';
    names: string[];           // own list (source 'eigen')
    showNumbers: boolean;      // "Groep 1" header (today)
    colored: boolean;          // a colour per group instead of today's blue
    emoji: boolean;            // an animal per group
    animate: boolean;          // flash a few deals before the real one
    result: string[][] | null;
    locked: number[];          // group indexes kept on a re-deal
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);

function readResult(v: unknown): string[][] | null {
    if (!Array.isArray(v) || !v.length || !v.every(Array.isArray)) return null;
    return v.map(strings);
}

export function groepjesModel(widget: BoardWidget): GroepjesModel {
    const p = widget.props ?? {};
    const result = readResult(p.result);
    return {
        ...groepjesProps(widget),
        source: p.source === 'eigen' ? 'eigen' : 'klas',
        names: strings(p.names),
        showNumbers: p.showNumbers !== false,
        colored: p.colored === true,
        emoji: p.emoji === true,
        animate: p.animate === true,
        result,
        locked: result ? (Array.isArray(p.locked) ? p.locked : []).filter((n): n is number => Number.isInteger(n) && n >= 0 && n < result.length) : [],
    };
}

// Group ink on the white card (cycled); index 0 = today's blue.
export const GROUP_COLORS = ['#1e40af', '#166534', '#9a3412', '#6b21a8', '#0f766e', '#be185d', '#b45309', '#374151'];
export const GROUP_ANIMALS = ['🦊', '🐻', '🐸', '🦉', '🐢', '🦁', '🐝', '🐧', '🐬', '🦔'];

export function groupLabel(m: Pick<GroepjesModel, 'showNumbers' | 'emoji'>, i: number): string {
    return [m.emoji ? GROUP_ANIMALS[i % GROUP_ANIMALS.length] : '', m.showNumbers ? `Groep ${i + 1}` : ''].filter(Boolean).join(' ');
}

// Re-deal everything except the locked groups: they keep their place and members (minus
// names no longer on the list); the rest is dealt over the remaining group slots.
export function dealGroups(names: string[], m: GroepjesModel): { groups: string[][]; locked: number[]; ok: boolean } {
    const prev = m.result ?? [];
    const kept = new Map<number, string[]>();
    for (const i of m.locked) if (prev[i]) kept.set(i, prev[i].filter(n => names.includes(n)));
    const taken = new Set([...kept.values()].flat());
    const free = names.filter(n => !taken.has(n));
    const total = m.mode === 'aantal' ? Math.min(m.groups, names.length) : Math.max(1, Math.round(names.length / m.size));
    const slots = Math.max(free.length ? 1 : 0, total - kept.size);
    const dealt = slots ? makeGroups(free, { ...m, mode: 'aantal', groups: slots }) : { groups: [], ok: true };
    const out: Array<{ g: string[]; lock: boolean }> = [];
    const rest = [...dealt.groups];
    const size = Math.max(prev.length, kept.size + rest.length);
    for (let i = 0; i < size; i++) {
        if (kept.has(i)) out.push({ g: kept.get(i)!, lock: true });
        else if (rest.length) out.push({ g: rest.shift()!, lock: false });
    }
    out.push(...rest.map(g => ({ g, lock: false })));
    // An emptied locked group drops out, so the lock indexes are recounted.
    const final = out.filter(o => o.g.length);
    return { groups: final.map(o => o.g), locked: final.flatMap((o, i) => (o.lock ? [i] : [])), ok: dealt.ok };
}

export function groupsAsText(groups: string[][], m: Pick<GroepjesModel, 'showNumbers' | 'emoji'>): string {
    return groups.map((g, i) => `${groupLabel({ showNumbers: true, emoji: m.emoji }, i)}: ${g.join(', ')}`).join('\n');
}
