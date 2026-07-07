import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import Switch from '../../components/ui/Switch';
import { useBoardStore } from '../useBoardStore';
import { klokProps, type KlokProps, weerProps, type WeerProps, NAMES_KEY, datumProps, type DatumProps, DATUM_COLORS, werksymbolenProps, WERKSYMBOLEN, dobbelProps, ademProps, groepjesProps, getallenlijnProps, positietabelProps, POSITIE_KOLOMMEN, breukvizProps } from '../widgetSizing';
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
                {widget.kind === 'timer' && <TimerSettings widget={widget} />}
                {widget.kind === 'dobbelsteen' && <DobbelSettings widget={widget} />}
                {widget.kind === 'adem' && <AdemSettings widget={widget} />}
                {widget.kind === 'groepjes' && <GroepjesSettings widget={widget} />}
                {widget.kind === 'checklist' && <ChecklistSettings widget={widget} />}
                {widget.kind === 'stappenplan' && <StappenplanSettings widget={widget} />}
                {widget.kind === 'getallenlijn' && <GetallenlijnSettings widget={widget} />}
                {widget.kind === 'positietabel' && <PositietabelSettings widget={widget} />}
                {widget.kind === 'honderdveld' && <HonderdveldSettings widget={widget} />}
                {widget.kind === 'breukviz' && <BreukvizSettings widget={widget} />}
                {widget.kind === 'mabmat' && <MabMatSettings widget={widget} />}
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

function TimerSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const dur = Math.max(5, Number(widget.props?.durationSec ?? 300));
    const color = String(widget.props?.color ?? '#16a34a');
    const set = (patch: Record<string, unknown>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });
    const COLORS = ['#16a34a', '#1d4ed8', '#dc2626', '#ea580c', '#7c3aed'];
    return (
        <div>
            <div style={S.sectionLabel}>Duur ({Math.floor(dur / 60)}:{String(dur % 60).padStart(2, '0')})</div>
            <input type="range" min={30} max={3600} step={30} value={dur} style={{ width: '100%' }}
                onChange={(e) => set({ durationSec: Number(e.target.value) })} />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '4px 0' }}>
                {[60, 120, 300, 600, 900].map(s => (
                    <button key={s} type="button" className="ui-hover" style={S.smallBtn} onClick={() => set({ durationSec: s })}>
                        {s / 60} min
                    </button>
                ))}
            </div>
            <div style={S.sectionLabel}>Kleur</div>
            <div style={{ display: 'flex', gap: '6px' }}>
                {COLORS.map(c => (
                    <button key={c} type="button" aria-label={`Kleur ${c}`} onClick={() => set({ color: c })}
                        style={{ width: '34px', height: '34px', borderRadius: '50%', background: c, cursor: 'pointer', border: '2px solid var(--bg-panel)', outline: color === c ? '3px solid var(--accent-purple)' : 'none' }} />
                ))}
            </div>
        </div>
    );
}

function DobbelSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const p = dobbelProps(widget);
    const rawCustom = typeof widget.props?.custom === 'string' ? widget.props.custom : '';
    const set = (patch: Record<string, unknown>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });
    return (
        <div>
            <div style={S.sectionLabel}>Aantal dobbelstenen ({p.count})</div>
            <div className="seg-group">
                {[1, 2, 3].map(n => (
                    <button key={n} type="button" className="seg-btn" aria-pressed={p.count === n} onClick={() => set({ count: n })}>{n}</button>
                ))}
            </div>
            <div style={S.sectionLabel}>Zijden ({p.sides})</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[4, 6, 8, 10, 12, 20].map(n => (
                    <button key={n} type="button" className="ui-hover"
                        style={{ ...S.smallBtn, ...(p.sides === n && !p.custom.length ? { borderColor: 'var(--accent-purple)', background: 'var(--bg-active)' } : {}) }}
                        onClick={() => set({ sides: n, custom: '' })}>{n}</button>
                ))}
            </div>
            <div style={S.sectionLabel}>Eigen zijden (één per lijn; leeg = getallen)</div>
            <textarea value={rawCustom} placeholder={'rood\nblauw\ngeel'} onChange={(e) => set({ custom: e.target.value })}
                style={{ width: '100%', minHeight: '110px', resize: 'vertical', boxSizing: 'border-box', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px', fontSize: '13px', fontFamily: "'Azeret Mono', monospace", outline: 'none' }} />
        </div>
    );
}

function AdemSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const p = ademProps(widget);
    const set = (patch: Record<string, unknown>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });
    const slider = (label: string, value: number, key: string, min: number) => (
        <div>
            <div style={S.sectionLabel}>{label} ({value}s)</div>
            <input type="range" min={min} max={10} step={1} value={value} style={{ width: '100%' }}
                onChange={(e) => set({ [key]: Number(e.target.value) })} />
        </div>
    );
    return (
        <div>
            {slider('Adem in', p.inSec, 'inSec', 1)}
            {slider('Houd vast', p.holdSec, 'holdSec', 0)}
            {slider('Adem uit', p.outSec, 'outSec', 1)}
            <div style={S.sectionLabel}>Presets</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" className="ui-hover" style={S.smallBtn} onClick={() => set({ inSec: 4, holdSec: 4, outSec: 4 })}>4-4-4</button>
                <button type="button" className="ui-hover" style={S.smallBtn} onClick={() => set({ inSec: 4, holdSec: 7, outSec: 8 })}>4-7-8</button>
                <button type="button" className="ui-hover" style={S.smallBtn} onClick={() => set({ inSec: 3, holdSec: 0, outSec: 5 })}>3-0-5</button>
            </div>
        </div>
    );
}

const areaStyle: React.CSSProperties = {
    width: '100%', minHeight: '90px', resize: 'vertical', boxSizing: 'border-box',
    background: 'var(--bg-input)', color: 'var(--text-main)',
    border: '1px solid var(--border-color)', borderRadius: '10px',
    padding: '8px', fontSize: '13px', fontFamily: "'Azeret Mono', monospace", outline: 'none',
};

function GroepjesSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const g = groepjesProps(widget);
    const set = (patch: Record<string, unknown>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });
    const [names, setNames] = useState(() => localStorage.getItem(NAMES_KEY) ?? '');
    const saveNames = (v: string) => { setNames(v); localStorage.setItem(NAMES_KEY, v); };
    return (
        <div>
            <div style={S.sectionLabel}>Verdelen op</div>
            <div className="seg-group">
                <button type="button" className="seg-btn" aria-pressed={g.mode === 'aantal'} onClick={() => set({ mode: 'aantal' })}>Aantal groepen</button>
                <button type="button" className="seg-btn" aria-pressed={g.mode === 'grootte'} onClick={() => set({ mode: 'grootte' })}>Groepsgrootte</button>
            </div>
            {g.mode === 'aantal' ? (
                <>
                    <div style={S.sectionLabel}>Aantal groepen ({g.groups})</div>
                    <input type="range" min={2} max={10} step={1} value={g.groups} style={{ width: '100%' }} onChange={(e) => set({ groups: Number(e.target.value) })} />
                </>
            ) : (
                <>
                    <div style={S.sectionLabel}>Leerlingen per groep ({g.size})</div>
                    <input type="range" min={2} max={8} step={1} value={g.size} style={{ width: '100%' }} onChange={(e) => set({ size: Number(e.target.value) })} />
                </>
            )}
            <div style={S.sectionLabel}>Moeten samen (Naam, Naam per lijn)</div>
            <textarea value={g.mustTogether} placeholder={'Emma, Noah'} onChange={(e) => set({ mustTogether: e.target.value })} style={areaStyle} />
            <div style={S.sectionLabel}>Mogen niet samen</div>
            <textarea value={g.cannotTogether} placeholder={'Lina, Sem'} onChange={(e) => set({ cannotTogether: e.target.value })} style={areaStyle} />
            <div style={S.sectionLabel}>Klaslijst (gedeeld met namenkiezer)</div>
            <textarea value={names} placeholder={'Eén naam per lijn'} onChange={(e) => saveNames(e.target.value)} style={{ ...areaStyle, minHeight: '140px' }} />
        </div>
    );
}

function ChecklistSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const items = typeof widget.props?.items === 'string' ? widget.props.items : 'boek klaar\npotlood klaar\naan de slag!';
    const round = widget.props?.round === true;
    const set = (patch: Record<string, unknown>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });
    return (
        <div>
            <div style={S.sectionLabel}>Items (één per lijn)</div>
            <textarea value={items} onChange={(e) => set({ items: e.target.value, checked: [] })} style={{ ...areaStyle, minHeight: '140px' }} />
            <div style={S.sectionLabel}>Vinkstijl</div>
            <div className="seg-group">
                <button type="button" className="seg-btn" aria-pressed={!round} onClick={() => set({ round: false })}>Vierkant</button>
                <button type="button" className="seg-btn" aria-pressed={round} onClick={() => set({ round: true })}>Rond</button>
            </div>
            <button type="button" className="ui-hover" style={{ ...S.smallBtn, marginTop: '10px' }} onClick={() => set({ checked: [] })}>
                Alles afvinken ongedaan maken
            </button>
        </div>
    );
}

function StappenplanSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const text = typeof widget.props?.text === 'string' ? widget.props.text : '';
    const numbered = widget.props?.numbered !== false;
    const colorKey = typeof widget.props?.color === 'string' ? widget.props.color : 'blauw';
    const set = (patch: Record<string, unknown>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });
    return (
        <div>
            <div style={S.sectionLabel}>Stappen (# = titel, ## = subtitel)</div>
            <textarea value={text} placeholder={'# Zo werk je\neerste stap\ntweede stap'} onChange={(e) => set({ text: e.target.value })} style={{ ...areaStyle, minHeight: '160px' }} />
            <div style={S.row}>
                <span style={S.rowLabel}>Nummering</span>
                <Switch checked={numbered} onChange={(v) => set({ numbered: v })} aria-label="Nummering" />
            </div>
            <div style={S.sectionLabel}>Kleur</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {Object.entries(DATUM_COLORS).map(([key, c]) => (
                    <button key={key} type="button" aria-label={`Kleur ${key}`} title={key} onClick={() => set({ color: key })}
                        style={{ width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', background: c.text, border: '2px solid var(--bg-panel)', outline: colorKey === key ? '3px solid var(--accent-purple)' : 'none' }} />
                ))}
            </div>
        </div>
    );
}

function GetallenlijnSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const g = getallenlijnProps(widget);
    const set = (patch: Record<string, unknown>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });
    const numInput = (label: string, value: number, key: string) => (
        <div style={S.row}>
            <span style={S.rowLabel}>{label}</span>
            <input type="number" value={value} onChange={(e) => set({ [key]: Number(e.target.value) })}
                style={{ ...S.textInput, flex: 'none', width: '90px' }} />
        </div>
    );
    return (
        <div>
            <div style={S.sectionLabel}>Bereik</div>
            {numInput('Van', g.min, 'min')}
            {numInput('Tot', g.max, 'max')}
            <div style={S.sectionLabel}>Aantal tekens ({g.ticks})</div>
            <input type="range" min={2} max={21} step={1} value={g.ticks} style={{ width: '100%' }} onChange={(e) => set({ ticks: Number(e.target.value) })} />
            <div style={S.sectionLabel}>Labels</div>
            <div className="seg-group">
                {(['alles', 'uiteinden', 'geen'] as const).map(l => (
                    <button key={l} type="button" className="seg-btn" aria-pressed={g.labels === l} onClick={() => set({ labels: l })}>{l}</button>
                ))}
            </div>
        </div>
    );
}

function PositietabelSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const p = positietabelProps(widget);
    const set = (patch: Record<string, unknown>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });
    const toggleCol = (key: string) => {
        const next = p.columns.includes(key) ? p.columns.filter(c => c !== key) : [...p.columns, key];
        if (next.length) set({ columns: next });
    };
    return (
        <div>
            <div style={S.sectionLabel}>Kolommen</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {POSITIE_KOLOMMEN.map(k => (
                    <button key={k.key} type="button" className="ui-hover"
                        style={{ ...S.smallBtn, minWidth: '44px', justifyContent: 'center', ...(p.columns.includes(k.key) ? { borderColor: 'var(--accent-purple)', background: 'var(--bg-active)', fontWeight: 700 } : {}) }}
                        onClick={() => toggleCol(k.key)}>{k.label}</button>
                ))}
            </div>
            <div style={S.sectionLabel}>Rijen ({p.rows})</div>
            <input type="range" min={1} max={8} step={1} value={p.rows} style={{ width: '100%' }} onChange={(e) => set({ rows: Number(e.target.value) })} />
        </div>
    );
}

function HonderdveldSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const start = Number(widget.props?.start ?? 1);
    const set = (patch: Record<string, unknown>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });
    return (
        <div>
            <div style={S.sectionLabel}>Startgetal</div>
            <div className="seg-group">
                <button type="button" className="seg-btn" aria-pressed={start === 1} onClick={() => set({ start: 1 })}>1 – 100</button>
                <button type="button" className="seg-btn" aria-pressed={start === 0} onClick={() => set({ start: 0 })}>0 – 99</button>
            </div>
            <div style={{ ...S.rowLabel, padding: '8px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                Tik op een vakje om te kleuren (geel → groen → blauw → rood → weg).
            </div>
            <button type="button" className="ui-hover" style={S.smallBtn} onClick={() => set({ marks: {} })}>
                Wis alle markeringen
            </button>
        </div>
    );
}

function BreukvizSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const b = breukvizProps(widget);
    const set = (patch: Record<string, unknown>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });
    return (
        <div>
            <div style={S.sectionLabel}>Vorm</div>
            <div className="seg-group">
                {(['cirkel', 'pizza', 'lijn'] as const).map(v => (
                    <button key={v} type="button" className="seg-btn" aria-pressed={b.shape === v} onClick={() => set({ shape: v })}>{v}</button>
                ))}
            </div>
            <div style={S.row}>
                <span style={S.rowLabel}>Enkel stambreuken (1/n)</span>
                <Switch checked={b.stambreuk} onChange={(v) => set({ stambreuk: v, ...(v ? { n: 1 } : {}) })} aria-label="Enkel stambreuken" />
            </div>
            <div style={S.sectionLabel}>Noemer ({b.d})</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[2, 3, 4, 5, 6, 8, 10, 12].map(d => (
                    <button key={d} type="button" className="ui-hover"
                        style={{ ...S.smallBtn, minWidth: '40px', justifyContent: 'center', ...(b.d === d ? { borderColor: 'var(--accent-purple)', background: 'var(--bg-active)', fontWeight: 700 } : {}) }}
                        onClick={() => set({ d, n: Math.min(b.n, d) })}>{d}</button>
                ))}
            </div>
            {!b.stambreuk && (
                <>
                    <div style={S.sectionLabel}>Teller ({b.n})</div>
                    <input type="range" min={1} max={b.d} step={1} value={b.n} style={{ width: '100%' }} onChange={(e) => set({ n: Number(e.target.value) })} />
                </>
            )}
        </div>
    );
}

function MabMatSettings({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const style = String(widget.props?.mabStyle ?? 'mab-color');
    const showTotal = widget.props?.showTotal === true;
    const set = (patch: Record<string, unknown>) => updateWidget(widget.id, { props: { ...widget.props, ...patch } });
    return (
        <div>
            <div style={S.sectionLabel}>Stijl</div>
            <div className="seg-group">
                <button type="button" className="seg-btn" aria-pressed={style === 'mab-color'} onClick={() => set({ mabStyle: 'mab-color' })}>Realistisch</button>
                <button type="button" className="seg-btn" aria-pressed={style === 'mab-bw'} onClick={() => set({ mabStyle: 'mab-bw' })}>Zwart-wit</button>
                <button type="button" className="seg-btn" aria-pressed={style === 'symbolic'} onClick={() => set({ mabStyle: 'symbolic' })}>Symbolisch</button>
            </div>
            <div style={S.row}>
                <span style={S.rowLabel}>Toon totaal</span>
                <Switch checked={showTotal} onChange={(v) => set({ showTotal: v })} aria-label="Toon totaal" />
            </div>
            <button type="button" className="ui-hover" style={S.smallBtn} onClick={() => set({ d: 0, h: 0, t: 0, e: 0 })}>
                Alles wissen
            </button>
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
