import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import NaturalSettings from './multiplication/NaturalSettings';
import DecimalSettings from './multiplication/DecimalSettings';
import RationalSettings from './multiplication/RationalSettings';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';
import HrPresetRow from './HrPresetRow';

interface Props { block: MathBlock; }

export default function DivisionConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const { numberType = 'natural', equationType = 'normal', preset = 'vrij' } = block.constraints;
    const isTienvoud = preset === 'tienvoud';

    const updateConstraint = (key: string, value: unknown) => {
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });
    };

    return (
        <div style={styles.container}>
            {/* OEFENVORM + AANTAL FACTOREN */}
            {numberType !== 'rational' && <HrPresetRow block={block} variant="muldiv" />}

            {/* TYPE OEFENING */}
            <div style={styles.section}>
                <SettingLabel text="Type oefening:" info="Gewone som (a : b = …) of puntoefening (a : … = c)." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => updateConstraint('equationType', 'normal')} style={styles.radioBtn(equationType === 'normal' || !equationType)}>
                        Gewone  (a : b = …)
                    </button>
                    <button onClick={() => updateConstraint('equationType', 'puntoefening')} style={styles.radioBtn(equationType === 'puntoefening')}>
                        Punt  (a : · = c)
                    </button>
                </div>
            </div>

            {/* SUB-CONFIGURATIE per getaltype (verborgen bij het tienvoud-preset) */}
            {numberType === 'natural' && !isTienvoud && <NaturalSettings block={block} isDivision={true} />}
            {numberType === 'decimal' && !isTienvoud && <DecimalSettings block={block} isDivision={true} />}
            {numberType === 'rational' && <RationalSettings block={block} isDivision={true} />}
        </div>
    );
}
