import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { useTempCwd, seedConfig } from '../helpers/temp-dir.js';
import { copyChecklistFixture } from '../helpers/fixtures.js';
import { printStatus } from '../../core/status.js';

describe('printStatus', () => {
    useTempCwd();

    beforeEach(async () => {
        await seedConfig({ environments: ['dev', 'staging', 'prod'] });
        await mkdir('.anchor/checklists', { recursive: true });
    });

    it('reports "no checklists" when directory is empty', async () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await printStatus();

        const all = logSpy.mock.calls.map(c => String(c[0])).join('\n');
        expect(all).toMatch(/No checklists/);
        logSpy.mockRestore();
    });

    it('prints pending + checked tally for each checklist', async () => {
        await copyChecklistFixture('completed.md'); // 2 done / 0 pending
        await copyChecklistFixture('pending.md'); // 1 done / 1 pending

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await printStatus();

        const lines = logSpy.mock.calls.map(c => String(c[0])).join('\n');
        expect(lines).toMatch(/completed\.md.*2 done \/ 0 pending/);
        expect(lines).toMatch(/pending\.md.*1 done \/ 1 pending/);
        logSpy.mockRestore();
    });

    it('filters by --environment', async () => {
        await copyChecklistFixture('completed.md'); // envs: [dev, staging]
        await copyChecklistFixture('pending.md'); // envs: [staging]
        const prodOnlyContent = [
            '---',
            'name: prod-only',
            'description: prod',
            'environments: [prod]',
            'createdAt: 2024-01-01',
            'projects: []',
            '---',
            '',
            '- [ ] still pending',
            '',
        ].join('\n');
        await writeFile('.anchor/checklists/prod-only.md', prodOnlyContent);

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await printStatus(['staging']);

        const lines = logSpy.mock.calls.map(c => String(c[0])).join('\n');
        expect(lines).toContain('completed.md');
        expect(lines).toContain('pending.md');
        expect(lines).not.toContain('prod-only.md');
        logSpy.mockRestore();
    });

    it('filters by --projects', async () => {
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
            '- [ ] still pending',
            '',
        ].join('\n');
        await writeFile('.anchor/checklists/docs-only.md', docsOnlyContent);

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await printStatus(undefined, ['docs']);

        const lines = logSpy.mock.calls.map(c => String(c[0])).join('\n');
        expect(lines).toContain('docs-only.md');
        expect(lines).not.toContain('completed.md');
        logSpy.mockRestore();
    });

    it('--projects does not exclude a checklist with no project restriction (projects: [])', async () => {
        await copyChecklistFixture('completed.md'); // projects: [api]
        await copyChecklistFixture('pending.md'); // projects: []

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await printStatus(undefined, ['docs']);

        const lines = logSpy.mock.calls.map(c => String(c[0])).join('\n');
        expect(lines).toContain('pending.md');
        expect(lines).not.toContain('completed.md');
        logSpy.mockRestore();
    });

    it('skips a malformed checklist without aborting the rest', async () => {
        await copyChecklistFixture('invalid-line.md');
        await copyChecklistFixture('completed.md');

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await printStatus();

        const lines = logSpy.mock.calls.map(c => String(c[0])).join('\n');
        expect(lines).toContain('completed.md');
        expect(process.exitCode).toBe(1);
        expect(errorSpy.mock.calls.some(c => String(c[0]).includes('invalid-line.md'))).toBe(true);

        process.exitCode = 0;
        errorSpy.mockRestore();
        logSpy.mockRestore();
    });

    it('does not throw when .anchor/checklists directory missing', async () => {
        await rm('.anchor/checklists', { recursive: true, force: true });

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await expect(printStatus()).resolves.toBeUndefined();
        logSpy.mockRestore();
    });
});
