import { useEffect, useLayoutEffect, useState } from 'react';
import { useWorksheetStore } from '../../store/useWorksheetStore';

interface Props { onClose: () => void; }

type Advance = 'blocks' | 'exercises' | 'next' | 'finish';
interface Step { sel: string; title: string; body: string; advance: Advance; }

// Interactive spotlight tour. Each step highlights a real element (via data-tour anchors)
// and advances either on a real action (block added / exercises generated) or a Next click.
// The overlay is non-blocking (pointer-events:none) so the user can actually do each step.
const STEPS: Step[] = [
    { sel: '[data-tour="sidebar-nav"]', title: '1. Kies een oefening', body: 'Klik op een oefening in de lijst links om ze aan je blad toe te voegen.', advance: 'blocks' },
    { sel: '[data-tour="inspector"]', title: '2. Pas ze aan', body: 'In dit paneel rechts stel je het blok in: aantal oefeningen, moeilijkheidsgraad, getalbereik en meer.', advance: 'next' },
    { sel: '[data-tour="generate-block"]', title: '3. Genereer', body: 'Klik op Genereer om de oefeningen te maken (of opnieuw te maken met andere getallen).', advance: 'exercises' },
    { sel: '[data-tour="print"]', title: '4. Afdrukken', body: 'Klaar! Hier druk je af of bewaar je als PDF — met of zonder oplossingen. Je hoeft nu niet te klikken.', advance: 'next' },
    { sel: '[data-tour="menu"]', title: '5. Menu', body: 'Via ≡ Menu beheer je je werkbladen: open “Mijn bladen”, importeer of exporteer een blad, of deel het via een link.', advance: 'next' },
    { sel: '[data-tour="settings"]', title: '6. Instellingen', body: 'Onder ⚙ Instellingen stel je de basis-moeilijkheid en het thema in, en vind je hulp en info over het project.', advance: 'next' },
    { sel: '[data-tour="menu"]', title: '7. Laad een voorbeeldblad', body: 'Geen tijd om zelf te bouwen? Open ≡ Menu → “Kant-en-klare bladen” en kies een kant-en-klaar blad dat je daarna nog kan aanpassen.', advance: 'next' },
    { sel: '[data-tour="overzicht-tab"]', title: '8. Overzicht', body: 'In het tabblad “Overzicht” zie je alle blokken op een rij: versleep om te ordenen, dupliceer of verwijder, en zie waar de pagina’s eindigen.', advance: 'finish' },
];

const TT_W = 290;

export default function TourOverlay({ onClose }: Props) {
    const [step, setStep] = useState(0);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const blocksLen = useWorksheetStore((s) => s.blocks.length);
    const hasExercises = useWorksheetStore((s) => {
        const b = s.blocks.find((x) => x.id === s.activeBlockId);
        return !!b && Object.entries(b).some(([k, v]) => k.toLowerCase().includes('exercise') && Array.isArray(v) && v.length > 0);
    });
    const cur = STEPS[step];

    // Keep the spotlight glued to the current target (re-measure on resize/scroll + late mount).
    // scrollIntoView runs ONCE per step (not inside the scroll listener) and setRect bails when
    // the rect is unchanged — otherwise scrollIntoView→scroll→measure→setRect loops forever.
    useLayoutEffect(() => {
        const once = document.querySelector(cur.sel) as HTMLElement | null;
        if (once) once.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        const measure = () => {
            const el = document.querySelector(cur.sel) as HTMLElement | null;
            setRect(prev => {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                if (prev && prev.left === r.left && prev.top === r.top && prev.width === r.width && prev.height === r.height) return prev;
                return r;
            });
        };
        measure();
        const t1 = setTimeout(measure, 140);
        const t2 = setTimeout(measure, 400);
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
    }, [cur.sel]);

    // Auto-advance when the user actually performs the step (guarded → no render loop).
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional, guarded
        if (step === 0 && blocksLen > 0) setStep(1);
    }, [blocksLen, step]);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional, guarded
        if (step === 2 && hasExercises) setStep(3);
    }, [hasExercises, step]);

    const next = () => (step >= STEPS.length - 1 ? onClose() : setStep(step + 1));

    // Spotlight box (with a little padding around the target).
    const pad = 6;
    const hl = rect ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;

    // Tooltip placement: below the target if there's room, else above; clamped to viewport.
    let tt: React.CSSProperties;
    if (rect) {
        const placeBelow = rect.bottom + 170 < window.innerHeight;
        const top = placeBelow ? rect.bottom + 12 : Math.max(12, rect.top - 12 - 160);
        let left = rect.left > window.innerWidth / 2 ? rect.right - TT_W : rect.left;
        left = Math.min(Math.max(12, left), window.innerWidth - TT_W - 12);
        tt = { position: 'fixed', left, top, width: TT_W };
    } else {
        tt = { position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: TT_W };
    }

    const isAction = cur.advance === 'blocks' || cur.advance === 'exercises';

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1900, pointerEvents: 'none', fontFamily: 'var(--font-ui)' }}>
            {hl ? (
                <div style={{ position: 'fixed', left: hl.left, top: hl.top, width: hl.width, height: hl.height, borderRadius: '10px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', border: '2px solid var(--accent)', transition: 'left .2s ease, top .2s ease, width .2s ease, height .2s ease', pointerEvents: 'none' }} />
            ) : (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
            )}

            <div style={{ ...tt, pointerEvents: 'auto', background: 'var(--bg-surface)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-2)', padding: 'var(--sp-4)', boxSizing: 'border-box', color: 'var(--text-main)' }}>
                <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--sp-2)' }}>{cur.title}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 'var(--sp-3)' }}>{cur.body}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{step + 1} / {STEPS.length}</span>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                        <button onClick={onClose} style={btn(false)}>Overslaan</button>
                        <button onClick={next} style={btn(true)}>
                            {step >= STEPS.length - 1 ? 'Voltooien' : isAction ? 'Toch verder' : 'Volgende'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const btn = (primary: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600,
    border: primary ? '1px solid var(--accent)' : '1px solid var(--separator)',
    background: primary ? 'var(--accent)' : 'transparent',
    color: primary ? 'var(--accent-on)' : 'var(--text-muted)',
});
