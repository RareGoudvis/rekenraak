import Switch from '../ui/Switch';
import { SwatchRow } from '../ui/Swatch';
import { useWorksheetStore, type RegionStyle } from '../../store/useWorksheetStore';
import { PRINT_PALETTE, PRINT_FILLS, STYLE_BOUNDS } from '../../config/printPalette';

// Look-and-feel controls for one printed region. These used to live in a "Stijl
// aanpassen" modal with its own miniature preview; the three regions map exactly onto
// the Blad sub-tabs, and the real sheet is already on screen behind the panel, so the
// modal (and its second, less accurate preview) was pure indirection.
export type StyleRegion = 'header' | 'titel' | 'footer';

const REGION_KEY = { header: 'headerCustom', titel: 'titelCustom', footer: 'footerCustom' } as const;
// Sizes the sheet falls back to when a region carries no custom style.
const DEFAULT_SIZE: Record<StyleRegion, number> = { header: 22, titel: 16, footer: 9 };

export default function RegionStyleFields({ region }: { region: StyleRegion }) {
    const docSettings = useWorksheetStore((s) => s.docSettings);
    const updateDocSettings = useWorksheetStore((s) => s.updateDocSettings);

    const bounds = STYLE_BOUNDS[region];
    const cur: RegionStyle = docSettings[REGION_KEY[region]] ?? {};
    const patch = (p: Partial<RegionStyle>) => updateDocSettings({ [REGION_KEY[region]]: { ...cur, ...p } });
    const reset = () => updateDocSettings({ [REGION_KEY[region]]: {} });

    return (
        <>
            <Field label={`Tekengrootte: ${cur.fontSize ?? DEFAULT_SIZE[region]}px`}>
                <input
                    type="range" min={bounds.fontMin} max={bounds.fontMax}
                    value={cur.fontSize ?? DEFAULT_SIZE[region]}
                    onChange={(e) => patch({ fontSize: Number(e.target.value) })}
                    style={range}
                />
            </Field>

            <div style={rowStyle}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>Vet</span>
                <Switch checked={!!cur.bold} onChange={(v) => patch({ bold: v })} aria-label="Vet" />
            </div>

            <Field label="Tekstkleur">
                <SwatchRow options={PRINT_PALETTE} value={cur.color ?? '#000000'} onChange={(v) => patch({ color: v })} />
            </Field>

            <Field label="Vulkleur">
                <SwatchRow options={PRINT_FILLS} value={cur.background ?? ''} onChange={(v) => patch({ background: v })} />
            </Field>

            {/* The footer's side padding IS the print margin, so only header and titel
                expose padding — changing it on the footer would move the page margin. */}
            {region !== 'footer' && (
                <>
                    <Field label={`Marge horizontaal: ${cur.padX ?? 0}px`}>
                        <input type="range" min={0} max={bounds.padMax} value={cur.padX ?? 0}
                            onChange={(e) => patch({ padX: Number(e.target.value) })} style={range} />
                    </Field>
                    <Field label={`Marge verticaal: ${cur.padY ?? 0}px`}>
                        <input type="range" min={0} max={bounds.padMax} value={cur.padY ?? 0}
                            onChange={(e) => patch({ padY: Number(e.target.value) })} style={range} />
                    </Field>
                </>
            )}

            <button type="button" onClick={reset} style={resetBtn}>Stijl terugzetten</button>
        </>
    );
}

// Reset every style-related doc setting to its default: all three region customs
// cleared (the shallow merge needs the explicit undefined) plus the sheet-wide sizes
// and spacings, and every per-block bodyFontScale override removed.
export function ResetAllStylesButton() {
    const blocks = useWorksheetStore((s) => s.blocks);
    const updateDocSettings = useWorksheetStore((s) => s.updateDocSettings);
    const updateBlockSettings = useWorksheetStore((s) => s.updateBlockSettings);

    const resetAll = () => {
        updateDocSettings({
            showScores: false, opdrachtTitelStyle: 'regular', showDividers: false,
            headerStyle: 'geen', titlePosition: 'center', titleFieldsGap: 16,
            headerContentGap: 12, blockSpacing: 12, numberBlocks: true, bodyFontScale: 1,
            headerCustom: undefined, titelCustom: undefined, footerCustom: undefined,
        });
        blocks.forEach((blk) => {
            if (blk.constraints?.bodyFontScale !== undefined) {
                updateBlockSettings(blk.id, { constraints: { ...blk.constraints, bodyFontScale: undefined } });
            }
        });
    };

    return (
        <button
            type="button" onClick={resetAll} style={resetAllBtn}
            title="Zet alle stijlen terug: koptekst, opdracht-titel, voettekst, tekstgrootte en per-blok afwijkingen."
        >
            Alle stijlen terugzetten
        </button>
    );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 'var(--sp-4)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>{label}</label>
            {children}
        </div>
    );
}

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' };
const range: React.CSSProperties = { width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' };
const resetBtn: React.CSSProperties = { padding: '7px 12px', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--separator)', background: 'var(--bg-surface-2)', color: 'var(--text-muted)' };
const resetAllBtn: React.CSSProperties = { ...resetBtn, border: '1px solid var(--danger)', color: 'var(--danger)', background: 'transparent' };
