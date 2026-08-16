// KNOWN E2E GAP: `anchor setup` and interactive `anchor set` are TTY-bound
// flows (inquirer assumes TTY for cursor movement); piped stdin over
// child_process.spawn often hangs on Windows inquirer. They're covered by
// tests/integration/* with mocked prompts instead. `anchor set --name --items`
// bypasses inquirer entirely, so that path IS covered here below.

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { execaNode } from 'execa';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
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
            throw new Error(`Built CLI not found at ${DIST_BIN}. Run \`bun run build\` first (or \`npm run test:e2e\` which builds automatically).`);
        }
    });

    e2eEnv(); // side-effect registration of beforeEach/afterAll

    it('prints a usage-style error and exits 1 when called with no command', async () => {
        const result = await execaNode(DIST_BIN, [], { reject: false });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toMatch(/No command provided/i);
    });

    it('--help prints usage and exits 0 instead of a raw parseArgs error', async () => {
        const result = await execaNode(DIST_BIN, ['--help'], { reject: false });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/Usage: anchor/i);
        expect(result.stderr).not.toMatch(/Unknown option/i);
    });

    it('--version prints the package.json version and exits 0', async () => {
        // DIST_BIN is dist/bin/main.js; package.json is copied to dist/package.json by the build.
        const pkg = JSON.parse(await readFile(pathJoin(DIST_BIN, '..', '..', 'package.json'), 'utf-8'));
        const result = await execaNode(DIST_BIN, ['--version'], { reject: false });
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe(pkg.version);
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

    it('anchor set --name --items creates a checklist without a TTY', async () => {
        await mkdir('.anchor', { recursive: true });
        await writeFile('.anchor/config.json', JSON.stringify({ environments: ['dev'], projects: [] }));

        const result = await execaNode(DIST_BIN, ['set', '--name', 'pr-1', '--items', 'a,b', '--environment', 'dev'], { reject: false });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/Checklist created/);

        const files = await readdir('.anchor/checklists');
        expect(files).toHaveLength(1);
    });

    it('anchor set with only --name (no --items) exits 1 with a clear error', async () => {
        await mkdir('.anchor', { recursive: true });
        await writeFile('.anchor/config.json', JSON.stringify({ environments: ['dev'], projects: [] }));

        const result = await execaNode(DIST_BIN, ['set', '--name', 'pr-1'], { reject: false });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toMatch(/--name and --items must be provided together/);
    });

    it('anchor lift --dry-run previews without deleting, still exits 0', async () => {
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

        const result = await execaNode(DIST_BIN, ['lift', '--dry-run'], { reject: false });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/Would remove completed checklist: all-done\.md/);
        expect(await fileExists('.anchor/checklists/all-done.md')).toBe(true);
    });

    it('anchor rm deletes a checklist regardless of pending items', async () => {
        await mkdir('.anchor/checklists', { recursive: true });
        const content = [
            '---',
            'name: mid-flight',
            'description: ',
            'environments: [dev]',
            'createdAt: 2024-01-01',
            'projects: []',
            '---',
            '',
            '- [ ] not done',
            '',
        ].join('\n');
        await writeFile('.anchor/checklists/mid-flight.md', content);

        const result = await execaNode(DIST_BIN, ['rm', 'mid-flight'], { reject: false });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/Checklist removed: mid-flight\.md/);
        expect(await fileExists('.anchor/checklists/mid-flight.md')).toBe(false);
    });

    it('anchor rm on a nonexistent checklist exits 1', async () => {
        const result = await execaNode(DIST_BIN, ['rm', 'nope'], { reject: false });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toMatch(/Checklist not found: nope\.md/);
    });

    it('anchor lift --help prints command-specific usage and exits 0', async () => {
        const result = await execaNode(DIST_BIN, ['lift', '--help'], { reject: false });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatch(/Usage: anchor lift/);
        expect(result.stdout).toMatch(/--dry-run/);
    });
});
