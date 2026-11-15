import { useSpelStore } from '../useSpelStore';
import SpelScreen from '../SpelScreen';

/** The audit page's root: the game screen once window.__spelAudit.show(…) started one. */
export default function PresentAudit() {
    const phase = useSpelStore(s => s.phase);
    return phase === 'idle' ? <p className="oefen-lead">Spelen weergave: stuur window.__spelAudit.show(…)</p> : <SpelScreen />;
}
