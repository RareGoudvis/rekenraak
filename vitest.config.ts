import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Tests run in `node` by default — generators, the packer and persistence are all pure.
// Only the viewer smoke suite needs a DOM, and it opts in per-file with
// `// @vitest-environment jsdom`.
//
// `css: false` keeps the run free of style processing; no module under src/ imports a
// stylesheet except main.tsx, which no test touches.
export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'node',
        css: false,
        include: ['src/__tests__/**/*.test.{ts,tsx}'],
        setupFiles: ['src/__tests__/setup.ts'],
        // The generator matrix is thousands of small runs; a per-test timeout that is too
        // tight turns an over-restrictive constraint set into a confusing timeout.
        testTimeout: 30000,
        // Console output from tests goes straight to stdout: the matrix suite ends with a
        // warning table of under-producing constraint sets, and the intercepted default
        // drops it when the run is piped (CI, `npm test > log`).
        disableConsoleIntercept: true,
    },
});
