import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Discover any *.test.ts under tests/. Layer folders (unit/, integration/,
        // regression/, e2e/) live next to this glob so users can scope by folder:
        //   vitest run tests/unit
        include: ['tests/**/*.test.ts'],

        // CLI tool — keep tests in Node, no jsdom.
        environment: 'node',

        // Cross-test hygiene for mocked prompts + process.exit spies.
        clearMocks: true,

        // Anchor's core modules mutate `process.cwd()` (`.anchor/...` is hardcoded
        // relative to cwd). Force sequential, deterministic execution so
        // concurrent tests can't stomp each other's working directory and CI
        // failure logs reproduce reliably.
        sequence: {
            concurrent: false,
            shuffle: false,
        },

        // E2E spawns a child process and -- on cold Windows CI -- can take a while.
        testTimeout: 20_000,
        hookTimeout: 20_000,
    },
});
