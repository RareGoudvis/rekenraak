import { Check, Prohibit } from '@phosphor-icons/react';

// A single color swatch (selected = accent ring). Empty value '' renders a "geen" chip.
export function Swatch({ value, active, onClick }: { value: string; active: boolean; onClick: () => void }) {
    const empty = value === '';
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={empty ? 'Geen kleur' : value}
            style={{
                width: '24px', height: '24px', borderRadius: 'var(--radius-xs)', cursor: 'pointer',
                background: empty ? 'var(--bg-surface-2)' : value,
                border: `2px solid ${active ? 'var(--accent)' : 'var(--separator)'}`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
        >
            {empty
                ? <Prohibit size={13} color="var(--text-muted)" />
                : active && <Check size={13} weight="bold" color={isDark(value) ? '#fff' : '#000'} />}
        </button>
    );
}

// Row of swatches for one property (text color, fill, border color), plus a custom
// picker. The curated list is print-safe and covers most sheets, but school and club
// colours are never going to be on it, so the last chip is a native colour input —
// selected whenever the current value is not one of the presets.
export function SwatchRow({ options, value, onChange }: { options: string[]; value: string | undefined; onChange: (v: string) => void }) {
    const current = value ?? '';
    const isCustom = current !== '' && !options.includes(current);
    return (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {options.map((o) => <Swatch key={o || 'none'} value={o} active={current === o} onClick={() => onChange(o)} />)}
            <label
                title="Eigen kleur kiezen"
                style={{
                    position: 'relative', width: '24px', height: '24px', flexShrink: 0, cursor: 'pointer',
                    borderRadius: 'var(--radius-xs)',
                    border: `2px solid ${isCustom ? 'var(--accent)' : 'var(--separator)'}`,
                    background: isCustom
                        ? current
                        : 'conic-gradient(#ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                <input
                    type="color"
                    value={isCustom ? current : '#000000'}
                    onChange={(e) => onChange(e.target.value)}
                    aria-label="Eigen kleur"
                    style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', padding: 0, border: 'none' }}
                />
                {isCustom && <Check size={13} weight="bold" color={isDark(current) ? '#fff' : '#000'} />}
            </label>
        </div>
    );
}

// Rough luminance check so the check-mark stays visible on dark vs light swatches.
function isDark(hex: string): boolean {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return false;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
}
