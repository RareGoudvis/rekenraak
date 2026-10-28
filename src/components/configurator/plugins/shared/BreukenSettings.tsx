import type { CSSProperties, ReactNode } from 'react';
import { Lock } from '@phosphor-icons/react';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';
import SettingLabel from '../SettingLabel';
import PopupSelect from '../../../ui/PopupSelect';
import { NOEMER_CEILING, noemerOptions } from '../../../../config/numberRanges';

// The one "Breuken" block every fraction leaf mounts (UX review 2026-10-28): one order
// (noemer → teller → soorten → schrijfwijze → leaf extras), one vocabulary, one control per
// row. The block is controlled: each leaf's Config is the adapter that maps these rows onto
// its own saved keys, so no persisted key changed and the block itself knows no typeId.

export type NoemerRow =
    // "Noemer van [▾] tot [▾]" over the one noemer list, clamped min ≤ max.
    | { shape: 'range'; min: number; max: number; ceiling?: number; onChange: (min: number, max: number) => void }
    // "Hoogste noemer [▾]": leaves that only cap the noemer.
    | { shape: 'max'; value: number; ceiling?: number; onChange: (v: number) => void }
    // One exact noemer, the sprong 1/n of a getallenas / getallenrij.
    | { shape: 'step'; value: number; options: readonly number[]; onChange: (v: number) => void }
    // A fixed set of noemers (verbanden: only terminating ones).
    | { shape: 'set'; values: readonly number[]; options: readonly number[]; onChange: (v: number[]) => void; info?: string };

export type FractionKind = 'stam' | 'echt' | 'onecht';
export interface KindPill {
    kind: FractionKind;
    on: boolean;
    // Inherent to the leaf: shown on, cannot be switched off.
    locked?: boolean;
    onToggle?: (next: boolean) => void;
}

// 'none' = geen gemengde getallen, 'some' = ook (mixed with plain breuken), 'all' = alleen.
export type MixedMode = 'none' | 'some' | 'all';
export interface MixedRow {
    label?: string;
    value: MixedMode;
    // The states the leaf's generator can draw (hr + − offers none / all only).
    options?: readonly MixedMode[];
    // Inherent to the leaf (gemengd ↔ breuk): shown, not editable.
    locked?: boolean;
    onChange?: (v: MixedMode) => void;
}

export interface NotationRow { label: string; on: boolean; onChange: (v: boolean) => void }

export interface BreukenSettingsProps {
    // null = no heading (the block sits under a heading of its own, e.g. a vergelijken side).
    title?: string | null;
    info?: string;
    noemer?: NoemerRow;
    teller?: { value: number; onChange: (v: number) => void };
    // A FractionMaxField-style picture that replaces the noemer + teller rows (gemengd ↔ breuk).
    picture?: ReactNode;
    kinds?: KindPill[];
    kindsHint?: string;
    mixed?: MixedRow | MixedRow[];
    notation?: NotationRow[];
    // Leaf extras (Richting, Doelnoemer, Voorinstelling, …), rendered last.
    children?: ReactNode;
}

const KIND_LABEL: Record<FractionKind, string> = {
    stam: 'Stambreuken',
    echt: 'Echte breuken',
    onecht: 'Onechte breuken',
};

const MIXED_LABEL: Record<MixedMode, string> = { none: 'Geen', some: 'Ook', all: 'Alleen' };
const MIXED_ARIA: Record<MixedMode, string> = {
    none: 'Geen gemengde getallen', some: 'Ook gemengde getallen', all: 'Alleen gemengde getallen',
};
const ALL_MIXED: readonly MixedMode[] = ['none', 'some', 'all'];

// A saved value outside the list (an old sheet, a preset's 24 or 100) stays visible as an
// extra option instead of being floored, so opening the panel never changes the sheet.
function noemerChoices(ceiling: number | undefined, ...current: number[]) {
    const list = noemerOptions(ceiling ?? NOEMER_CEILING);
    const extra = current.filter(v => Number.isFinite(v) && !list.includes(v));
    return [...new Set([...list, ...extra])].sort((a, b) => a - b).map(v => ({ value: v, label: String(v) }));
}

function NoemerControl({ row }: { row: NoemerRow }) {
    if (row.shape === 'range') {
        const options = noemerChoices(row.ceiling, row.min, row.max);
        return (
            <div style={styles.section}>
                <SettingLabel text="Noemer" info="Kleinste en grootste noemer van de breuken." />
                <div style={rangeRow}>
                    <span style={styles.miniLabel}>van</span>
                    <div style={selectCell}>
                        <PopupSelect value={row.min} options={options} ariaLabel="Noemer van"
                            onChange={(v) => row.onChange(v, Math.max(v, row.max))} />
                    </div>
                    <span style={styles.miniLabel}>tot</span>
                    <div style={selectCell}>
                        <PopupSelect value={row.max} options={options} ariaLabel="Noemer tot"
                            onChange={(v) => row.onChange(Math.min(row.min, v), v)} />
                    </div>
                </div>
            </div>
        );
    }
    if (row.shape === 'max') {
        return (
            <div style={styles.section}>
                <SettingLabel text="Hoogste noemer" info="De grootste noemer die mag voorkomen." />
                <div style={selectCell}>
                    <PopupSelect value={row.value} options={noemerChoices(row.ceiling, row.value)} ariaLabel="Hoogste noemer" onChange={row.onChange} />
                </div>
            </div>
        );
    }
    if (row.shape === 'step') {
        // A saved sprong outside the pills (an old typed 6) keeps a lit pill of its own.
        const options = row.options.includes(row.value) ? row.options : [...row.options, row.value].sort((a, b) => a - b);
        return (
            <div style={styles.section}>
                <SettingLabel text="Noemer (sprong 1/n)" info="De afstand tussen twee getallen: één n-de." />
                <div style={styles.buttonGroup}>
                    {options.map(d => (
                        <button key={d} type="button" onClick={() => row.onChange(d)} aria-pressed={row.value === d} style={styles.radioBtn(row.value === d)}>1/{d}</button>
                    ))}
                </div>
            </div>
        );
    }
    const toggle = (d: number) => {
        const next = row.values.includes(d) ? row.values.filter(x => x !== d) : [...row.values, d];
        if (next.length) row.onChange(next);
    };
    return (
        <div style={styles.section}>
            <SettingLabel text="Noemers" info={row.info ?? 'Welke noemers mogen voorkomen.'} />
            <div style={styles.buttonGroup}>
                {row.options.map(d => (
                    <button key={d} type="button" onClick={() => toggle(d)} aria-pressed={row.values.includes(d)} style={styles.pill(row.values.includes(d))}>{d}</button>
                ))}
            </div>
        </div>
    );
}

