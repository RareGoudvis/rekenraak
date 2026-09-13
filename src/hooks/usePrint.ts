import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useWorksheetStore } from '../store/useWorksheetStore';

const STYLE_ID = 'print-dynamic';

// Blank the browser-injected header/footer boxes only. Chrome does NOT render
// @page margin-box `content`, so the actual footer is a fixed HTML bar
// (.print-footer-bar in index.css / App.tsx), not injected here.
function injectMarginStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `@page {
            @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; }
            @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; }
        }`;
    document.head.appendChild(style);
}

const PRINT_HINT_KEY = 'rekenraak_print_hint_seen_v1';

// `beforeFirstPrint` runs once per browser, before the first print dialog, with the
// continuation that actually prints — App shows the "Marges op Geen" modal there. Both
// the print button and the intercepted Ctrl+P pass through it.
export function usePrint(beforeFirstPrint?: (proceed: () => void) => void) {
    // True between handlePrint() and its afterprint, so the native-print guards below
    // stay out of the way of the app's own (already complete) preparation.
    const appInitiated = useRef(false);
    // Selection to restore after a native print; `undefined` = nothing captured.
    const nativeSelection = useRef<string | null | undefined>(undefined);
    const gate = useRef(beforeFirstPrint);
    useEffect(() => { gate.current = beforeFirstPrint; });

    const handlePrint = (withSolutions: boolean) => {
        let seen = true;
        try { seen = localStorage.getItem(PRINT_HINT_KEY) === '1'; } catch { /* ignore */ }
        if (!seen && gate.current) {
            gate.current(() => {
                try { localStorage.setItem(PRINT_HINT_KEY, '1'); } catch { /* ignore */ }
                doPrint(withSolutions);
            });
            return;
        }
        doPrint(withSolutions);
    };

    const doPrint = (withSolutions: boolean) => {
        const store = useWorksheetStore.getState();
        const prevSolutions = store.showSolutions;
        const prevSelection = store.activeBlockId;
        appInitiated.current = true;
        store.setActiveSelection(null);
        if (withSolutions !== prevSolutions) store.setShowSolutions(withSolutions);

        injectMarginStyle();

        window.addEventListener('afterprint', () => {
            if (withSolutions !== prevSolutions) store.setShowSolutions(prevSolutions);
            store.setActiveSelection(prevSelection);
            document.getElementById(STYLE_ID)?.remove();
            appInitiated.current = false;
        }, { once: true });

        // Deselecting a block changes its height, which remeasures and repacks. Two frames
        // is one to lay the new state out and one to let the repack land, so the dialog
        // sees the same pagination the screen shows.
        requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    };

    // A print can also start outside the app: the browser's own Ctrl+P, the menu, or
    // window.print() from an extension. Ctrl/Cmd+P is intercepted so it takes the app's
    // path (which can await the repack); `beforeprint` is the net for the rest — it can
    // only clean the DOM (no frame runs between it and the print snapshot), so the sheet
    // at least prints without the selection halo and the block controls.
    useEffect(() => {
        const onBeforePrint = () => {
            if (appInitiated.current) return;
            const store = useWorksheetStore.getState();
            nativeSelection.current = store.activeBlockId;
            // flushSync: React's own batching would land the deselect in a microtask,
            // which is after the print snapshot Chrome takes when this handler returns.
            flushSync(() => store.setActiveSelection(null));
            injectMarginStyle();
        };
        const onAfterPrint = () => {
            if (appInitiated.current) return;
            if (nativeSelection.current !== undefined) {
                useWorksheetStore.getState().setActiveSelection(nativeSelection.current);
                nativeSelection.current = undefined;
            }
            document.getElementById(STYLE_ID)?.remove();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
            if (e.key !== 'p' && e.key !== 'P') return;
            e.preventDefault();
            handlePrint(false);
        };
        window.addEventListener('beforeprint', onBeforePrint);
        window.addEventListener('afterprint', onAfterPrint);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('beforeprint', onBeforePrint);
            window.removeEventListener('afterprint', onAfterPrint);
            window.removeEventListener('keydown', onKeyDown);
        };
        // Mounted once (App); handlePrint reads the store imperatively, so no deps.
    }, []);

    return { handlePrint };
}
