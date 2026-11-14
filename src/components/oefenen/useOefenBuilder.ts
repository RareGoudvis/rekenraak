import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { deleteOefenSessie, saveOefenSessie } from '../../services/persistence';
import type { MathBlock } from '../../services/math/types';
import type { OefenAttempts, OefenMode, OefenSessie } from '../../services/oefenen/types';
import { makeDraftBlock } from '../curriculum/draftBlock';
import { MAX_TITLE, MAX_TYPES, newSessieId, sessieContentHash } from '../../services/oefenen/session';
import { kioskSupports } from '../../services/oefenen/kiosk';
import { plannedTotal } from '../../services/oefenen/scheduler';
import {
    buildSessie, deadRows, draftIdOf, listOefenLeaves, normaliseWeights, rowsFromSessie, seedRowConstraints,
    rowMayHaveMab, rowMayHaveSteps, type BuilderRow, type OefenLeaf,
} from './oefenBuild';

// Row = what the builder owns per slot; the row's constraints live in the store's draft block.
// `cardLabel`: the Eenvoudig card it came from, shown in the workspace only (never in the link).
export type OefenRow = Omit<BuilderRow, 'constraints'> & { cardLabel?: string };

// SYNC: session.ts MAX_LABEL, the longest row label a link carries.
const MAX_CARD_LABEL = 80;

export type SaveResult = 'saved' | 'cancelled' | 'empty' | 'full';

