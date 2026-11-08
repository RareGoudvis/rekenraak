import { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import type { MathBlock } from '../../services/math/types';
import { REGISTRY } from '../../config/exerciseRegistry';
import { EXERCISE_UI } from '../../config/exerciseUI';
import { BlockErrorBoundary } from '../viewer/BlockErrorBoundary';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../viewer/BlockWidthContext';

interface Props {
    typeId: string;
    constraints: Record<string, unknown>;   // fully resolved constraints (defaults + base + variant + edits)
    nonce?: number;                          // bump to force a fresh random generation
    height?: number;                         // clip-box height; default 150
    count?: number;                          // exercises to generate; default 1
    // Shown instead of the viewer when the settings generate nothing (the viewers' own empty text says "klik Genereer").
    emptyText?: string;
    // Keep the max keys as given: a card for 1 000 000 000 needs numbers the 1 000 cap would ruin.
    unclamped?: boolean;
    showSolutions?: boolean;                 // default true
    // Render exactly ONE exercise, no opdracht title, scaled and centred on its real ink in the frame.
    // A furniture block (layout-*) has no exercise and is fitted itself.
    fitOne?: boolean;
    maxScale?: number;                       // fitOne only: how far a small sum may be enlarged; default 1.5
}

// A preview never needs huge numbers, and a generator fed an out-of-range max (e.g. the
// global baseMaxGetal from a high leerjaar = 1e6/1e10) can allocate until it OOMs. Cap the
// max keys to a safe ceiling before generating — protects MassAdd / Bibliotheek / hover card.
const PREVIEW_MAX = 1000;
function clampForPreview(constraints: Record<string, unknown>): Record<string, unknown> {
    const out = { ...constraints };
    for (const key of ['maxGetal', 'maxRange', 'maxNumber'] as const) {
        const v = out[key];
        if (typeof v === 'number' && v > PREVIEW_MAX) out[key] = PREVIEW_MAX;
    }
    return out;
}

// Build a throwaway block and call the generator DIRECTLY — never touches the
// store / setExercises. Caller passes the already-resolved constraints.
function buildPreviewBlock(typeId: string, rawConstraints: Record<string, unknown>, count: number, unclamped: boolean, one: boolean): MathBlock | null {
    const def = REGISTRY[typeId];
    if (!def) return null;
    const constraints = unclamped ? { ...rawConstraints } : clampForPreview(rawConstraints);
    const block: MathBlock = {
        id: `preview-${typeId}`,
        typeId,
        instructionText: '',
        instructionMode: 'geen',
        showInstruction: false,
        layoutPreset: 'inline-short',
        steppedLines: 3,
        numberOfExercises: one ? 1 : count,
        totalPoints: 0,
        verticalSpacing: 14,
        constraints,
        exercises: [],
    };
    const data = def.generate(block);
    // A generator may hand back more than asked; one means one, never the whole set.
    return { ...block, [def.exerciseField]: one && !def.isFurniture ? data.slice(0, 1) : data };
}

// Only build/render once scrolled into view — many live generators+viewers at once
// is a real perf cost.
function useInView<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || inView) return;
        const obs = new IntersectionObserver((entries) => {
            if (entries.some(e => e.isIntersecting)) { setInView(true); obs.disconnect(); }
        }, { rootMargin: '200px' });
        obs.observe(el);
        return () => obs.disconnect();
    }, [inView]);
    return { ref, inView };
}

// Elements that paint without text: replaced content and table cells (an empty answer <input> or
// a bordered cell is all a line shows).
const PAINTS_ALONE = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'IMG', 'CANVAS', 'BUTTON', 'TD', 'TH', 'HR']);
interface Box { l: number; t: number; r: number; b: number }

function addRect(box: Box | null, rect: { left: number; top: number; right: number; bottom: number; width: number; height: number }): Box | null {
    if (!rect.width && !rect.height) return box;
    if (!box) return { l: rect.left, t: rect.top, r: rect.right, b: rect.bottom };
    return { l: Math.min(box.l, rect.left), t: Math.min(box.t, rect.top), r: Math.max(box.r, rect.right), b: Math.max(box.b, rect.bottom) };
}

// The union of everything that actually paints inside root (text, inputs, svg, borders, fills),
// so empty layout space around a short exercise does not count as content.
function inkBox(root: HTMLElement): Box | null {
    let box: Box | null = null;
    for (const el of Array.from(root.querySelectorAll('*'))) {
        const isSvg = el.tagName.toLowerCase() === 'svg';
        if (!isSvg && el.closest('svg')) continue;   // the outer <svg> stands for its parts
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
        const k = cs as unknown as Record<string, string>;
        const visibleBorder = ['Top', 'Right', 'Bottom', 'Left'].some(side =>
            parseFloat(k[`border${side}Width`]) > 0 && k[`border${side}Style`] !== 'none' && k[`border${side}Style`] !== 'hidden');
        const filled = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
        if (isSvg || PAINTS_ALONE.has(el.tagName) || visibleBorder || filled) box = addRect(box, el.getBoundingClientRect());
        for (const node of Array.from(el.childNodes)) {
            if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            // jsdom has no Range geometry; real browsers always do.
            if (typeof range.getBoundingClientRect === 'function') box = addRect(box, range.getBoundingClientRect());
        }
    }
    return box;
}

