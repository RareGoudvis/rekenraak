import { sharedPluginStyles as styles } from './sharedPluginStyles';
import InfoTip from '../../ui/InfoTip';

interface Props {
    text: string;
    info?: string;             // one-line explanation → ⓘ tooltip
    group?: boolean;           // use the bold groupLabel tier instead of label
}

// A config-plugin field label with an optional ⓘ help tooltip. Drop-in for the
// bare `<label style={styles.label}>…</label>` pattern.
export default function SettingLabel({ text, info, group }: Props) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: group ? 'var(--sp-3)' : 'var(--sp-2)' }}>
            <label style={{ ...(group ? styles.groupLabel : styles.label), margin: 0 }}>{text}</label>
            {info && <InfoTip text={info} />}
        </div>
    );
}
