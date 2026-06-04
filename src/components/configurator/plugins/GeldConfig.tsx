import { useWorksheetStore } from '../../../store/useWorksheetStore';
import { sharedPluginStyles as S } from './sharedPluginStyles';
import type { MathBlock } from '../../../services/math/types';
import { DENOMINATION_CATALOGUE, denominationLabel } from '../../../services/geld/geldGenerator';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';

export default function GeldConfig({ block }: { block: MathBlock }) {
    const updateBlockSettings = useWorksheetStore(s => s.updateBlockSettings);
    const isHerkennen = block.typeId === 'geld-herkennen';

    const c = block.constraints;
    const set = (key: string, val: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: val } });

    const maxGetal: number = c.maxGetal ?? 10;
    const geldLayout: string = c.geldLayout ?? 'samen';
    const allowedDenominations: number[] = c.allowedDenominations ?? DENOMINATION_CATALOGUE.map(d => d.valueCents);

    const toggleDenom = (valueCents: number) => {
        const next = allowedDenominations.includes(valueCents)
            ? allowedDenominations.filter(v => v !== valueCents)
            : [...allowedDenominations, valueCents];
        set('allowedDenominations', next);
        const voorbeeldTypes: number[] = c.voorbeeldTypes ?? [];
        if (!next.includes(valueCents) && voorbeeldTypes.includes(valueCents)) {
            set('voorbeeldTypes', voorbeeldTypes.filter(v => v !== valueCents));
        }
    };

    return (
        <div style={S.container}>

            {/* ── Maximum getal ── */}
            <div style={S.section}>
                <SettingLabel text="Maximum getal" info="Het grootste bedrag dat mag voorkomen." />
                <PopupSelect
                    clampToLowest
                    value={maxGetal}
                    options={[10, 20, 100, 1000].map(v => ({ value: v, label: `Tot ${v}` }))}
                    onChange={(v) => set('maxGetal', v)}
                    ariaLabel="Maximum getal"
                />
            </div>

            {/* ── Toegestane coupures ── */}
            <div style={S.section}>
                <SettingLabel text="Toegestane coupures" info="Welke biljetten en munten gebruikt mogen worden." />
                <div style={{ marginBottom: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>Biljetten</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                    {DENOMINATION_CATALOGUE.filter(d => d.type === 'bill').map(d => (
                        <span key={d.valueCents} style={S.pill(allowedDenominations.includes(d.valueCents))} onClick={() => toggleDenom(d.valueCents)}>
                            {denominationLabel(d.valueCents)}
                        </span>
                    ))}
                </div>
                <div style={{ marginBottom: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>Munten (€)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                    {DENOMINATION_CATALOGUE.filter(d => d.type === 'euro-coin').map(d => (
                        <span key={d.valueCents} style={S.pill(allowedDenominations.includes(d.valueCents))} onClick={() => toggleDenom(d.valueCents)}>
                            {denominationLabel(d.valueCents)}
                        </span>
                    ))}
                </div>
                <div style={{ marginBottom: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>Munten (ct)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {DENOMINATION_CATALOGUE.filter(d => d.type === 'cent-coin').map(d => (
                        <span key={d.valueCents} style={S.pill(allowedDenominations.includes(d.valueCents))} onClick={() => toggleDenom(d.valueCents)}>
                            {denominationLabel(d.valueCents)}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Geldlayout (herkennen only) ── */}
            {isHerkennen && (
                <div style={S.section}>
                    <SettingLabel text="Geldlayout" info="Toont het geld samen of gescheiden per soort." />
                    <div style={S.buttonGroup}>
                        <button style={S.radioBtn(geldLayout !== 'gescheiden')} onClick={() => set('geldLayout', 'samen')}>Samen</button>
                        <button style={S.radioBtn(geldLayout === 'gescheiden')} onClick={() => set('geldLayout', 'gescheiden')}>Gescheiden</button>
                    </div>
                </div>
            )}
        </div>
    );
}
