// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { mabPlan, type MabPicture, type MabPieceState } from '../services/steps/mabSteps';
import { workedSteps, type StepLine } from '../services/math/workedSteps';
import { stepsVisualFor } from '../components/steps/stepsVisuals';
import { decodeSessie, encodeSessie, sessieContentHash, toWire } from '../services/oefenen/session';
import { OEFEN_VERSION, type OefenSessie } from '../services/oefenen/types';
import { buildSessie } from '../components/oefenen/oefenBuild';
import { buildZelfSessie } from '../oefenen/zelf/zelfSessie';
import { packText } from '../services/oefenen/packText';
import { TUTOR_HASH_PREFIX } from '../services/oefenen/tutorPayload';
import StepsPanel from '../oefenen/kiosk/StepsPanel';
import TutorApp from '../tutor/TutorApp';
import type { Equation } from '../services/math/types';

// MAB level A: the picture follows the revealed hoofdrekenen lines, whole numbers up to 1000, leerjaar 1–3, toggle on.

afterEach(() => { cleanup(); window.location.hash = ''; localStorage.clear(); });

const eq = (a: number, op: Equation['operator'], b: number, extra: Partial<Equation> = {}): Equation => {
    const answer = op === '+' ? a + b : op === '-' ? a - b : op === 'x' ? a * b : a / b;
    return { id: 'e', operands: [a, b], operator: op, answer, isManuallyEdited: false, ...extra };
};
const planOf = (e: Equation) => { const lines = workedSteps(e)!; return { lines, plan: mabPlan(e, lines) }; };
const count = (pic: MabPicture, state: MabPieceState, place?: number) =>
    pic.clusters.reduce((s, c) => s + c.pieces.reduce((t, list, p) => t + (place === undefined || p === place ? list.filter(x => x === state).length : 0), 0), 0);
const basisStages = (lines: StepLine[], stages: (MabPicture | null)[]) => lines.flatMap((l, i) => (l.basis ? [stages[i]] : []));

describe('mabPlan: + rijgen with inwisselen', () => {
    it('475 + 368: the running total, the part added now, the parts still to come; 10 T → 1 H and 10 E → 1 T', () => {
        const { lines, plan } = planOf(eq(475, '+', 368));
        expect(plan).not.toBeNull();
        // Before any line: 475 and the 368 still to add.
        expect(count(plan!.initial, 'have')).toBe(4 + 7 + 5);
        expect(count(plan!.initial, 'wait')).toBe(3 + 6 + 8);
        const [first, split1, split2, answer] = basisStages(lines, plan!.stages);
        // (475 + 300) + 60 + 8: 3 H now, 6 T and 8 E waiting, no exchange.
        expect(count(first!, 'now', 2)).toBe(3);
        expect(count(first!, 'wait')).toBe(14);
        expect(first!.captions).toEqual([]);
        // (775 + 30) + 30 + 8: ten T marked, one H won.
        expect(split1!.captions).toEqual(['10 T wordt 1 H']);
        expect(split1!.clusters[0].rings).toEqual([{ place: 1, from: 0 }]);
        expect(count(split1!, 'gain', 2)).toBe(1);
        // (835 + 5) + 3: ten E → one T.
        expect(split2!.captions).toEqual(['10 E wordt 1 T']);
        // The answer shows the hidden last move 840 + 3: three E added, 843 in pieces.
        expect(count(answer!, 'have') + count(answer!, 'now')).toBe(8 + 4 + 3);
        expect(count(answer!, 'now', 0)).toBe(3);
    });

    it('123 + 456 needs no inwisselen: never a caption or a ring', () => {
        const { plan } = planOf(eq(123, '+', 456));
        for (const s of plan!.stages) expect(s?.captions ?? []).toEqual([]);
        expect(plan!.stages.every(s => !s?.clusters.some(c => c.rings))).toBe(true);
    });

    it('600 + 400 = 1000: ten H become one D', () => {
        const { plan } = planOf(eq(650, '+', 350));
        expect(plan!.stages.some(s => s?.captions.includes('10 H wordt 1 D'))).toBe(true);
    });
});

