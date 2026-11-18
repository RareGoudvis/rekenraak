import type { CardVariant } from '../../config/eenvoudig/cards';
import type { Leerjaar } from '../../config/gradePresets';
import { childLabel } from './zelfLabels';
import type { UsableCard } from './zelfSessie';

// The kids app's own grouping of a topic (owner 2026-11-18): simpler choices that combine or reshape the teacher's
// card variants. The cards stay as they are; a reshaped variant is built here (like the tafel toggles' variants).

export interface RegroupChoice { key: string; label: string; vars: CardVariant[]; source?: string }

interface Regroup {
    // The leerjaren it applies to; absent = every leerjaar.
    grades?: readonly Leerjaar[];
    // The pupil picks no "Tot hoeveel?": the choices take the cards of every range the leerjaar offers.
    rangeless?: boolean;
    choices(cards: UsableCard[], topicId: string): RegroupChoice[];
}

// A card variant with other settings: its own id (so its runs stay apart), the card's leerjaar and leaf.
const twin = (v: CardVariant, tag: string, ov: Record<string, unknown>, label: string): CardVariant =>
    ({ ...v, id: `${v.id}~${tag}`, ov: { ...v.ov, ...ov }, l: label, label });

const varsOf = (cards: UsableCard[], keep: (c: UsableCard, v: CardVariant) => boolean) => cards.flatMap(c => c.vars.filter(v => keep(c, v)));
const choice = (topicId: string, key: string, source: string, vars: CardVariant[]): RegroupChoice[] =>
    (vars.length ? [{ key, label: childLabel(topicId, source), source, vars }] : []);

// Vergelijken: groter of kleiner (< = >), grootste of kleinste (the card asks the grootste; its twin the kleinste),
// ordenen in both directions (each exercise names its own), afronden as it was, and everything together.
const VERGELIJKEN_GROUPS = { kiezen: 'Het grootste getal omcirkelen', teken: 'Twee vergelijken met <', ordenen: 'Getallen ordenen' } as const;
const vergelijkGroupOf = (leafId: string): keyof typeof VERGELIJKEN_GROUPS | null =>
    leafId === 'vergelijken-kiezen' ? 'kiezen' : leafId.startsWith('vergelijken-') ? 'teken' : leafId.startsWith('getalbegrip-ordenen') ? 'ordenen' : null;
const VERGELIJKEN: Regroup = {
    choices(cards, topicId) {
        const of = (g: keyof typeof VERGELIJKEN_GROUPS) => varsOf(cards, (_c, v) => vergelijkGroupOf(v.leafId) === g);
        const kiezen = of('kiezen').flatMap(v => [v, twin(v, 'kleinste', { chooseTarget: 'kleinste' }, v.label.replace(/grootste/g, 'kleinste'))]);
        const afronden = cards.filter(c => c.vars.every(v => vergelijkGroupOf(v.leafId) === null));
        const sections = [...new Set(afronden.map(c => c.card.section || c.card.name))];
        const out = [
            ...choice(topicId, 'teken', VERGELIJKEN_GROUPS.teken, of('teken')),
            ...choice(topicId, 'kiezen', VERGELIJKEN_GROUPS.kiezen, kiezen),
            ...choice(topicId, 'ordenen', VERGELIJKEN_GROUPS.ordenen, of('ordenen')),
            ...sections.flatMap(s => choice(topicId, `s:${s}`, s, afronden.filter(c => (c.card.section || c.card.name) === s).flatMap(c => c.vars))),
        ];
        return out.length > 1 ? [...out, { key: 'alles', label: 'Alles door elkaar', vars: out.flatMap(c => c.vars) }] : out;
    },
};

// Splitsen in leerjaar 1: four steps instead of "Tot hoeveel?" and the card names.
const boom = (c: UsableCard) => /splitsboom/i.test(c.card.name);
const SPLITSEN_L1: Regroup = {
    grades: [1],
    rangeless: true,
    choices(cards, topicId) {
        const max = (c: UsableCard) => c.card.max ?? 0;
        const tot5 = varsOf(cards, c => boom(c) && max(c) <= 5);
        // Vriendjes van 10: the hearts and a splitsboom, both of 10 itself (the card's hearts take any total up to 10).
        const harten = varsOf(cards, c => /harten/i.test(c.card.name)).map(v => twin(v, 'tien', { fixedTotal: 10 }, 'Verliefde harten van 10'));
        const tien = varsOf(cards, c => boom(c) && max(c) === 10).slice(0, 1).map(v => twin(v, 'tien', { fixedTotal: 10, blankPositions: ['right'] }, 'Splitsboom van 10'));
        // Van 10 tot 20: the tot-20 splitsboom with a tiental in every total (11 to 19), a tak or the geheel open.
        const twintig = varsOf(cards, c => boom(c) && max(c) === 20);
        const tienTwintig = twintig.slice(0, 1).flatMap(v => [
            twin(v, '11-19', { maxGetal: 19, operand1Mask: { T: true, E: true }, blankPositions: ['right'] }, 'Splitsboom van 11 tot 19'),
            twin(v, '11-19-top', { maxGetal: 19, operand1Mask: { T: true, E: true }, blankPositions: ['top'] }, 'Splitsboom van 11 tot 19: het geheel'),
        ]);
        return [
            ...choice(topicId, 'tot5', 'Splitsen tot 5', tot5),
            ...choice(topicId, 'vriendjes10', 'Vriendjes van 10', [...harten, ...tien]),
            ...choice(topicId, 'tien-twintig', 'Van 10 tot 20', tienTwintig),
            ...choice(topicId, 'tot20', 'Splitsen tot 20', cards.flatMap(c => c.vars)),
        ];
    },
};

const REGROUPS: Readonly<Record<string, Regroup>> = {
    'Vergelijken, ordenen, afronden': VERGELIJKEN,
    Splitsen: SPLITSEN_L1,
};

/** The kids app's grouping of this topic at this leerjaar, if it has one. */
export const regroupOf = (topicId: string, grade: Leerjaar): Regroup | null => {
    const r = REGROUPS[topicId];
    return r && (!r.grades || r.grades.includes(grade)) ? r : null;
};

/** Whether the topic shows no "Tot hoeveel?" at this leerjaar: its choices already span the ranges. */
export const zelfRangeless = (topicId: string, grade: Leerjaar): boolean => !!regroupOf(topicId, grade)?.rangeless;
