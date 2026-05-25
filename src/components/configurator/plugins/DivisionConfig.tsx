import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import NaturalSettings from './multiplication/NaturalSettings';
import DecimalSettings from './multiplication/DecimalSettings';
import RationalSettings from './multiplication/RationalSettings';
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props { block: MathBlock; }

export default function DivisionConfig({ block }: Props) {
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
                        Gewone  (a : b = …)
                    </button>
                    <button onClick={() => updateConstraint('equationType', 'puntoefening')} style={styles.radioBtn(equationType === 'puntoefening')}>
                        Punt  (a : · = c)
                    </button>
                </div>
            </div>

            {/* SUB-CONFIGURATIE per getaltype */}
            {numberType === 'natural' && <NaturalSettings block={block} isDivision={true} />}
            {numberType === 'decimal' && <DecimalSettings block={block} isDivision={true} />}
            {numberType === 'rational' && <RationalSettings block={block} isDivision={true} />}
        </div>
    );
}
