import type { CSSProperties } from 'react';

interface Props {
    checked: boolean;
    onChange: (next: boolean) => void;
    label?: string;          // optional inline label (rendered before the switch)
    disabled?: boolean;
    'aria-label'?: string;   // required when no visible label, for screen readers
}

// iOS-style toggle. A button with role="switch" — the track fills with the accent
// when on and the knob slides. Spring easing on the knob gives the tactile "snap".
export default function Switch({ checked, onChange, label, disabled = false, ...rest }: Props) {
    const row: CSSProperties = {
        display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-3)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    };
    const track: CSSProperties = {
        position: 'relative', flexShrink: 0,
        width: '40px', height: '24px', borderRadius: 'var(--radius-pill)',
        border: `1px solid ${checked ? 'var(--accent)' : 'var(--separator)'}`,
        backgroundColor: checked ? 'var(--accent)' : 'var(--bg-surface-2)',
        transition: 'background-color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out)',
        padding: 0,
    };
    const knob: CSSProperties = {
        position: 'absolute', top: '2px', left: '2px',
        width: '18px', height: '18px', borderRadius: 'var(--radius-pill)',
        backgroundColor: checked ? 'var(--accent-on)' : 'var(--text-muted)',
        boxShadow: 'var(--shadow-1)',
        // 16px = track width 40 − knob 18 − 2×2px inset; spring easing for the snap
        transform: checked ? 'translateX(16px)' : 'translateX(0)',
        transition: 'transform var(--dur) var(--ease-spring), background-color var(--dur) var(--ease-out)',
    };
    return (
        <label style={row}>
            {label && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>{label}</span>}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={rest['aria-label']}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                style={track}
            >
                <span style={knob} aria-hidden="true" />
            </button>
        </label>
    );
}
