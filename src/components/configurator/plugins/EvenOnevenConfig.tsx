import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';
import PopupSelect from '../../ui/PopupSelect';

interface Props { block: MathBlock; }

const MAX_PRESETS = [20, 100, 1000, 10000];

export default function EvenOnevenConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const { subType = 'rooster', maxGetal = 100, target = 'even', perRow = 10 } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });

    return (
        <div style={styles.container}>
            {/* Wat moet gekleurd worden */}
            <div style={styles.section}>
                <SettingLabel text="Kleur de:" info="Welke getallen de leerling moet inkleuren (even of oneven)." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('target', 'even')} style={styles.radioBtn(target === 'even')}>Even getallen</button>
                    <button onClick={() => set('target', 'oneven')} style={styles.radioBtn(target === 'oneven')}>Oneven getallen</button>
                </div>
            </div>

            {subType === 'rooster' ? (
                <>
                    <div style={styles.section}>
                        <SettingLabel text="Maximum getal:" info="Het grootste getal in het rooster." />
                        <PopupSelect
                            clampToLowest
                            value={maxGetal}
                            options={MAX_PRESETS.map(val => ({ value: val, label: `Tot ${val.toLocaleString('nl-BE')}` }))}
                            onChange={(val) => set('maxGetal', val)}
                            ariaLabel="Maximum getal"
                        />
                    </div>
                    <div style={styles.section}>
                        <SettingLabel text={`Getallen per rij: ${perRow}`} info="Hoeveel getallen er per rij in het rooster staan." />
                        <input type="range" min="5" max="14" step="1" value={perRow}
                            onChange={(e) => set('perRow', Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                    </div>
                </>
            ) : (
                <div style={styles.section}>
                    <p style={styles.hint}>
                        Elke oefening toont een aantal cirkels (max 24). De leerling groepeert ze per 2 en bepaalt even of oneven.
                    </p>
                </div>
            )}
        </div>
    );
}
