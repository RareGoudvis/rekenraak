import { X } from '@phosphor-icons/react';
import Switch from '../../components/ui/Switch';
import { useBoardStore } from '../useBoardStore';
import { dobbelProps, ademProps, positietabelProps, POSITIE_KOLOMMEN, breukvizProps, widgetTitle } from '../widgetSizing';
import { WIDGET_SETTINGS, type WidgetSettingsPanel } from '../settings/registry';
import BaselineSettings from '../settings/BaselineSettings';
import type { BoardWidget, WidgetKind } from '../boardTypes';

interface Props {
    widget: BoardWidget;   // selected non-exercise widget (klok, weer, …)
}

// Panels not yet moved to src/board/settings/ (groups B/C move theirs into the registry).
const LEGACY_SETTINGS: Partial<Record<WidgetKind, WidgetSettingsPanel>> = {
    timer: TimerSettings, dobbelsteen: DobbelSettings, adem: AdemSettings,
    positietabel: PositietabelSettings, honderdveld: HonderdveldSettings,
    breukviz: BreukvizSettings, mabmat: MabMatSettings,
};

// Settings flyout for non-exercise widgets (same chrome as the exercise inspector): the
// kind's own panel from the settings registry, then the baseline every kind shares.
export default function WidgetInspector({ widget }: Props) {
    const selectWidget = useBoardStore((s) => s.selectWidget);
    const Panel = WIDGET_SETTINGS[widget.kind] ?? LEGACY_SETTINGS[widget.kind];

    return (
        <div style={S.panel} data-widget-inspector>
            <div style={S.head}>
                <span style={S.title}>Instellingen · {widgetTitle(widget)}</span>
                <button type="button" className="ui-hover" style={S.closeBtn} aria-label="Sluiten" onClick={() => selectWidget(null)}>
                    <X size={18} />
                </button>
            </div>
            <div style={S.scroll}>
                {Panel && <Panel widget={widget} />}
                <BaselineSettings widget={widget} />
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
        position: 'absolute', top: '12px', right: '12px', maxHeight: 'calc(100% - 24px)', width: '340px',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '14px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)', zIndex: 50, overflow: 'hidden',
    } as React.CSSProperties,
    head: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderBottom: '1px solid var(--border-color)', flexShrink: 0,
    } as React.CSSProperties,
    title: { fontSize: '14px', fontWeight: 600, fontFamily: "'Azeret Mono', monospace", color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 } as React.CSSProperties,
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
