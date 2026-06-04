import { useState } from 'react';
import { CaretDown, X, Check } from '@phosphor-icons/react';
import ModalPortal from '../ui/ModalPortal';
import ExercisePreview from '../shared/ExercisePreview';
import { sharedPluginStyles as S } from './plugins/sharedPluginStyles';

export interface StyleOption {
    value: string;
    label: string;
    previewConstraints: Record<string, unknown>;   // resolved constraints for the example card
}

interface Props {
    typeId: string;
    value: string;
    options: StyleOption[];
    onChange: (value: string) => void;
    title?: string;   // modal heading, e.g. "Kies stijl"
    disabled?: boolean;
}

// Visual-variant picker: a compact trigger showing the current pick that opens a modal
// card-gallery, each card a live ExercisePreview. Use for "Stijl"/layout/subtype selection
// (many visual variants) instead of segmented buttons.
export default function StylePicker({ typeId, value, options, onChange, title = 'Kies stijl', disabled }: Props) {
    const [open, setOpen] = useState(false);
    const current = options.find((o) => o.value === value);

    return (
        <>
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen(true)}
                style={{ ...S.selectTrigger, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
                <span>{current?.label ?? '—'}</span>
                <CaretDown size={13} weight="bold" style={{ opacity: 0.6, flexShrink: 0 }} />
            </button>

            {open && (
                <ModalPortal>
                    <div style={overlay} onClick={() => setOpen(false)}>
                        <div style={panel} onClick={(e) => e.stopPropagation()}>
                            <div style={header}>
                                <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--text-main)' }}>{title}</h3>
                                <button type="button" onClick={() => setOpen(false)} style={closeBtn} aria-label="Sluiten"><X size={18} /></button>
                            </div>
                            <div style={grid}>
                                {options.map((o) => {
                                    const active = o.value === value;
                                    return (
                                        <button
                                            key={o.value}
                                            type="button"
                                            onClick={() => { onChange(o.value); setOpen(false); }}
                                            style={{ ...card, borderColor: active ? 'var(--accent)' : 'var(--separator)', boxShadow: active ? 'var(--shadow-1)' : 'none' }}
                                        >
                                            <ExercisePreview typeId={typeId} constraints={o.previewConstraints} height={120} />
                                            <div style={cardLabel}>
                                                <span style={{ color: active ? 'var(--accent)' : 'var(--text-main)', fontWeight: active ? 600 : 500 }}>{o.label}</span>
                                                {active && <Check size={14} weight="bold" color="var(--accent)" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </>
    );
}

const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
};
const panel: React.CSSProperties = {
    width: 'min(680px, 92vw)', maxHeight: '86vh', overflowY: 'auto',
    background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-2)', padding: 'var(--sp-5)',
};
const header: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)',
};
const closeBtn: React.CSSProperties = {
    border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)',
    display: 'inline-flex', padding: '4px',
};
const grid: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--sp-3)',
};
const card: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', padding: '6px',
    background: 'var(--bg-surface-2)', border: '1.5px solid var(--separator)',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left',
};
const cardLabel: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '2px 4px', fontSize: 'var(--text-sm)',
};
