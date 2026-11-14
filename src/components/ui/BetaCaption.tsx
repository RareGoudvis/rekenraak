import { BETA_MODULES } from '../../config/beta';

const LABEL: Record<keyof typeof BETA_MODULES, string> = { oefenmodus: 'Oefenmodus', bordmodus: 'Whiteboard' };

// One muted line under the mode buttons instead of a pill per button: two identical pills in a row read as noise.
export default function BetaCaption() {
    const names = (Object.keys(BETA_MODULES) as (keyof typeof BETA_MODULES)[]).filter(k => BETA_MODULES[k]).map(k => LABEL[k]);
    if (names.length === 0) return null;
    const list = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' en ' + names[names.length - 1];
    return (
        <div data-testid="beta-caption" style={{ padding: '0 var(--sp-4) var(--sp-2)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.3, textAlign: 'center' }}>
            {list} {names.length === 1 ? 'is' : 'zijn'} in bèta
        </div>
    );
}
