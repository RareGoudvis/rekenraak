import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { getMaskPlaces } from '../../../services/math/mathEngine';
import { REP_OPTIONS } from '../../../services/vergelijken/representations';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';
import FractionMaxField from './FractionMaxField';
import PopupSelect from '../../ui/PopupSelect';

interface Props { block: MathBlock; }

const MAX_PRESETS = [100, 1000, 10000, 100000, 1000000];
const REP_MAX_PRESETS = [10, 100, 1000];   // representaties: tienden/honderdsten range

export default function VergelijkenConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const { subType = 'getallen', maxGetal = 1000, numberMask = {}, chooseTarget = 'grootste', setSize = 4, decimalPlaces = 0, leftRep = 'breuk', rightRep = 'kommagetal', leftMask = {}, rightMask = {},
        leftFracN = 4, leftFracD = 8, rightFracN = 4, rightFracD = 8 } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });
    const toggleMask = (k: string) => set('numberMask', { ...numberMask, [k]: !numberMask[k] });
    const places = getMaskPlaces(maxGetal, decimalPlaces > 0 ? 'decimal' : 'natural', decimalPlaces);
    const isRep = subType === 'representaties';
    // representaties: each side has its own representation + getalopbouw mask.
    const repPlaces = getMaskPlaces(maxGetal, 'decimal', decimalPlaces || 1);
    const toggleSideMask = (side: 'leftMask' | 'rightMask', mask: Record<string, boolean>, k: string) =>
        set(side, { ...mask, [k]: !mask[k] });

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Maximum getal:" info="Het grootste getal dat vergeleken wordt." />
                <PopupSelect
                    clampToLowest
                    value={maxGetal}
                    options={(isRep ? REP_MAX_PRESETS : MAX_PRESETS).map(val => ({ value: val, label: `Tot ${val.toLocaleString('nl-BE')}` }))}
                    onChange={(val) => set('maxGetal', val)}
                    ariaLabel="Maximum getal"
                />
            </div>

            <div style={styles.section}>
                <SettingLabel text="Decimalen:" info="Hoeveel cijfers er na de komma staan." />
                <div style={styles.buttonGroup}>
                    {(isRep ? [1, 2] : [0, 1, 2, 3]).map(dp => (
                        <button key={dp} onClick={() => set('decimalPlaces', dp)} style={styles.radioBtn(decimalPlaces === dp)}>{dp === 0 ? 'Geen' : dp}</button>
                    ))}
                </div>
            </div>

            {/* REPRESENTATIES — two columns: each side owns its representation + getalopbouw */}
            {isRep && (
                <div style={{ ...styles.section, display: 'flex', gap: '14px' }}>
                    {([
                        { title: 'Linkerkant', rep: leftRep, repKey: 'leftRep', maskKey: 'leftMask' as const, mask: leftMask, fnKey: 'leftFracN', fdKey: 'leftFracD', fn: leftFracN, fd: leftFracD },
                        { title: 'Rechterkant', rep: rightRep, repKey: 'rightRep', maskKey: 'rightMask' as const, mask: rightMask, fnKey: 'rightFracN', fdKey: 'rightFracD', fn: rightFracN, fd: rightFracD },
                    ]).map((col, i) => (
                        <div key={col.repKey} style={{ flex: 1, minWidth: 0, ...(i === 1 ? { borderLeft: '1px solid var(--separator)', paddingLeft: '14px' } : {}) }}>
                            <SettingLabel text={`${col.title}:`} info="In welke vorm deze kant getoond wordt (breuk, kommagetal, ...)." />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                                {REP_OPTIONS.map(o => (
                                    <button key={o.key} onClick={() => set(col.repKey, o.key)} style={styles.radioBtn(col.rep === o.key)}>{o.label}</button>
                                ))}
                            </div>
                            <SettingLabel text="Getalopbouw:" info="Welke posities (eenheden, tienden, ...) het getal mag bevatten." />
                            {/* A breuk side uses the teller/noemer widget; other reps use the place mask. */}
                            {col.rep === 'breuk' ? (
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <FractionMaxField
                                        numerator={col.fn}
                                        denominator={col.fd}
                                        onNumerator={(v) => set(col.fnKey, v)}
                                        onDenominator={(v) => set(col.fdKey, v)}
                                    />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    {repPlaces.map(p => (
                                        <button key={p.key} onClick={() => toggleSideMask(col.maskKey, col.mask, p.key)} style={styles.maskBtn(!!col.mask[p.key])} title={p.label}>{p.key}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {subType === 'kiezen' && (
                <>
                    <div style={styles.section}>
                        <SettingLabel text="Omcirkel het:" info="Of de leerling het grootste of het kleinste getal kiest." />
                        <div style={styles.buttonGroup}>
                            <button onClick={() => set('chooseTarget', 'grootste')} style={styles.radioBtn(chooseTarget === 'grootste')}>Grootste</button>
                            <button onClick={() => set('chooseTarget', 'kleinste')} style={styles.radioBtn(chooseTarget === 'kleinste')}>Kleinste</button>
                        </div>
                    </div>
                    <div style={styles.section}>
                        <SettingLabel text={`Getallen per oefening: ${setSize}`} info="Uit hoeveel getallen de leerling moet kiezen." />
                        <input type="range" min="3" max="6" step="1" value={setSize}
                            onChange={(e) => set('setSize', Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                    </div>
                </>
            )}

            {!isRep && (
                <div style={styles.section}>
                    <SettingLabel text="Specifieke getalopbouw:" info="Welke posities de getallen mogen bevatten. Leeg = vrije opbouw." />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {places.map(p => (
                            <button key={p.key} onClick={() => toggleMask(p.key)} style={styles.maskBtn(!!numberMask[p.key])} title={p.label}>{p.key}</button>
                        ))}
                    </div>
                    <p style={styles.hint}>Leeg = vrije opbouw.</p>
                </div>
            )}
        </div>
    );
}
