import type { DuelFlight, DuelRule, DuelSideView } from '../../duel/types';

// Tovenaarsduel on the duel engine: own sums each. Every right answer casts a spell by itself (no choosing, so the
// rhythm of the sums never breaks); the spell follows that side's streak (owner 2026-11-16): 1 in a row = IJspijl
// (1), 2 = Vuurbal (2), 3 = Bliksem (3), 4 = Schild on yourself (blocks the next hit), then IJspijl again. A wrong
// answer or a Moeilijk time-out breaks the streak (the engine resets it): back to IJspijl. The frost of an IJspijl
// is only a picture, it never freezes a keypad or a clock. 0 lives = the wizard is defeated, round lost.

export const SPELLS = ['ijs', 'vuur', 'bliksem', 'schild'] as const;
export type Spell = typeof SPELLS[number];
export type AttackSpell = Exclude<Spell, 'schild'>;

export const SPELL_NAME: Record<Spell, string> = { ijs: 'IJspijl', vuur: 'Vuurbal', bliksem: 'Bliksem', schild: 'Schild' };

export const TOVER = {
    damage: { ijs: 1, vuur: 2, bliksem: 3 } as Record<AttackSpell, number>,
    // Cast to impact: the charge glow at the staff, then the flight (art keyframes land on these).
    castMs: { ijs: 1150, vuur: 1250, bliksem: 1100 } as Record<AttackSpell, number>,
    // The charge part of castMs: the projectile leaves the staff after this (the bolt falls from the sky).
    chargeMs: { ijs: 420, vuur: 480, bliksem: 640 } as Record<AttackSpell, number>,
    lives: { choices: [20, 30, 40], default: 30 },
    // The defeat (smoke, the hat flies, dizzy stars) before the scoreboard card.
    endMs: 3000,
} as const;

/** The spell this right answer casts (streak already counts it): 1 = IJspijl, 2 = Vuurbal, 3 = Bliksem, 4 = Schild, 5 = IJspijl … */
export const spellOf = (streak: number): Spell => SPELLS[(Math.max(1, streak) - 1) % SPELLS.length];

/** The spell the next right answer casts, from the streak so far (the orb at the staff shows it). */
export const nextSpellOf = (streak: number): Spell => spellOf(streak + 1);

/** The step on the ladder (0..3) the next right answer is at: the runes light up this far. */
export const ladderStep = (streak: number) => streak % SPELLS.length;

export const shieldOf = (v: Pick<DuelSideView, 'flags'>) => (v.flags.shield ?? 0) > 0;

export const spellOfFlight = (f: Pick<DuelFlight, 'data'>): AttackSpell => (f.data.spell as AttackSpell) ?? 'ijs';

/** The tag on a landing: the spell, '-blocked' when a shield ate it. */
export const landTag = (spell: AttackSpell, blocked: boolean) => `${spell}${blocked ? '-blocked' : ''}`;
export function parseLandTag(tag: string | undefined): { spell: AttackSpell; blocked: boolean } | null {
    const m = /^(ijs|vuur|bliksem)(-blocked)?$/.exec(tag ?? '');
    return m ? { spell: m[1] as AttackSpell, blocked: !!m[2] } : null;
}

export const TOVER_RULE: DuelRule = {
    right: ({ side, other, streak }) => {
        const spell = spellOf(streak);
        if (spell === 'schild') return { flags: { [side]: { shield: 1 } }, tag: 'schild' };
        return { launch: { ms: TOVER.castMs[spell], to: other, tag: spell, data: { spell } } };
    },
    // The shield is read on impact: one raised while the spell was on its way still blocks it, and breaks.
    land: ({ other, them }, f) => {
        const spell = spellOfFlight(f);
        if (shieldOf(them)) return { flags: { [other]: { shield: 0 } }, tag: landTag(spell, true) };
        return { damage: { [other]: TOVER.damage[spell] }, tag: landTag(spell, false) };
    },
    cardMs: TOVER.endMs,
};

// What a wizard looks like after its hits this round: a singed hat (fire), a frosty beard (ice), a sooty face (lightning).
export interface WizardMarks { singe: number; frost: number; soot: number }
export const freshMarks = (): WizardMarks => ({ singe: 0, frost: 0, soot: 0 });
const MARK_OF: Record<AttackSpell, keyof WizardMarks> = { vuur: 'singe', ijs: 'frost', bliksem: 'soot' };
// Each kind of mark shows up to 3 stages.
export const MAX_MARK = 3;

/** One more hit's mark on a wizard. */
export const markHit = (m: WizardMarks, spell: AttackSpell): WizardMarks => ({ ...m, [MARK_OF[spell]]: Math.min(MAX_MARK, m[MARK_OF[spell]] + 1) });

/** The health bar's colour band at lives of max: ok above 60 %, mid above 30 %, else low. */
export const healthTone = (lives: number, max: number) => {
    const f = lives / Math.max(1, max);
    return f > 0.6 ? 'ok' : f > 0.3 ? 'mid' : 'low';
};
