import { useId, useState } from 'react';

// Two controls the wiskunde-gereedschap panels need on top of the shared kit (controls.tsx):
// a number field that tolerates a half-typed value, and swatches over a given palette (fills
// are pastels a black digit stays readable on, so the kit's dark ink palette does not fit).

export function NumberField({ label, value, onChange, min, max }: {
    label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
    const id = useId();
    // A draft while typing, so "-" or "0," can sit in the box; the store only gets numbers.
    const [draft, setDraft] = useState<string | null>(null);
    const commit = (raw: string) => {
        setDraft(raw);
        const n = Number(raw.replace(',', '.'));
        if (raw.trim() === '' || !Number.isFinite(n)) return;
        onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)));
    };
    return (
        <div style={S.row}>
            <label style={S.label} htmlFor={id}>{label}</label>
            <input id={id} inputMode="decimal" value={draft ?? String(value).replace('.', ',')} onChange={(e) => commit(e.target.value)}
                onBlur={() => setDraft(null)} style={S.input} />
        </div>
    );
}

const isHexColor = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

export function PaletteRow({ label, value, palette, onChange, extra }: {
    label: string; value: string; palette: readonly string[]; onChange: (v: string) => void;
    // A leading non-colour choice (e.g. 'cyclus'), drawn as a striped swatch.
    extra?: { value: string; label: string };
}) {
    const dot = (bg: string, on: boolean): React.CSSProperties => ({
        width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', padding: 0, flexShrink: 0,
        background: bg, border: '2px solid var(--bg-surface)',
        boxShadow: on ? '0 0 0 2px var(--accent)' : '0 0 0 1px var(--separator)',
    });
    const custom = isHexColor(value) && !palette.some(c => c.toLowerCase() === value.toLowerCase());
    return (
        <div style={S.stacked}>
            <span style={S.label}>{label}</span>
            <div role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                {extra && (
                    <button type="button" aria-pressed={value === extra.value} aria-label={extra.label} title={extra.label} onClick={() => onChange(extra.value)}
                        style={dot(`conic-gradient(${palette.join(', ')})`, value === extra.value)} />
                )}
                {palette.map(c => (
                    <button key={c} type="button" aria-pressed={value.toLowerCase() === c.toLowerCase()} aria-label={`Kleur ${c}`} title={c}
                        onClick={() => onChange(c)} style={dot(c, value.toLowerCase() === c.toLowerCase())} />
                ))}
                {/* A native colour input cannot be empty (it shows black for 'cyclus'), so it sits
                    invisible over a swatch that is neutral until a colour outside the palette is chosen. */}
                <label data-palette-custom="" title={`${label}: eigen kleur`}
                    style={{ ...dot(custom ? value : 'var(--bg-surface-2)', custom), position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                    {!custom && '+'}
                    <input type="color" aria-label={`${label}: eigen kleur`} value={isHexColor(value) ? value : palette[0] ?? '#ffffff'}
                        onChange={(e) => onChange(e.target.value)}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', padding: 0, border: 'none', opacity: 0, cursor: 'pointer' }} />
                </label>
            </div>
        </div>
    );
}

const S = {
    row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', minHeight: '32px' } as React.CSSProperties,
    stacked: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' } as React.CSSProperties,
    label: { fontSize: 'var(--text-sm)', color: 'var(--text-main)' } as React.CSSProperties,
    input: {
        boxSizing: 'border-box', height: '36px', width: '96px', padding: '0 10px', borderRadius: 'var(--radius-xs)',
        border: '1px solid var(--separator)', background: 'var(--bg-surface-2)', color: 'var(--text-main)',
        fontSize: 'var(--text-sm)', outline: 'none', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
    } as React.CSSProperties,
};
