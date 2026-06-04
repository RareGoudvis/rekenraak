import { X } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { getMaskPlaces, getBridgePlaces } from '../../services/math/mathEngine';
import type { BaseBridgePolicy, BaseNumberType } from '../../config/baseSettings';
import ModalPortal from '../ui/ModalPortal';
import BridgeControl from '../configurator/BridgeControl';

interface Props {
    onClose: () => void;
}

const MAX_PRESETS = [10, 20, 100, 1000, 10000, 100000, 1000000];

// Global base difficulty, mirroring the real exercise config (NaturalSettings).
// Values snapshot into each NEW block at add-time (baseApply); existing blocks
// stay unchanged.
export default function BaseSettingsModal({ onClose }: Props) {
    const base = useWorksheetStore((s) => s.baseSettings);
    const updateBase = useWorksheetStore((s) => s.updateBaseSettings);

    // Masks/bridges only make sense for place-value arithmetic (natural/decimal).
    const showPlaceControls = base.baseNumberType === 'natural' || base.baseNumberType === 'decimal';
    const helperType = base.baseNumberType === 'decimal' ? 'decimal' : 'natural';
    const maskPlaces = getMaskPlaces(base.baseMaxGetal, helperType, base.baseNumberType === 'decimal' ? base.baseDecimalPlaces : 0);
    const bridgePlaces = getBridgePlaces(base.baseMaxGetal, helperType);

    const toggleMask = (which: 'baseOperand1Mask' | 'baseOperand2Mask', key: string) => {
        const cur = base[which] || {};
        updateBase({ [which]: { ...cur, [key]: !cur[key] } } as Partial<typeof base>);
    };
    const setBridge = (key: string, opt: BaseBridgePolicy) =>
        updateBase({ baseBridges: { ...base.baseBridges, [key]: opt } });

    return (
        <ModalPortal>
        <div style={S.overlay} onClick={onClose}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                <div style={S.header}>
                    <div>
                        <h2 style={S.title}>Basisinstellingen</h2>
                        <p style={S.subtitle}>Standaard voor nieuwe oefeningen. Bestaande blokken blijven ongewijzigd. Getalopbouw en bruggetjes gelden enkel voor hoofdrekenen, cijferen en splitsen.</p>
                    </div>
                    <button style={S.closeBtn} onClick={onClose} title="Sluiten" aria-label="Sluiten"><X size={20} /></button>
                </div>

                <div style={S.body}>
                    <div style={S.section}>
                        <label style={S.label}>Maximum getal</label>
                        <div style={S.wrapRow}>
                            {MAX_PRESETS.map(val => (
                                <button key={val} onClick={() => updateBase({ baseMaxGetal: val })} style={S.preset(base.baseMaxGetal === val)}>
                                    Tot {val.toLocaleString('nl-BE')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={S.section}>
                        <label style={S.label}>Getalsoort</label>
                        <div style={S.wrapRow}>
                            {([
                                { val: 'natural', label: 'Natuurlijk' },
                                { val: 'decimal', label: 'Decimaal' },
                                { val: 'rational', label: 'Rationaal' },
                                { val: 'geheel', label: 'Geheel' },
                            ] as Array<{ val: BaseNumberType; label: string }>).map(({ val, label }) => (
                                <button key={val} onClick={() => updateBase({ baseNumberType: val })} style={S.preset(base.baseNumberType === val)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {base.baseNumberType === 'decimal' && (
                        <div style={S.section}>
                            <label style={S.label}>Decimalen</label>
                            <div style={S.wrapRow}>
                                {[1, 2, 3].map(dp => (
                                    <button key={dp} onClick={() => updateBase({ baseDecimalPlaces: dp })} style={S.preset(base.baseDecimalPlaces === dp)}>{dp}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {base.baseNumberType === 'rational' && (
                        <div style={S.section}>
                            <label style={S.label}>Breuken</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)', cursor: 'pointer', marginBottom: '6px' }}>
                                <input type="checkbox" checked={base.baseUnitFractionsOnly} onChange={(e) => updateBase({ baseUnitFractionsOnly: e.target.checked })} style={{ accentColor: 'var(--accent-purple)', width: '15px', height: '15px' }} />
                                Enkel stambreuken (teller = 1)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)', cursor: 'pointer' }}>
                                <input type="checkbox" checked={base.baseAllowMixed} onChange={(e) => updateBase({ baseAllowMixed: e.target.checked })} style={{ accentColor: 'var(--accent-purple)', width: '15px', height: '15px' }} />
                                Gemengde getallen (bv. 1 1/4)
                            </label>
                        </div>
                    )}

                    {showPlaceControls && (
                        <>
                            <div style={S.section}>
                                <h4 style={S.h4}>Specifieke getalopbouw</h4>
                                {(['baseOperand1Mask', 'baseOperand2Mask'] as const).map((op, idx) => (
                                    <div key={op} style={S.maskRow}>
                                        <span style={S.maskLabel}>Getal {idx + 1}:</span>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {maskPlaces.map(p => (
                                                <button key={p.key} onClick={() => toggleMask(op, p.key)} style={S.maskBtn(!!base[op]?.[p.key])}>{p.key}</button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <p style={S.hint}>Leeg = alle posities toegelaten.</p>
                            </div>

                            <div style={S.section}>
                                <h4 style={S.h4}>Bruginstellingen</h4>
                                <BridgeControl
                                    places={bridgePlaces}
                                    bridges={base.baseBridges as Record<string, BaseBridgePolicy>}
                                    onChange={(key, val) => setBridge(key, val as BaseBridgePolicy)}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div style={S.footer}>
                    <button style={S.doneBtn} onClick={onClose}>Klaar</button>
                </div>
            </div>
        </div>
        </ModalPortal>
    );
}

const S = {
    overlay: { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' } as React.CSSProperties,
    modal: { width: '100%', maxWidth: '640px', maxHeight: '90vh', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' } as React.CSSProperties,
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', padding: '18px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 } as React.CSSProperties,
    title: { margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' } as React.CSSProperties,
    subtitle: { margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' } as React.CSSProperties,
    closeBtn: { flexShrink: 0, width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties,
    body: { flex: 1, overflowY: 'auto', padding: '20px' } as React.CSSProperties,
    section: { marginBottom: '24px' } as React.CSSProperties,
    label: { display: 'block', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' } as React.CSSProperties,
    h4: { fontSize: '13px', margin: '0 0 12px 0', color: 'var(--text-main)' } as React.CSSProperties,
    wrapRow: { display: 'flex', flexWrap: 'wrap', gap: '6px' } as React.CSSProperties,
    preset: (active: boolean): React.CSSProperties => ({ padding: '7px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)', backgroundColor: active ? 'var(--accent-purple)' : 'var(--bg-input)', color: active ? '#fff' : 'var(--text-muted)', fontWeight: active ? 'bold' : 'normal' }),
    maskRow: { display: 'flex', alignItems: 'center', marginBottom: '8px' } as React.CSSProperties,
    maskLabel: { fontSize: '11px', width: '54px', color: 'var(--text-muted)' } as React.CSSProperties,
    maskBtn: (active: boolean): React.CSSProperties => ({ width: '30px', height: '30px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: active ? 'var(--accent-purple)' : 'var(--bg-input)', color: active ? '#fff' : 'var(--text-muted)' }),
    bridgeRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
    bridgeLabel: { fontSize: '12px', color: 'var(--text-muted)', width: '40px' } as React.CSSProperties,
    bridgeBtn: (active: boolean): React.CSSProperties => ({ flex: 1, fontSize: '11px', padding: '7px 0', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: active ? 'var(--accent-purple)' : 'var(--bg-input)', color: active ? '#fff' : 'var(--text-muted)', fontWeight: active ? 'bold' : 'normal' }),
    hint: { fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '6px 0 0' } as React.CSSProperties,
    footer: { display: 'flex', justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid var(--border-color)', flexShrink: 0 } as React.CSSProperties,
    doneBtn: { padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, border: 'none', background: 'var(--accent-purple)', color: '#fff' } as React.CSSProperties,
};
