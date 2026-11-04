// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// jsdom's location.assign is unforgeable, so the navigation itself is checked through the mock.
const leave = vi.hoisted(() => vi.fn());
vi.mock('../bootEntry', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../bootEntry')>()),
    leaveBordPage: leave,
}));

// The store reads the flag at creation, so every case boots a fresh store module.
async function bootStore(bord: boolean) {
    if (bord) document.documentElement.dataset.boot = 'bord';
    const { useWorksheetStore } = await import('../store/useWorksheetStore');
    return useWorksheetStore;
}

describe('bord.html boot entry', () => {
    beforeEach(() => {
        vi.resetModules();
        leave.mockClear();
    });
    afterEach(() => {
        delete document.documentElement.dataset.boot;
    });

    it('boots into the editor without the flag', async () => {
        const store = await bootStore(false);
        expect(store.getState().view).toBe('editor');
    });

    it('boots straight into the board with data-boot="bord"', async () => {
        const store = await bootStore(true);
        expect(store.getState().view).toBe('whiteboard');
    });

    it('leaving the board on bord.html navigates to / instead of opening the editor', async () => {
        const store = await bootStore(true);
        store.getState().setView('editor');
        expect(leave).toHaveBeenCalledTimes(1);
        expect(store.getState().view).toBe('whiteboard');
    });

    it('leaving the board on index.html just switches the view', async () => {
        const store = await bootStore(false);
        store.getState().setView('whiteboard');
        store.getState().setView('editor');
        expect(leave).not.toHaveBeenCalled();
        expect(store.getState().view).toBe('editor');
    });
});
