// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useFontEpoch } from '../hooks/useFontEpoch';

afterEach(cleanup);

// A stand-in FontFaceSet: jsdom has none. Iterable over its faces, and an EventTarget.
type Face = { -readonly [K in keyof FontFace]?: FontFace[K] };
function fakeFonts(faces: Face[]) {
    const target = new EventTarget() as EventTarget & { [Symbol.iterator]: () => Iterator<FontFace> };
    target[Symbol.iterator] = () => (faces as unknown as FontFace[])[Symbol.iterator]();
    Object.defineProperty(document, 'fonts', { configurable: true, value: target });
    return { target, faces };
}
const face = (family: string, weight = '400', status: FontFaceLoadStatus = 'loaded'): Face =>
    ({ family, weight, style: 'normal', stretch: 'normal', unicodeRange: 'U+0-10FFFF', status });

// Every epoch drops every block's intrinsic widths (the sheetKey prune), so an event that
// loaded nothing (the gate's element screenshots fire them) must not count as one.
describe('useFontEpoch', () => {
    test('a loadingdone that loaded no new face is not an epoch', () => {
        const { target } = fakeFonts([face('Face A'), face('Face B')]);
        const { result } = renderHook(() => useFontEpoch());
        act(() => { target.dispatchEvent(new Event('loadingdone')); target.dispatchEvent(new Event('loadingdone')); });
        expect(result.current).toBe(0);
    });

    test('a face that finished loading is one', () => {
        const { target, faces } = fakeFonts([face('Face A'), face('Face C', '400', 'loading')]);
        const { result } = renderHook(() => useFontEpoch());
        faces[1].status = 'loaded';
        act(() => { target.dispatchEvent(new Event('loadingdone')); });
        expect(result.current).toBe(1);
        faces.push(face('Face C', '700'));
        act(() => { target.dispatchEvent(new Event('loadingdone')); target.dispatchEvent(new Event('loadingdone')); });
        expect(result.current).toBe(2);
    });
});
