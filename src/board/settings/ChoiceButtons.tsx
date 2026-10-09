import { Button } from './controls';

// A one-of-many pick that wraps onto a second line (Segmented squeezes six sound names into
// slivers on the 300px panel). Picking also plays/previews through onChange, like a Segmented.
export default function ChoiceButtons<T extends string>({ label, value, options, onChange }: {
    label: string; value: T; options: ReadonlyArray<{ value: T; label: string }>; onChange: (v: T) => void;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>{label}</span>
            <div role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                {options.map(o => (
                    <Button key={o.value} pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</Button>
                ))}
            </div>
        </div>
    );
}
