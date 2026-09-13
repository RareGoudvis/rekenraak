// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { BlockErrorBoundary } from '../components/viewer/BlockErrorBoundary';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { makeBlock } from './helpers/makeBlock';

function Thrower(): never {
    throw new Error('boom');
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
});

afterEach(() => {
    cleanup();
    consoleError.mockRestore();
});

test('a throwing child renders the default fallback and logs once', () => {
    const { getByText } = render(
        <BlockErrorBoundary label="test-type">
            <Thrower />
        </BlockErrorBoundary>,
    );
    expect(getByText('Kon dit blok niet tekenen — klik Genereer.')).toBeTruthy();
    const logged = consoleError.mock.calls.some((args: unknown[]) => String(args[0]).includes('[rekenraak] viewer crashed:'));
    expect(logged).toBe(true);
});

test('fallback={null} renders nothing instead of the default message', () => {
    const { container } = render(
        <BlockErrorBoundary fallback={null} label="test-type">
            <Thrower />
        </BlockErrorBoundary>,
    );
    expect(container.childElementCount).toBe(0);
});

// A resetKey change (e.g. Genereer swapping the exercise array reference) must clear a
// tripped boundary and let a now-healthy child render again.
test('a resetKey change clears a tripped boundary', () => {
    function Harness() {
        const [key, setKey] = useState(0);
        const [shouldThrow, setShouldThrow] = useState(true);
        return (
            <div>
                <button onClick={() => { setShouldThrow(false); setKey(k => k + 1); }}>fix</button>
                <BlockErrorBoundary resetKey={key} label="test-type">
                    {shouldThrow ? <Thrower /> : <div>recovered</div>}
                </BlockErrorBoundary>
            </div>
        );
    }
    const { getByText, queryByText } = render(<Harness />);
    expect(getByText('Kon dit blok niet tekenen — klik Genereer.')).toBeTruthy();
    fireEvent.click(getByText('fix'));
    expect(queryByText('Kon dit blok niet tekenen — klik Genereer.')).toBeNull();
    expect(getByText('recovered')).toBeTruthy();
});

// Deliberately wrong-shaped exercise data (missing fields a viewer's item type assumes)
// stress-tests every viewer inside the shared boundary. It may log (that's the whole
// point of componentDidCatch), but it must never throw out of the boundary — the sheet
// keeps its title row instead of going blank. Report to BUGS.md/stale-settings audit
// which typeIds actually fell back: that is real signal about missing defensive reads.
describe('every viewer survives wrong-shaped exercise data inside the boundary', () => {
    const typeIds = Object.keys(EXERCISE_UI);
    const fellBack: string[] = [];

    test.each(typeIds)('%s does not throw out of the boundary', (typeId) => {
        const { Viewer } = EXERCISE_UI[typeId];
        const block = makeBlock(typeId);
        const exerciseField = REGISTRY[typeId]?.exerciseField ?? 'exercises';
        // Missing basically everything a real exercise object carries besides id/isManuallyEdited.
        (block as unknown as Record<string, unknown>)[exerciseField] = [{ id: 'x', isManuallyEdited: false }];

        let threw = false;
        try {
            render(
                <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
                    <BlockErrorBoundary label={typeId}>
                        <Viewer block={block} showSolutions={false} />
                    </BlockErrorBoundary>
                </BlockWidthProvider>,
            );
        } catch {
            threw = true;
        }
        expect(threw, `${typeId} threw past the boundary`).toBe(false);

        const caught = consoleError.mock.calls.some((args: unknown[]) => String(args[0]).includes('[rekenraak] viewer crashed:'));
        if (caught) fellBack.push(typeId);
    });

    test('report which typeIds fell back', () => {
        console.info('[blockErrorBoundary] typeIds that fell back on wrong-shaped data:', fellBack);
        expect(Array.isArray(fellBack)).toBe(true);
    });
});
