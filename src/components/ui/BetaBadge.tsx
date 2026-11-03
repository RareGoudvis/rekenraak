import { BETA_MODULES, type BetaModule } from '../../config/beta';

export default function BetaBadge({ module }: { module: BetaModule }) {
    if (!BETA_MODULES[module]) return null;
    return (
        <span data-testid="beta-badge" style={{
            marginLeft: 'var(--sp-1)', padding: '0 6px', borderRadius: 'var(--radius-pill)', flexShrink: 0,
            background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 'var(--text-xs)', fontWeight: 700, lineHeight: '16px',
        }}>bèta</span>
    );
}
