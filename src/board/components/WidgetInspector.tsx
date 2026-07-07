import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import Switch from '../../components/ui/Switch';
import { useBoardStore } from '../useBoardStore';
import { klokProps, type KlokProps, weerProps, type WeerProps, NAMES_KEY } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

interface Props {
    widget: BoardWidget;   // selected non-exercise widget with settings (klok, weer, …)
}

// Settings flyout for non-exercise widgets (same chrome as the exercise
// inspector). Each kind renders its own controls; kinds without settings
// never mount this panel.
export default function WidgetInspector({ widget }: Props) {
    const selectWidget = useBoardStore((s) => s.selectWidget);

    return (
        <div style={S.panel}>
            <div style={S.head}>
                <span style={S.title}>Instellingen</span>
                <button type="button" className="ui-hover" style={S.closeBtn} aria-label="Sluiten" onClick={() => selectWidget(null)}>
                    <X size={18} />
                </button>
            </div>
            <div style={S.scroll}>
                {widget.kind === 'klok' && <KlokSettings widget={widget} />}
                {widget.kind === 'weer' && <WeerSettings widget={widget} />}
                {widget.kind === 'namen' && <NamenSettings />}
            </div>
        </div>
    );
}

function KlokSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const k = klokProps(widget);
    const set = (patch: Partial<KlokProps>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });

    const row = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
        <div style={S.row}>
            <span style={S.rowLabel}>{label}</span>
            <Switch checked={checked} onChange={onChange} aria-label={label} />
        </div>
    );

    return (
        <div>
            <div style={S.sectionLabel}>Weergave</div>
            {row('Analoge klok', k.showAnalog, (v) => set({ showAnalog: v }))}
            {row('Digitale klok', k.showDigital, (v) => set({ showDigital: v }))}
            {row('Geschreven tijd', k.showText, (v) => set({ showText: v }))}

            {k.showText && (
                <>
                    <div style={S.sectionLabel}>Stijl geschreven tijd</div>
                    <div className="seg-group" style={{ margin: '4px 0 10px' }}>
                        <button type="button" className="seg-btn" aria-pressed={k.textStyle === 'digitaal'} onClick={() => set({ textStyle: 'digitaal' })}>07:45</button>
                        <button type="button" className="seg-btn" aria-pressed={k.textStyle === 'tekst'} onClick={() => set({ textStyle: 'tekst' })}>kwart voor 8</button>
                    </div>
                </>
            )}

            <div style={S.sectionLabel}>Wijzers</div>
            {row('Uurwijzer', k.showHourHand, (v) => set({ showHourHand: v }))}
            {row('Minuutwijzer', k.showMinuteHand, (v) => set({ showMinuteHand: v }))}

            <div style={S.sectionLabel}>Tijd</div>
            <div style={{ ...S.rowLabel, padding: '4px 0' }}>
                Sleep de wijzers op de klok: buitenkant = minuten, binnenkant = uren.
            </div>
        </div>
    );
}

function WeerSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const w = weerProps(widget);
    const set = (patch: Partial<WeerProps>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });

    const row = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
        <div style={S.row}>
            <span style={S.rowLabel}>{label}</span>
            <Switch checked={checked} onChange={onChange} aria-label={label} />
        </div>
    );
    return (
        <div>
            <div style={S.sectionLabel}>Weergave</div>
            {row('Weer (icoon + naam)', w.showWeather, (v) => set({ showWeather: v }))}
            {row('Temperatuur nu', w.showTemp, (v) => set({ showTemp: v }))}
            {row('Min / max vandaag', w.showMinMax, (v) => set({ showMinMax: v }))}
            {row('Zonsopgang / -ondergang', w.showSun, (v) => set({ showSun: v }))}
            {row('Kans op neerslag', w.showRainPct, (v) => set({ showRainPct: v }))}
            {row('Hoeveelheid neerslag', w.showRainMm, (v) => set({ showRainMm: v }))}
            <div style={{ ...S.rowLabel, padding: '8px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                Locatie volgt de browser (of Brussel zonder toestemming). Bron: open-meteo.com.
            </div>
        </div>
    );
}

function NamenSettings() {
    // Class list is app-wide (localStorage), not per widget — a teacher has one class.
    const [names, setNames] = useState(() => localStorage.getItem(NAMES_KEY) ?? '');
    const save = (v: string) => { setNames(v); localStorage.setItem(NAMES_KEY, v); };
    const count = names.split('\n').map(s => s.trim()).filter(Boolean).length;
    return (
        <div>
            <div style={S.sectionLabel}>Namenlijst ({count})</div>
            <textarea
                value={names}
                placeholder={'Eén naam per lijn:\nEmma\nNoah\nLina\n…'}
                onChange={(e) => save(e.target.value)}
                style={{
                    width: '100%', minHeight: '260px', resize: 'vertical', boxSizing: 'border-box',
                    background: 'var(--bg-input)', color: 'var(--text-main)',
                    border: '1px solid var(--border-color)', borderRadius: '10px',
                    padding: '10px', fontSize: '14px', fontFamily: "'Azeret Mono', monospace", outline: 'none',
                }}
            />
            <div style={{ ...S.rowLabel, padding: '8px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                Wordt lokaal bewaard op dit toestel en gedeeld door alle borden.
            </div>
        </div>
    );
}

const S = {
    panel: {
        position: 'absolute', top: '12px', right: '12px', maxHeight: 'calc(100% - 24px)', width: '300px',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '14px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)', zIndex: 50, overflow: 'hidden',
    } as React.CSSProperties,
    head: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderBottom: '1px solid var(--border-color)', flexShrink: 0,
    } as React.CSSProperties,
    title: { fontSize: '14px', fontWeight: 600, fontFamily: "'Azeret Mono', monospace", color: 'var(--text-main)' } as React.CSSProperties,
    closeBtn: {
        width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: '8px', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer',
    } as React.CSSProperties,
    scroll: { flex: 1, overflowY: 'auto', padding: '12px 14px', minHeight: 0 } as React.CSSProperties,
    sectionLabel: {
        padding: '10px 0 4px', fontSize: '10px', letterSpacing: '0.8px', textTransform: 'uppercase',
        color: 'var(--text-muted)', fontFamily: "'Azeret Mono', monospace",
    } as React.CSSProperties,
    row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' } as React.CSSProperties,
    rowLabel: { fontSize: '13px', color: 'var(--text-main)' } as React.CSSProperties,
};
