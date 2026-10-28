import { useWorksheetStore, type RegionStyle } from '../../store/useWorksheetStore';
import { STYLE_BOUNDS } from '../../config/printPalette';
import FontStyleFields, { Field } from './FontStyleFields';
import { TEXT_FONT_OPTIONS } from '../../config/fontOptions';
import { ANSWER_SPACE_DEFAULT_PX } from '../viewer/BlockWidthContext';

// Look-and-feel controls for one printed region. These used to live in a "Stijl
// aanpassen" modal with its own miniature preview; the three regions map exactly onto
// the Blad sub-tabs, and the real sheet is already on screen behind the panel, so the
// modal (and its second, less accurate preview) was pure indirection.
export type StyleRegion = 'header' | 'titel' | 'footer';

const REGION_KEY = { header: 'headerCustom', titel: 'titelCustom', footer: 'footerCustom' } as const;
// Sizes the sheet falls back to when a region carries no custom style.
const DEFAULT_SIZE: Record<StyleRegion, number> = { header: 22, titel: 16, footer: 9 };
// Each region has its own face (DocSettings.fontFamily*), independent of the opdrachttekst.
const FONT_KEY = { header: 'fontFamilyHeader', titel: 'fontFamilyTitel', footer: 'fontFamilyFooter' } as const;
// The title and the opdracht line print bold until the teacher says otherwise.
// Three pickers can sit in one inspector tab, so each names its region
const FONT_LABEL: Record<StyleRegion, string> = { header: 'Lettertype koptekst', titel: 'Lettertype titel', footer: 'Lettertype voettekst' };
const DEFAULT_BOLD: Record<StyleRegion, boolean> = { header: true, titel: true, footer: false };

export default function RegionStyleFields({ region }: { region: StyleRegion }) {
    const docSettings = useWorksheetStore((s) => s.docSettings);
    const updateDocSettings = useWorksheetStore((s) => s.updateDocSettings);

    const bounds = STYLE_BOUNDS[region];
    const cur: RegionStyle = docSettings[REGION_KEY[region]] ?? {};
    const patch = (p: Partial<RegionStyle>) => updateDocSettings({ [REGION_KEY[region]]: { ...cur, ...p } });
    const reset = () => updateDocSettings({ [REGION_KEY[region]]: {} });

    return (
        <>
            <FontStyleFields
                fontFamily={{ label: FONT_LABEL[region], value: docSettings[FONT_KEY[region]], options: TEXT_FONT_OPTIONS, onChange: (v) => updateDocSettings({ [FONT_KEY[region]]: v }) }}
                fontSize={{ label: 'Tekengrootte', value: cur.fontSize ?? DEFAULT_SIZE[region], min: bounds.fontMin, max: bounds.fontMax, onChange: (v) => patch({ fontSize: v }) }}
                color={cur.color} onColorChange={(v) => patch({ color: v })}
                background={cur.background} onBackgroundChange={(v) => patch({ background: v })}
                bold={cur.bold ?? DEFAULT_BOLD[region]} onBoldChange={(v) => patch({ bold: v })}
                italic={cur.italic} onItalicChange={(v) => patch({ italic: v })}
                underline={cur.underline} onUnderlineChange={(v) => patch({ underline: v })}
            />

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
            headerStyle: 'geen', titlePosition: 'center', titleFieldsGap: 16, titleFieldsVerticalGap: undefined,
            headerContentGap: 12, blockSpacing: 12, numberBlocks: true, bodyFontScale: 1, answerSpace: ANSWER_SPACE_DEFAULT_PX,
            headerCustom: undefined, titelCustom: undefined, footerCustom: undefined,
            headerVeldenCustom: undefined, oefeningenCustom: undefined,
            fontFamilyText: undefined, fontFamilyMath: undefined, fontFamilyHeader: undefined,
            fontFamilyTitel: undefined, fontFamilyHeaderVelden: undefined, fontFamilyFooter: undefined,
        });
        blocks.forEach((blk) => {
            if (blk.constraints?.bodyFontScale !== undefined || blk.constraints?.answerSpace !== undefined) {
                updateBlockSettings(blk.id, { constraints: { ...blk.constraints, bodyFontScale: undefined, answerSpace: undefined } });
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

const range: React.CSSProperties = { width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' };
const resetBtn: React.CSSProperties = { padding: '7px 12px', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--separator)', background: 'var(--bg-surface-2)', color: 'var(--text-muted)' };
const resetAllBtn: React.CSSProperties = { ...resetBtn, border: '1px solid var(--danger)', color: 'var(--danger)', background: 'transparent' };
