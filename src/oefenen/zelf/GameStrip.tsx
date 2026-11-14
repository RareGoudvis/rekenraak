import { useEffect, useId, useRef, useState } from 'react';
import { CaretRight, Timer, Users } from '@phosphor-icons/react';
// Labels and icons only: the registry's skin components are lazy, so nothing of a game loads here.
import { SKINS } from '../spelen/skins/registry';
import { pickerToday, seasonsOn } from '../spelen/seasons';
import { gameBlurb } from './gameBlurbs';

type Game = (typeof SKINS)[number];

interface Props {
    // The games to show (tests); absent = every skin in the registry, so a new game appears by itself.
    games?: readonly Game[];
    // The day for the "nu!" ribbon (tests); absent = today.
    today?: Date;
    // Hook for later: remember the wish and preselect this game after the pupil picks an oefening (not built yet).
    onWish?(id: string): void;
}

const tint = (i: number) => `var(--kid-tint-${(i % 6) + 1})`;

// "Je kan ook spelen!": one compact row of drawn game tiles on the topics screen; a tap opens a small sheet that
// says what the game is and how to get there. In-season games come first with a "nu!" ribbon.
export default function GameStrip({ games = SKINS, today, onWish }: Props) {
    const uid = useId();
    const [open, setOpen] = useState<{ game: Game; tint: string } | null>(null);
    const okRef = useRef<HTMLButtonElement>(null);
    const fromRef = useRef<HTMLElement | null>(null);
    // More games to the side: an arrow button for a mouse (a finger just swipes).
    const rowRef = useRef<HTMLUListElement>(null);
    const [more, setMore] = useState(false);
    useEffect(() => {
        const row = rowRef.current;
        if (!row) return;
        const check = () => setMore(row.scrollLeft + row.clientWidth < row.scrollWidth - 48);
        check();
        row.addEventListener('scroll', check, { passive: true });
        window.addEventListener('resize', check);
        return () => { row.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
    }, []);
    const scrollOn = () => {
        const row = rowRef.current;
        const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        row?.scrollBy?.({ left: row.clientWidth * 0.75, behavior: smooth ? 'smooth' : 'auto' });
    };
    const now = seasonsOn(today ?? pickerToday());
    const inSeason = (g: Game) => !!g.meta.season && now.includes(g.meta.season);
    // Colours follow the registry order, so a seasonal game keeps its colour when it moves to the front.
    const listed = games.map((g, i) => ({ g, tint: tint(i) }));
    const shown = [...listed.filter(x => inSeason(x.g)), ...listed.filter(x => !inSeason(x.g))];

    const close = () => { setOpen(null); fromRef.current?.focus(); };
    useEffect(() => {
        if (!open) return;
        okRef.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(null); fromRef.current?.focus(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const marks = (meta: Game['meta']) => (
        <>
            {meta.timed && <span className="zelf-game-mark"><Timer weight="bold" aria-hidden /> op tijd</span>}
            {meta.players === 2 && <span className="zelf-game-mark"><Users weight="bold" aria-hidden /> 2 spelers</span>}
        </>
    );

    return (
        <section className="zelf-games" aria-labelledby={`${uid}-title`}>
            <h2 id={`${uid}-title`} className="zelf-games-title">Je kan ook spelen!</h2>
            <ul ref={rowRef} className="zelf-games-row">
                {shown.map(({ g, tint: bg }, n) => {
                    const { meta, icon: Icon } = g;
                    const nu = inSeason(g);
                    return (
                        <li key={meta.id}>
                            <button type="button" className="zelf-game" aria-haspopup="dialog" style={{ '--tint': bg, '--i': n } as React.CSSProperties}
                                aria-label={`${meta.label}${meta.timed ? ', op tijd' : ''}${meta.players === 2 ? ', 2 spelers' : ''}${nu ? ', nu extra leuk' : ''}`}
                                onClick={e => { fromRef.current = e.currentTarget; setOpen({ game: g, tint: bg }); }}>
                                <span className="zelf-game-disc" aria-hidden>
                                    <Icon weight="duotone" />
                                    {meta.timed && <span className="zelf-game-dot"><Timer weight="bold" /></span>}
                                    {meta.players === 2 && <span className="zelf-game-dot is-duo"><Users weight="bold" /></span>}
                                </span>
                                {nu && <span className="zelf-game-nu" aria-hidden>nu!</span>}
                                <span className="zelf-game-name" aria-hidden>{meta.label}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            {more && <button type="button" className="zelf-games-more" aria-label="Meer spellen" onClick={scrollOn}><CaretRight weight="bold" aria-hidden /></button>}
            {open && (() => {
                const { meta, icon: Icon } = open.game;
                const blurb = gameBlurb(meta.id, meta.label);
                return (
                    <div className="zelf-sheet-back" onClick={close}>
                        <div className="zelf-sheet" role="dialog" aria-modal="true" aria-labelledby={`${uid}-sheet`} aria-describedby={`${uid}-what`}
                            onClick={e => e.stopPropagation()}>
                            <span className="zelf-game-disc is-lg" style={{ '--tint': open.tint } as React.CSSProperties} aria-hidden><Icon weight="duotone" /></span>
                            <h2 id={`${uid}-sheet`} className="zelf-sheet-title">{meta.label}</h2>
                            {/* An unknown game has no line of its own: its name, said once. */}
                            <p id={`${uid}-what`} className="zelf-sheet-what">{blurb === meta.label ? 'Een nieuw spel om te ontdekken.' : blurb}</p>
                            {(meta.timed || meta.players === 2) && <p className="zelf-sheet-marks">{marks(meta)}</p>}
                            <p className="zelf-sheet-how">Kies je leerjaar bovenaan, kies wat je oefent en tik dan op Spelen.</p>
                            <button ref={okRef} type="button" className="kiosk-btn kiosk-btn-primary" onClick={() => { onWish?.(meta.id); close(); }}>Oké!</button>
                        </div>
                    </div>
                );
            })()}
        </section>
    );
}