describe('mabPlan: − rijgen with lenen', () => {
    it('352 − 127: pieces crossed out per line; the answer shows 230 − 5 with one T opened into 10 E', () => {
        const { lines, plan } = planOf(eq(352, '-', 127));
        const stages = basisStages(lines, plan!.stages);
        expect(count(stages[0]!, 'gone', 2)).toBe(1);
        const answer = stages[stages.length - 1]!;
        expect(answer.captions).toEqual(['1 T wordt 10 E']);
        expect(count(answer, 'ghost', 1)).toBe(1);
        expect(count(answer, 'gone', 0)).toBe(5);
        expect(count(answer, 'have', 0)).toBe(5);
        expect(answer.clusters[0].rings).toEqual([{ place: 0, from: 0 }]);
    });

    it('1000 − 250 opens the D into ten H', () => {
        const { plan } = planOf(eq(1000, '-', 250));
        expect(plan!.stages[0]!.captions).toEqual(['1 D wordt 10 H']);
    });
});

describe('mabPlan: small sums with one part (2026-11-14)', () => {
    it('8 + 5 = (8 + 2) + 3: two E make the ten, ten E become one T; the answer shows 10 + 3', () => {
        const { lines, plan } = planOf(eq(8, '+', 5));
        expect(count(plan!.initial, 'wait', 0)).toBe(5);
        const [split, answer] = basisStages(lines, plan!.stages);
        expect(count(split!, 'now', 0)).toBe(2);
        expect(split!.captions).toEqual(['10 E wordt 1 T']);
        expect(count(answer!, 'now', 0)).toBe(3);
    });

    it('53 − 7 = (53 − 3) − 4: three E off, then one T opened for the four', () => {
        const { lines, plan } = planOf(eq(53, '-', 7));
        const [split, answer] = basisStages(lines, plan!.stages);
        expect(count(split!, 'gone', 0)).toBe(3);
        expect(answer!.captions).toEqual(['1 T wordt 10 E']);
    });

    it('14 + 3 and 85 − 40 without a brug: b on or off at its own place, then the result', () => {
        const plus = planOf(eq(14, '+', 3));
        expect(count(plus.plan!.stages[0]!, 'now', 0)).toBe(3);
        expect(plus.plan!.stages[2]!.clusters[0].pieces.map(p => p.length)).toEqual([7, 1, 0, 0]);
        const minus = planOf(eq(85, '-', 40));
        expect(count(minus.plan!.stages[0]!, 'gone', 1)).toBe(4);
        expect(minus.plan!.stages[2]!.clusters[0].pieces.map(p => p.length)).toEqual([5, 4, 0, 0]);
        expect(planOf(eq(47, '+', 3)).plan!.stages[0]!.captions).toEqual(['10 E wordt 1 T']);
    });
});

describe('mabPlan: × as groups, : as sharing', () => {
    it('5 × 65: five groups of 6 T and 5 E, then the pieces gathered with their inwisselen, then the answer', () => {
        const { lines, plan } = planOf(eq(5, 'x', 65));
        expect(plan!.initial.clusters).toHaveLength(5);
        expect(plan!.initial.clusters.every(c => c.frame === 'solid' && c.pieces[1].length === 6 && c.pieces[0].length === 5)).toBe(true);
        const values = plan!.stages[lines.findIndex(l => l.kind === 'values')]!;
        expect(values.captions).toEqual(['20 E wordt 2 T en 5 E', '30 T wordt 3 H']);
        const answer = plan!.stages[lines.length - 1]!;
        expect(answer.clusters[0].pieces.map(p => p.length)).toEqual([5, 2, 3, 0]);
    });

    it('a tafel (3 × 4) is three groups of four E; the answer gathers them', () => {
        const { lines, plan } = planOf(eq(3, 'x', 4));
        expect(plan!.stages[0]!.clusters).toHaveLength(3);
        expect(plan!.stages[lines.length - 1]!.captions).toEqual(['10 E wordt 1 T en 2 E']);
    });

    it('96 : 4: 80 + 16 with one T opened, four empty groups, then 2 T and 4 E in each, one group marked', () => {
        const { lines, plan } = planOf(eq(96, ':', 4));
        const pile = plan!.stages[0]!;
        expect(pile.captions).toEqual(['1 T wordt 10 E']);
        expect(pile.clusters.filter(c => c.frame === 'dashed')).toHaveLength(4);
        expect(pile.clusters[1].pieces[0]).toHaveLength(16);
        const shared = plan!.stages[lines.findIndex(l => l.kind === 'distribute')]!;
        expect(shared.clusters).toHaveLength(4);
        expect(shared.clusters.every(c => c.pieces[1].length === 2 && c.pieces[0].length === 4)).toBe(true);
        expect(plan!.stages[lines.length - 1]!.clusters.filter(c => c.frame === 'hi')).toHaveLength(1);
    });

    it('480 : 6 by analogie: 48 T shared, 8 T in each group', () => {
        const { plan } = planOf(eq(480, ':', 6));
        expect(plan!.stages[0]!.captions).toEqual(['4 H wordt 40 T']);
        expect(plan!.stages[1]!.clusters.every(c => c.pieces[1].length === 8)).toBe(true);
    });
});

