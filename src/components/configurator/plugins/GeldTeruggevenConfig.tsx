import { useWorksheetStore } from '../../../store/useWorksheetStore';
import { sharedPluginStyles as S } from './sharedPluginStyles';
import Switch from '../../ui/Switch';
import type { MathBlock } from '../../../services/math/types';
import { DENOMINATION_CATALOGUE, denominationLabel } from '../../../services/geld/geldGenerator';

const BILL_DENOMS = DENOMINATION_CATALOGUE.filter(d => d.type === 'bill');

const PRICE_PRESETS = [
    { label: 'Tot €10',   max: 9,   payDefault: [1000] },
    { label: 'Tot €50',   max: 49,  payDefault: [1000, 2000, 5000] },
    { label: 'Tot €100',  max: 99,  payDefault: [2000, 5000, 10000] },
    { label: 'Tot €1000', max: 999, payDefault: [5000, 10000, 20000, 50000] },
];

const CENTEN_OPTIES = [
    { value: 'vijfentwintig', label: '25 cent',   hint: '.25 / .50 / .75' },
    { value: 'tien',          label: '10 cent',   hint: '.10 / .20 / ... / .90' },
    { value: 'vijf',          label: 'Vijf cent', hint: '.05 / .10 / ... / .95' },
];

export default function GeldTeruggevenConfig({ block }: { block: MathBlock }) {
    const updateBlockSettings = useWorksheetStore(s => s.updateBlockSettings);
    const c = block.constraints;
    const set = (key: string, val: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: val } });

    const maxPriceEuros: number    = c.maxPriceEuros ?? 49;
    const payWithOptions: number[] = c.payWithOptions ?? [1000, 2000, 5000];
    const antwoordType: string     = c.antwoordType ?? 'schrijven';
    const antwoordFormat: string   = c.antwoordFormat ?? 'euro-cent';
    const betalenMetTekening: boolean = c.betalenMetTekening ?? false;
    const centenDeel: string       = c.centenDeel ?? 'vijf';

    // active preset = whichever preset matches the current maxPriceEuros
    const activePreset = PRICE_PRESETS.find(p => p.max === maxPriceEuros);

    const applyPreset = (preset: typeof PRICE_PRESETS[0]) => {
        updateBlockSettings(block.id, {
            constraints: {
                ...c,
                minPriceEuros: 1,
                maxPriceEuros: preset.max,
                payWithOptions: preset.payDefault,
            },
        });
    };

    const togglePayWith = (valueCents: number) => {
        const next = payWithOptions.includes(valueCents)
            ? payWithOptions.filter(v => v !== valueCents)
            : [...payWithOptions, valueCents];
        set('payWithOptions', next);
    };

    return (
        <div style={S.container}>

            {/* ── Prijsbereik ── */}
            <div style={S.section}>
                <label style={S.label}>Prijsbereik</label>
                <div style={S.buttonGroup}>
                    {PRICE_PRESETS.map(p => (
                        <button key={p.max} style={S.radioBtn(activePreset?.max === p.max)}
                            onClick={() => applyPreset(p)}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Centpatroon (getalopbouw equivalent for money) ── */}
            <div style={S.section}>
                <label style={S.label}>Centpatroon</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {CENTEN_OPTIES.map(opt => (
                        <button key={opt.value}
                            style={{ ...S.radioBtn(centenDeel === opt.value), textAlign: 'left', display: 'flex', justifyContent: 'space-between' } as React.CSSProperties}
                            onClick={() => set('centenDeel', opt.value)}>
                            <span>{opt.label}</span>
                            <span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 'normal' }}>{opt.hint}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Betalen met ── */}
            <div style={S.section}>
                <label style={S.label}>Betalen met (biljetten)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {BILL_DENOMS.map(d => (
                        <span key={d.valueCents} style={S.pill(payWithOptions.includes(d.valueCents))}
                            onClick={() => togglePayWith(d.valueCents)}>
                            {denominationLabel(d.valueCents)}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Antwoord invullen ── */}
            <div style={S.section}>
                <label style={S.label}>Antwoord invullen</label>
                <div style={S.buttonGroup}>
                    <button style={S.radioBtn(antwoordType === 'schrijven')} onClick={() => set('antwoordType', 'schrijven')}>Schrijven</button>
                    <button style={S.radioBtn(antwoordType === 'tekenen-schrijven')} onClick={() => set('antwoordType', 'tekenen-schrijven')}>Tekenen + schrijven</button>
                </div>
            </div>

            {/* ── Antwoordformat ── */}
            <div style={S.section}>
                <label style={S.label}>Antwoordformat</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[
                        { value: 'euro-cent', label: '___ euro en ___ cent' },
                        { value: 'decimaal',  label: '€ ___ , ___' },
                        { value: 'beide',     label: 'Beide' },
                    ].map(opt => (
                        <button key={opt.value}
                            style={{ ...S.radioBtn(antwoordFormat === opt.value), justifyContent: 'flex-start', textAlign: 'left' }}
                            onClick={() => set('antwoordFormat', opt.value)}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Betalen met tekening ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                <label style={{ ...S.label, marginBottom: 0 }}>Betalen met (tekening)</label>
                <Switch checked={betalenMetTekening} onChange={(v) => set('betalenMetTekening', v)} aria-label="Betalen met tekening" />
            </div>
        </div>
    );
}
