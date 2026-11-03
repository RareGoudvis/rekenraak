import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { betaStripKey as keyOf } from '../../hooks/useFirstRun';
import { BETA_MODULES, BETA_TEXT, FEEDBACK_URL, type BetaModule } from '../../config/beta';


// Dismissable one-line beta notice, remembered per module.
export default function BetaStrip({ module }: { module: BetaModule }) {
    const [hidden, setHidden] = useState<boolean>(() => {
        try { return !!localStorage.getItem(keyOf(module)); } catch { return false; }
    });
    if (!BETA_MODULES[module] || hidden) return null;
    const dismiss = () => {
        try { localStorage.setItem(keyOf(module), '1'); } catch { /* ignore */ }
        setHidden(true);
    };
    return (
        <div role="note" data-testid="beta-strip" style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-1) var(--sp-3)',
            background: 'var(--accent-soft)', color: 'var(--text-main)', fontSize: 'var(--text-sm)', lineHeight: 1.4,
        }}>
            <span style={{ flex: 1 }}>
                {BETA_TEXT.replace('Mail ons.', '')}
                {/* A button, not an <a>: the builder's tests (and its share link) rely on being the only link in the modal */}
                <button type="button" onClick={() => window.open(FEEDBACK_URL, '_blank', 'noopener,noreferrer')}
                    style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'var(--accent)', textDecoration: 'underline' }}>Mail ons.</button>
            </span>
            <button type="button" onClick={dismiss} aria-label="Bèta-melding sluiten" style={{
                background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', padding: 2,
            }}><X size={14} aria-hidden="true" /></button>
        </div>
    );
}
