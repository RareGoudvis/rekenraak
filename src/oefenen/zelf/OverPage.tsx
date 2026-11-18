import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowSquareOut, Info, Trash, X } from '@phosphor-icons/react';
import { wipePupilData } from './pupilStorage';
import { FEEDBACK_URL, FRANS_TEXT, SHEETS_URL, SHOW_FRANS, STORED_ITEMS } from './overContent';
import './over.css';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
// Marks the history entry the page pushed, so a back gesture closes it and Sluiten pops it again.
const HISTORY_MARK = 'rekenraakOver';

const reloadPage = () => window.location.reload();

const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a className="over-link" href={href} target="_blank" rel="noopener noreferrer">
        {children} <ArrowSquareOut aria-hidden weight="bold" />
    </a>
);

interface DialogProps { onClosed(wiped: boolean): void }

const marked = () => !!(history.state as Record<string, unknown> | null)?.[HISTORY_MARK];

function OverDialog({ onClosed }: DialogProps) {
    const card = useRef<HTMLDivElement>(null);
    const closeBtn = useRef<HTMLButtonElement>(null);
    const wipeBtn = useRef<HTMLButtonElement>(null);
    const [confirm, setConfirm] = useState(false);
    const [wiped, setWiped] = useState(false);
    const wipedRef = useRef(false);
    const closedRef = useRef(onClosed);
    useEffect(() => { closedRef.current = onClosed; });
    const done = useRef(false);
    const finish = useCallback(() => {
        if (done.current) return;
        done.current = true;
        closedRef.current(wipedRef.current);
    }, []);

    useEffect(() => {
        closeBtn.current?.focus();
        // StrictMode mounts twice: one entry, not two.
        if (!marked()) history.pushState({ ...(history.state as object | null), [HISTORY_MARK]: true }, '');
        const onPop = () => finish();
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, [finish]);

    // Sluiten, Escape: pop the pushed entry (its popstate closes), so the back button needs no second press.
    const close = useCallback(() => {
        if (marked()) history.back();
        else finish();
    }, [finish]);

    // Nee: focus goes back to the button that asked (it was replaced by the question).
    const asked = useRef(false);
    useEffect(() => {
        if (confirm) asked.current = true;
        else if (asked.current) wipeBtn.current?.focus();
    }, [confirm]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key !== 'Tab' || !card.current) return;
        const list = [...card.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    const wipe = () => {
        wipePupilData();
        wipedRef.current = true;
        asked.current = false;
        setWiped(true);
        setConfirm(false);
        closeBtn.current?.focus();
    };

    return createPortal(
        <div className="over-overlay" onKeyDown={onKeyDown} onClick={e => { if (e.target === e.currentTarget) close(); }}>
            <div ref={card} className="over-card" role="dialog" aria-modal="true" aria-labelledby="over-title">
                <header className="over-head">
                    <span className="over-head-icon" aria-hidden><Info weight="duotone" /></span>
                    <div className="over-head-text">
                        <h1 id="over-title" className="over-title">Over RekenRaak</h1>
                        <p className="over-sub">Een korte uitleg voor ouders</p>
                    </div>
                    <button ref={closeBtn} type="button" className="kiosk-btn kiosk-btn-quiet over-close" onClick={close}>
                        <X aria-hidden weight="bold" /> Sluiten
                    </button>
                </header>
                <div className="over-body">
                    <section className="over-section" aria-labelledby="over-wat">
                        <h2 id="over-wat">Wat is dit?</h2>
                        <p>
                            RekenRaak is gemaakt door een leerkracht. Op rekenraak.be maken leerkrachten gratis rekenbladen om af te drukken.
                            Deze kinderpagina is een extraatje daarbij: kinderen oefenen of spelen hier zelf, op hun eigen niveau.
                        </p>
                        <p><ExternalLink href={SHEETS_URL}>Naar de rekenbladen op rekenraak.be</ExternalLink></p>
                        {SHOW_FRANS && <p>{FRANS_TEXT}</p>}
                    </section>
                    <section className="over-section" aria-labelledby="over-gratis">
                        <h2 id="over-gratis">Gratis, zonder account, zonder reclame</h2>
                        <p>Je betaalt niets, je maakt geen account en je ziet geen reclame. Nu en later.</p>
                    </section>
                    <section className="over-section" aria-labelledby="over-bewaard">
                        <h2 id="over-bewaard">Wat wordt er bewaard?</h2>
                        <p>Alleen op dit toestel, in de browser:</p>
                        <ul className="over-list">
                            {STORED_ITEMS.map(item => <li key={item}>{item}</li>)}
                        </ul>
                        <p>Niets daarvan gaat naar een server. Geen tracking, geen cookies van anderen.</p>
                    </section>
                    <section className="over-section over-wipe" aria-labelledby="over-wis">
                        <h2 id="over-wis">Wis mijn gegevens</h2>
                        <p>Dit wist alles wat hierboven staat, op dit toestel. Werkbladen en instellingen van een leerkracht op hetzelfde toestel blijven staan.</p>
                        {wiped ? (
                            <p className="over-done" role="status">Alles is gewist. De pagina begint opnieuw als je sluit.</p>
                        ) : confirm ? (
                            <div className="over-confirm" role="group" aria-labelledby="over-confirm-q">
                                <p id="over-confirm-q" className="over-confirm-q">Zeker? Dit kan je niet ongedaan maken.</p>
                                <div className="over-confirm-btns">
                                    <button type="button" className="kiosk-btn kiosk-btn-danger is-armed" onClick={wipe}>Ja, wis alles</button>
                                    <button type="button" className="kiosk-btn" onClick={() => setConfirm(false)} autoFocus>Nee</button>
                                </div>
                            </div>
                        ) : (
                            <button ref={wipeBtn} type="button" className="kiosk-btn over-wipe-btn" onClick={() => setConfirm(true)}>
                                <Trash aria-hidden weight="bold" /> Wis mijn gegevens
                            </button>
                        )}
                    </section>
                    <section className="over-section" aria-labelledby="over-vragen">
                        <h2 id="over-vragen">Voor volwassenen: vragen of ideeën?</h2>
                        <p>Laat het gerust weten via het formulier.</p>
                        <p><ExternalLink href={FEEDBACK_URL}>Naar het formulier</ExternalLink></p>
                    </section>
                </div>
            </div>
        </div>,
        document.body,
    );
}

// The quiet "Over" button on the Zelf home and the page it opens; onWiped runs after a wipe, once the page is closed.
export default function OverButton({ onWiped = reloadPage }: { onWiped?: () => void }) {
    const [open, setOpen] = useState(false);
    const opener = useRef<HTMLButtonElement>(null);
    const onClosed = useCallback((wiped: boolean) => {
        setOpen(false);
        // Everything in memory (leerjaar, sound) still holds the old picks: a fresh start shows the wiped state.
        if (wiped) onWiped();
        else opener.current?.focus();
    }, [onWiped]);
    return (
        <>
            <button ref={opener} type="button" className="over-btn" aria-haspopup="dialog" onClick={() => setOpen(true)}>
                <Info aria-hidden weight="bold" /> Over
            </button>
            {open && <OverDialog onClosed={onClosed} />}
        </>
    );
}
