import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

// Sensible percent pools per variant: korting uses shop-style percents,
// intrest uses bank-style rentevoeten.
const KORTING_PERCENTS = [5, 10, 20, 25, 50, 75];
const INTREST_PERCENTS = [1, 2, 3, 4, 5, 10];

export default function GeldRekenenConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const subType: string = c.subType ?? 'korting';
    const percents: number[] = c.percents ?? [10, 25, 50];
    const maxEuro = c.maxEuro ?? 100;
    const wholeEuros: boolean = c.wholeEuros ?? true;
    const halfYear: boolean = c.halfYear ?? false;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    const togglePercent = (p: number) => {
        const next = percents.includes(p) ? percents.filter(x => x !== p) : [...percents, p];
        if (next.length) set('percents', next);   // keep ≥1
    };
    const percentPool = subType === 'intrest' ? INTREST_PERCENTS : KORTING_PERCENTS;

    return (
        <div style={styles.container}>
            {subType !== 'winst' && (
                <div style={styles.section}>
                    <SettingLabel text={subType === 'intrest' ? 'Rentevoeten:' : 'Kortingen:'} info="Welke percenten in de tabel voorkomen." />
                    <div style={styles.buttonGroup}>
                        {percentPool.map(p => (
                            <button key={p} onClick={() => togglePercent(p)} style={styles.pill(percents.includes(p))}>{p} %</button>
                        ))}
                    </div>
                </div>
            )}

            <div style={styles.section}>
                <SettingLabel text="Maximum bedrag:" info="Het grootste bedrag in de tabel." />
                <PopupSelect
                    clampToLowest
                    value={maxEuro}
                    options={[100, 1000, 10000].map(v => ({ value: v, label: `Tot € ${v.toLocaleString('nl-BE')}` }))}
                    onChange={(v) => set('maxEuro', v)}
                    ariaLabel="Maximum bedrag"
                />
            </div>

            <div style={styles.onOffRow}>
                <SettingLabel text="Enkel hele euro's" info="Uit: bedragen kunnen ook centen bevatten (antwoorden blijven op de cent juist)." />
                <button onClick={() => set('wholeEuros', !wholeEuros)} style={styles.onOffBtn(wholeEuros)}>{wholeEuros ? 'Aan' : 'Uit'}</button>
            </div>

            {subType === 'intrest' && (
                <div style={styles.onOffRow}>
                    <SettingLabel text="Ook 6 maanden" info="Naast 1 jaar ook een looptijd van een half jaar (intrest pro rata)." />
                    <button onClick={() => set('halfYear', !halfYear)} style={styles.onOffBtn(halfYear)}>{halfYear ? 'Aan' : 'Uit'}</button>
                </div>
            )}
        </div>
    );
}
