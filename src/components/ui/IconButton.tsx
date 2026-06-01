import type { LucideIcon } from 'lucide-react';
import type { MouseEvent } from 'react';

export type IconButtonVariant = 'primary' | 'neutral' | 'danger' | 'active';

interface Props {
    icon: LucideIcon;
    label: string;                // tooltip + aria-label
    visibleLabel?: string;        // text shown alongside the icon (used for CTAs)
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    variant?: IconButtonVariant;
    size?: number;                // icon size in px
}

// Centralised button styling so TopBar / sidebar / block overlay all share
// one visual language. Three semantic tiers + an "active" toggle state.
// All colour tokens come from CSS variables so themes flow through.
export default function IconButton({
    icon: Icon, label, visibleLabel, onClick, disabled = false,
    variant = 'neutral', size = 18,
}: Props) {
    const style = computeStyle(variant, disabled, !!visibleLabel);
    return (
        <button
            type="button"
            className="ui-icon-btn"
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
            aria-disabled={disabled || undefined}
            style={style}
        >
            <Icon size={size} strokeWidth={2} aria-hidden="true" />
            {visibleLabel && <span style={labelTextStyle}>{visibleLabel}</span>}
        </button>
    );
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