function MixedControl({ row }: { row: MixedRow }) {
    const options = row.options ?? ALL_MIXED;
    return (
        <div style={{ marginTop: 'var(--sp-3)' }}>
            <span style={{ ...styles.label, marginBottom: 'var(--sp-2)' }}>{row.label ?? 'Gemengde getallen (bv. 1 1/4)'}</span>
            <div style={{ display: 'flex', gap: '4px' }} role="group" aria-label={row.label ?? 'Gemengde getallen'}>
                {options.map(m => {
                    const active = row.value === m;
                    return (
                        <button key={m} type="button" aria-pressed={active} aria-label={MIXED_ARIA[m]}
                            disabled={row.locked && !active}
                            onClick={() => !row.locked && row.onChange?.(m)}
                            style={{ ...styles.bridgeBtn(active), fontSize: 'var(--text-sm)', cursor: row.locked ? 'default' : 'pointer', opacity: row.locked && !active ? 0.5 : 1 }}>
                            {MIXED_LABEL[m]}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function BreukenSettings({ title = 'Breuken', info, noemer, teller, picture, kinds, kindsHint, mixed, notation, children }: BreukenSettingsProps) {
    const mixedRows = mixed ? (Array.isArray(mixed) ? mixed : [mixed]) : [];
    const shownKinds = kinds ?? [];
    const onCount = shownKinds.filter(k => k.on).length;
    return (
        <div data-breuken-settings="">
            {title && <SettingLabel text={title} info={info} group />}

            {picture ? <div style={styles.section}>{picture}</div> : (
                <>
                    {noemer && <NoemerControl row={noemer} />}
                    {teller && (
                        <div style={styles.section}>
                            <SettingLabel text="Hoogste teller" info="De grootste teller die mag voorkomen." />
                            <input type="number" min={1} value={teller.value} aria-label="Hoogste teller"
                                onChange={(e) => teller.onChange(Math.max(1, Math.round(Number(e.target.value)) || 1))}
                                style={numberField} />
                        </div>
                    )}
                </>
            )}

            {(shownKinds.length > 0 || mixedRows.length > 0) && (
                <div style={styles.section}>
                    {shownKinds.length > 0 && (
                        <>
                            <SettingLabel text="Soort breuken" info="Welke soorten breuken in de oefeningen voorkomen (minstens één)." />
                            <div style={styles.buttonGroup}>
                                {shownKinds.map(k => {
                                    // At least one kind stays on: the last lit pill cannot be switched off.
                                    const last = k.on && onCount === 1;
                                    const fixed = !!k.locked || last;
                                    return (
                                        <button key={k.kind} type="button" aria-pressed={k.on}
                                            aria-disabled={fixed || undefined}
                                            onClick={() => { if (!fixed) k.onToggle?.(!k.on); }}
                                            style={{ ...styles.pill(k.on), cursor: fixed ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            {k.locked && <Lock size={12} weight="bold" aria-hidden="true" />}
                                            {KIND_LABEL[k.kind]}
                                        </button>
                                    );
                                })}
                            </div>
                            {kindsHint && <p style={styles.hint}>{kindsHint}</p>}
                        </>
                    )}
                    {mixedRows.map((r, i) => <MixedControl key={r.label ?? i} row={r} />)}
                </div>
            )}

            {notation && notation.length > 0 && (
                <div style={styles.section}>
                    <SettingLabel text="Schrijfwijze" info="Hoe de breuken op het blad geschreven worden." />
                    {notation.map(n => (
                        <div key={n.label} style={styles.onOffRow}>
                            <span style={styles.onOffLabel}>{n.label}</span>
                            <button type="button" onClick={() => n.onChange(!n.on)} aria-pressed={n.on} style={styles.onOffBtn(n.on)}>{n.on ? 'Aan' : 'Uit'}</button>
                        </div>
                    ))}
                </div>
            )}

            {children}
        </div>
    );
}

const rangeRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' };
const selectCell: CSSProperties = { width: '84px' };
const numberField: CSSProperties = {
    width: '84px', padding: '6px 10px', backgroundColor: 'var(--bg-surface-2)',
    border: '1px solid var(--separator)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)',
    outline: 'none', boxSizing: 'border-box', ...styles.numInput,
};
