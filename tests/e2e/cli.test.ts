// KNOWN E2E GAP: `anchor setup` and `anchor set` are interactive flows that
// require a TTY (inquirer assumes TTY for cursor movement). Piped stdin over
// child_process.spawn often hangs on Windows inquirer. These commands are
// covered by tests/integration/* with mocked prompts. To extend E2E coverage
// here, see the TODO at the bottom of this file.

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { execaNode } from 'execa';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join as pathJoin } from 'node:path';
import { fileExists } from '../../utils/file-exists.js';

const DIST_BIN = pathJoin(process.cwd(), 'dist', 'bin', 'main.js');

// Shared scaffolding: chdir into a fresh tmpDir per test, restore on teardown.
const e2eEnv = () => {
    let tmpDir: string;
    const originalCwd = process.cwd();

    beforeEach(async () => {
        tmpDir = await mkdtemp(pathJoin(tmpdir(), 'anchor-e2e-'));
        process.chdir(tmpDir);
    });

    afterAll(async () => {
        process.chdir(originalCwd);
        await rm(tmpDir, { recursive: true, force: true });
    });

    return { tmpDir: () => tmpDir };
};

describe('e2e: built CLI (anchor)', () => {
    beforeAll(async () => {
        if (!(await fileExists(DIST_BIN))) {
            throw new Error(
                `Built CLI not found at ${DIST_BIN}. Run \`bun run build\` first (or \`npm run test:e2e\` which builds automatically).`,
            );
        }
    });

    e2eEnv(); // side-effect registration of beforeEach/afterAll

    it('prints a usage-style error and exits 1 when called with no command', async () => {
        const result = await execaNode(DIST_BIN, [], { reject: false });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toMatch(/No command provided/i);
    });

    it('prints an "Unknown command" error for an invalid command', async () => {
        const result = await execaNode(DIST_BIN, ['wat'], { reject: false });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toMatch(/Unknown command/i);
    });

    it('prints a clean error (not a raw stack trace) for an unrecognized flag', async () => {
        const result = await execaNode(DIST_BIN, ['status', '--bogus'], { reject: false });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).not.toMatch(/at parseArgs|node:internal/);
    });

    it('anchor status (no .anchor dir) prints "Directory not found" and exits 0', async () => {
        const result = await execaNode(DIST_BIN, ['status'], { reject: false });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/Directory not found/i);
    });

    it('anchor status reports tally when only completed checklists exist', async () => {
        await mkdir('.anchor/checklists', { recursive: true });
        const content = [
            '---',
            'name: done',
            'description: ',
            'environments: [dev]',
            'createdAt: 2024-01-01',
            'projects: []',
            '---',
            '',
            '- [x] first',
            '- [x] second',
            '',
        ].join('\n');
        await writeFile('.anchor/checklists/done.md', content);

        const result = await execaNode(DIST_BIN, ['status'], { reject: false });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/done\.md.*2 done \/ 0 pending/);
    });

    it('anchor lift removes completed checklists (exit 0)', async () => {
        await mkdir('.anchor/checklists', { recursive: true });
        const content = [
            '---',
            'name: all-done',
            'description: ',
            'environments: [dev]',
            'createdAt: 2024-01-01',
            'projects: []',
            '---',
            '',
            '- [x] only item',
            '',
        ].join('\n');
        await writeFile('.anchor/checklists/all-done.md', content);

        const result = await execaNode(DIST_BIN, ['lift'], { reject: false });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/Checklist completed and removed: all-done\.md/);
        expect(await fileExists('.anchor/checklists/all-done.md')).toBe(false);
    });

    it('anchor lift on a pending checklist exits 1 (failure semantics for CI)', async () => {
        await mkdir('.anchor/checklists', { recursive: true });
        const content = [
            '---',
            'name: not-ready',
            'description: ',
            'environments: [dev]',
            'createdAt: 2024-01-01',
            'projects: []',
            '---',
            '',
            '- [ ] undone',
            '',
        ].join('\n');
        await writeFile('.anchor/checklists/not-ready.md', content);

        const result = await execaNode(DIST_BIN, ['lift'], { reject: false });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toMatch(/Checklist still pending/);
    });

    // TODO(extend-e2e): cover `anchor setup` and `anchor set` once a TTY-safe
    // answer-piping strategy is chosen (e.g., split stdin via `expect`-style
    // answers, or refactor bin/main.ts to accept answers via env vars).
});
