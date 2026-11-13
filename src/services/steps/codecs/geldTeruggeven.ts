import type { GeldTeruggevenExercise } from '../../math/types';
import { geldText, geldTeruggevenSteps } from '../geldTeruggevenSteps';
import { defineCodec } from '../tutorCodec';

// Geld teruggeven as [priceCents, payWithCents]; the waypoint and the change are derived again on the tutor page.
const MAX = 1_000_000;
const cents = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= MAX;

export const codec = defineCodec<GeldTeruggevenExercise>({
    id: 'gt',
    typeIds: ['geld-teruggeven'],
    what: 'geld teruggeven',
    out(ex) {
        const g = ex as GeldTeruggevenExercise | undefined;
        return g && cents(g.priceCents) && cents(g.payWithCents) && g.priceCents < g.payWithCents ? [g.priceCents, g.payWithCents] : null;
    },
    in(wire) {
        if (!Array.isArray(wire) || wire.length !== 2 || !wire.every(cents)) return null;
        const [price, pay] = wire as number[];
        if (price >= pay) return null;
        const waypoint = Math.ceil(price / 100) * 100;
        return { id: '', priceCents: price, payWithCents: pay, changeCents: pay - price, waypointCents: waypoint, step1Cents: waypoint - price, step2Cents: pay - waypoint, isManuallyEdited: false };
    },
    steps: geldTeruggevenSteps,
    // Short on purpose: the tutor card heading does not wrap, so a sentence would run off a phone screen.
    sum: ex => [{ t: 'word', w: `€ ${geldText(ex.payWithCents)}` }, { t: 'op', op: '-' }, { t: 'word', w: `€ ${geldText(ex.priceCents)}` }],
});
