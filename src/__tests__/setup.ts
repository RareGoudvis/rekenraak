// Minimal browser shims. The node-environment suites never touch these; the jsdom
// viewer smoke suite does, and jsdom ships neither ResizeObserver nor matchMedia.
class ResizeObserverStub {
    observe() { /* no layout in jsdom — nothing to report */ }
    unobserve() { }
    disconnect() { }
}

const g = globalThis as unknown as Record<string, unknown>;

if (!g.ResizeObserver) g.ResizeObserver = ResizeObserverStub;

if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
    })) as typeof window.matchMedia;
}
