import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import ModalPortal from '../ui/ModalPortal';
import Switch from '../ui/Switch';
import { SwatchRow } from '../ui/Swatch';
import { useWorksheetStore, type RegionStyle } from '../../store/useWorksheetStore';
import { PRINT_PALETTE, PRINT_FILLS, STYLE_BOUNDS } from '../../config/printPalette';
import { overlayRegionStyle } from '../../services/regionStyle';

type Region = 'header' | 'titel' | 'footer';
const REGION_KEY = { header: 'headerCustom', titel: 'titelCustom', footer: 'footerCustom' } as const;
const REGIONS: Array<{ id: Region; label: string }> = [
    { id: 'header', label: 'Koptekst' },
    { id: 'titel', label: 'Opdracht-titel' },
    { id: 'footer', label: 'Voettekst' },
];
const DEFAULT_SIZE: Record<Region, number> = { header: 22, titel: 16, footer: 9 };

export default function StyleBuilderModal({ onClose }: { onClose: () => void }) {
    const docSettings = useWorksheetStore((s) => s.docSettings);
    const updateDocSettings = useWorksheetStore((s) => s.updateDocSettings);
    const [region, setRegion] = useState<Region>('header');

    const b = STYLE_BOUNDS[region];
    const cur: RegionStyle = docSettings[REGION_KEY[region]] ?? {};
    const patch = (p: Partial<RegionStyle>) => updateDocSettings({ [REGION_KEY[region]]: { ...cur, ...p } });
    const reset = () => updateDocSettings({ [REGION_KEY[region]]: {} });

    return (
        <ModalPortal>
            <div style={overlay} onClick={onClose}>
                <div style={panel} onClick={(e) => e.stopPropagation()}>
                    <div style={head}>
                        <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--text-main)' }}>Stijl aanpassen</h3>
                        <button type="button" onClick={onClose} style={closeBtn} aria-label="Sluiten"><X size={18} /></button>
                    </div>

                    {/* Region switch */}
                    <div className="seg-group" style={{ marginBottom: 'var(--sp-4)' }}>
                        {REGIONS.map((r) => (
                            <button key={r.id} className="seg-btn" aria-pressed={region === r.id} onClick={() => setRegion(r.id)}>{r.label}</button>
                        ))}
                    </div>

                    <div style={grid}>
                        {/* ── Controls ── */}
                        <div style={col}>
                            <Field label={`Tekengrootte: ${cur.fontSize ?? DEFAULT_SIZE[region]}px`}>
                                <input type="range" min={b.fontMin} max={b.fontMax} value={cur.fontSize ?? DEFAULT_SIZE[region]}
                                    onChange={(e) => patch({ fontSize: Number(e.target.value) })} style={range} />
                            </Field>

                            <Row label="Vet"><Switch checked={!!cur.bold} onChange={(v) => patch({ bold: v })} aria-label="Vet" /></Row>

                            <Field label="Tekstkleur">
                                <SwatchRow options={PRINT_PALETTE} value={cur.color ?? '#000000'} onChange={(v) => patch({ color: v })} />
                            </Field>

                            <Field label="Vulkleur">
                                <SwatchRow options={PRINT_FILLS} value={cur.background ?? ''} onChange={(v) => patch({ background: v })} />
                            </Field>

                            <Field label="Uitlijning">
                                <div className="seg-group">
                                    {(['left', 'center', 'right'] as const).map((a) => (
                                        <button key={a} className="seg-btn" aria-pressed={(cur.align ?? 'left') === a} onClick={() => patch({ align: a })}>
                                            {a === 'left' ? 'Links' : a === 'center' ? 'Midden' : 'Rechts'}
                                        </button>
                                    ))}
                                </div>
                            </Field>

                            <Field label="Lijnen">
                                <div className="seg-group">
                                    <button className="seg-btn" aria-pressed={!!cur.borderTop} onClick={() => patch({ borderTop: !cur.borderTop, borderBox: false })}>Boven</button>
                                    <button className="seg-btn" aria-pressed={!!cur.borderBottom} onClick={() => patch({ borderBottom: !cur.borderBottom, borderBox: false })}>Onder</button>
                                    <button className="seg-btn" aria-pressed={!!cur.borderBox} onClick={() => patch({ borderBox: !cur.borderBox, borderTop: false, borderBottom: false })}>Kader</button>
                                </div>
                            </Field>
                            {(cur.borderTop || cur.borderBottom || cur.borderBox) && (
                                <>
                                    <Field label={`Lijndikte: ${cur.borderWidth ?? 1.5}px`}>
                                        <input type="range" min={1} max={b.borderMax} step={0.5} value={cur.borderWidth ?? 1.5}
                                            onChange={(e) => patch({ borderWidth: Number(e.target.value) })} style={range} />
                                    </Field>
                                    <Field label="Lijnkleur">
                                        <SwatchRow options={PRINT_PALETTE} value={cur.borderColor ?? '#000000'} onChange={(v) => patch({ borderColor: v })} />
                                    </Field>
                                </>
                            )}

                            {/* Footer side-padding is the print margin — only header/titel expose padding. */}
                            {region !== 'footer' && (
                                <>
                                    <Field label={`Marge horizontaal: ${cur.padX ?? 0}px`}>
                                        <input type="range" min={0} max={b.padMax} value={cur.padX ?? 0} onChange={(e) => patch({ padX: Number(e.target.value) })} style={range} />
                                    </Field>
                                    <Field label={`Marge verticaal: ${cur.padY ?? 0}px`}>
                                        <input type="range" min={0} max={b.padMax} value={cur.padY ?? 0} onChange={(e) => patch({ padY: Number(e.target.value) })} style={range} />
                                    </Field>
                                </>
                            )}

                            <button type="button" onClick={reset} style={resetBtn}>Stijl terugzetten</button>
                        </div>

                        {/* ── Live preview (same overlay helper as the real sheet) ── */}
                        <div style={previewWrap}>
                            <div style={previewSheet}>
                                <div style={{ ...overlayRegionStyle(headerBase, docSettings.headerCustom), ...ring(region === 'header') }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                        <span>Naam: ______</span><span>Klas: ___</span>
                                    </div>
                                    <div style={{ fontWeight: 'bold', fontSize: 'inherit', marginTop: '6px' }}>Werkblad</div>
                                </div>
                                <div style={{ ...overlayRegionStyle(opdrachtBase, docSettings.titelCustom), ...ring(region === 'titel') }}>
                                    <span>1. Reken uit.</span>
                                    <span>__ / 10</span>
                                </div>
                                <div style={{ marginTop: 'auto', ...overlayRegionStyle(footerBase, docSettings.footerCustom), ...ring(region === 'footer') }}>
                                    <span>School | Klas</span><span>vrije tekst</span>
                                </div>
                            </div>
                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '8px 2px 0', fontStyle: 'italic' }}>
                                Voorbeeld — zo verschijnt het op het afgedrukte blad.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 'var(--sp-4)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>{label}</label>
            {children}
        </div>
    );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>{label}</span>{children}
        </div>
    );
}

