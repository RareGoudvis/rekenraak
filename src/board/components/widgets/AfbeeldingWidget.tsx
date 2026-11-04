import { useState } from 'react';
import { afbeeldingProps, isPlainImage, RATIO } from '../../settings/afbeeldingModel';
import { widgetAccent } from '../../settings/baseProps';
import type { BoardWidget } from '../../boardTypes';

const OBJECT_FIT = { natuurlijk: 'fill', passend: 'contain', vullend: 'cover', uitrekken: 'fill' } as const;

// Uploaded image (dataURL in props.src — serializes with the board file), with fit, frame,
// caption, opacity, flips and quarter turns from the settings panel.
export default function AfbeeldingWidget({ widget }: { widget: BoardWidget }) {
    const m = afbeeldingProps(widget);
    const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
    if (!m.src) return <div style={{ padding: '16px', background: '#fff', borderRadius: '8px' }}>Geen afbeelding</div>;

    const quarter = m.rotate === 90 || m.rotate === 270;
    const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (img.naturalWidth && img.naturalHeight) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    };

    let picture: React.ReactNode;
    if (isPlainImage(m)) {
        picture = <img src={m.src} alt={m.caption} onLoad={onLoad} style={{ width: '100%', display: 'block', borderRadius: `${m.radius}px` }} draggable={false} />;
    } else {
        // Box aspect (w/h): the picked frame, or the picture's own shape (swapped on a quarter turn).
        const own = natural ? natural.w / natural.h : 4 / 3;
        const a = m.fit === 'natuurlijk' ? (quarter ? 1 / own : own) : RATIO[m.ratio];
        // A quarter-turned image is laid out in a box of swapped sides, then rotated into place.
        const imgW = quarter ? `${100 / a}%` : '100%';
        const imgH = quarter ? `${100 * a}%` : '100%';
        picture = (
            <div data-afbeelding-box style={{
                position: 'relative', width: '100%', aspectRatio: String(a), overflow: 'hidden',
                borderRadius: `${m.radius}px`, border: m.borderWidth ? `${m.borderWidth}px solid ${widgetAccent(widget) ?? '#111'}` : undefined,
                boxSizing: 'border-box',
            }}>
                <img src={m.src} alt={m.caption} onLoad={onLoad} draggable={false} style={{
                    position: 'absolute', left: '50%', top: '50%', width: imgW, height: imgH,
                    objectFit: OBJECT_FIT[m.fit], opacity: m.opacity,
                    transform: `translate(-50%, -50%) rotate(${m.rotate}deg) scale(${m.flipH ? -1 : 1}, ${m.flipV ? -1 : 1})`,
                }} />
            </div>
        );
    }

    if (!m.caption) return picture;
    const cap = (overlay: boolean) => (
        <div data-afbeelding-caption style={{
            fontFamily: "'Ubuntu', system-ui, sans-serif", fontSize: `${m.captionSize}px`, lineHeight: 1.3, textAlign: 'center',
            padding: '6px 10px', color: overlay ? '#fff' : '#111',
            ...(overlay ? { position: 'absolute', left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', borderRadius: `0 0 ${m.radius}px ${m.radius}px` } : {}),
        }}>{m.caption}</div>
    );
    return (
        <div style={{ position: 'relative' }}>
            {m.captionPos === 'boven' && cap(false)}
            {picture}
            {m.captionPos === 'onder' && cap(false)}
            {m.captionPos === 'over' && cap(true)}
        </div>
    );
}
