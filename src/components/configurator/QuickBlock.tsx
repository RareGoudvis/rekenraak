import { useEffect, useState } from 'react';
import { Sparkle as Sparkles } from '@phosphor-icons/react';
import IconButton from '../ui/IconButton';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { QUICK_SETTINGS, type QuickPills, type QuickSpec } from '../../config/quickSettings';
import { EXERCISE_UI } from '../../config/exerciseUI';
import { loadEenvoudigData } from '../../config/eenvoudig/cards';
import { regenerateBlock } from '../../services/generateDispatch';
import type { MathBlock } from '../../services/math/types';
import type { BlockConstraints } from '../../services/math/constraintTypes';
import { F } from './plugins/shared/fieldStyles';

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const COMBO_OPS = ['+', '-', 'x', ':'] as const;
type ComboOp = (typeof COMBO_OPS)[number];

// 'combo' or 'combo:<op>' (the combination builder, optionally limited to one operation).
function comboOnly(cardId: string): ComboOp | undefined {
    const suffix = cardId.split(':')[1];
    return (COMBO_OPS as readonly string[]).includes(suffix) ? (suffix as ComboOp) : undefined;
}

// The topic whose card list holds this variant id; null until the card data has loaded or when no card lists it.
function useCardTopic(cardId: string | undefined): string | null {
    // Keyed by cardId so a stale answer for a previous block is never shown.
    const [found, setFound] = useState<{ id: string; topic: string } | null>(null);
    useEffect(() => {
        if (!cardId || cardId.startsWith('combo')) return;
        let live = true;
        loadEenvoudigData().then((data) => {
            const topic = data.types.find(t => t.vars.some(v => v.id === cardId))?.topic;
            if (live && topic) setFound({ id: cardId, topic });
        }, () => { /* no card data: the button just stays hidden */ });
        return () => { live = false; };
    }, [cardId]);
    return found && found.id === cardId ? found.topic : null;
}

// A type whose whole panel is short enough to show in the quick block (QuickFull).
function FullConfig({ block }: { block: MathBlock }) {
    const { Config, StyleConfig } = EXERCISE_UI[block.typeId] ?? {};
    // The family's sheet-layout rows (e.g. figuren per rij) belong to the whole panel too.
    return Config ? <div className="qb-row"><Config block={block} />{StyleConfig && <StyleConfig block={block} />}</div> : null;
}

// How many exercises matters for every type, so the quick block always offers it (same rule as the Opdrachtblok slider).
function CountRow({ block }: { block: MathBlock }) {
    const updateBlockSettings = useWorksheetStore((s) => s.updateBlockSettings);
    const aantal = block.numberOfExercises || 10;
    return (
        <div className="qb-row">
            <label className="qb-q" htmlFor={`qb-count-${block.id}`}>Aantal oefeningen: {aantal}</label>
            <input
                id={`qb-count-${block.id}`} type="range" min="1" max="20" step="1" value={aantal}
                style={{ accentColor: 'var(--accent-purple)' }}
                onChange={(e) => {
                    const next = Number(e.target.value);
                    // The score caps at 2 points per exercise, as in the Opdrachtblok.
                    updateBlockSettings(block.id, { numberOfExercises: next, totalPoints: Math.min(block.totalPoints || 0, next * 2) });
                }}
            />
        </div>
    );
}

function PillsRow({ block, spec }: { block: MathBlock; spec: QuickPills }) {
    const updateBlockSettings = useWorksheetStore((s) => s.updateBlockSettings);
    const c = (block.constraints ?? {}) as Record<string, unknown>;
    if (spec.when && !spec.when(c)) return null;
    const current = c[spec.key] ?? spec.fallback;
    return (
        <div className="qb-row">
            <div className="qb-q">{spec.label}</div>
            <div className="qb-opts" role="group" aria-label={spec.label}>
                {spec.options.map((o) => (
                    <button
                        key={o.label} type="button"
                        aria-pressed={sameValue(current, o.value)}
                        // Merge against the whole bag, as useConstraints does: keys this row does not name must survive.
                        onClick={() => updateBlockSettings(block.id, { constraints: { ...c, [spec.key]: o.value } as BlockConstraints })}
                    >{o.label}</button>
                ))}
            </div>
        </div>
    );
}

// Same store action and rules as HrStdStyleConfig; puntoefeningen (a + . = c) are one short line by definition.
function LayoutRow({ block }: { block: MathBlock }) {
    const updateBlockLayout = useWorksheetStore((s) => s.updateBlockLayout);
    if ((block.constraints as Record<string, unknown> | undefined)?.equationType === 'puntoefening') return null;
    const preset = block.layoutPreset ?? 'inline-short';
    return (
        <div className="qb-row">
            <div className="qb-q">Schrijfruimte</div>
            <div className="seg-group">
                <button type="button" className="seg-btn" aria-pressed={preset === 'inline-short'} onClick={() => updateBlockLayout(block.id, 'inline-short')}>Korte lijn</button>
                <button type="button" className="seg-btn" aria-pressed={preset === 'inline-long'} onClick={() => updateBlockLayout(block.id, 'inline-long')}>Lange lijn</button>
                <button type="button" className="seg-btn" aria-pressed={preset === 'stepped'} onClick={() => updateBlockLayout(block.id, 'stepped')}>Onder elkaar</button>
            </div>
            {preset === 'stepped' && (
                <label style={{ ...F.label, marginTop: 'var(--sp-2)' }}>
                    Aantal lijnen: {block.steppedLines ?? 3}
                    <input
                        type="range" min="1" max="10" step="1" style={F.range}
                        value={block.steppedLines ?? 3}
                        onChange={(e) => updateBlockLayout(block.id, 'stepped', Number(e.target.value))}
                    />
                </label>
            )}
        </div>
    );
}

