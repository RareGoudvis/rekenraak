import { X } from '@phosphor-icons/react';
import { Section, Segmented, Slider, Toggle, Hint, Button, ButtonRow } from './controls';
import { useBoardStore } from '../useBoardStore';
import { GELD_CATALOGUE, DEFAULT_GELD_PALET, type GeldPaletSettings } from '../mathTools/geld';
import { denominationLabel } from '../../services/geld/geldGenerator';

// Settings of the geld dock (not a widget: it opens from the dock's own ⚙, beside the dock).
export default function GeldPaletSettingsPanel({ value, onChange, onClose }: {
    value: GeldPaletSettings; onChange: (v: GeldPaletSettings) => void; onClose: () => void;
}) {
    const set = (patch: Partial<GeldPaletSettings>) => onChange({ ...value, ...patch });
    const toggleDenom = (d: number) => {
        const next = value.denoms.includes(d) ? value.denoms.filter(x => x !== d) : [...value.denoms, d];
        // The dock never goes empty: the last coin stays.
        if (next.length) set({ denoms: GELD_CATALOGUE.map(g => g.denom).filter(x => next.includes(x)) });
    };
    const only = (pred: (d: number) => boolean) => set({ denoms: GELD_CATALOGUE.map(g => g.denom).filter(pred) });
    const clearMoney = () => {
        const s = useBoardStore.getState();
        s.pages[s.activePageIdx].widgets.filter(w => w.kind === 'geld-item').forEach(w => s.removeWidget(w.id));
    };

    return (
        <div style={S.panel} onPointerDown={(e) => e.stopPropagation()} data-geld-palet-settings>
            <div style={S.head}>
                <span style={S.title}>Geld-palet</span>
                <button type="button" className="ui-hover" style={S.closeBtn} aria-label="Palet-instellingen sluiten" onClick={onClose}><X size={16} /></button>
            </div>
            <div style={S.scroll}>
                <Section title="Munten en biljetten">
                    <div role="group" aria-label="Munten en biljetten in het palet" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {GELD_CATALOGUE.map(g => (
                            <Button key={g.denom} pressed={value.denoms.includes(g.denom)} onClick={() => toggleDenom(g.denom)} label={`${denominationLabel(g.denom)} in het palet`}>
                                {denominationLabel(g.denom)}
                            </Button>
                        ))}
                    </div>
                    <ButtonRow>
                        <Button onClick={() => only(() => true)}>Alles</Button>
                        <Button onClick={() => only(d => d < 100)}>Enkel centen</Button>
                        <Button onClick={() => only(d => d >= 100 && d <= 200)}>Euromunten</Button>
                        <Button onClick={() => only(d => d >= 500)}>Biljetten</Button>
                        <Button onClick={() => only(d => d <= 2000)}>Tot €20</Button>
                    </ButtonRow>
                </Section>
                <Section title="Weergave">
                    <Segmented label="Stijl" value={value.style} onChange={(v) => set({ style: v })}
                        options={[{ value: 'tekening', label: 'Schematisch' }, { value: 'realistisch', label: 'Echt' }]} />
                    <Toggle label="Bedrag onder elk stuk" checked={value.showLabels} onChange={(v) => set({ showLabels: v })} />
                    <Slider label="Grootte van nieuwe stukken" value={value.size} min={0.6} max={2} step={0.1}
                        format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ size: v })} />
                </Section>
                <Section title="Op het bord">
                    <Toggle label="Vastklikken op het raster" checked={value.snap} onChange={(v) => set({ snap: v })} />
                    <Toggle label="Tel samen (totaal in het palet)" checked={value.showSum} onChange={(v) => set({ showSum: v })} />
                    <Hint>Stijl, bedrag en grootte gelden voor stukken die je hierna op het bord sleept.</Hint>
                    <ButtonRow>
                        <Button danger onClick={clearMoney}>Al het geld van deze pagina wissen</Button>
                    </ButtonRow>
                </Section>
                <Section title="Standaard">
                    <ButtonRow>
                        <Button onClick={() => onChange({ ...DEFAULT_GELD_PALET })}>Palet terugzetten</Button>
                    </ButtonRow>
                </Section>
            </div>
        </div>
    );
}

const S = {
    panel: {
        position: 'absolute', left: '152px', top: '12px', maxHeight: 'calc(100% - 24px)', width: '320px',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '14px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)', zIndex: 46, overflow: 'hidden',
    } as React.CSSProperties,
    head: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderBottom: '1px solid var(--border-color)', flexShrink: 0,
    } as React.CSSProperties,
    title: { fontSize: '14px', fontWeight: 600, fontFamily: "'Azeret Mono', monospace", color: 'var(--text-main)' } as React.CSSProperties,
    closeBtn: {
        width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: '8px', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer',
    } as React.CSSProperties,
    scroll: { flex: 1, overflowY: 'auto', padding: '0 14px 12px', minHeight: 0 } as React.CSSProperties,
};
