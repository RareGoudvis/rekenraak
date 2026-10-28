import PopupSelect from '../ui/PopupSelect';
import { ensureFontLoaded, INSTALLED_SUFFIX, type FontOption } from '../../config/fontOptions';

// Font-family PopupSelect shared by every sheet-font picker. Picking the list's first entry
// (the standaard face) clears the setting, so the sheet falls back to the theme.css token.
export default function FontFamilyPicker({ value, options, onChange, ariaLabel }: {
    value: string | undefined;
    options: FontOption[];
    onChange: (value: string | undefined) => void;
    ariaLabel: string;
}) {
    const current = value ?? options[0].value;
    const installedOnly = !!options.find(o => o.value === current)?.label.endsWith(INSTALLED_SUFFIX);
    return (
        <>
            <PopupSelect
                value={current}
                options={options.map((f) => ({ value: f.value, label: f.label }))}
                onChange={(v) => { void ensureFontLoaded(v); onChange(v === options[0].value ? undefined : v); }}
                ariaLabel={ariaLabel} />
            {installedOnly && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 'var(--sp-1) 0 0' }}>
                    Dit lettertype staat niet in RekenRaak zelf: op een computer zonder dit lettertype ziet en print het blad er anders uit.
                </p>
            )}
        </>
    );
}
