import { useId, useState, type ReactNode } from 'react';
import { CaretUp, CaretDown, Trash, Plus } from '@phosphor-icons/react';
import Switch from '../../components/ui/Switch';
import { useBoardStore } from '../useBoardStore';
import { ACCENT_PALETTE, FONT_SIZES, colorName, isHex, type FontSizeKey } from './baseProps';
import { loadWidgetDefaults, saveWidgetDefaults, clearWidgetDefaults, resetProps } from './widgetDefaults';
import { TITLE_DEFAULTS } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

// The shared controls kit for every board ⚙ panel: same tokens and tiers as the sheet
// Inspector (sentence-case section titles, muted labels, .seg-group segments, Switch).
// Every control is a real button / input, so Tab + Enter/Space reach all of it.

export function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section style={S.section} aria-label={title}>
            <h3 style={S.sectionTitle}>{title}</h3>
            {children}
        </section>
    );
}

export function Hint({ children }: { children: ReactNode }) {
    return <p style={S.hint}>{children}</p>;
}

// Label left, control right; `stacked` puts a wide control (list, slider) under the label.
export function Row({ label, children, stacked, htmlFor }: { label: ReactNode; children: ReactNode; stacked?: boolean; htmlFor?: string }) {
    return (
        <div style={stacked ? S.rowStacked : S.row}>
            <label style={S.rowLabel} htmlFor={htmlFor}>{label}</label>
            {children}
        </div>
    );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div style={S.row}>
            <span style={S.rowLabel}>{label}</span>
            <Switch checked={checked} onChange={onChange} aria-label={label} />
        </div>
    );
}

