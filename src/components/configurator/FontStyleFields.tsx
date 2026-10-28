import type { CSSProperties, ReactNode } from 'react';
import Switch from '../ui/Switch';
import { SwatchRow } from '../ui/Swatch';
import { PRINT_PALETTE, PRINT_FILLS } from '../../config/printPalette';

// One reusable font-style block: optional size slot, then text/fill colour and
// bold/italic/underline. RegionStyleFields passes the size; a card with its own size
// controls (the veldlabels, the oefeningen) omits it and gets only the shared rows.
export interface FontSizeSlot {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
}

interface Props {
    fontSize?: FontSizeSlot;
    color?: string;
    onColorChange: (value: string) => void;
    background?: string;
    onBackgroundChange: (value: string) => void;
    bold?: boolean;
    onBoldChange: (value: boolean) => void;
    italic?: boolean;
    onItalicChange: (value: boolean) => void;
    underline?: boolean;
    onUnderlineChange: (value: boolean) => void;
}

export default function FontStyleFields({
    fontSize, color, onColorChange, background, onBackgroundChange,
    bold, onBoldChange, italic, onItalicChange, underline, onUnderlineChange,
}: Props) {
    return (
        <>
            {fontSize && (
                <Field label={`${fontSize.label}: ${fontSize.value}px`}>
                    <input type="range" min={fontSize.min} max={fontSize.max} value={fontSize.value}
                        onChange={(e) => fontSize.onChange(Number(e.target.value))} style={range} />
                </Field>
            )}

            <SwitchRow label="Vet" checked={!!bold} onChange={onBoldChange} />
            <SwitchRow label="Cursief" checked={!!italic} onChange={onItalicChange} />
            <SwitchRow label="Onderstreept" checked={!!underline} onChange={onUnderlineChange} />

            <Field label="Tekstkleur">
                <SwatchRow options={PRINT_PALETTE} value={color ?? '#000000'} onChange={onColorChange} />
            </Field>

            <Field label="Vulkleur">
                <SwatchRow options={PRINT_FILLS} value={background ?? ''} onChange={onBackgroundChange} />
            </Field>
        </>
    );
}

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div style={rowStyle}>
            <span style={textStyle}>{label}</span>
            <Switch checked={checked} onChange={onChange} aria-label={label} />
        </div>
    );
}

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
    return (
        <div style={{ marginBottom: 'var(--sp-4)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>{label}</label>
            {children}
        </div>
    );
}

const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' };
const textStyle: CSSProperties = { fontSize: 'var(--text-sm)', color: 'var(--text-main)' };
const range: CSSProperties = { width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' };
