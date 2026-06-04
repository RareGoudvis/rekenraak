import { useEffect, useRef, useState } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';
import { sharedPluginStyles as S } from '../configurator/plugins/sharedPluginStyles';

export interface PopupSelectOption<T> {
    value: T;
    label: string;
}

interface Props<T> {
    value: T;
    options: PopupSelectOption<T>[];
    onChange: (value: T) => void;
    disabled?: boolean;
    ariaLabel?: string;
    // Opt-in: if `value` matches no option (renders "—"), snap to the lowest option
    // and persist via onChange. Used on numeric max dropdowns so a leftover base/grade
    // value out of this list can't feed a generator an unbounded max → memory overflow.
    clampToLowest?: boolean;
}

// Themed single-select pop-up menu for value pickers (max getal, decimalen, niveau…).
// Replaces wrapping radio-button rows when a selector has many options. Compares values
// with String() so number/string option types both match.
export default function PopupSelect<T extends string | number>({ value, options, onChange, disabled, ariaLabel, clampToLowest }: Props<T>) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const current = options.find((o) => String(o.value) === String(value));

    // Out-of-range guard: a value with no matching option (e.g. a leftover base/grade
    // max) would render as "—" and reach the generator unclamped → memory overflow.
    // Snap to the numerically lowest option and persist. Converges in one tick:
    // once value is a real option, `current` is truthy and this no-ops.
    useEffect(() => {
        if (!clampToLowest || current || options.length === 0) return;
        const lowest = options.reduce((a, b) => (Number(b.value) < Number(a.value) ? b : a));
        onChange(lowest.value);
    }, [clampToLowest, current, options, onChange]);

    // Close on outside click / Escape.
    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
    }, [open]);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
                disabled={disabled}
                onClick={() => !disabled && setOpen((v) => !v)}
                style={{ ...S.selectTrigger, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
                <span>{current?.label ?? '—'}</span>
                <CaretDown size={13} weight="bold" style={{ opacity: 0.6, flexShrink: 0 }} />
            </button>
            {open && (
                <div role="listbox" style={S.selectMenu}>
                    {options.map((o) => {
                        const active = String(o.value) === String(value);
                        return (
                            <div
                                key={String(o.value)}
                                role="option"
                                aria-selected={active}
                                onClick={() => { onChange(o.value); setOpen(false); }}
                                style={{ ...S.selectItem(active), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)' }}
                            >
                                <span>{o.label}</span>
                                {active && <Check size={13} weight="bold" />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
