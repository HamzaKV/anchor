vi.mock('inquirer', () => ({
    default: { prompt: vi.fn() },
}));
vi.mock('unique-names-generator', () => ({
    uniqueNamesGenerator: vi.fn(() => 'golden-pr'),
    adjectives: [],
    colors: [],
    animals: [],
}));

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { useTempCwd, seedConfig } from '../helpers/temp-dir.js';
import { setChecklist } from '../../core/set.js';
import inquirer from 'inquirer';
import matter from 'gray-matter';

// These snapshots lock the EXACT text the CLI produces. Any future change to
// core/set.ts formatting produces a clear diff.

// Fake `Date` so `createdAt: ${new Date().toISOString()}` in set.ts is
// deterministic across runs and platforms — otherwise every run produces a
// different snapshot and the regression test fails.
const FROZEN_TIME = new Date('2024-06-15T12:00:00.000Z');

describe('markdown generation — golden snapshots', () => {
    useTempCwd();

    beforeEach(async () => {
        await seedConfig({
            environments: ['dev', 'staging', 'prod'],
            projects: ['api', 'docs'],
        });
        vi.useFakeTimers();
        vi.setSystemTime(FROZEN_TIME);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('matches the captured golden file for a typical set invocation', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            checklistName: 'pr-regression',
            selectedEnvs: ['dev', 'staging'],
            selectedProjects: ['api'],
            items: 'Lint,Test,Deploy',
            description: 'Regression capture',
        } as never);

        await setChecklist();

        const content = await readFile('.anchor/checklists/golden-pr.md', 'utf-8');
        await expect(content).toMatchFileSnapshot(
            'tests/__fixtures__/__snapshots__/typical-checklist.md',
        );
    });

    // BUG TRACKER: core/set.ts writes `environments: [${env || selectedEnvs.join(', ')}]`.
    // When `--environment=dev` is passed as a filter but the user picks a different env
    // at the prompt, the filter value silently wins and the user's selection is lost.
    // Both the explicit assertion below AND the snapshot catch the bug.
    // When the bug is fixed, the snapshot will need updating via `vitest -u`.
    it('bug-tracks: --environment filter overrides selectedEnvs (current behaviour)', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            checklistName: 'pr-bug',
            selectedEnvs: ['staging'],
            selectedProjects: [],
            items: 'verify env',
            description: 'bug repro',
        } as never);

        await setChecklist('dev'); // ← filter says 'dev', user picks 'staging'

        const content = await readFile('.anchor/checklists/golden-pr.md', 'utf-8');
        const { data } = matter(content);

        // Strong assertion that survives snapshot deletion.
        expect(data.environments).toEqual(['dev']);
        // Belt-and-braces: lock the timer fix in too so a future Vitest upgrade
        // that stops intercepting `new Date()` can never silently break this test.
        expect(data.createdAt).toBe('2024-06-15T12:00:00.000Z');

        // AND a snapshot to catch any further formatting drift.
        await expect(content).toMatchFileSnapshot(
            'tests/__fixtures__/__snapshots__/bug-env-filter-override.md',
        );
    });
});
