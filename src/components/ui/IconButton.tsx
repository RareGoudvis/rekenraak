import type { Icon as PhosphorIcon, IconWeight } from '@phosphor-icons/react';
import { useState, type MouseEvent } from 'react';

export type IconButtonVariant = 'primary' | 'neutral' | 'danger' | 'active';

interface Props {
    icon: PhosphorIcon;
    label: string;                // tooltip + aria-label
    visibleLabel?: string;        // text shown alongside the icon (used for CTAs)
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    variant?: IconButtonVariant;
    size?: number;                // icon size in px
    dataTour?: string;            // forwarded as data-tour (spotlight onboarding anchor)
}

// Centralised button styling so TopBar / sidebar / block overlay all share
// one visual language. Three semantic tiers + an "active" toggle state.
// All colour tokens come from CSS variables so themes flow through.
export default function IconButton({
    icon: Icon, label, visibleLabel, onClick, disabled = false,
    variant = 'neutral', size = 18, dataTour,
}: Props) {
    const style = computeStyle(variant, disabled, !!visibleLabel);
    // Phosphor weight is a prop (not CSS), so the hover thickening can't live in
    // index.css like the brightness/scale — track hover/focus here to drive it.
    const [emphasized, setEmphasized] = useState(false);
    return (
        <button
            type="button"
            className="ui-icon-btn"
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
            aria-disabled={disabled || undefined}
            data-tour={dataTour}
            style={style}
            onMouseEnter={() => setEmphasized(true)}
            onMouseLeave={() => setEmphasized(false)}
            onFocus={() => setEmphasized(true)}
            onBlur={() => setEmphasized(false)}
        >
            <Icon size={size} weight={iconWeight(variant, emphasized)} aria-hidden="true" />
            {visibleLabel && <span style={labelTextStyle}>{visibleLabel}</span>}
        </button>
    );
}

// SF-Symbols feel: emphasis = heavier glyph. Selected/CTA icons sit bold at rest;
// neutral/danger icons thicken to bold on hover or keyboard focus.
function iconWeight(variant: IconButtonVariant, emphasized: boolean): IconWeight {
    if (variant === 'active' || variant === 'primary') return 'bold';
    return emphasized ? 'bold' : 'regular';
}

function computeStyle(variant: IconButtonVariant, disabled: boolean, hasLabel: boolean): React.CSSProperties {
    const base: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: hasLabel ? 'var(--sp-2)' : 0,
        height: '34px',
        minWidth: hasLabel ? undefined : '34px',
        padding: hasLabel ? '0 14px' : 0,
        borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: '1px solid var(--separator)',
        fontSize: 'var(--text-sm)',
        fontWeight: 600,
        fontFamily: 'inherit',
        // Subtle macOS bezel (soft drop shadow); off in colorblind where shadow-1 is none.
        boxShadow: 'var(--shadow-1)',
        // hover/active live in index.css (.ui-icon-btn) — inline can't do :hover
        transition: 'background-color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out), color var(--dur) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
        opacity: disabled ? 0.5 : 1,
    };

    switch (variant) {
        case 'primary':
            return {
                ...base,
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-on)',
                border: '1px solid var(--accent)',
            };
        case 'danger':
            return {
                ...base,
                backgroundColor: 'var(--danger-soft)',
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
            };
        case 'active':
            return {
                ...base,
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
            };
        case 'neutral':
        default:
            return {
                ...base,
                backgroundColor: 'var(--bg-surface-2)',
                color: 'var(--text-main)',
            };
    }
}

const labelTextStyle: React.CSSProperties = {
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
};
