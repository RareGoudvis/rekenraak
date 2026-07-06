import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

const OPS = [
    { key: '+', label: '+' }, { key: '-', label: '−' }, { key: 'x', label: '×' }, { key: ':', label: ':' },
];

export default function KettingConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const ops: string[] = c.ops ?? ['+', '-'];
    const opSettings: Record<string, { max: number }> = c.opSettings ?? {};
    const chainLength: number = c.chainLength ?? 4;
    const maxGetal = c.maxGetal ?? 100;
    const blankMiddle: boolean = c.blankMiddle ?? false;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    const toggleOp = (op: string) => {
        const next = ops.includes(op) ? ops.filter(x => x !== op) : [...ops, op];
        if (next.length) set('ops', next);   // keep ≥1
    };
    const setOpMax = (op: string, max: number) =>
        set('opSettings', { ...opSettings, [op]: { ...(opSettings[op] ?? {}), max } });

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Bewerkingen:" info="Welke stappen in de ketting voorkomen; opeenvolgende stappen verschillen altijd." />
                <div style={styles.buttonGroup}>
                    {OPS.map(op => (
                        <button key={op.key} onClick={() => toggleOp(op.key)} style={styles.pill(ops.includes(op.key))}>{op.label}</button>
                    ))}
                </div>
            </div>

            {ops.filter(o => o === '+' || o === '-').length > 0 && (
                <div style={styles.section}>
                    <SettingLabel text="Grootste sprong (+/−):" info="De grootste stapwaarde bij optellen en aftrekken." />
                    <PopupSelect
                        value={opSettings['+']?.max ?? opSettings['-']?.max ?? 10}
                        options={[10, 20, 50, 100].map(v => ({ value: v, label: `Tot ${v}` }))}
                        onChange={(v) => { setOpMax('+', Number(v)); set('opSettings', { ...opSettings, '+': { max: Number(v) }, '-': { max: Number(v) } }); }}
                        ariaLabel="Grootste sprong"
                    />
                </div>
            )}

            <div style={styles.section}>
                <SettingLabel text="Lengte van de ketting:" info="Aantal stappen tussen start en einde." />
                <div style={styles.buttonGroup}>
                    {[3, 4, 5].map(n => (
                        <button key={n} onClick={() => set('chainLength', n)} style={styles.radioBtn(chainLength === n)}>{n} stappen</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Maximum getal:" info="Tussenresultaten blijven onder dit getal." />
                <PopupSelect
                    clampToLowest
                    value={maxGetal}
                    options={[20, 100, 1000].map(v => ({ value: v, label: `Tot ${v.toLocaleString('nl-BE')}` }))}
                    onChange={(v) => set('maxGetal', v)}
                    ariaLabel="Maximum getal"
                />
            </div>

            <div style={styles.onOffRow}>
                <SettingLabel text="Ook tussenstap blanco" info="Naast het eindresultaat wordt ook één tussenwaarde opengelaten." />
                <button onClick={() => set('blankMiddle', !blankMiddle)} style={styles.onOffBtn(blankMiddle)}>{blankMiddle ? 'Aan' : 'Uit'}</button>
            </div>
        </div>
    );
}
