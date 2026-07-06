import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

// Concept pools per kind (+ classify axis for figuren). Labels stay short; the
// full leerplan names live in the viewer's CONCEPT_NAMES.
const PUNT_LIJN = [
    { key: 'punt', label: 'Punt' }, { key: 'rechte', label: 'Rechte' },
    { key: 'halfrechte', label: 'Halfrechte' }, { key: 'lijnstuk', label: 'Lijnstuk' },
    { key: 'evenwijdig', label: 'Evenwijdig' }, { key: 'snijdend', label: 'Snijdend' }, { key: 'loodrecht', label: 'Loodrecht' },
];
const HOEKEN = [
    { key: 'scherp', label: 'Scherp' }, { key: 'recht', label: 'Recht' },
    { key: 'stomp', label: 'Stomp' }, { key: 'gestrekt', label: 'Gestrekt' },
];
const DRIEHOEK_HOEKEN = [
    { key: 'scherphoekig', label: 'Scherphoekig' }, { key: 'rechthoekig', label: 'Rechthoekig' }, { key: 'stomphoekig', label: 'Stomphoekig' },
];
const DRIEHOEK_ZIJDEN = [
    { key: 'gelijkzijdig', label: 'Gelijkzijdig' }, { key: 'gelijkbenig', label: 'Gelijkbenig' }, { key: 'ongelijkzijdig', label: 'Ongelijkzijdig' },
];
const FIGUREN: Record<string, { key: string; label: string }[]> = {
    // One driehoeken leaf covers both classification axes; old classify keys stay readable.
    'driehoeken': [...DRIEHOEK_HOEKEN, ...DRIEHOEK_ZIJDEN],
    'driehoeken-hoeken': DRIEHOEK_HOEKEN,
    'driehoeken-zijden': DRIEHOEK_ZIJDEN,
    'vierhoeken': [
        { key: 'vierkant', label: 'Vierkant' }, { key: 'rechthoek', label: 'Rechthoek' }, { key: 'ruit', label: 'Ruit' },
        { key: 'parallellogram', label: 'Parallellogram' }, { key: 'trapezium', label: 'Trapezium' },
    ],
};

