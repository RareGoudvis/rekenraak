import { type ReactNode } from 'react';
import ModalShell from '../ui/ModalShell';
import Wordmark from '../ui/Wordmark';

interface Props {
    onClose: () => void;
}

// External link — always new tab + noopener.
function A({ href, children }: { href: string; children: ReactNode }) {
    return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{children}</a>;
}

// "Over dit project" — the project's manifesto + tech + license. Long-form, so the
// header (wordmark + tagline + close) is fixed and the body scrolls.
export default function AboutModal({ onClose }: Props) {
    return (
        <ModalShell onClose={onClose} ariaLabel="Over dit project" variant="sheet" maxWidth={640}>
                {/* Fixed header */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-1)', padding: 'var(--sp-6) var(--sp-6) var(--sp-4)', borderBottom: '1px solid var(--separator)' }}>
                    <Wordmark height={40} />
                </div>

                {/* Scrollable body */}
                <div style={{ overflowY: 'auto', padding: 'var(--sp-5) var(--sp-6) var(--sp-6)' }}>
                    <p style={S.lead}>
                        Een gratis generator voor wiskunde, gebaseerd op de leerstof in de nieuwe minimumdoelen.
                        Geen accounts. Geen abonnement. Geen 'paywall' — nooit. Lesmateriaal verkopen mag geen
                        verdienmodel zijn. Daarom kan je deze tool binnenkort ook terugvinden via KlasCement, het
                        portaal van de Vlaamse Overheid waar leerkrachten hun materiaal gratis delen.
                    </p>

                    <h3 style={S.h3}>Wat doet rekenraak?</h3>
                    <p style={S.p}>
                        Het werkt een beetje zoals een legoset. Je kiest de bouwblokken, verfijnt de instellingen
                        en laat de generator zijn werk doen.
                    </p>
                    <p style={S.p}>
                        Het is een 'work in progress', het project zelf is dus zeker nog niet af. Feedback is daarbij
                        belangrijk. Werkt iets niet? Mis je een bepaald type oefening? Denk je aan een andere visuele
                        voorstelling bij een oefening? Geef het door via het{' '}
                        <A href="https://forms.gle/jc1LcMXaRG3V3M556">feedbackformulier</A>. Ik kan niet beloven dat
                        alles ook geïmplementeerd wordt.
                    </p>

                    <p style={{ ...S.p, marginTop: 'var(--sp-4)', marginBottom: 0 }}>
                        <a href="/about.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Lees meer over het project &rarr;</a>
                    </p>
                    <p style={{ ...S.p, marginTop: 'var(--sp-2)', marginBottom: 0, fontSize: 'var(--text-sm)' }}>
                        <A href="/faq.html">Veelgestelde vragen</A> &middot; <A href="/oefeningen.html">Alle oefeningen</A>
                    </p>
                    <span style={{ display: 'block', textAlign: 'right', marginTop: '20px', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-muted)' }}>Gemaakt door Ruben V.H.</span>
                </div>
        </ModalShell>
    );
}

const S = {
    lead: { margin: '0 0 var(--sp-4)', fontSize: 'var(--text-md)', fontWeight: 600, lineHeight: 1.5, color: 'var(--text-main)' } as React.CSSProperties,
    h3: { margin: 'var(--sp-5) 0 var(--sp-2)', fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-main)' } as React.CSSProperties,
    p: { margin: '0 0 var(--sp-3)', fontSize: 'var(--text-base)', lineHeight: 1.55, color: 'var(--text-main)' } as React.CSSProperties,
    italic: { margin: '0 0 var(--sp-3)', fontSize: 'var(--text-base)', lineHeight: 1.55, fontStyle: 'italic', color: 'var(--text-muted)' } as React.CSSProperties,
};
