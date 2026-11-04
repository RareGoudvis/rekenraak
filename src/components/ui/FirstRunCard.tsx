import { FIRST_RUN, type FirstRunModule } from '../../config/firstRun';
import { useFirstRun } from '../../hooks/useFirstRun';

// Once-per-module intro card; replayable via resetFirstRun(module) from Help.
export default function FirstRunCard({ module }: { module: FirstRunModule }) {
    const { show, dismiss } = useFirstRun(module);
    if (!show) return null;
    const c = FIRST_RUN[module];
    return (
        <section role="region" aria-label={c.title} data-testid="first-run-card" style={{
            margin: 'var(--sp-3)', padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-surface)', border: '1px solid var(--accent)', color: 'var(--text-main)',
            display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', maxWidth: 560,
        }}>
            <strong style={{ fontSize: 'var(--text-sm)' }}>{c.title}</strong>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
                {c.lines.map(l => <li key={l}>{l}</li>)}
            </ul>
            <button type="button" onClick={dismiss} style={{
                alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-on)', fontWeight: 700, fontFamily: 'inherit',
            }}>Begrepen</button>
        </section>
    );
}
