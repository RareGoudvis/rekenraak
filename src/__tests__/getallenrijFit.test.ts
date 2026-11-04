import { test, expect } from 'vitest';
import { getallenrijFit, getallenrijWidth } from '../services/layout/blockLayout';

// A narrow board card (298 px at 200 %): the first/last numbers used to sit across the oval's outline
// because the ladder stopped at 12 px with a 22 px padding that no longer fit.
test.each([
    [5, 3, 298, 1], [5, 3, 298, 2], [6, 4, 260, 1], [4, 6, 240, 1],
])('%i numbers of %i chars fit a %ipx column at scale %f without crossing the frame', (count, chars, width, scale) => {
    const fit = getallenrijFit(count, chars, width, scale, true);
    expect(getallenrijWidth(fit, count, chars, scale, true)).toBeLessThanOrEqual(width);
});

test('a roomy column keeps today\'s look: 18 px font, 22 px padding, 14 px gaps', () => {
    expect(getallenrijFit(5, 3, 681, 1, true)).toEqual({ fontPx: 18, padX: 22, gapPx: 14, cellMin: 44 });
});
