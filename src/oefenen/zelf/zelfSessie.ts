import { kindsOf, listCards, type CardType, type CardVariant, type EenvoudigData } from '../../config/eenvoudig/cards';
import { EENVOUDIG_NAV } from '../../config/eenvoudig/nav';
import { resolveCard } from '../../config/eenvoudig/resolveCard';
import type { Leerjaar } from '../../config/gradePresets';
import { rowYields, withKioskSeed } from '../../components/oefenen/oefenBuild';
import { kioskLabelOf, kioskSupports } from '../../services/oefenen/kiosk';
import { fnv1a } from '../../services/oefenen/session';
import { OEFEN_VERSION, type OefenSessie } from '../../services/oefenen/types';

export type ZelfMode = { kind: 'count'; n: 3 | 5 | 10 } | { kind: 'timer'; min: 1 | 3 | 5 };

export const ZELF_COUNTS = [3, 5, 10] as const;
export const ZELF_MINUTES = [1, 3, 5] as const;

// Teacher ids are 8 chars, so this prefix can never collide with one; it also marks a session as self-made.
const ID_PREFIX = 'zelf-';
// SYNC: parseType's MAX_LABEL / MAX_INSTRUCTION in session.ts.
const MAX_LABEL = 80;
const MAX_INSTRUCTION = 200;

export const isZelfSessie = (s: { id: string } | null): boolean => !!s && s.id.startsWith(ID_PREFIX);

const cut = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

export const modeKey = (m: ZelfMode): string => (m.kind === 'count' ? `n${m.n}` : `t${m.min}`);

/** A one-type session for a card variant: the same choice always has the same id, so a pupil's earlier runs come back. */
export function buildZelfSessie(v: CardVariant, mode: ZelfMode, now = Date.now()): OefenSessie {
    const card = resolveCard(v);
    return {
        v: OEFEN_VERSION,
        id: `${ID_PREFIX}${fnv1a(`${v.id}|${modeKey(mode)}`)}`,
        createdAt: now,
        types: [{
            typeId: card.typeId,
            leafId: card.leafId,
            label: cut(kioskLabelOf(card.leafId) ?? card.label, MAX_LABEL),
            instruction: cut(card.instruction, MAX_INSTRUCTION),
            // Same kiosk start as a builder row (klok in woorden, plaats shuffled).
            constraints: withKioskSeed(card.typeId, card.constraints),
            weight: 100,
        }],
        mode: 'afwisselen',
        allowRepeatType: false,
        testMode: false,
        statsLocked: false,
        ...(mode.kind === 'count' ? { total: mode.n } : { timerMin: mode.min }),
    };
}

export interface UsableCard { card: CardType; vars: CardVariant[] }

const variantOk = new Map<string, boolean>();

// The kiosk can check the variant's settings and they yield at least one exercise.
function usable(v: CardVariant): boolean {
    let ok = variantOk.get(v.id);
    if (ok === undefined) {
        try {
            const c = resolveCard(v);
            const constraints = withKioskSeed(c.typeId, c.constraints);
            ok = kioskSupports(c.typeId, constraints) && rowYields({ leaf: { id: c.leafId, typeId: c.typeId, label: c.label }, constraints });
        } catch { ok = false; }
        variantOk.set(v.id, ok);
    }
    return ok;
}

const byGrade = new Map<EenvoudigData, Map<Leerjaar, Map<string, UsableCard[]>>>();

/** Per topic (only those with something usable) the listed cards for the leerjaar, each with its usable variants. */
export function usableVariants(data: EenvoudigData, grade: Leerjaar): Map<string, UsableCard[]> {
    let perGrade = byGrade.get(data);
    if (!perGrade) { perGrade = new Map(); byGrade.set(data, perGrade); }
    const cached = perGrade.get(grade);
    if (cached) return cached;
    const out = new Map<string, UsableCard[]>();
    for (const topic of EENVOUDIG_NAV.flatMap(s => s.topics)) {
        if (!topic.hasCards) continue;
        // A topic with komma / breuk buttons lists those cards apart; a pupil sees all of them.
        const cards = new Set<CardType>(listCards(data, topic.id, { grade }));
        for (const kind of kindsOf(data, topic.id)) for (const c of listCards(data, topic.id, { grade, kind })) cards.add(c);
        const list = [...cards].map(card => ({ card, vars: card.vars.filter(usable) })).filter(c => c.vars.length > 0);
        if (list.length) out.set(topic.id, list);
    }
    perGrade.set(grade, out);
    return out;
}