// Hover and selected are grey (the accent stays for primary buttons); tokens only.
const CSS = `
.qb { margin: 0 0 var(--sp-3); padding: var(--sp-4); border-radius: var(--radius-md); background: var(--accent-soft); border: 1px solid var(--accent); }
.qb-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-2); margin-bottom: var(--sp-3); }
.qb-head h4 { margin: 0 0 2px; font-size: var(--text-md); font-weight: 700; color: var(--text-main); }
.qb-head p { margin: 0; font-size: var(--text-xs); color: var(--text-muted); }
.qb-row + .qb-row { margin-top: var(--sp-3); }
.qb-q { font-size: var(--text-sm); font-weight: 600; margin-bottom: 6px; color: var(--text-main); }
.qb-opts { display: flex; flex-direction: column; gap: 5px; }
.qb-opts button { text-align: left; padding: 8px 11px; border-radius: var(--radius-sm); border: 1px solid var(--separator); background: var(--bg-surface); font: inherit; font-size: var(--text-sm); font-weight: 500; color: var(--text-main); cursor: pointer; }
.qb-opts button:hover { background: var(--bg-hover); }
.qb-opts button[aria-pressed="true"] { background: var(--bg-active); font-weight: 700; }
.qb-edit { padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid var(--separator); background: var(--bg-surface); font: inherit; font-size: var(--text-xs); font-weight: 600; color: var(--text-main); cursor: pointer; flex: none; }
.qb-edit:hover { background: var(--bg-hover); }
.qb-gen { margin-top: var(--sp-3); }
.qb .seg-group { width: 100%; }
.qb .seg-btn { padding: 0 4px; }
.qb input[type="range"] { width: 100%; margin-top: 6px; }
.qb-more { display: flex; align-items: center; gap: 6px; width: 100%; padding: 9px 0; margin-bottom: var(--sp-2); border: 0; border-bottom: 1px solid var(--separator); background: transparent; font: inherit; font-size: var(--text-sm); font-weight: 600; color: var(--text-muted); cursor: pointer; }
.qb-more:hover { color: var(--text-main); }
`;

// Generic: renders any QUICK_SETTINGS row; the registry-style table decides what a type shows.
export default function QuickBlock({ block }: { block: MathBlock }) {
    const specs: QuickSpec[] = QUICK_SETTINGS[block.typeId] ?? [];
    const setEenvoudigPanel = useWorksheetStore((s) => s.setEenvoudigPanel);
    const setExercises = useWorksheetStore((s) => s.setExercises);
    const setGenerationNote = useWorksheetStore((s) => s.setGenerationNote);
    const uniqueExercises = useWorksheetStore((s) => s.docSettings.uniqueExercises ?? true);
    const isStale = useWorksheetStore((s) => !!s.staleBlocks[block.id]);
    const topic = useCardTopic(block.cardId);

    const isCombo = !!block.cardId?.startsWith('combo');
    const onEdit = isCombo
        ? () => setEenvoudigPanel({ kind: 'combo', only: comboOnly(block.cardId!), editBlockId: block.id })
        : topic ? () => setEenvoudigPanel({ kind: 'topic', topicId: topic }) : null;

    return (
        <div className="qb" data-testid="quick-block">
            <style>{CSS}</style>
            <div className="qb-head">
                <div>
                    <h4>Snel aanpassen</h4>
                    <p>De instellingen die hier het meest tellen.</p>
                </div>
                {block.cardId && onEdit && <button type="button" className="qb-edit" onClick={onEdit}>Aanpassen</button>}
            </div>
            <CountRow block={block} />
            {specs.map((spec, i) => spec.kind === 'layout'
                ? <LayoutRow key={`layout-${i}`} block={block} />
                : spec.kind === 'full'
                ? <FullConfig key={`full-${i}`} block={block} />
                : <PillsRow key={spec.key} block={block} spec={spec} />)}
            <div className="qb-gen">
                <IconButton
                    icon={Sparkles}
                    label={isStale ? 'Instellingen gewijzigd, genereer opnieuw' : 'Genereer oefeningen'}
                    visibleLabel={isStale ? 'Genereer •' : 'Genereer'}
                    variant="primary"
                    onClick={() => regenerateBlock(block, setExercises, setGenerationNote, uniqueExercises)}
                />
            </div>
        </div>
    );
}

export function MoreToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
    return (
        <button type="button" className="qb-more" aria-expanded={open} onClick={onToggle}>
            {open ? '▾' : '▸'} Alle instellingen
        </button>
    );
}
