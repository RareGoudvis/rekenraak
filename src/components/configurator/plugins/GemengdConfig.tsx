import { useState } from 'react';
import { useConstraints } from '../useConstraints';
import { ConstraintScopeContext } from '../ConstraintScope';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';
import PopupSelect from '../../ui/PopupSelect';
import AdditionConfig from './AdditionConfig';
import SubtractionConfig from './SubtractionConfig';
import MultiplicationConfig from './MultiplicationConfig';
import DivisionConfig from './DivisionConfig';
import type { MathBlock } from '../../../services/math/types';
import { MIXED_VARIANTS } from '../../../services/math/constraintTypes';
import { opGlyph } from '../../../services/math/formatters';
import type { MixedConstraints, MixedOp, MixedVariantId } from '../../../services/math/constraintTypes';

interface Props { block: MathBlock; }

// The four hoofdrekenen plugins, reused unchanged inside a per-variant scope.
const CONFIG_FOR_OP: Record<MixedOp, (p: { block: MathBlock }) => React.ReactNode> = {
    '+': AdditionConfig,
    '-': SubtractionConfig,
    'x': MultiplicationConfig,
    ':': DivisionConfig,
};

const OP_NAME: Record<MixedOp, string> = {
    '+': 'Optellen', '-': 'Aftrekken', 'x': 'Vermenigvuldigen', ':': 'Delen',
};

// Short chip/tab wording: the row already says which bewerking it is, so the chip only
// has to say WHICH form of it. The full Dutch name rides along as the tooltip.
const FORM_LABEL: Record<string, string> = {
    'vrij': 'Gewoon', 'compenseren': 'Compenseren', 'tienvoud': 'Met 10, 100, 1000',
};
const tabLabel = (op: MixedOp, preset?: string) =>
    preset ? `${opGlyph(op)} ${preset === 'tienvoud' ? '×10' : 'comp.'}` : opGlyph(op);

// Settings that stay on this shared panel: one number range and one getaltype for the
// whole block (the getaltype is fixed by the sidebar leaf). Module-level so the Set the
// scope builds from it stays referentially stable across renders.
const SHARED_KEYS = ['maxGetal', 'numberType'] as const;

const MAX_PRESETS: Record<string, number[]> = {
    natural: [10, 20, 100, 1000, 10000, 100000, 1000000],
    decimal: [10, 100, 1000],
};

/**
 * `hr-std-gemengd`: one block that mixes several bewerkingen. The teacher picks the
 * VARIANTS in the mix (a bewerking plus optionally its oefenvorm, so "+" and
 * "+ compenseren" can sit in the same block), then fine-tunes each one in its own tab —
 * where the ordinary Addition/Subtraction/Multiplication/Division plugin is mounted
 * inside a ConstraintScope so everything it writes lands in `perVariant[id]` and
 * everything it does not write keeps following the shared settings.
 */