export default function ExercisePreview({ typeId, constraints, nonce = 0, height = 150, count = 1, emptyText, unclamped = false, showSolutions = true, fitOne = false, maxScale = 1.5 }: Props) {
    const { ref: boxRef, inView } = useInView<HTMLDivElement>();
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const constraintsKey = JSON.stringify(constraints);

    const block = useMemo(() => {
        if (!inView) return null;
        try {
            return buildPreviewBlock(typeId, constraints, count, unclamped, fitOne);
        } catch {
            return null;
        }
        // constraints captured via stable JSON key
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [typeId, constraintsKey, nonce, inView, count, unclamped, fitOne]);

    const Viewer = EXERCISE_UI[typeId]?.Viewer;
    const field = REGISTRY[typeId]?.exerciseField;
    const empty = !!emptyText && !!block && !!field && Array.isArray(block[field]) && (block[field] as unknown[]).length === 0;

    // Measure the unscaled content and the box, then scale so the WHOLE example fits.
    // transform doesn't affect layout, so measuring the (unscaled) inner is stable.
    useLayoutEffect(() => {
        const box = boxRef.current;
        const inner = innerRef.current;
        if (!box || !inner || !block) return;
        const fit = () => {
            const boxW = box.clientWidth - PAD * 2;
            const boxH = box.clientHeight - PAD * 2;
            if (fitOne) {
                // Measured with no transform on, then placed imperatively: a state-driven transform
                // would not be reset by React when the numbers happen to repeat.
                inner.style.transform = 'none';
                const ink = inkBox(inner);
                if (!ink || boxW <= 0 || boxH <= 0) return;
                const inkW = ink.r - ink.l;
                const inkH = ink.b - ink.t;
                if (inkW <= 0 || inkH <= 0) return;
                const origin = inner.getBoundingClientRect();
                const s = Math.min(maxScale, boxW / inkW, boxH / inkH);
                // Centre the ink box, not the layout box: its offset inside inner is (ink - origin).
                const tx = PAD + (boxW - inkW * s) / 2 - (ink.l - origin.left) * s;
                const ty = PAD + (boxH - inkH * s) / 2 - (ink.t - origin.top) * s;
                inner.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
                return;
            }
            // Fit by width AND height (uniform scale, no distortion) so the whole example
            // always shrinks to fit inside the card instead of clipping.
            const contentW = inner.scrollWidth;
            const contentH = inner.scrollHeight;
            if (!contentW || !contentH || boxW <= 0 || boxH <= 0) { setScale(1); return; }
            const raw = Math.min(1, boxW / contentW, boxH / contentH);
            setScale(raw > 0 && Number.isFinite(raw) ? raw : 1);
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(box);
        ro.observe(inner);
        // Web fonts arrive after first layout and change every text width.
        if (fitOne) void document.fonts?.ready.then(fit);
        return () => ro.disconnect();
        // re-measure when content changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [block, constraintsKey, nonce, inView, fitOne, maxScale]);

    const viewer = block ? <Viewer block={block} showSolutions={showSolutions} /> : null;

    return (
        <div ref={boxRef} style={{ ...wrapStyle, ...(fitOne ? fitFrameStyle : null), height }}>
            {!inView && <div style={fallbackStyle}>…</div>}
            {inView && (!block || !Viewer
                ? <div style={fallbackStyle}>Voorbeeld niet beschikbaar</div>
                : empty ? <div style={fallbackStyle}>{emptyText}</div>
                : (
                    <div ref={innerRef} style={fitOne ? fitInner : { ...scaleWrap, transform: `scale(${scale})` }}>
                        <BlockErrorBoundary
                            resetKey={`${constraintsKey}:${nonce}`}
                            fallback={<div style={fallbackStyle}>Voorbeeld niet beschikbaar</div>}
                            label={typeId}
                        >
                            {fitOne
                                ? <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>{viewer}</BlockWidthProvider>
                                : viewer}
                        </BlockErrorBoundary>
                    </div>
                ))}
        </div>
    );
}

const PAD = 10;
const wrapStyle: React.CSSProperties = {
    overflow: 'hidden', pointerEvents: 'none',
    fontSize: '13px', color: '#000', background: '#fff',
    borderRadius: '6px', padding: `${PAD}px`, boxSizing: 'border-box',
};
// Inner fills the box width so viewers lay out as on the sheet; scaled to fit.
// DECISION (UpdateState 2026-06-01): do NOT horizontally center the example. Centering needs
// the wrap shrunk to fit-content, which collapses width:100% viewers (getallenas number line,
// temperatuur thermometer, MAB) to min-content — broken/tiny previews. Left-aligned is fine.
// Don't retry.
const scaleWrap: React.CSSProperties = {
    transformOrigin: 'top left', width: '100%',
};
const fallbackStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', color: '#999', fontSize: '12px', fontStyle: 'italic',
};

// The sheet's own type: the size/face tokens live on the page element, so the frame restates the
// defaults and a one-exercise preview reads the same wherever it sits.
const fitFrameStyle: React.CSSProperties = {
    position: 'relative',
    ['--sheet-size-math' as string]: '13pt',
    ['--sheet-size-text' as string]: '15pt',
    fontSize: 'var(--sheet-size-math)',
    fontFamily: 'var(--font-sheet-math)',
};
// Laid out at one full block width (as on the sheet) and moved/scaled onto its ink by the layout effect.
const fitInner: React.CSSProperties = {
    position: 'absolute', top: 0, left: 0, width: `${FULL_BLOCK_WIDTH_PX}px`, transformOrigin: 'top left',
};
