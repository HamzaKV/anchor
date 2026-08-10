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
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(code => {
            throw new Error(`__process.exit:${code as number}`);
        });

        await liftChecklist();

        expect(await readdir('.anchor/checklists')).toEqual([]);
        exitSpy.mockRestore();
    });

    it('exits with code 1 when any checklist is still pending', async () => {
        await copyChecklistFixture('pending.md');

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(code => {
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

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(code => {
            throw new Error(`__process.exit:${code as number}`);
        });

        await liftChecklist(['dev']);

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

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(code => {
            throw new Error(`__process.exit:${code as number}`);
        });

        await liftChecklist(undefined, ['docs']);

        // 'docs-only.md' is lifted, 'completed.md' (api) stays.
        expect((await readdir('.anchor/checklists')).sort()).toEqual(['completed.md']);
        exitSpy.mockRestore();
    });

    it('skips a malformed checklist without aborting processing of the rest', async () => {
        await copyChecklistFixture('invalid-line.md'); // throws during validation
        await copyChecklistFixture('completed.md'); // valid, should still be lifted

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(code => {
            throw new Error(`__process.exit:${code as number}`);
        });
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await liftChecklist();

        expect(await readdir('.anchor/checklists')).toEqual(['invalid-line.md']);
        expect(process.exitCode).toBe(1);
        expect(errorSpy.mock.calls.some(c => String(c[0]).includes('invalid-line.md'))).toBe(true);

        process.exitCode = 0;
        errorSpy.mockRestore();
        exitSpy.mockRestore();
    });

    it('does not throw when .anchor/checklists directory does not exist', async () => {
        await rm('.anchor/checklists', { recursive: true, force: true });
        await expect(liftChecklist()).resolves.toBeUndefined();
    });

    it('still lifts a completed checklist that sorts after a pending one', async () => {
        // readdir returns entries alphabetically on this platform, so naming
        // controls iteration order: the pending checklist is seen first.
        const pendingContent = [
            '---',
            'name: a-pending',
            'description: pending',
            'environments: [dev]',
            'createdAt: 2024-01-01',
            'projects: []',
            '---',
            '',
            '- [ ] not done yet',
            '',
        ].join('\n');
        const completedContent = [
            '---',
            'name: z-completed',
            'description: completed',
            'environments: [dev]',
            'createdAt: 2024-01-01',
            'projects: []',
            '---',
            '',
            '- [x] all done',
            '',
        ].join('\n');
        await writeFile('.anchor/checklists/a-pending.md', pendingContent);
        await writeFile('.anchor/checklists/z-completed.md', completedContent);

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(code => {
            throw new Error(`__process.exit:${code as number}`);
        });

        await expect(liftChecklist()).rejects.toThrow(/__process.exit:1/);

        // The pending checklist blocks the exit code, but must not prevent
        // the completed one (which sorts later) from being lifted too.
        expect(await readdir('.anchor/checklists')).toEqual(['a-pending.md']);
        exitSpy.mockRestore();
    });

    it('--projects still lifts a checklist with no project restriction (projects: [])', async () => {
        const content = [
            '---',
            'name: no-project-restriction',
            'description: applies everywhere',
            'environments: [dev]',
            'createdAt: 2024-01-01',
            'projects: []',
            '---',
            '',
            '- [x] done',
            '',
        ].join('\n');
        await writeFile('.anchor/checklists/no-project.md', content);

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(code => {
            throw new Error(`__process.exit:${code as number}`);
        });

        await liftChecklist(undefined, ['api']);

        expect(await readdir('.anchor/checklists')).toEqual([]);
        exitSpy.mockRestore();
    });
});