describe('mabPlan: no MAB outside the rules', () => {
    it('above 1000, kommagetallen, breuken, met rest, deeltafels, compenseren, puntoefeningen: null', () => {
        expect(planOf(eq(650, '+', 450)).plan).toBeNull();
        expect(planOf(eq(2340, ':', 3)).plan).toBeNull();
        expect(planOf(eq(25, 'x', 32)).plan).toBeNull();
        expect(planOf(eq(0.6, '+', 0.8)).plan).toBeNull();
        expect(planOf(eq(26, ':', 5, { answer: 5, remainder: 1 })).plan).toBeNull();
        expect(planOf(eq(20, ':', 4)).plan).toBeNull();
        const breuk = { ...eq(1, '+', 1), operands: [{ n: 1, d: 4 }, { n: 1, d: 4 }] } as Equation;
        expect(mabPlan(breuk, workedSteps(eq(1, '+', 1)) ?? [{ kind: 'answer', basis: true, tokens: [] }])).toBeNull();
        const comp = workedSteps(eq(140, '+', 99), { preset: 'compenseren' })!;
        expect(mabPlan(eq(140, '+', 99), comp)).toBeNull();
        const lines = workedSteps(eq(475, '+', 368))!;
        expect(mabPlan(eq(475, '+', 368, { missingTerm: 'operand2' }), lines)).toBeNull();
        expect(mabPlan({}, lines)).toBeNull();
    });
});