export default function GemengdConfig({ block }: Props) {
    const [c, patch] = useConstraints<MixedConstraints>(block);
    const numberType = c.numberType ?? 'natural';
    const variants: MixedVariantId[] = c.variants?.length ? c.variants : ['+', '-', 'x', ':'];
    const mix = c.mix ?? 'random';
    const perVariant = c.perVariant ?? {};

    const [openId, setOpenId] = useState<MixedVariantId | null>(null);
    const activeId = openId && variants.includes(openId) ? openId : variants[0];
    const activeVariant = MIXED_VARIANTS.find(v => v.id === activeId);

    const toggleVariant = (id: MixedVariantId) => {
        const next = variants.includes(id) ? variants.filter(v => v !== id) : [...variants, id];
        if (next.length === 0) return;   // a mix needs at least one variant
        // Keep the catalogue order so the 'cycle' mix reads + − × : down the sheet.
        patch({ variants: MIXED_VARIANTS.filter(v => next.includes(v.id)).map(v => v.id) });
    };

    // "Zoals algemeen": drop the whole override bag, so the tab inherits everything again.
    const resetVariant = (id: MixedVariantId) => {
        const rest = { ...perVariant };
        delete rest[id];
        patch({ perVariant: rest });
    };

    const ActiveConfig = activeVariant ? CONFIG_FOR_OP[activeVariant.op] : null;

    return (
        <div style={styles.container}>
            {/* ── ALGEMEEN — the settings every variant inherits ── */}
            <div style={styles.section}>
                <SettingLabel text="Maximum uitkomst:" info="Geldt voor alle bewerkingen in het blok; per bewerking kan je het in de tab hieronder niet apart zetten." />
                <PopupSelect
                    clampToLowest
                    value={c.maxGetal ?? (numberType === 'decimal' ? 100 : 1000)}
                    options={(MAX_PRESETS[numberType] ?? MAX_PRESETS.natural).map(val => ({ value: val, label: `Tot ${val.toLocaleString('nl-BE')}` }))}
                    onChange={(val) => patch({ maxGetal: val })}
                    ariaLabel="Maximum uitkomst"
                />
            </div>

            <div style={styles.section}>
                <SettingLabel text="Bewerkingen in het blok:" info="Kies wat door elkaar mag komen. Een oefenvorm (compenseren, met 10-100-1000) telt als een aparte keuze, dus + en + compenseren kunnen samen." />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(['+', '-', 'x', ':'] as MixedOp[]).map(op => (
                        <div key={op} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ ...styles.miniLabel, width: '18px', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-main)' }}>{opGlyph(op)}</span>
                            {MIXED_VARIANTS.filter(v => v.op === op).map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => toggleVariant(v.id)}
                                    title={v.label}
                                    aria-label={v.label}
                                    aria-pressed={variants.includes(v.id)}
                                    style={styles.pill(variants.includes(v.id))}
                                >
                                    {FORM_LABEL[v.preset ?? 'vrij']}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Volgorde:" info="Willekeurig = elke oefening trekt een bewerking. Om de beurt = de gekozen bewerkingen komen op vaste beurt aan bod." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => patch({ mix: 'random' })} style={styles.radioBtn(mix === 'random')}>Willekeurig</button>
                    <button onClick={() => patch({ mix: 'cycle' })} style={styles.radioBtn(mix === 'cycle')}>Om de beurt</button>
                </div>
            </div>

            <hr style={styles.divider} />

            {/* ── PER BEWERKING — the same plugins, writing into perVariant[id] ── */}
            <SettingLabel group text="Per bewerking" info="Alles wat je hier zet, geldt alleen voor die bewerking. Wat je niet aanraakt, volgt de algemene instellingen." />
            <div style={{ ...styles.buttonGroup, marginBottom: 'var(--sp-4)' }}>
                {MIXED_VARIANTS.filter(v => variants.includes(v.id)).map(v => {
                    const overridden = Object.keys(perVariant[v.id] ?? {}).length > 0;
                    return (
                        <button
                            key={v.id}
                            onClick={() => setOpenId(v.id)}
                            title={v.label}
                            aria-label={v.label}
                            aria-pressed={v.id === activeId}
                            style={{ ...styles.radioBtn(v.id === activeId), flex: '0 1 auto', gap: '5px' }}
                        >
                            {tabLabel(v.op, v.preset)}
                            {/* A dot marks a tab that no longer follows the shared settings. */}
                            {overridden && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />}
                        </button>
                    );
                })}
            </div>

            {activeVariant && ActiveConfig && (
                <div key={activeVariant.id} style={styles.sectionBox}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
                        <span style={{ ...styles.groupLabel, margin: 0 }}>{OP_NAME[activeVariant.op]}{activeVariant.preset ? ` — ${FORM_LABEL[activeVariant.preset].toLowerCase()}` : ''}</span>
                        <button
                            onClick={() => resetVariant(activeVariant.id)}
                            disabled={!Object.keys(perVariant[activeVariant.id] ?? {}).length}
                            title="Wis de eigen instellingen van deze bewerking"
                            style={{ ...styles.pill(false), flexShrink: 0, cursor: Object.keys(perVariant[activeVariant.id] ?? {}).length ? 'pointer' : 'default', opacity: Object.keys(perVariant[activeVariant.id] ?? {}).length ? 1 : 0.5 }}
                        >
                            Zoals algemeen
                        </button>
                    </div>
                    <ConstraintScopeContext.Provider value={{
                        path: ['perVariant', activeVariant.id],
                        hidden: SHARED_KEYS,
                        fixedPreset: activeVariant.preset ?? 'vrij',
                    }}>
                        <ActiveConfig block={block} />
                    </ConstraintScopeContext.Provider>
                </div>
            )}
        </div>
    );
}
