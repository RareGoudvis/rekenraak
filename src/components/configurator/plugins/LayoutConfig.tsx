import type { MathBlock } from '../../../services/math/types';
import { useWorksheetStore } from '../../../store/useWorksheetStore';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';

// Settings for the sheet-furniture blocks (section rule, writing lines, squared grid,
// memory box, blank page). One plugin covers all of them, switching on constraints.kind,
// because they share the "no generator, all constraints" shape.
export default function LayoutConfig({ block }: { block: MathBlock }) {
    const updateBlockSettings = useWorksheetStore((s) => s.updateBlockSettings);
    const c = (block.constraints ?? {}) as Record<string, unknown>;
    const kind = (c.kind as string) ?? 'sectie';
    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });

    const textField = (key: string, label: string, info: string, placeholder = '') => (
        <div style={styles.section}>
            <SettingLabel text={label} info={info} />
            <input
                style={{ ...styles.numInput, width: '100%' }}
                value={(c[key] as string) ?? ''}
                placeholder={placeholder}
                onChange={(e) => set(key, e.target.value)}
            />
        </div>
    );

    const segment = (key: string, label: string, info: string, opts: Array<{ v: string; l: string }>, fallback: string) => (
        <div style={styles.section}>
            <SettingLabel text={label} info={info} />
            <div style={styles.buttonGroup}>
                {opts.map(o => (
                    <button key={o.v} style={styles.radioBtn(((c[key] as string) ?? fallback) === o.v)} onClick={() => set(key, o.v)}>{o.l}</button>
                ))}
            </div>
        </div>
    );

    const slider = (key: string, label: string, info: string, min: number, max: number, step: number, fallback: number, unit = '') => (
        <div style={styles.section}>
            <SettingLabel text={`${label}: ${Number(c[key] ?? fallback)}${unit}`} info={info} />
            <input
                type="range" min={min} max={max} step={step}
                value={Number(c[key] ?? fallback)}
                onChange={(e) => set(key, Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
        </div>
    );

    return (
        <div style={styles.container}>
            {kind === 'sectie' && (<>
                {textField('title', 'Titel:', 'Optionele kop onder de scheidingslijn.', 'Bv. Deel 2 — meten')}
                {segment('rule', 'Lijn:', 'De scheiding zelf. Kies Geen als je alleen een kop wil.', [
                    { v: 'lijn', l: 'Vol' }, { v: 'stippel', l: 'Stippel' }, { v: 'geen', l: 'Geen' },
                ], 'lijn')}
            </>)}

            {kind === 'schrijflijnen' && (<>
                {slider('lineCount', 'Aantal lijnen', 'Hoeveel schrijflijnen dit blok toont.', 1, 20, 1, 6)}
                {slider('lineSpacing', 'Lijnafstand', 'Afstand tussen de lijnen in millimeter.', 6, 20, 1, 10, ' mm')}
                {segment('lineStyle', 'Soort:', 'Schrijflijn voegt de stippellijn op halve hoogte toe.', [
                    { v: 'enkel', l: 'Enkel' }, { v: 'schrijf', l: 'Schrijflijn' },
                ], 'enkel')}
            </>)}

            {kind === 'raster' && (<>
                {slider('cellMm', 'Hokjesgrootte', 'Zijde van één hokje in millimeter.', 5, 20, 1, 10, ' mm')}
                {slider('rows', 'Aantal rijen', 'Hoeveel rijen hokjes hoog het raster is.', 1, 24, 1, 8)}
                <p style={styles.hint}>Het aantal kolommen volgt de breedte van het blok, zodat de hokjes vierkant blijven.</p>
            </>)}

            {kind === 'kader' && (<>
                {textField('title', 'Titel:', 'Kop van het kader.', 'Onthoud')}
                <div style={styles.section}>
                    <SettingLabel text="Tekst:" info="De inhoud van het onthoudkader. Enters blijven behouden." />
                    <textarea
                        style={{ ...styles.numInput, width: '100%', minHeight: '84px', resize: 'vertical', fontFamily: 'inherit' }}
                        value={(c.body as string) ?? ''}
                        placeholder={'Bv. Bij het optellen tel je eerst de eenheden.'}
                        onChange={(e) => set('body', e.target.value)}
                    />
                </div>
                {segment('emphasis', 'Stijl:', 'Hoe het kader eruitziet op het blad.', [
                    { v: 'kader', l: 'Kader' }, { v: 'rond', l: 'Afgerond' },
                    { v: 'grijs', l: 'Grijs' }, { v: 'geen', l: 'Geen' },
                ], 'kader')}
            </>)}

            {kind === 'lege-pagina' && (
                <p style={styles.hint}>
                    Dit blok houdt een volledige pagina vrij, bijvoorbeeld als extra oefenruimte
                    of om aan één zijde te kunnen afdrukken. Er zijn geen instellingen.
                </p>
            )}
        </div>
    );
}
