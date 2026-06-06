import { Component, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { WorksheetFile } from '../../services/persistence';
import { EXERCISE_UI } from '../../config/exerciseUI';

interface Props {
    file: WorksheetFile;
    height?: number;       // clip-box height; default 200
    maxBlocks?: number;    // how many top blocks to render; default 3
}

// Nominal page content width the inner renders at, then scaled to the card width.
// Matches the on-sheet body width closely enough for a faithful top-of-page preview.
const CONTENT_W = 700;

// A single bad block/viewer must not blank the whole thumbnail.
class ThumbBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? null : this.props.children; }
}

// Only render once scrolled into view — a library grid can hold dozens of these,
// each mounting real exercise viewers.
function useInView<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || inView) return;
        const obs = new IntersectionObserver((entries) => {
            if (entries.some(e => e.isIntersecting)) { setInView(true); obs.disconnect(); }
        }, { rootMargin: '300px' });
        obs.observe(el);
        return () => obs.disconnect();
    }, [inView]);
    return { ref, inView };
}

// Scaled, non-interactive mini-render of a saved worksheet's TOP (header + first
// `maxBlocks` blocks). Width-fits to the card and clips vertically — like a real
// page peeking out. Reuses the actual block viewers via EXERCISE_UI.
export default function SheetThumbnail({ file, height = 200, maxBlocks = 3 }: Props) {
    const { ref: boxRef, inView } = useInView<HTMLDivElement>();
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // Scale by WIDTH only (top-aligned, clipped) so the thumbnail shows the page top.
    useLayoutEffect(() => {
        const box = boxRef.current;
        const inner = innerRef.current;
        if (!box || !inner || !inView) return;
        const fit = () => {
            const boxW = box.clientWidth;
            if (!boxW) return;
            setScale(Math.min(1, boxW / CONTENT_W));
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(box);
        return () => ro.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable
    }, [inView]);

    const blocks = (file.blocks || []).slice(0, maxBlocks);

    return (
        <div ref={boxRef} style={{ ...wrap, height }}>
            {!inView ? <div style={fallback}>…</div> : (
                <div ref={innerRef} style={{ ...inner, transform: `scale(${scale})` }}>
                    {/* Mini header strip — mirrors the real sheet's Naam/Klas + title */}
                    <div style={headerRow}>
                        <span>Naam: ____________</span><span>Klas: ____</span>
                    </div>
                    {file.header?.titel ? <div style={titleRow}>{file.header.titel}</div> : null}
                    {blocks.map((block, i) => {
                        const Viewer = EXERCISE_UI[block.typeId]?.Viewer;
                        return (
                            <div key={block.id ?? i} style={blockWrap}>
                                {block.instructionText ? (
                                    <div style={opdracht}>{i + 1}. {block.instructionText}</div>
                                ) : null}
                                {Viewer ? (
                                    <ThumbBoundary>
                                        <Viewer block={block} showSolutions={false} />
                                    </ThumbBoundary>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const wrap: React.CSSProperties = {
    overflow: 'hidden', pointerEvents: 'none',
    fontSize: '13px', color: '#000', background: '#fff',
    fontFamily: 'Azeret Mono, monospace',
};
// Inner renders at the nominal page width, left-aligned (NEVER fit-content — collapses
// width:100% viewers like getallenas/thermometer/MAB), scaled down to the card width.
const inner: React.CSSProperties = {
    transformOrigin: 'top left', width: `${CONTENT_W}px`, padding: '14px 18px', boxSizing: 'border-box',
};
const headerRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '8px' };
const titleRow: React.CSSProperties = { fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' };
const blockWrap: React.CSSProperties = { marginBottom: '12px' };
const opdracht: React.CSSProperties = { fontWeight: 'bold', marginBottom: '6px' };
const fallback: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
    color: '#bbb', fontSize: '12px',
};
