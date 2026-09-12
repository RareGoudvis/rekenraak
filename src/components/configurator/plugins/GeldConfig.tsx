import { useConstraints } from '../useConstraints';
import { F } from './shared/fieldStyles';
import Switch from '../../ui/Switch';
import { sharedPluginStyles as S } from './sharedPluginStyles';
import type { MathBlock } from '../../../services/math/types';
import { DENOMINATION_CATALOGUE, denominationLabel } from '../../../services/geld/geldGenerator';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';
import type { GeldConstraints } from '../../../services/math/constraintTypes';

export default function GeldConfig({ block }: { block: MathBlock }) {
    const [c, patch] = useConstraints<GeldConstraints>(block);
    const isHerkennen = block.typeId === 'geld-herkennen';

    const set = (key: keyof GeldConstraints, val: unknown) => patch({ [key]: val } as Partial<GeldConstraints>);
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

// ── Differentiatie: money notation + the answer/draw box (herkennen + tekenen).
// Mounted by Inspector through EXERCISE_UI[typeId].StyleConfig.
export function GeldStyleConfig({ block }: { block: MathBlock }) {
    const [c, patch] = useConstraints<GeldConstraints>(block);
    const isGeldHerkennen = block.typeId === 'geld-herkennen';
    const gFormat: string = c.format ?? 'euros';
    const gScaffolding: string = c.scaffolding ?? (isGeldHerkennen ? 'invullen' : 'eenvoudig');
    const gShowVoorbeelden: boolean = c.showVoorbeelden ?? false;
    const gVoorbeeldTypes: number[] = c.voorbeeldTypes ?? [];
    const gAllowedDenominations: number[] = c.allowedDenominations ?? [];

    const toggleVoorbeeld = (valueCents: number) => {
        const next = gVoorbeeldTypes.includes(valueCents)
            ? gVoorbeeldTypes.filter(v => v !== valueCents)
            : [...gVoorbeeldTypes, valueCents];
        patch({ voorbeeldTypes: next });
    };

    return (
        <>
            <label style={{ ...F.label, marginTop: '12px' }}>Opmaak</label>
            <div className="seg-group">
                <button className="seg-btn" aria-pressed={gFormat === 'euros'} onClick={() => patch({ format: 'euros' })}>Euro's (xx)</button>
                <button className="seg-btn" aria-pressed={gFormat === 'decimaal'} onClick={() => patch({ format: 'decimaal' })}>Decimaal (xx,xx)</button>
            </div>

            {isGeldHerkennen && (
                <>
                    <label style={{ ...F.label, marginTop: '12px' }}>Antwoord</label>
                    <div className="seg-group">
                        <button className="seg-btn" aria-pressed={gScaffolding === 'invullen'} onClick={() => patch({ scaffolding: 'invullen' })}>
                            {gFormat === 'decimaal' ? 'Invullen (€__,__)' : 'Invullen (€___)'}
                        </button>
                        <button className="seg-btn" aria-pressed={gScaffolding === 'zelf-schrijven'} onClick={() => patch({ scaffolding: 'zelf-schrijven' })}>Zelf schrijven</button>
                    </div>
                </>
            )}

            {!isGeldHerkennen && (
                <>
                    <label style={{ ...F.label, marginTop: '12px' }}>Tekenvak</label>
                    <div className="seg-group">
                        <button className="seg-btn" aria-pressed={gScaffolding === 'eenvoudig'} onClick={() => patch({ scaffolding: 'eenvoudig' })}>Eenvoudig</button>
                        <button className="seg-btn" aria-pressed={gScaffolding === 'verdeeld'} onClick={() => patch({ scaffolding: 'verdeeld' })}>Verdeeld (€ / cent)</button>
                    </div>
                </>
            )}

            <div style={{ ...F.switchRow, marginTop: '12px' }}>
                <span style={F.switchText}>Voorbeelden tonen</span>
                <Switch checked={gShowVoorbeelden} onChange={(v) => patch({ showVoorbeelden: v })} aria-label="Voorbeelden tonen" />
            </div>
            {gShowVoorbeelden && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {DENOMINATION_CATALOGUE.filter(d => gAllowedDenominations.includes(d.valueCents)).map(d => {
                        const active = gVoorbeeldTypes.includes(d.valueCents);
                        return (
                            <span key={d.valueCents} onClick={() => toggleVoorbeeld(d.valueCents)}
                                style={{
                                    padding: '4px 8px', fontSize: '11px', borderRadius: '12px', cursor: 'pointer',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: active ? 'var(--accent-purple)' : 'var(--bg-input)',
                                    color: active ? 'white' : 'var(--text-muted)',
                                    fontWeight: active ? 'bold' : 'normal',
                                    userSelect: 'none',
                                }}>
                                {denominationLabel(d.valueCents)}
                            </span>
                        );
                    })}
                </div>
            )}
        </>
    );
}

// ── Geavanceerd: printed geometry, shared by every geld type except geld-teruggeven
// (which has its own box-height control in its plugin).
export function GeldAdvancedConfig({ block }: { block: MathBlock }) {
    const [c, patch] = useConstraints<GeldConstraints>(block);
    const isGeldHerkennen = block.typeId === 'geld-herkennen';
    const currentPerRow = c.exercisesPerRow ?? 4;
    const boxHeight = c.boxHeight ?? 80;
    return (
        <>
            <label style={F.label}>Oefeningen per rij ({currentPerRow})</label>
            <input
                type="range" min={1} max={4}
                value={currentPerRow}
                onChange={e => patch({ exercisesPerRow: Number(e.target.value) })}
                style={F.range}
            />
            {!isGeldHerkennen && (
                <>
                    <label style={{ ...F.label, marginTop: '10px' }}>Hoogte tekenvak ({boxHeight}px)</label>
                    <input
                        type="range" min={40} max={160}
                        value={boxHeight}
                        onChange={e => patch({ boxHeight: Number(e.target.value) })}
                        style={F.range}
                    />
                </>
            )}
        </>
    );
}
