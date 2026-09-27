import { useConstraints } from '../useConstraints';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';
import PopupSelect from '../../ui/PopupSelect';
import { RANGES, presetLabel } from '../../../config/numberRanges';
import type { EvenOnevenConstraints } from '../../../services/math/constraintTypes';

interface Props { block: MathBlock; }

export default function EvenOnevenConfig({ block }: Props) {
    const [c, patch] = useConstraints<EvenOnevenConstraints>(block);
    const { subType = 'rooster', maxGetal = 100, target = 'even', perRow = 10 } = c;

    const set = (key: string, value: unknown) =>
        patch({ [key]: value } as Partial<EvenOnevenConstraints>);

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
                            options={RANGES.evenOneven().map(val => ({ value: val, label: presetLabel(val) }))}
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
