import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import Switch from '../../components/ui/Switch';
import { useBoardStore } from '../useBoardStore';
import { klokProps, type KlokProps, weerProps, type WeerProps, NAMES_KEY, datumProps, type DatumProps, DATUM_COLORS, werksymbolenProps, WERKSYMBOLEN } from '../widgetSizing';
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
                {widget.kind === 'datum' && <DatumSettings widget={widget} />}
                {widget.kind === 'werksymbolen' && <WerksymbolenSettings widget={widget} />}
                <HeaderToggle widget={widget} />
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

function HeaderToggle({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    return (
        <div style={S.row}>
            <span style={S.rowLabel}>Titelbalk tonen</span>
            <Switch checked={widget.props?.showHeader !== false} aria-label="Titelbalk tonen"
                onChange={(v) => updateWidget(widget.id, { props: { ...widget.props, showHeader: v } })} />
        </div>
    );
}

function WeerSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const w = weerProps(widget);
    const set = (patch: Partial<WeerProps>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Array<{ name: string; admin1?: string; latitude: number; longitude: number }>>([]);

    const search = () => {
        if (!query.trim()) return;
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=nl`)
            .then(r => r.json())
            .then(j => setResults(j.results ?? []))
            .catch(() => setResults([]));
    };
    const pick = (r: { name: string; admin1?: string; latitude: number; longitude: number }) => {
        updateWidget(widget.id, { props: { ...widget.props, lat: r.latitude, lon: r.longitude, placeName: r.name } });
        setResults([]); setQuery('');
    };
    const useCurrent = () => {
        const props = { ...widget.props };
        delete props.lat; delete props.lon; delete props.placeName;
        updateWidget(widget.id, { props });
    };

    const row = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
        <div style={S.row}>
            <span style={S.rowLabel}>{label}</span>
            <Switch checked={checked} onChange={onChange} aria-label={label} />
        </div>
    );
    return (
        <div>
            <div style={S.sectionLabel}>Locatie ({typeof widget.props?.placeName === 'string' ? widget.props.placeName : 'huidige locatie'})</div>
            <div style={{ display: 'flex', gap: '6px' }}>
                <input
                    value={query} placeholder="Zoek gemeente…"
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
                    style={S.textInput}
                />
                <button type="button" className="ui-hover" style={S.smallBtn} onClick={search}>Zoek</button>
            </div>
            {results.map((r, i) => (
                <button key={i} type="button" className="ui-hover" style={{ ...S.smallBtn, width: '100%', justifyContent: 'flex-start', marginTop: '4px' }} onClick={() => pick(r)}>
                    {r.name}{r.admin1 ? ` (${r.admin1})` : ''}
                </button>
            ))}
            <button type="button" className="ui-hover" style={{ ...S.smallBtn, marginTop: '6px' }} onClick={useCurrent}>
                Gebruik huidige locatie
            </button>

            <div style={S.sectionLabel}>Weergave</div>
            {row('Weer (icoon + naam)', w.showWeather, (v) => set({ showWeather: v }))}
            {row('Temperatuur nu', w.showTemp, (v) => set({ showTemp: v }))}
            {row('Min / max vandaag', w.showMinMax, (v) => set({ showMinMax: v }))}
            {row('Zonsopgang / -ondergang', w.showSun, (v) => set({ showSun: v }))}
            {row('Kans op neerslag', w.showRainPct, (v) => set({ showRainPct: v }))}
            {row('Hoeveelheid neerslag', w.showRainMm, (v) => set({ showRainMm: v }))}
            <div style={{ ...S.rowLabel, padding: '8px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                Bron: open-meteo.com.
            </div>
        </div>
    );
}

function DatumSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const d = datumProps(widget);
    const set = (patch: Partial<DatumProps>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });
    const row = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
        <div style={S.row}>
            <span style={S.rowLabel}>{label}</span>
            <Switch checked={checked} onChange={onChange} aria-label={label} />
        </div>
    );
    return (
        <div>
            <div style={S.sectionLabel}>Weergave</div>
            {row('Weekdag', d.showWeekday, (v) => set({ showWeekday: v }))}
            {row('Datum', d.showDate, (v) => set({ showDate: v }))}
            {row('Tijd (live)', d.showTime, (v) => set({ showTime: v }))}
            {d.showTime && row('Seconden', d.showSeconds, (v) => set({ showSeconds: v }))}
            <div style={S.sectionLabel}>Kleur</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {Object.entries(DATUM_COLORS).map(([key, c]) => (
                    <button key={key} type="button" aria-label={`Kleur ${key}`} title={key}
                        onClick={() => set({ color: key })}
                        style={{
                            width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer',
                            background: c.text, border: '2px solid var(--bg-panel)',
                            outline: d.color === key ? '3px solid var(--accent-purple)' : 'none',
                        }} />
                ))}
            </div>
        </div>
    );
}

function WerksymbolenSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const p = werksymbolenProps(widget);
    const set = (patch: Record<string, unknown>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });
    const toggleMode = (key: string) => {
        const next = p.enabled.includes(key) ? p.enabled.filter(k => k !== key) : [...p.enabled, key];
        if (next.length) set({ enabled: next });
    };
    const row = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
        <div style={S.row}>
            <span style={S.rowLabel}>{label}</span>
            <Switch checked={checked} onChange={onChange} aria-label={label} />
        </div>
    );
    return (
        <div>
            <div style={S.sectionLabel}>Layout</div>
            {row('Verticaal', p.vertical, (v) => set({ vertical: v }))}
            {row('Enkel icoon', p.iconOnly, (v) => set({ iconOnly: v }))}
            <div style={S.sectionLabel}>Zichtbare symbolen</div>
            {WERKSYMBOLEN.map(m => row(m.label, p.enabled.includes(m.key), () => toggleMode(m.key)))}
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
    textInput: {
        flex: 1, minWidth: 0, height: '36px', padding: '0 10px', borderRadius: '8px',
        border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)',
        fontSize: '13px', outline: 'none',
    } as React.CSSProperties,
    smallBtn: {
        display: 'inline-flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 12px',
        borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent',
        color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer',
    } as React.CSSProperties,
};
