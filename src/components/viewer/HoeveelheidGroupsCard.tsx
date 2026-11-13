import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { FractionExercise } from '../../services/math/types';
import { groupOf, groupPartProps, useViewerInteraction } from './ViewerInteractionContext';
import KioskCell from './KioskCell';
import { HV_ANSWER, hvObject, hvQuestion, hvTips, hvWord, type HvTip } from '../../services/fractions/hoeveelheidGroups';

interface Props {
    ex: FractionExercise;
    // Objects per row, as the sheet lays them out (the teacher's groupingMode): the card shows the same picture.
    rowSizes: number[];
    // The breuk as the sheet draws it (VerticalFraction), for the answer line.
    fraction: ReactNode;
}

// Card px (the kiosk scales the 340 px card up): 22 px objects with 3 px of tap padding all round,
// so neighbouring hit areas touch and a finger never lands between two objects.
const OBJ = 22, PAD = 3;
// Screen px between the "i" and its bubble, and the bubble's margin to the window edge.
const GAP = 8;

// Oefenmodus only (FractionExerciseItem renders it under a fill-cells context): the objects the pupil
// groups and colours, the two optional working rows and the answer line, each with an "i" that shows
// its breukvragen on request. SYNC: hoeveelheidGroups.ts keys.
export default function HoeveelheidGroupsCard({ ex, rowSizes, fraction }: Props) {
    const ix = useViewerInteraction();
    const work = ix?.state.groups;
    const word = hvWord(ex, false);
    const cell = (key: string) => <KioskCell cellKey={key} variant={key === HV_ANSWER ? 'is-hv' : 'is-hv is-scratch'} label={hvQuestion(key, ex)} />;
    const sign = (s: string) => <span className="kiosk-hv-sign" aria-hidden>{s}</span>;
    const tip = (spot: Parameters<typeof hvTips>[0], label: string) =>
        ix && <InfoTip label={label} tips={hvTips(spot, ex, ix.state)} />;
    const starts = rowSizes.map((_, r) => rowSizes.slice(0, r).reduce((a, b) => a + b, 0));
    // The objects' "i" costs no room at the end of a short last row; a full one gets it on a line above
    // (beside the widest row a phone card would scroll).
    const tipInRow = rowSizes.length > 0 && rowSizes[rowSizes.length - 1] < Math.max(...rowSizes);
    const objectsTip = tip('objects', 'Hulp bij de groepjes');
    return (
        <div className="kiosk-hv">
            <div className="kiosk-hv-objline">
                {!tipInRow && objectsTip}
                <div className="kiosk-hv-objects" role="group" aria-label={`${ex.total ?? 0} ${hvWord(ex)}`}>
                    {rowSizes.map((n, r) => (
                        <div key={r} className="kiosk-hv-objrow">
                            {Array.from({ length: n }, (_, j) => {
                                const i = starts[r] + j;
                                const key = hvObject(i);
                                const at = work ? groupOf(work, key) : -1;
                                return (
                                    <span key={key} className="kiosk-obj" style={{ padding: PAD }} {...groupPartProps(ix, key, `${word} ${i + 1}`)}>
                                        <svg width={OBJ} height={OBJ} viewBox={`0 0 ${OBJ} ${OBJ}`} aria-hidden>
                                            {ex.objectShape === 'square'
                                                ? <rect className="kiosk-obj-shape" x={2} y={2} width={OBJ - 4} height={OBJ - 4} />
                                                : <circle className="kiosk-obj-shape" cx={OBJ / 2} cy={OBJ / 2} r={OBJ / 2 - 2} />}
                                            {/* The group's number: groups stay apart without telling colours apart. */}
                                            {at >= 0 && <text className="kiosk-obj-num" x={OBJ / 2} y={OBJ / 2 + 0.5}>{at + 1}</text>}
                                        </svg>
                                    </span>
                                );
                            })}
                            {tipInRow && r === rowSizes.length - 1 && objectsTip}
                        </div>
                    ))}
                </div>
            </div>
            <div className="kiosk-hv-row">{cell('r0')}{sign(':')}{cell('r1')}{sign('=')}{cell('r2')}{tip('row1', 'Hulp bij de eerste rij')}</div>
            <div className="kiosk-hv-row">{cell('r3')}{sign('×')}{cell('r4')}{sign('=')}{cell('r5')}{tip('row2', 'Hulp bij de tweede rij')}</div>
            <div className="kiosk-hv-row kiosk-hv-answer">{fraction}<span>van {ex.total ?? 0} =</span>{cell(HV_ANSWER)}{tip('answer', 'Hulp bij het antwoord')}</div>
        </div>
    );
}

