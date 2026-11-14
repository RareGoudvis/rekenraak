import { useEffect, useId, useRef, useState } from 'react';
import { CaretRight, Timer, Users } from '@phosphor-icons/react';
// Labels, icons and thumbnails only: the registry's skin components are lazy, so nothing of a game loads here.
import { SKINS } from '../spelen/skins/registry';
import { gameBlurb } from './gameBlurbs';
import { thumbOf, type SpeelMeteenTile } from './speelMeteen';

type Skin = (typeof SKINS)[number];

// Colours follow the registry order, so a game keeps its colour wherever it sits.
const tintOf = (id: string) => `var(--kid-tint-${(Math.max(0, SKINS.findIndex(s => s.meta.id === id)) % 6) + 1})`;

/** The picture on top of a tile: the game's thumbnail; until it loads, or when it is missing, its icon on a coloured panel. */
export function GameThumb({ skin }: { skin: Skin }) {
    const [broken, setBroken] = useState(false);
    const { meta, icon: Icon } = skin;
    return (
        <span className="zelf-play-thumb" style={{ '--tint': tintOf(meta.id) } as React.CSSProperties} aria-hidden>
            <Icon className="zelf-play-icon" weight="duotone" />
            {!broken && <img src={thumbOf(meta.id)} alt="" width={480} height={300} loading="lazy" decoding="async" draggable={false} onError={() => setBroken(true)} />}
        </span>
    );
}

const marksOf = (meta: Skin['meta']) => `${meta.timed ? ', op tijd' : ''}${meta.players === 2 ? ', 2 spelers' : meta.players === '1-2' ? ', 1 of 2 spelers' : ''}`;

interface Props {
    // The leerjaar's tiles (speelMeteenFor); null = no leerjaar yet: the games by name, dimmed and out of reach.
    tiles: SpeelMeteenTile[] | null;
    preview: { skin: Skin; nu: boolean }[];
    onPlay(tile: SpeelMeteenTile): void;
}

// "Speel meteen": one row of picture tiles under the leerjaar bar; a tap starts that game with that oefening.
// More tiles scroll sideways (an arrow for a mouse, a finger just swipes).
export default function SpeelMeteen({ tiles, preview, onPlay }: Props) {
    const uid = useId();
    const rowRef = useRef<HTMLUListElement>(null);
    const [more, setMore] = useState(false);
    const count = tiles?.length ?? preview.length;
    useEffect(() => {
        const row = rowRef.current;
        if (!row) return;
        const check = () => setMore(row.scrollLeft + row.clientWidth < row.scrollWidth - 48);
        check();
        row.addEventListener('scroll', check, { passive: true });
        window.addEventListener('resize', check);
        return () => { row.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
    }, [count]);
    const scrollOn = () => {
        const row = rowRef.current;
        const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        row?.scrollBy?.({ left: row.clientWidth * 0.75, behavior: smooth ? 'smooth' : 'auto' });
    };
    if (!count) return null;
    const dim = tiles === null;

    const body = (skin: Skin, title: string, nu: boolean) => {
        const { meta } = skin;
        return (
            <>
                <GameThumb skin={skin} />
                {nu && <span className="zelf-play-nu" aria-hidden>nu!</span>}
                {(meta.timed || meta.players) && (
                    <span className="zelf-play-marks" aria-hidden>
                        {meta.timed && <span className="zelf-play-mark"><Timer weight="bold" /></span>}
                        {meta.players && <span className="zelf-play-mark"><Users weight="bold" /></span>}
                    </span>
                )}
                <span className="zelf-play-title" aria-hidden>{title}</span>
            </>
        );
    };

    return (
        <section className={`zelf-play${dim ? ' is-dim' : ''}`} aria-labelledby={`${uid}-title`}>
            <h2 id={`${uid}-title`} className="zelf-play-heading">Speel meteen</h2>
            <ul ref={rowRef} className="zelf-play-row" inert={dim}>
                {tiles ? tiles.map((t, n) => {
                    const { meta } = t.skin;
                    const blurb = gameBlurb(meta.id, meta.label);
                    const why = `${uid}-w${n}`;
                    return (
                        <li key={`${meta.id}|${t.entry.topic}|${t.entry.choice}`}>
                            <button type="button" className="zelf-play-tile" title={blurb === meta.label ? undefined : blurb}
                                aria-label={`${t.entry.title}${marksOf(meta)}${t.nu ? ', nu extra leuk' : ''}`}
                                aria-describedby={blurb === meta.label ? undefined : why} onClick={() => onPlay(t)}>
                                {body(t.skin, t.entry.title, t.nu)}
                            </button>
                            {blurb !== meta.label && <span id={why} hidden>{blurb}</span>}
                        </li>
                    );
                }) : preview.map(({ skin, nu }) => (
                    <li key={skin.meta.id}>
                        <button type="button" className="zelf-play-tile" disabled aria-label={skin.meta.label}>{body(skin, skin.meta.label, nu)}</button>
                    </li>
                ))}
            </ul>
            {more && !dim && <button type="button" className="zelf-play-more" aria-label="Meer spellen" onClick={scrollOn}><CaretRight weight="bold" aria-hidden /></button>}
        </section>
    );
}
