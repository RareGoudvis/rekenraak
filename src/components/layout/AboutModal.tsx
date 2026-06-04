import { useEffect, type ReactNode } from 'react';
import ModalPortal from '../ui/ModalPortal';
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
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <ModalPortal>
        <div
            className="no-print"
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-4)',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Over dit project"
                style={{
                    backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)',
                    borderRadius: '12px', maxWidth: '640px', width: '100%', maxHeight: '85vh',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden', color: 'var(--text-main)',
                }}
            >
                {/* Fixed header */}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-1)', padding: 'var(--sp-6) var(--sp-6) var(--sp-4)', borderBottom: '1px solid var(--separator)' }}>
                    <Wordmark height={40} />
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Sluiten"
                        className="ui-hover"
                        style={{ position: 'absolute', top: 'var(--sp-3)', right: 'var(--sp-3)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 'var(--text-xl)', lineHeight: 1, padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}
                    >
                        ×
                    </button>
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

                    <h3 style={S.h3}>Waarom rekenraak?</h3>
                    <p style={S.p}>
                        Een hele industrie verkoopt leerkrachten dingen die ze zouden kunnen maken. Ons onderwijs zit
                        vol met de befaamde invulboeken en steeds vaker betalen scholen (of zelfs leerkrachten uit
                        eigen zak) elke maand om hun lesmateriaal te mogen gebruiken. Zo betalen ze huur op hun eigen werk.
                    </p>
                    <p style={S.p}>
                        Werkbladen zijn daar het mooiste voorbeeld van. Facebookgroepen voor leerkrachten staan vol met
                        webpagina's die jou een bundel willen verkopen. Jammer genoeg gaan we daar al te lang in mee. Vandaar dit open source project.<br />
                    </p>
                    <p style={S.p}>
                        Delen is een morele plicht. Kennis
                        moet vrij toegankelijk zijn.
                    </p>
                    <p style={S.italic}>
                        Alle oefeningen passen binnen de nieuwe Vlaamse minimumdoelen. Je zal hier geen extra
                        tekeningen of spelletjes vinden. Droge, rustige werkbladen om de leerstof verder in te slijpen.
                    </p>

                    <h3 style={S.h3}>Hoe werd dit gemaakt?</h3>
                    <p style={S.p}>
                        rekenraak is gebouwd als een moderne webapplicatie die volledig in je browser draait — er is
                        geen server en er worden geen gegevens verzonden of opgeslagen op een externe locatie.
                        LocalStorage (op jouw computer) wordt gebruikt om presets op te slaan. Via Cloudflare analytics
                        heb ik wel inzicht in het aantal gebruikers, maar gebruikers worden niet individueel gevolgd.
                    </p>
                    <p style={S.p}>
                        De interface is gemaakt met React en TypeScript, gebundeld met Vite. De toestand van je werkblad
                        (alle blokken en instellingen) wordt beheerd met Zustand, en deelbare links worden compact
                        gehouden met lz-string-compressie. De iconen komen van Phosphor, en de vormgeving gebruikt eigen
                        CSS met thema's (licht, donker en hoog contrast) via CSS-variabelen — de{' '}
                        <A href="https://developer.apple.com/design/human-interface-guidelines">'Human Interface Guidelines'</A>{' '}
                        van Apple waren een gids voor de opbouw van de UI.
                    </p>
                    <p style={S.p}>
                        Werkbladen worden afgedrukt of als PDF bewaard via de ingebouwde printfunctie van de browser;
                        wat je op het scherm ziet, is exact wat er op papier komt. Onder de motorkap is alles dus gewoon
                        HTML, CSS en JavaScript.
                    </p>
                    <p style={S.p}>
                        De pagina wordt gehost via <A href="https://www.cloudflare.com/">Cloudflare Pages</A>, de
                        domeinnaam werd geregistreerd bij <A href="https://www.hostinger.com/be-nl">Hostinger</A>.
                    </p>
                    <p style={S.p}>
                        De code zelf werd mede gemaakt met <A href="https://claude.ai/">Claude Code</A>.
                    </p>

                    <h3 style={S.h3}>Open source</h3>
                    <p style={S.p}>
                        De code staat volledig open op <A href="https://github.com/RareGoudvis/rekenraak">GitHub</A>.
                        Iedereen mag ze inkijken, en iedereen mag ze forken en er een eigen versie van maken — dat
                        garandeert de licentie.
                    </p>
                    <p style={S.p}>
                        Wat ik niet doe: inzendingen aannemen. Deze site host enkel mijn eigen versie. Wil je iets
                        anders? Fork gerust en bouw je eigen ding — dat is net het punt van open source.
                    </p>

                    <h3 style={S.h3}>Licentie</h3>
                    <p style={S.p}>
                        <strong>
                            <A href="https://www.gnu.org/licenses/agpl-3.0.txt">GNU AGPL-3.0</A>.
                        </strong>{' '}
                        Gebruik het, pas het aan, deel het. Maar bouw je erop voort — ook verstopt achter een
                        betaaldienst — dan moet je je volledige broncode onder diezelfde licentie openstellen. Niemand
                        kan dit dichttimmeren en als gesloten product verkopen. Wat vrij is, blijft vrij.
                    </p>
                    <p style={{ ...S.p, marginBottom: 0 }}>
                        Wil je toch iets geven? Koop mij dan een pintje via het hartje onderaan.<br />  
                    </p>
                        <span style={{ display: 'block', textAlign: 'right', marginTop: '20px', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-muted)' }}>Gemaakt door Ruben V.H.</span>
                </div>
            </div>
            
        </div>
            
        </ModalPortal>
    );
}

const S = {
    lead: { margin: '0 0 var(--sp-4)', fontSize: 'var(--text-md)', fontWeight: 600, lineHeight: 1.5, color: 'var(--text-main)' } as React.CSSProperties,
    h3: { margin: 'var(--sp-5) 0 var(--sp-2)', fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-main)' } as React.CSSProperties,
    p: { margin: '0 0 var(--sp-3)', fontSize: 'var(--text-base)', lineHeight: 1.55, color: 'var(--text-main)' } as React.CSSProperties,
    italic: { margin: '0 0 var(--sp-3)', fontSize: 'var(--text-base)', lineHeight: 1.55, fontStyle: 'italic', color: 'var(--text-muted)' } as React.CSSProperties,
};
