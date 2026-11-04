// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { EXERCISE_UI } from '../config/exerciseUI';

// "Oefeningen per rij" moved from a Geavanceerd slider to a 1–4 list in the Opdrachtblok card,
// through the registry's AppearanceConfig slot (no typeId branch in the Inspector).

afterEach(() => {
    cleanup();
    useWorksheetStore.getState().clearBlocks();
});

describe('MAB AppearanceConfig', () => {
    test.each(['mab-herkennen', 'mab-tekenen'])('%s registers the slot and the list writes exercisesPerRow', (typeId) => {
        const { AppearanceConfig, AdvancedConfig } = EXERCISE_UI[typeId];
        expect(AppearanceConfig).toBeDefined();
        useWorksheetStore.getState().addBlockFromType(typeId, 'MAB');
        const block = () => useWorksheetStore.getState().blocks.at(-1)!;
        const Appearance = AppearanceConfig!, Advanced = AdvancedConfig!;
        render(<Appearance block={block()} />);
        fireEvent.click(screen.getByLabelText('Oefeningen per rij'));
        expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['1 oefening', '2 oefeningen', '3 oefeningen', '4 oefeningen']);
        fireEvent.click(screen.getByRole('option', { name: /2 oefeningen/ }));
        expect((block().constraints as Record<string, unknown>).exercisesPerRow).toBe(2);
        cleanup();
        // The old slider is gone from Geavanceerd.
        render(<Advanced block={block()} />);
        expect(screen.queryByText(/Oefeningen per rij/)).toBeNull();
    });
});