// The Oefenmodus composer's state and rules, lifted out of the old builder modal unchanged:
// rows + their off-sheet draft blocks, session settings, ids by content, Opslaan and the
// pre-flight. The workspace view renders it; nothing here knows about layout.
export function useOefenBuilder(initial?: OefenSessie) {
    const leaves = useMemo(() => listOefenLeaves(), []);
    const leafById = useMemo(() => new Map(leaves.map(l => [l.id, l])), [leaves]);

    const setDraftBlocks = useWorksheetStore((s) => s.setDraftBlocks);
    const clearDraftBlocks = useWorksheetStore((s) => s.clearDraftBlocks);
    const draftBlocks = useWorksheetStore((s) => s.draftBlocks);
    const grade = useWorksheetStore((s) => s.selectedGrade);

    const [rows, setRows] = useState<OefenRow[]>(() => (initial ? rowsFromSessie(initial).map(({ constraints: _c, ...row }) => row) : []));
    const [title, setTitle] = useState(initial?.title ?? '');
    const [mode, setMode] = useState<OefenMode>(initial?.mode ?? 'afwisselen');
    const [allowRepeatType, setAllowRepeatType] = useState(initial?.allowRepeatType ?? false);
    const [timerMin, setTimerMin] = useState<number | undefined>(initial?.timerMin);
    const [testMode, setTestMode] = useState(initial?.testMode ?? false);
    const [statsLocked, setStatsLocked] = useState(initial?.statsLocked ?? false);
    const [showSteps, setShowSteps] = useState(!initial?.noSteps);
    const [showMab, setShowMab] = useState(!initial?.noMab);
    // Kept apart from testMode: switching testmodus off again restores the teacher's choice.
    const [attempts, setAttempts] = useState<OefenAttempts>(initial ? (initial.attempts ?? 1) : 1);
    const nextKey = useRef(rows.length);
    // Whole minutes: the share link then carries createdAt as a 8-digit minute count.
    const [meta] = useState(() => ({ id: initial?.id ?? newSessieId(), createdAt: initial?.createdAt ?? Math.floor(Date.now() / 60_000) * 60_000 }));
    // One id per content for the composer's lifetime: pupils' runs are stored per id with per-slot stats, so
    // other content must never ship under an id already handed out; reverting an edit finds its id again.
    const [idsByContent] = useState(() => new Map<string, string>(initial ? [[sessieContentHash(initial), initial.id]] : []));

    // Seed drafts for a reopened session; always tear them down on close (they are off-sheet).
    useEffect(() => {
        if (initial) {
            const seeded = rowsFromSessie(initial);
            setDraftBlocks(seeded.map(r => makeDraftBlock(r.leaf.typeId, r.constraints, draftIdOf(r.key))));
        } else setDraftBlocks([]);
        return () => clearDraftBlocks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const draftOf = (key: string): MathBlock | undefined => draftBlocks.find(b => b.id === draftIdOf(key));
    const constraintsOf = (key: string): Record<string, unknown> | undefined =>
        draftOf(key)?.constraints as Record<string, unknown> | undefined;

    const full = rows.length >= MAX_TYPES;

    /** Adds a row for a sidebar leaf; returns its key, or null when the session is full or the leaf is not kiosk-capable. */
    const addLeaf = (leafId: string, constraints?: Record<string, unknown>, cardLabel?: string): string | null => {
        const leaf = leafById.get(leafId);
        if (!leaf || rows.length >= MAX_TYPES) return null;
        const key = `r${nextKey.current++}`;
        const st = useWorksheetStore.getState();
        // A leaf click is seeded at the sidebar's leerjaar (a later leerjaar change leaves the row be); an
        // Eenvoudig card arrives resolved (its preset + the kiosk start), so it is taken as it is.
        const start = constraints ?? seedRowConstraints(leaf, st.selectedGrade);
        st.setDraftBlocks([...st.draftBlocks, makeDraftBlock(leaf.typeId, start, draftIdOf(key))]);
        // The card's full name is for the workspace only and cut like Zelf oefenen cuts it; the link keeps the leaf's kiosk label.
        const shown = cardLabel?.trim().slice(0, MAX_CARD_LABEL);
        setRows(rs => [...rs, { key, leaf, weight: 50, ...(shown ? { cardLabel: shown } : {}) }]);
        return key;
    };
    const removeRow = (key: string) => {
        const st = useWorksheetStore.getState();
        st.setDraftBlocks(st.draftBlocks.filter(b => b.id !== draftIdOf(key)));
        setRows(rs => rs.filter(r => r.key !== key));
    };
    const patchRow = (key: string, patch: Partial<OefenRow>) => setRows(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r));
    /** Order is content (the link's slots follow it): a move is a new id, like any other edit. */
    const moveRow = (key: string, dir: -1 | 1) => setRows(rs => {
        const i = rs.findIndex(r => r.key === key);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= rs.length) return rs;
        const next = [...rs];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
    });
    /** A copy right under the row, with its own draft block; returns the new key. */
    const duplicateRow = (key: string): string | null => {
        const i = rows.findIndex(r => r.key === key);
        const src = draftOf(key);
        if (i < 0 || !src || rows.length >= MAX_TYPES) return null;
        const copyKey = `r${nextKey.current++}`;
        const st = useWorksheetStore.getState();
        st.setDraftBlocks([...st.draftBlocks, makeDraftBlock(rows[i].leaf.typeId, { ...src.constraints } as Record<string, unknown>, draftIdOf(copyKey))]);
        setRows(rs => {
            const at = rs.findIndex(r => r.key === key);
            const next = [...rs];
            next.splice(at + 1, 0, { ...rs[at], key: copyKey });
            return next;
        });
        return copyKey;
    };
    // A kiosk-only setting lives in the draft's constraints like any Config setting, so the link carries it.
    const setRowConstraint = (key: string, name: string, value: string) => {
        const st = useWorksheetStore.getState();
        const draft = st.draftBlocks.find(b => b.id === draftIdOf(key));
        if (draft) st.updateBlockSettings(draft.id, { constraints: { ...draft.constraints, [name]: value } });
    };

    // Rows whose draft block has not landed in the store yet (first render after add) are skipped.
    const buildable: BuilderRow[] = rows.flatMap(r => {
        const constraints = constraintsOf(r.key);
        const { cardLabel: _l, ...row } = r;
        return constraints ? [{ ...row, constraints }] : [];
    });
    // The steps switch only shows when a chosen row can actually produce a sum with steps.
    const stepsPossible = buildable.some(rowMayHaveSteps);
    // MAB above the steps is for leerjaar 1–3 only, and only when a row can produce a whole sum up to 1000.
    const mabPossible = stepsPossible && grade !== null && grade <= 3 && buildable.some(rowMayHaveMab);
    const { sessie: built, excluded } = buildSessie(buildable, { ...meta, title, mode, allowRepeatType, timerMin, testMode, statsLocked, attempts, noSteps: !showSteps, noMab: !showMab, grade });
    // A content edit is a new session, a rename keeps the id (the title is not part of the content).
    const contentKey = sessieContentHash(built);
    let id = idsByContent.get(contentKey);
    if (id === undefined) {
        // A fresh composer's first content takes the id it opened with.
        id = idsByContent.size === 0 ? meta.id : newSessieId();
        idsByContent.set(contentKey, id);
    }
    const sessie: OefenSessie = { ...built, id };
    const percents = normaliseWeights(sessie.types.map(t => t.weight));
    const percentOf = (key: string): number | null => {
        const i = buildable.filter(r => kioskSupports(r.leaf.typeId, r.constraints)).findIndex(r => r.key === key);
        return i < 0 ? null : percents[i];
    };

    /** Opslaan: asks for a name when the session has no title (the name doubles as the pupil's title). */
    const save = (): SaveResult => {
        if (sessie.types.length === 0) return 'empty';
        let name = title.trim();
        if (!name) {
            const asked = window.prompt('Naam voor deze oefensessie:', 'Oefensessie');
            if (asked === null) return 'cancelled';
            name = asked;
        }
        // The library name doubles as the pupil's title, so the kiosk never falls back on "Oefenen".
        const titled = title.trim() ? sessie : { ...sessie, title: name.trim().slice(0, MAX_TITLE) };
        if (!title.trim()) setTitle(titled.title ?? '');
        const entry = saveOefenSessie(titled, name);
        if (!entry) { window.alert('Opslaan mislukt: de opslag van je browser is vol.'); return 'full'; }
        // One library row per session in this composer: drop versions saved under its other contents' ids.
        for (const other of new Set(idsByContent.values())) if (other !== titled.id) deleteOefenSessie(other);
        return 'saved';
    };

    const canShip = sessie.types.length > 0;
    // Pre-flight: a row that yields no exercise would end every pupil's run, so it blocks Delen until fixed.
    const dead = new Set(deadRows(buildable).map(r => r.key));
    const canShare = canShip && dead.size === 0;
    // A dead row the kiosk also refuses (klok without tijdstypes) is counted once, as dead.
    const unsupportedOnly = excluded.filter(r => !dead.has(r.key)).length;
    // The kiosk's own rule: one row without a limit makes the run endless, and only a timer ends it then.
    const endless = sessie.types.length > 0 && plannedTotal(sessie) === null && !sessie.timerMin;

    return {
        leaves, rows, buildable, full, grade,
        settings: { title, mode, allowRepeatType, timerMin, testMode, statsLocked, showSteps, showMab, attempts },
        setTitle, setMode, setAllowRepeatType, setTimerMin, setTestMode, setStatsLocked, setShowSteps, setShowMab, setAttempts,
        addLeaf, removeRow, patchRow, moveRow, duplicateRow, setRowConstraint, draftOf, constraintsOf,
        sessie, percents, percentOf, dead, excluded, canShip, canShare, unsupportedOnly, endless, stepsPossible, mabPossible,
        countOf: (leafId: string) => rows.filter(r => r.leaf.id === leafId).length,
        save,
    };
}

export type OefenBuilder = ReturnType<typeof useOefenBuilder>;
export type { OefenLeaf };