const ring = (on: boolean): React.CSSProperties => on ? { outline: '2px solid var(--accent)', outlineOffset: '2px', borderRadius: '3px' } : {};

// Preview base styles (representative of the real sheet defaults; the overlay adds custom on top).
const headerBase: React.CSSProperties = { display: 'flex', flexDirection: 'column', padding: '10px', fontFamily: 'Azeret Mono, monospace', fontSize: '13px', color: '#000', background: '#fff' };
const opdrachtBase: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Azeret Mono, monospace', fontWeight: 'bold', fontSize: '14px', color: '#000', margin: '14px 0' };
const footerBase: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontFamily: 'Azeret Mono, monospace', fontSize: '9pt', color: '#666' };

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' };
const panel: React.CSSProperties = { width: 'min(760px, 94vw)', maxHeight: '88vh', overflowY: 'auto', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-2)', padding: 'var(--sp-5)' };
const head: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' };
const closeBtn: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', padding: '4px' };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 'var(--sp-5)' };
const col: React.CSSProperties = { minWidth: 0 };
const range: React.CSSProperties = { width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' };
const previewWrap: React.CSSProperties = { minWidth: 0 };
const previewSheet: React.CSSProperties = { display: 'flex', flexDirection: 'column', minHeight: '260px', background: '#fff', borderRadius: '4px', padding: '12px', boxShadow: 'var(--shadow-1)' };
const resetBtn: React.CSSProperties = { marginTop: 'var(--sp-2)', padding: '7px 12px', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--separator)', background: 'var(--bg-surface-2)', color: 'var(--text-muted)' };
