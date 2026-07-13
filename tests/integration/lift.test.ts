import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readdir, writeFile, mkdir, rm } from 'node:fs/promises';
import { useTempCwd, seedConfig } from '../helpers/temp-dir.js';
import { copyChecklistFixture } from '../helpers/fixtures.js';
import { liftChecklist } from '../../core/lift.js';

describe('liftChecklist', () => {
    useTempCwd();

    beforeEach(async () => {
        await seedConfig({
            environments: ['dev', 'staging', 'prod'],
            projects: ['api', 'docs'],
        });
        await mkdir('.anchor/checklists', { recursive: true });
    });

    it('removes a fully-checked checklist and exits 0', async () => {
        await copyChecklistFixture('completed.md');

        // Block real process.exit so the runner stays alive on the failure path.
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`__process.exit:${code as number}`);
        });

        await liftChecklist();

        expect(await readdir('.anchor/checklists')).toEqual([]);
        exitSpy.mockRestore();
    });

    it('exits with code 1 when any checklist is still pending', async () => {
        await copyChecklistFixture('pending.md');

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`__process.exit:${code as number}`);
        });

        await expect(liftChecklist()).rejects.toThrow(/__process.exit:1/);

        expect(await readdir('.anchor/checklists')).toEqual(['pending.md']);
        exitSpy.mockRestore();
    });

    it('--environment only lifts checklists whose environments contain that env', async () => {
        await copyChecklistFixture('completed.md'); // envs: [dev, staging]
        const prodOnlyContent = [
            '---',
            'name: prod-only',
            'description: prod-only',
            'environments: [prod]',
            'createdAt: 2024-01-01',
            'projects: []',
            '---',
            '',
            '- [x] only thing',
            '',
        ].join('\n');
        await writeFile('.anchor/checklists/prod-only.md', prodOnlyContent);

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`__process.exit:${code as number}`);
        });

        await liftChecklist('dev');

        expect((await readdir('.anchor/checklists')).sort()).toEqual(['prod-only.md']);
        exitSpy.mockRestore();
    });

    it('--projects only lifts checklists whose projects intersect the filter', async () => {
        await copyChecklistFixture('completed.md'); // projects: [api]
        const docsOnlyContent = [
            '---',
            'name: docs-only',
            'description: docs',
            'environments: [dev]',
            'createdAt: 2024-01-01',
            'projects: [docs]',
            '---',
            '',
            '- [x] clean up',
            '',
        ].join('\n');
        await writeFile('.anchor/checklists/docs-only.md', docsOnlyContent);

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`__process.exit:${code as number}`);
        });

        await liftChecklist(undefined, ['docs']);

        // 'docs-only.md' is lifted, 'completed.md' (api) stays.
        expect((await readdir('.anchor/checklists')).sort()).toEqual(['completed.md']);
        exitSpy.mockRestore();
    });

    it('does not throw when .anchor/checklists directory does not exist', async () => {
        await rm('.anchor/checklists', { recursive: true, force: true });
        await expect(liftChecklist()).resolves.toBeUndefined();
    });
});