export function Segmented<T extends string | number>({ label, value, options, onChange }: {
    label?: string; value: T; options: ReadonlyArray<{ value: T; label: string }>; onChange: (v: T) => void;
}) {
    return (
        <div style={S.rowStacked}>
            {label && <span style={S.rowLabel}>{label}</span>}
            <div className="seg-group" role="group" aria-label={label} style={{ width: '100%' }}>
                {options.map(o => (
                    <button key={String(o.value)} type="button" className="seg-btn" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function Slider({ label, value, min, max, step = 1, onChange, format }: {
    label: string; value: number; min: number; max: number; step?: number;
    onChange: (v: number) => void; format?: (v: number) => string;
}) {
    const id = useId();
    return (
        <div style={S.rowStacked}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label style={S.rowLabel} htmlFor={id}>{label}</label>
                <span style={S.readout} aria-hidden="true">{format ? format(value) : value}</span>
            </div>
            <input id={id} type="range" min={min} max={max} step={step} value={value} style={{ width: '100%', accentColor: 'var(--accent)' }}
                aria-valuetext={format ? format(value) : String(value)}
                onChange={(e) => onChange(Number(e.target.value))} />
        </div>
    );
}

export function TextField({ label, value, onChange, placeholder, type = 'text' }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: 'text' | 'date';
}) {
    const id = useId();
    return (
        <div style={S.rowStacked}>
            <label style={S.rowLabel} htmlFor={id}>{label}</label>
            <input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={S.input} />
        </div>
    );
}

export function TextArea({ label, value, onChange, placeholder, rows = 5 }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
    const id = useId();
    return (
        <div style={S.rowStacked}>
            <label style={S.rowLabel} htmlFor={id}>{label}</label>
            <textarea id={id} value={value} placeholder={placeholder} rows={rows} onChange={(e) => onChange(e.target.value)} style={S.area} />
        </div>
    );
}

export function Button({ children, onClick, danger, pressed, label }: {
    children: ReactNode; onClick: () => void; danger?: boolean; pressed?: boolean; label?: string;
}) {
    return (
        <button type="button" className="ui-hover" onClick={onClick} aria-pressed={pressed} aria-label={label}
            style={{ ...S.btn, ...(danger ? S.btnDanger : {}), ...(pressed ? S.btnOn : {}) }}>
            {children}
        </button>
    );
}

export function ButtonRow({ children }: { children: ReactNode }) {
    return <div style={S.btnRow}>{children}</div>;
}

// Palette swatches + a custom colour; null = the widget's own colour ("Standaard").
export function ColorSwatches({ label, value, onChange, noneLabel = 'Standaard', compact }: {
    label: string; value: string | null; onChange: (v: string | null) => void; noneLabel?: string; compact?: boolean;
}) {
    const [hex, setHex] = useState(value ?? '');
    const size = compact ? 24 : 30;
    const dot = (bg: string, on: boolean): React.CSSProperties => ({
        width: size, height: size, borderRadius: '50%', cursor: 'pointer', padding: 0, flexShrink: 0,
        background: bg, border: '2px solid var(--bg-surface)',
        boxShadow: on ? '0 0 0 2px var(--accent)' : '0 0 0 1px var(--separator)',
    });
    const commitHex = (v: string) => {
        const h = v.startsWith('#') ? v : `#${v}`;
        if (isHex(h)) onChange(h.toLowerCase());
    };
    return (
        <div style={S.rowStacked}>
            {!compact && <span style={S.rowLabel}>{label}: <strong style={{ fontWeight: 600 }}>{value ? colorName(value) : noneLabel}</strong></span>}
            <div role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <button type="button" aria-pressed={value === null} aria-label={noneLabel} title={noneLabel} onClick={() => onChange(null)}
                    style={{ ...dot('var(--bg-surface-2)', value === null), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    ∅
                </button>
                {ACCENT_PALETTE.map(c => (
                    <button key={c.hex} type="button" aria-pressed={value?.toLowerCase() === c.hex} aria-label={c.name} title={c.name}
                        onClick={() => onChange(c.hex)} style={dot(c.hex, value?.toLowerCase() === c.hex)} />
                ))}
                {!compact && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <input type="color" aria-label="Eigen kleur kiezen" value={value ?? '#1e40af'}
                            onChange={(e) => { setHex(e.target.value); onChange(e.target.value); }}
                            style={{ width: size + 6, height: size + 4, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                        <input aria-label="Eigen kleur (hex)" value={hex} placeholder="#hex" maxLength={7}
                            onChange={(e) => setHex(e.target.value)}
                            onBlur={(e) => commitHex(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitHex((e.target as HTMLInputElement).value); }}
                            style={{ ...S.input, width: '84px', height: '30px' }} />
                    </span>
                )}
            </div>
        </div>
    );
}

// Compact per-item colour for a ListEditor row (place it in an ItemRow): a dot that opens
// the palette on its own line below the row.
export function ColorDot({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button type="button" aria-expanded={open} aria-label={`${label}: ${colorName(value)}`} title={`${label}: ${colorName(value)}`} onClick={() => setOpen(!open)}
                style={{ width: '28px', height: '28px', marginTop: '2px', borderRadius: '50%', cursor: 'pointer', padding: 0, flexShrink: 0, border: '2px solid var(--bg-surface)', boxShadow: '0 0 0 1px var(--separator)', background: value ?? 'var(--bg-surface)' }} />
            {open && (
                <div style={{ flexBasis: '100%', order: 10 }}>
                    <ColorSwatches compact label={label} value={value} onChange={(v) => { onChange(v); setOpen(false); }} />
                </div>
            )}
        </>
    );
}

// One ListEditor row's controls side by side, wrapping (a ColorDot's palette takes a line).
export function ItemRow({ children }: { children: ReactNode }) {
    return <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 'var(--sp-1)' }}>{children}</div>;
}

export function FontSizeRow({ value, onChange, label = 'Tekstgrootte' }: { value: FontSizeKey; onChange: (v: FontSizeKey) => void; label?: string }) {
    return <Segmented label={label} value={value} onChange={onChange} options={FONT_SIZES.map(f => ({ value: f.key, label: f.label }))} />;
}

// Reorder / add / remove rows; each row's own editor comes from renderItem. `bulk` adds a
// "Plak een lijst" textarea (one item per line) for long lists such as a class list.
export function ListEditor<T>({ label, items, onChange, renderItem, newItem, addLabel = 'Toevoegen', itemName, bulk, min = 0 }: {
    label: string;
    items: T[];
    onChange: (items: T[]) => void;
    renderItem: (item: T, update: (next: T) => void, index: number) => ReactNode;
    newItem: () => T;
    addLabel?: string;
    itemName?: (item: T, index: number) => string;
    bulk?: { toText: (items: T[]) => string; fromText: (text: string) => T[]; label?: string };
    min?: number;
}) {
    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const name = (it: T, i: number) => itemName?.(it, i) ?? `item ${i + 1}`;
    const move = (i: number, d: -1 | 1) => {
        const j = i + d;
        if (j < 0 || j >= items.length) return;
        const next = [...items];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };
    return (
        <div style={S.rowStacked}>
            <span style={S.rowLabel}>{label} ({items.length})</span>
            {bulkOpen && bulk ? (
                <>
                    <textarea aria-label={bulk.label ?? 'Plak een lijst'} value={bulkText} rows={8} onChange={(e) => setBulkText(e.target.value)} style={S.area}
                        placeholder="Eén per lijn" />
                    <ButtonRow>
                        <Button onClick={() => { onChange(bulk.fromText(bulkText)); setBulkOpen(false); }}>Lijst overnemen</Button>
                        <Button onClick={() => setBulkOpen(false)}>Annuleer</Button>
                    </ButtonRow>
                </>
            ) : (
                <>
                    <ol style={S.list}>
                        {items.map((it, i) => (
                            <li key={i} style={S.listRow}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {renderItem(it, (next) => onChange(items.map((x, k) => (k === i ? next : x))), i)}
                                </div>
                                <div style={S.listBtns}>
                                    <button type="button" className="ui-hover" style={{ ...S.iconBtn, opacity: i === 0 ? 0.35 : 1 }} disabled={i === 0} aria-label={`${name(it, i)} omhoog`} title="Omhoog" onClick={() => move(i, -1)}><CaretUp size={14} /></button>
                                    <button type="button" className="ui-hover" style={{ ...S.iconBtn, opacity: i === items.length - 1 ? 0.35 : 1 }} disabled={i === items.length - 1} aria-label={`${name(it, i)} omlaag`} title="Omlaag" onClick={() => move(i, 1)}><CaretDown size={14} /></button>
                                    <button type="button" className="ui-hover" style={{ ...S.iconBtn, color: 'var(--danger)' }} disabled={items.length <= min} aria-label={`${name(it, i)} verwijderen`} title="Verwijderen"
                                        onClick={() => onChange(items.filter((_, k) => k !== i))}><Trash size={14} /></button>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <ButtonRow>
                        <Button onClick={() => onChange([...items, newItem()])}><Plus size={14} /> {addLabel}</Button>
                        {bulk && <Button onClick={() => { setBulkText(bulk.toText(items)); setBulkOpen(true); }}>{bulk.label ?? 'Plak een lijst'}</Button>}
                    </ButtonRow>
                </>
            )}
        </div>
    );
}

// A one-line text input sized for a ListEditor row.
export function ItemInput({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string }) {
    return <input aria-label={label} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ ...S.input, height: '32px', width: '100%', flex: '1 1 0' }} />;
}

// "Standaard": back to the teacher's saved standaard (or the factory look); asks once, since
// widget edits have no undo.
export function ResetRow({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const [confirm, setConfirm] = useState(false);
    const mine = loadWidgetDefaults(widget.kind) !== null;
    return confirm ? (
        <div style={S.rowStacked}>
            <span style={S.rowLabel}>Alle instellingen van deze kaart terugzetten{mine ? ' naar jouw standaard' : ''}?</span>
            <ButtonRow>
                <Button danger onClick={() => { updateWidget(widget.id, { props: resetProps(widget.kind, widget.props) }); setConfirm(false); }}>Ja, terugzetten</Button>
                <Button onClick={() => setConfirm(false)}>Nee</Button>
            </ButtonRow>
        </div>
    ) : (
        <ButtonRow>
            <Button onClick={() => setConfirm(true)}>{mine ? 'Terug naar mijn standaard' : 'Standaard herstellen'}</Button>
        </ButtonRow>
    );
}

export function SaveDefaultRow({ widget }: { widget: BoardWidget }) {
    const [saved, setSaved] = useState(() => loadWidgetDefaults(widget.kind) !== null);
    const [msg, setMsg] = useState<string | null>(null);
    const kindName = (TITLE_DEFAULTS[widget.kind] ?? 'widget').toLowerCase();
    return (
        <div style={S.rowStacked}>
            <ButtonRow>
                <Button onClick={() => {
                    const ok = saveWidgetDefaults(widget.kind, widget.props);
                    setSaved(ok || saved);
                    setMsg(ok ? `Nieuwe ${kindName}-kaarten starten zo.` : 'Kon niet bewaren (opslag vol?).');
                }}>Bewaar als mijn standaard</Button>
                {saved && <Button onClick={() => { clearWidgetDefaults(widget.kind); setSaved(false); setMsg('Je standaard is vergeten.'); }}>Vergeet</Button>}
            </ButtonRow>
            <Hint>{msg ?? (saved ? `Nieuwe ${kindName}-kaarten starten met jouw standaard.` : `Bewaart deze instellingen voor elke nieuwe ${kindName}-kaart.`)}</Hint>
        </div>
    );
}

const S = {
    section: { padding: 'var(--sp-3) 0', borderBottom: '1px solid var(--separator)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' } as React.CSSProperties,
    sectionTitle: { margin: 0, color: 'var(--text-main)', fontSize: 'var(--text-md)', fontWeight: 600, letterSpacing: '-0.01em' } as React.CSSProperties,
    hint: { margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.4 } as React.CSSProperties,
    row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', minHeight: '32px' } as React.CSSProperties,
    rowStacked: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' } as React.CSSProperties,
    rowLabel: { fontSize: 'var(--text-sm)', color: 'var(--text-main)' } as React.CSSProperties,
    readout: { fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' } as React.CSSProperties,
    input: {
        boxSizing: 'border-box', height: '36px', padding: '0 10px', borderRadius: 'var(--radius-xs)',
        border: '1px solid var(--separator)', background: 'var(--bg-surface-2)', color: 'var(--text-main)',
        fontSize: 'var(--text-sm)', outline: 'none', minWidth: 0,
    } as React.CSSProperties,
    area: {
        width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: 'var(--sp-2)',
        borderRadius: 'var(--radius-xs)', border: '1px solid var(--separator)', background: 'var(--bg-surface-2)',
        color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-ui)', outline: 'none',
    } as React.CSSProperties,
    btnRow: { display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' } as React.CSSProperties,
    btn: {
        display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '34px', padding: '0 12px',
        // Longhands only: btnOn / btnDanger override borderColor, and React warns when a shorthand
        // and its longhand mix across re-renders.
        borderRadius: 'var(--radius-sm)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--separator)', background: 'var(--bg-surface)',
        color: 'var(--text-main)', fontSize: 'var(--text-sm)', cursor: 'pointer',
    } as React.CSSProperties,
    btnDanger: { borderColor: 'var(--danger)', color: 'var(--danger)' } as React.CSSProperties,
    btnOn: { borderColor: 'var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 } as React.CSSProperties,
    list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' } as React.CSSProperties,
    listRow: {
        display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-1)', padding: 'var(--sp-1)',
        borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-2)',
    } as React.CSSProperties,
    listBtns: { display: 'flex', gap: '2px', flexShrink: 0, paddingTop: '2px' } as React.CSSProperties,
    iconBtn: {
        width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: 'var(--radius-xs)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', padding: 0,
    } as React.CSSProperties,
};