describe('the visual: gated by leerjaar and toggle, drawn per reveal', () => {
    const e = eq(475, '+', 368);
    const lines = workedSteps(e)!;

    it('only for leerjaar 1–3 with MAB on; no box at all otherwise', () => {
        expect(stepsVisualFor('hr-std-optellen', e, lines, 'kiosk', { grade: 2 })).toBeDefined();
        expect(stepsVisualFor('hr-std-gemengd', e, lines, 'tutor', { grade: 3 })).toBeDefined();
        expect(stepsVisualFor('hr-std-optellen', e, lines, 'kiosk', { grade: 4 })).toBeUndefined();
        expect(stepsVisualFor('hr-std-optellen', e, lines, 'kiosk', {})).toBeUndefined();
        expect(stepsVisualFor('hr-std-optellen', e, lines, 'kiosk', { grade: 2, noMab: true })).toBeUndefined();
        expect(stepsVisualFor('hr-std-optellen', eq(650, '+', 450), workedSteps(eq(650, '+', 450))!, 'kiosk', { grade: 2 })).toBeUndefined();
    });

    it('in Oefenmodus the pieces go under the exercise (card slot), following the revealed lines, with the caption at an inwisselen', () => {
        const visual = stepsVisualFor('hr-std-optellen', e, lines, 'kiosk', { grade: 2 })!;
        expect(visual.slot).toBe('card');
        expect(stepsVisualFor('hr-std-gemengd', e, lines, 'tutor', { grade: 2 })!.slot).toBe('panel');
        // The Kiosk's part: it hears how far the panel is and draws the visual in the card column.
        function Host() {
            const [revealed, setRevealed] = useState<number | null>(null);
            return <><div className="card">{revealed !== null && visual(revealed)}</div><StepsPanel lines={lines} onNext={() => {}} visual={visual} onVisual={setRevealed} /></>;
        }
        const { container } = render(<Host />);
        expect(container.querySelector('.sv-mab')).toBeNull();
        fireEvent.click(screen.getByText('Toon de stappen'));
        expect(container.querySelector('.card > .steps-visual > .sv-mab')).toBeTruthy();
        expect(container.querySelector('.kiosk-steps .sv-mab')).toBeNull();
        expect(container.querySelectorAll('.sv-mab-p.is-now')).toHaveLength(3);
        expect(container.querySelector('.sv-mab-cap')).toBeNull();
        fireEvent.click(screen.getByText('Toon de volgende stap'));
        expect(container.querySelector('.sv-mab-cap')?.textContent).toBe('10 T wordt 1 H');
        expect(container.querySelectorAll('.sv-mab-ring')).toHaveLength(1);
    });

    it('the stappenhulp shows MAB for a leerjaar 1–3 payload and never for leerjaar 4 or an unknown one', () => {
        const page = (grade?: number) => TUTOR_HASH_PREFIX + packText(JSON.stringify([1, [[1, '', null, [[475, 368, '+']]]], ...(grade ? [grade] : [])]));
        for (const [grade, shows] of [[2, true], [4, false], [undefined, false]] as const) {
            window.location.hash = page(grade);
            const { container, unmount } = render(<TutorApp />);
            fireEvent.click(screen.getByRole('button', { name: /475/ }));
            fireEvent.click(screen.getByRole('button', { name: 'Toon de eerste stap' }));
            expect(!!container.querySelector('.sv-mab'), String(grade)).toBe(shows);
            unmount();
        }
    });
});

describe('the toggle on the session', () => {
    const base: OefenSessie = {
        v: OEFEN_VERSION, id: 'abcdefgh', createdAt: 60_000 * 29_000_000, mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false, grade: 2,
        types: [{ typeId: 'hr-std-optellen', leafId: 'hr-std-optellen', label: 'Optellen', constraints: {}, weight: 100 }],
    };

    it('noMab rides in flag bit 8 and round-trips; links without it keep their flags, hash and id', () => {
        const flags = (s: OefenSessie) => toWire(s)[3] as number;
        expect(flags({ ...base, noMab: true })).toBe(flags(base) | 256);
        expect(flags(base) & 256).toBe(0);
        const back = decodeSessie(encodeSessie({ ...base, noMab: true })!);
        expect(back.noMab).toBe(true);
        expect(back.grade).toBe(2);
        expect(decodeSessie(encodeSessie(base)!).noMab).toBeUndefined();
        expect(sessieContentHash({ ...base, noMab: true })).toBe(sessieContentHash(base));
    });

    it('the builder ships noMab only for leerjaar 1–3 with steps on', () => {
        const settings = { id: 'abcdefgh', createdAt: 0, title: '', mode: 'afwisselen' as const, allowRepeatType: false, testMode: false, statsLocked: false, noMab: true };
        expect(buildSessie([], { ...settings, grade: 2 }).sessie.noMab).toBe(true);
        expect(buildSessie([], { ...settings, grade: 4 }).sessie.noMab).toBeUndefined();
        expect(buildSessie([], { ...settings, grade: 2, noSteps: true }).sessie.noMab).toBeUndefined();
        expect(buildSessie([], { ...settings, grade: null }).sessie.noMab).toBeUndefined();
    });

    it('Zelf oefenen carries the pupil\'s choice for leerjaar 1–3 only, and keeps the session id', () => {
        const choice = { key: 'k', label: 'Optellen', vars: [] };
        const on = buildZelfSessie(choice, { kind: 'count', n: 5 }, 0, 2);
        const off = buildZelfSessie(choice, { kind: 'count', n: 5 }, 0, 2, true);
        expect(on.noMab).toBeUndefined();
        expect(off.noMab).toBe(true);
        expect(off.id).toBe(on.id);
        expect(buildZelfSessie(choice, { kind: 'count', n: 5 }, 0, 5, true).noMab).toBeUndefined();
    });
});
