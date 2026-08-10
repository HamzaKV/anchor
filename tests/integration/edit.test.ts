vi.mock('inquirer', () => ({
    default: { prompt: vi.fn() },
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import inquirer from 'inquirer';
import matter from 'gray-matter';
import { useTempCwd, seedConfig } from '../helpers/temp-dir.js';
import { copyChecklistFixture } from '../helpers/fixtures.js';
import { editChecklist } from '../../core/edit.js';

describe('editChecklist', () => {
    useTempCwd();

    beforeEach(async () => {
        await seedConfig({
            environments: ['dev', 'staging', 'prod'],
            projects: ['api', 'docs'],
        });
        await mkdir('.anchor/checklists', { recursive: true });
    });

    it('toggles an item from unchecked to checked and persists it', async () => {
        // pending.md: [x] Update CHANGELOG, [ ] Run database migration
        await copyChecklistFixture('pending.md');

        vi.mocked(inquirer.prompt)
            .mockResolvedValueOnce({ selectedFile: 'pending.md' } as never)
            // Check both items this time (index 0 was already checked, index 1 was not).
            .mockResolvedValueOnce({ checkedItems: [0, 1] } as never);

        await editChecklist();

        const content = await readFile('.anchor/checklists/pending.md', 'utf-8');
        expect(content).toMatch(/- \[x\] Update CHANGELOG/);
        expect(content).toMatch(/- \[x\] Run database migration/);
    });

    it('toggles an item from checked to unchecked and persists it', async () => {
        // completed.md: [x] Run unit tests, [x] Update CHANGELOG
        await copyChecklistFixture('completed.md');

        vi.mocked(inquirer.prompt)
            .mockResolvedValueOnce({ selectedFile: 'completed.md' } as never)
            // Only keep the first item checked; uncheck the second.
            .mockResolvedValueOnce({ checkedItems: [0] } as never);

        await editChecklist();

        const content = await readFile('.anchor/checklists/completed.md', 'utf-8');
        expect(content).toMatch(/- \[x\] Run unit tests/);
        expect(content).toMatch(/- \[ \] Update CHANGELOG/);
    });

    it('preserves frontmatter unchanged', async () => {
        await copyChecklistFixture('pending.md');

        vi.mocked(inquirer.prompt)
            .mockResolvedValueOnce({ selectedFile: 'pending.md' } as never)
            .mockResolvedValueOnce({ checkedItems: [0, 1] } as never);

        await editChecklist();

        const content = await readFile('.anchor/checklists/pending.md', 'utf-8');
        const { data } = matter(content);

        expect(data.name).toBe('pr-101');
        expect(data.description).toBe('Pending sample');
        expect(data.environments).toEqual(['staging']);
        expect(data.projects).toEqual([]);
        expect(data.createdAt).toBeDefined();
    });

    it('preserves item order regardless of selection order returned by the prompt', async () => {
        const content = [
            '---',
            'name: order-check',
            'description: order',
            'environments: [dev]',
            'createdAt: 2024-01-01',
            'projects: []',
            '---',
            '',
            '- [ ] first',
            '- [ ] second',
            '- [ ] third',
            '',
        ].join('\n');
        await writeFile('.anchor/checklists/order-check.md', content);

        vi.mocked(inquirer.prompt)
            .mockResolvedValueOnce({ selectedFile: 'order-check.md' } as never)
            // Selection returned out of order; the third item is checked, others not.
            .mockResolvedValueOnce({ checkedItems: [2] } as never);

        await editChecklist();

        const updated = await readFile('.anchor/checklists/order-check.md', 'utf-8');
        const lines = matter(updated).content.split('\n').filter((l) => l.trim() !== '');

        expect(lines).toEqual([
            '- [ ] first',
            '- [ ] second',
            '- [x] third',
        ]);
    });

    it('prints a message and returns when no checklists exist', async () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await editChecklist();

        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/no checklists found/i));
        expect(inquirer.prompt).not.toHaveBeenCalled();

        logSpy.mockRestore();
    });

    it('prints a message and returns when the checklists directory does not exist', async () => {
        const { rm } = await import('node:fs/promises');
        await rm('.anchor/checklists', { recursive: true, force: true });

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await editChecklist();

        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/directory not found/i));
        expect(inquirer.prompt).not.toHaveBeenCalled();

        logSpy.mockRestore();
    });
});