// A small "i" on the card: a tap (or a mouse hovering) opens a bubble with the step's breukvragen
// and hints; a tap anywhere else (the bubble too) closes it. The bubble lives on <body> so the card's scale and clip leave it readable.
function InfoTip({ label, tips }: { label: string; tips: HvTip[] }) {
    const [open, setOpen] = useState<'hover' | 'pinned' | null>(null);
    const [pos, setPos] = useState<CSSProperties>({ visibility: 'hidden' });
    const btn = useRef<HTMLButtonElement>(null);
    const bubble = useRef<HTMLDivElement>(null);
    const id = useId();

    useLayoutEffect(() => {
        if (!open || !btn.current || !bubble.current) return;
        const r = btn.current.getBoundingClientRect();
        const { offsetWidth: w, offsetHeight: h } = bubble.current;
        const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
        const left = Math.max(GAP, Math.min(r.left + r.width / 2 - w / 2, vw - w - GAP));
        // Below the "i" when it fits, else above it (the answer row sits low on a phone).
        const top = r.bottom + GAP + h <= vh - GAP ? r.bottom + GAP : Math.max(GAP, r.top - GAP - h);
        setPos({ left, top });
    }, [open, tips]);

    useEffect(() => {
        if (!open) return;
        const away = (e: Event) => {
            const t = e.target as Node;
            // The bubble closes on its own click: gone at pointerdown, the tap would fall through to what it covers.
            if (!btn.current?.contains(t) && !bubble.current?.contains(t)) setOpen(null);
        };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
        const close = () => setOpen(null);
        document.addEventListener('pointerdown', away, true);
        window.addEventListener('keydown', esc);
        window.addEventListener('resize', close);
        return () => {
            document.removeEventListener('pointerdown', away, true);
            window.removeEventListener('keydown', esc);
            window.removeEventListener('resize', close);
        };
    }, [open]);

    const toggle = () => setOpen(o => (o === 'pinned' ? null : 'pinned'));
    return (
        <>
            <button
                ref={btn}
                type="button"
                className="kiosk-hv-info"
                aria-label={label}
                aria-expanded={!!open}
                aria-controls={open ? id : undefined}
                // Keep the focus in the cell the keypad types into.
                onMouseDown={e => e.preventDefault()}
                onPointerEnter={e => { if (e.pointerType === 'mouse') setOpen(o => o ?? 'hover'); }}
                onPointerLeave={e => { if (e.pointerType === 'mouse') setOpen(o => (o === 'hover' ? null : o)); }}
                onClick={toggle}
                onKeyDown={e => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    // As interactionProps: the kiosk's window handler must not read this Enter as Controleer.
                    e.preventDefault();
                    toggle();
                }}
            >i</button>
            {open && createPortal(
                <div ref={bubble} id={id} role="tooltip" className="kiosk-tip" style={{ position: 'fixed', ...pos }} onClick={() => setOpen(null)}>
                    {tips.map(t => (
                        <p key={t.question}><strong>{t.question}</strong> {t.hint}</p>
                    ))}
                </div>,
                document.body,
            )}
        </>
    );
}
