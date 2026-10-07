import { defineConfig } from 'vitest/config';

// `npm run limits:audit` — the full limit diagnosis, kept OUT of `npm test` / `npm run check`
// (vitest.config.ts excludes src/__tests__/audit). Minutes, not seconds; options come from env:
// LIMITS_OUT, LIMITS_DUMP, LIMITS_ONLY, LIMITS_SEEDS, LIMITS_COUNT, LIMITS_RANDOM (TESTING.md).
export default defineConfig({
    test: {
        environment: 'node',
        // Same reason as vitest.config.ts: the thread pool fails to resolve its runner from Git Bash.
        pool: 'forks',
        css: false,
        include: ['src/__tests__/audit/**/*.test.ts'],
        setupFiles: ['src/__tests__/setup.ts'],
        // One test per typeId runs thousands of blocks; the per-case `slow` rule is the hang guard.
        testTimeout: 3_600_000,
        disableConsoleIntercept: true,
    },
});