export default function VormleerConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const kind: string = c.kind ?? 'punt-lijn';
    const mode: string = c.mode ?? 'herkennen';
    const classify: string = c.classify ?? 'vierhoeken';
    const concepts: string[] = c.concepts ?? [];
    const answerMode: string = c.answerMode ?? 'woordbank';
    const randomRotation: boolean = c.randomRotation ?? (kind === 'hoek');
    const showEqualSides: boolean = c.showEqualSides ?? c.showMarks ?? true;
    const showRightAngles: boolean = c.showRightAngles ?? c.showMarks ?? true;
    const showParallel: boolean = c.showParallel ?? false;
    const rightAngleStyle: string = c.rightAngleStyle ?? 'vierkantje';
    const showBoog: boolean = c.showBoog ?? true;
    const raster: boolean = c.raster ?? true;
    const perRow: number = c.exercisesPerRow ?? 3;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    const toggleConcept = (k: string) => {
        const next = concepts.includes(k) ? concepts.filter(x => x !== k) : [...concepts, k];
        if (next.length) set('concepts', next);   // keep ≥1
    };
    const pool = kind === 'hoek' ? HOEKEN : kind === 'figuur' ? (FIGUREN[classify] ?? FIGUREN['vierhoeken']) : PUNT_LIJN;
    const isTekenen = mode === 'tekenen';

    return (
        <div style={styles.container}>
            {kind === 'figuur' && (
                <div style={styles.section}>
                    <SettingLabel text="Opdracht:" info="Benoemen: figuur → naam. Eigenschappen: aankruistabel per kenmerk." />
                    <div style={styles.buttonGroup}>
                        <button onClick={() => set('mode', 'benoemen')} style={styles.radioBtn(mode === 'benoemen')}>Benoemen</button>
                        <button onClick={() => set('mode', 'eigenschappen')} style={styles.radioBtn(mode === 'eigenschappen')}>Eigenschappen</button>
                    </div>
                </div>
            )}

            {classify === 'driehoeken' && kind === 'figuur' ? (
                // Two labelled clusters so the teacher can mix hoek- and zijde-klassen freely.
                <div style={styles.section}>
                    <SettingLabel text="Driehoeken:" info="Kies vrij uit beide indelingen; de tabelkolommen volgen je keuze." />
                    <label style={styles.miniLabel}>Volgens hoeken</label>
                    <div style={styles.buttonGroup}>
                        {DRIEHOEK_HOEKEN.map(p => (
                            <button key={p.key} onClick={() => toggleConcept(p.key)} style={styles.pill(concepts.includes(p.key))}>{p.label}</button>
                        ))}
                    </div>
                    <label style={{ ...styles.miniLabel, marginTop: '6px' }}>Volgens zijden</label>
                    <div style={styles.buttonGroup}>
                        {DRIEHOEK_ZIJDEN.map(p => (
                            <button key={p.key} onClick={() => toggleConcept(p.key)} style={styles.pill(concepts.includes(p.key))}>{p.label}</button>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={styles.section}>
                    <SettingLabel text={kind === 'hoek' ? 'Hoeken:' : kind === 'figuur' ? 'Figuren:' : 'Begrippen:'} info="Wat er op het blad voorkomt." />
                    <div style={styles.buttonGroup}>
                        {pool.map(p => (
                            <button key={p.key} onClick={() => toggleConcept(p.key)} style={styles.pill(concepts.includes(p.key))}>{p.label}</button>
                        ))}
                    </div>
                </div>
            )}

            {!isTekenen && mode !== 'eigenschappen' && (
                <div style={styles.section}>
                    <SettingLabel text="Antwoordvorm:" info="Met woordbank staan de namen bovenaan om uit te kiezen." />
                    <div style={styles.buttonGroup}>
                        <button onClick={() => set('answerMode', 'woordbank')} style={styles.radioBtn(answerMode === 'woordbank')}>Woordbank</button>
                        <button onClick={() => set('answerMode', 'schrijven')} style={styles.radioBtn(answerMode === 'schrijven')}>Zelf schrijven</button>
                    </div>
                </div>
            )}

            {kind === 'hoek' && (
                <>
                    <div style={styles.onOffRow}>
                        <SettingLabel text="Gedraaide hoeken" info="Uit: het basisbeen ligt horizontaal (makkelijker herkennen)." />
                        <button onClick={() => set('randomRotation', !randomRotation)} style={styles.onOffBtn(randomRotation)}>{randomRotation ? 'Aan' : 'Uit'}</button>
                    </div>
                    <div style={styles.onOffRow}>
                        <SettingLabel text="Hoekboog tonen" info="Tekent het boogje (of vierkantje bij een rechte hoek) in elke hoek." />
                        <button onClick={() => set('showBoog', !showBoog)} style={styles.onOffBtn(showBoog)}>{showBoog ? 'Aan' : 'Uit'}</button>
                    </div>
                </>
            )}

            {kind === 'figuur' && (
                <>
                    <div style={styles.onOffRow}>
                        <SettingLabel text="Gelijke lengtes aanduiden" info="Streepjes op zijden met dezelfde lengte." />
                        <button onClick={() => set('showEqualSides', !showEqualSides)} style={styles.onOffBtn(showEqualSides)}>{showEqualSides ? 'Aan' : 'Uit'}</button>
                    </div>
                    <div style={styles.onOffRow}>
                        <SettingLabel text="Rechte hoeken aanduiden" info="Een teken in elke rechte hoek." />
                        <button onClick={() => set('showRightAngles', !showRightAngles)} style={styles.onOffBtn(showRightAngles)}>{showRightAngles ? 'Aan' : 'Uit'}</button>
                    </div>
                    {showRightAngles && (
                        <div style={styles.section}>
                            <SettingLabel text="Teken voor rechte hoek:" info="Vierkantje in de hoek, of het losse haakje." />
                            <div style={styles.buttonGroup}>
                                <button onClick={() => set('rightAngleStyle', 'vierkantje')} style={styles.radioBtn(rightAngleStyle === 'vierkantje')}>Vierkantje</button>
                                <button onClick={() => set('rightAngleStyle', 'haakje')} style={styles.radioBtn(rightAngleStyle === 'haakje')}>Haakje</button>
                            </div>
                        </div>
                    )}
                    <div style={styles.onOffRow}>
                        <SettingLabel text="Evenwijdige zijden tonen" info="Pijltjes op evenwijdige zijden (één pijltje per paar, twee bij een tweede paar)." />
                        <button onClick={() => set('showParallel', !showParallel)} style={styles.onOffBtn(showParallel)}>{showParallel ? 'Aan' : 'Uit'}</button>
                    </div>
                    <div style={styles.onOffRow}>
                        <SettingLabel text="Gedraaide figuren" info="Figuren staan licht gedraaid zodat herkenning niet aan de stand hangt." />
                        <button onClick={() => set('randomRotation', !randomRotation)} style={styles.onOffBtn(randomRotation)}>{randomRotation ? 'Aan' : 'Uit'}</button>
                    </div>
                </>
            )}

            {isTekenen && (
                <div style={styles.onOffRow}>
                    <SettingLabel text="Rasterlijnen" info="Een licht 1 cm-raster in het tekenvak." />
                    <button onClick={() => set('raster', !raster)} style={styles.onOffBtn(raster)}>{raster ? 'Aan' : 'Uit'}</button>
                </div>
            )}

            {!isTekenen && mode !== 'eigenschappen' && (
                <div style={styles.section}>
                    <SettingLabel text="Figuren per rij:" info="Hoeveel tekeningen naast elkaar staan." />
                    <PopupSelect
                        value={perRow}
                        options={[2, 3, 4].map(v => ({ value: v, label: String(v) }))}
                        onChange={(v) => set('exercisesPerRow', v)}
                        ariaLabel="Per rij"
                    />
                </div>
            )}
        </div>
    );
}
