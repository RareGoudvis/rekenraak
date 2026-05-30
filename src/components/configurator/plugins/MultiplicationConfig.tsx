import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import NaturalSettings from './multiplication/NaturalSettings';
import DecimalSettings from './multiplication/DecimalSettings';
import RationalSettings from './multiplication/RationalSettings'; 
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props { block: MathBlock; }

export default function MultiplicationConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const { numberType = 'natural', equationType = 'normal' } = block.constraints;

    const updateConstraint = (key: string, value: unknown) => {
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });
    };

    return (
        <div style={styles.container}>
            {/* TYPE OEFENING */}
            <div style={styles.section}>
                <label style={styles.label}>Type oefening:</label>
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

        </div>
    );
}