import { useState } from 'react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import ModalShell from '../ui/ModalShell';
import { BETA_MODULES, BETA_TEXT, FEEDBACK_URL } from '../../config/beta';
import { resetFirstRun, resetBetaStrip } from '../../hooks/useFirstRun';
import { HANDLEIDING_URL, HELP_TOPICS } from './helpTopics';

interface Props {
    onClose: () => void;
    onStartTour?: () => void;
    onShowVideo?: () => void;
    onShowReleaseNotes?: () => void;
}

// The in-app help: a topic list on the left, a short answer on the right, and per topic a link
// to its section on the full manual (handleiding.html). Topics live in helpTopics.ts.
export default function HelpModal({ onClose, onStartTour, onShowVideo, onShowReleaseNotes }: Props) {
    const [topicId, setTopicId] = useState(HELP_TOPICS[0].id);
    const [replayed, setReplayed] = useState<string | null>(null);
    const topic = HELP_TOPICS.find(t => t.id === topicId) ?? HELP_TOPICS[0];
    const module = topic.module;

    return (
        <ModalShell onClose={onClose} ariaLabel="Hulp" variant="sheet" maxWidth={1040}>
            {/* A fixed height, so switching topics never makes the window jump. */}
            <div style={S.frame}>
                <header style={S.header}>
                    <h2 style={S.title}>Hulp</h2>
                    <p style={S.lead}>Kies links een onderwerp. Alles staat uitgebreider, met schermafbeeldingen, in de handleiding.</p>
                    <div style={S.actions}>
                        {onStartTour && <button type="button" onClick={onStartTour} style={S.primaryBtn}>▶ Start de rondleiding</button>}
                        {onShowVideo && <button type="button" onClick={onShowVideo} style={S.secondaryBtn}>Bekijk de video</button>}
                        {/* The way back to the release notes once the banner is dismissed. */}
                        {onShowReleaseNotes && <button type="button" onClick={onShowReleaseNotes} style={S.secondaryBtn}>Wat is er nieuw</button>}
                        <a href={HANDLEIDING_URL} target="_blank" rel="noopener" style={S.secondaryBtn}>
                            Open de handleiding <ArrowSquareOut size={15} aria-hidden />
                        </a>
                    </div>
                </header>

                <div style={S.body}>
                    <nav style={S.nav} aria-label="Onderwerpen">
                        {HELP_TOPICS.map(t => (
                            <button
                                key={t.id}
                                type="button"
                                className="ui-hover"
                                aria-pressed={t.id === topic.id}
                                onClick={() => setTopicId(t.id)}
                                style={t.id === topic.id ? { ...S.navBtn, ...S.navBtnActive } : S.navBtn}
                            >{t.title}</button>
                        ))}
                    </nav>

                    <article style={S.article} aria-live="polite">
                        <h3 style={S.topicTitle}>{topic.title}</h3>
                        <ul style={S.list}>
                            {topic.bullets.map(b => <li key={b} style={S.item}>{b}</li>)}
                        </ul>
                        {module && BETA_MODULES[module] && (
                            <p style={S.beta}>
                                {BETA_TEXT.replace('Mail ons.', '')}<a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" style={S.link}>Mail ons.</a>
                            </p>
                        )}
                        {module && (
                            <p style={{ margin: '0 0 var(--sp-4)' }}>
                                <button type="button" style={S.secondaryBtn} onClick={() => { resetFirstRun(module); resetBetaStrip(module); setReplayed(module); }}>
                                    Toon de uitleg opnieuw
                                </button>
                                {replayed === module && <span style={S.note}>Klaar: je ziet de uitleg de volgende keer dat je de module opent.</span>}
                            </p>
                        )}
                        <a href={`${HANDLEIDING_URL}#${topic.anchor}`} target="_blank" rel="noopener" style={S.more}>
                            Lees meer in de handleiding <ArrowSquareOut size={15} aria-hidden />
                        </a>
                        {topic.id === 'start' && (
                            <p style={S.feedback}>
                                Werkt iets niet of mis je iets? Laat het weten via het <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" style={S.link}>feedbackformulier</a>.
                            </p>
                        )}
                    </article>
                </div>
            </div>
        </ModalShell>
    );
}

const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
    padding: '9px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'inherit', textDecoration: 'none',
};

const S = {
    frame: { display: 'flex', flexDirection: 'column', height: 'min(760px, 85vh)', minHeight: 0, color: 'var(--text-main)' } as React.CSSProperties,
    header: { padding: 'var(--sp-5) var(--sp-6) var(--sp-4)', borderBottom: '1px solid var(--separator)', flex: 'none' } as React.CSSProperties,
    title: { margin: '0 0 4px', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-main)' } as React.CSSProperties,
    lead: { margin: '0 0 var(--sp-3)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5, paddingRight: 'var(--sp-8)' } as React.CSSProperties,
    actions: { display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' } as React.CSSProperties,
    primaryBtn: { ...btnBase, border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-on)' } as React.CSSProperties,
    secondaryBtn: { ...btnBase, border: '1px solid var(--separator)', background: 'var(--bg-input)', color: 'var(--text-main)' } as React.CSSProperties,
    body: { display: 'flex', flex: 1, minHeight: 0 } as React.CSSProperties,
    nav: {
        flex: '0 0 240px', overflowY: 'auto', padding: 'var(--sp-3) var(--sp-2)',
        borderRight: '1px solid var(--separator)', background: 'var(--bg-surface)',
        display: 'flex', flexDirection: 'column', gap: '2px',
    } as React.CSSProperties,
    navBtn: {
        textAlign: 'left', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: 'none',
        background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 'var(--text-sm)', fontWeight: 500,
    } as React.CSSProperties,
    navBtnActive: { background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 700 } as React.CSSProperties,
    article: { flex: 1, minWidth: 0, overflowY: 'auto', padding: 'var(--sp-5) var(--sp-6) var(--sp-6)' } as React.CSSProperties,
    topicTitle: { margin: '0 0 var(--sp-3)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-main)' } as React.CSSProperties,
    list: { margin: '0 0 var(--sp-4)', paddingLeft: 20 } as React.CSSProperties,
    item: { margin: '0 0 var(--sp-2)', fontSize: 'var(--text-md)', lineHeight: 1.55, color: 'var(--text-main)' } as React.CSSProperties,
    beta: { margin: '0 0 var(--sp-3)', fontSize: 'var(--text-sm)', lineHeight: 1.5, color: 'var(--text-muted)' } as React.CSSProperties,
    note: { marginLeft: 10, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' } as React.CSSProperties,
    feedback: { margin: 'var(--sp-5) 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' } as React.CSSProperties,
    link: { color: 'var(--accent)', textDecoration: 'underline' } as React.CSSProperties,
    more: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--accent)' } as React.CSSProperties,
};
