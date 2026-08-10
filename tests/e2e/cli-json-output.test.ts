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
        tmpDir = await mkdtemp(pathJoin(tmpdir(), 'anchor-e2e-json-'));
        process.chdir(tmpDir);
    });

    afterAll(async () => {
        process.chdir(originalCwd);
        await rm(tmpDir, { recursive: true, force: true });
    });

    return { tmpDir: () => tmpDir };
};

describe('e2e: --json output', () => {
    beforeAll(async () => {
        if (!(await fileExists(DIST_BIN))) {
            throw new Error(`Built CLI not found at ${DIST_BIN}. Run \`npm run build\` first (or \`npm run test:e2e\` which builds automatically).`);
        }
    });

    e2eEnv(); // side-effect registration of beforeEach/afterAll

    it('anchor status --json (no .anchor dir) prints an empty JSON array and exits 0', async () => {
        const result = await execaNode(DIST_BIN, ['status', '--json'], { reject: false });
        expect(result.exitCode).toBe(0);
        expect(JSON.parse(result.stdout)).toEqual([]);
    });

    it('anchor status --json (no checklists found) prints an empty JSON array and exits 0', async () => {
        await mkdir('.anchor/checklists', { recursive: true });
        const result = await execaNode(DIST_BIN, ['status', '--json'], { reject: false });
        expect(result.exitCode).toBe(0);
        expect(JSON.parse(result.stdout)).toEqual([]);
    });

    it('anchor status --json reports a mixed done/pending checklist with full entry shape', async () => {
        await mkdir('.anchor/checklists', { recursive: true });
        const content = [
            '---',
            'name: mixed',
            'description: ',
            'environments: [dev, staging]',
            'createdAt: 2024-01-01',
            'projects: [api]',
            '---',
            '',
            '- [x] first',
            '- [ ] second',
            '- [ ] third',
            '',
        ].join('\n');
        await writeFile('.anchor/checklists/mixed.md', content);

        const result = await execaNode(DIST_BIN, ['status', '--json'], { reject: false });
        expect(result.exitCode).toBe(0);
        // Stdout must be ONLY the JSON array -- no emoji/text lines mixed in.
        expect(() => JSON.parse(result.stdout)).not.toThrow();

        const parsed = JSON.parse(result.stdout);
        expect(parsed).toEqual([
            {
                file: 'mixed.md',
                doneCount: 1,
                pendingCount: 2,
                environments: ['dev', 'staging'],
                projects: ['api'],
            },
        ]);
    });

    it('anchor status --json normalizes a missing "projects" frontmatter key to an empty array', async () => {
        await mkdir('.anchor/checklists', { recursive: true });
        const content = ['---', 'name: no-projects', 'description: ', 'environments: [dev]', 'createdAt: 2024-01-01', '---', '', '- [x] first', ''].join('\n');
        await writeFile('.anchor/checklists/no-projects.md', content);

        const result = await execaNode(DIST_BIN, ['status', '--json'], { reject: false });
        expect(result.exitCode).toBe(0);

        const parsed = JSON.parse(result.stdout);
        expect(parsed).toEqual([
            {
                file: 'no-projects.md',
                doneCount: 1,
                pendingCount: 0,
                environments: ['dev'],
                projects: [],
            },
        ]);
    });

    it('anchor lift --json removes completed checklists, reports status "removed", and exits 0', async () => {
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

        const result = await execaNode(DIST_BIN, ['lift', '--json'], { reject: false });
        expect(result.exitCode).toBe(0);

        const parsed = JSON.parse(result.stdout);
        expect(parsed).toEqual([{ file: 'all-done.md', status: 'removed' }]);
        expect(await fileExists('.anchor/checklists/all-done.md')).toBe(false);
    });

    it('anchor lift --json on a pending checklist reports status "pending", still exits 1, and does not delete the file', async () => {
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

        const result = await execaNode(DIST_BIN, ['lift', '--json'], { reject: false });
        expect(result.exitCode).toBe(1);

        const parsed = JSON.parse(result.stdout);
        expect(parsed).toEqual([{ file: 'not-ready.md', status: 'pending' }]);
        expect(await fileExists('.anchor/checklists/not-ready.md')).toBe(true);
    });
});
