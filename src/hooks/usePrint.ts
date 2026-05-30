import { useWorksheetStore } from '../store/useWorksheetStore';

export function usePrint() {
    const handlePrint = (withSolutions: boolean) => {
        const store = useWorksheetStore.getState();
        const prevSolutions = store.showSolutions;
        const prevSelection = store.activeBlockId;
        store.setActiveSelection(null);
        if (withSolutions !== prevSolutions) store.setShowSolutions(withSolutions);

        const style = document.createElement('style');
        style.id = 'print-dynamic';
        // Blank the browser-injected header/footer boxes only. Chrome does NOT render
        // @page margin-box `content`, so the actual footer is a fixed HTML bar
        // (.print-footer-bar in index.css / App.tsx), not injected here.
        style.textContent = `@page {
            @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; }
            @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; }
        }`;
        document.head.appendChild(style);

        window.addEventListener('afterprint', () => {
            if (withSolutions !== prevSolutions) store.setShowSolutions(prevSolutions);
            store.setActiveSelection(prevSelection);
            document.getElementById('print-dynamic')?.remove();
        }, { once: true });

        setTimeout(() => window.print(), 0);
    };

    return { handlePrint };
}
