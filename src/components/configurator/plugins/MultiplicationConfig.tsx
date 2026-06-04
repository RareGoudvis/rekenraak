import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import NaturalSettings from './multiplication/NaturalSettings';
import DecimalSettings from './multiplication/DecimalSettings';
import RationalSettings from './multiplication/RationalSettings'; 
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

export default function MultiplicationConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const { numberType = 'natural', equationType = 'normal', excludeOne = false } = block.constraints;

    const updateConstraint = (key: string, value: unknown) => {
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });
    };

    return (
        <div style={styles.container}>
            {/* TYPE OEFENING */}
            <div style={styles.section}>
                <SettingLabel text="Type oefening:" info="Gewone som (a x b = …) of puntoefening (a x … = c)." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => updateConstraint('equationType', 'normal')} style={styles.radioBtn(equationType === 'normal' || !equationType)}>
                        Gewone (a x b = ...)
                    </button>
                    <button onClick={() => updateConstraint('equationType', 'puntoefening')} style={styles.radioBtn(equationType === 'puntoefening')}>
                        Punt (a x . = c)
                    </button>
                </div>
            </div>

            {/* LAAD DE JUISTE UI GEBASEERD OP DE KEUZE HIERBOVEN */}
            {numberType === 'natural' && <NaturalSettings block={block} />}
            {numberType === 'decimal' && <DecimalSettings block={block} />}

            {/* 🔥 Hier vertellen we React om jouw nieuwe paneel te tonen */}
            {numberType === 'rational' && <RationalSettings block={block} />}

            {/* EXCLUDE 1 — laatste engine-instelling: weert de makkelijkste oefeningen (×1) */}
            <div style={styles.section}>
                <div style={styles.onOffRow}>
                    <span style={styles.onOffLabel}>Zonder ×1 (makkelijkste weglaten)</span>
                    <button onClick={() => updateConstraint('excludeOne', !excludeOne)} style={styles.onOffBtn(excludeOne)}>
                        {excludeOne ? 'AAN' : 'UIT'}
                    </button>
                </div>
            </div>

        </div>
    );
}