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
import { join } from 'node:path';
import { useTempCwd, seedConfig } from '../helpers/temp-dir.js';
import { FIXTURES_DIR } from '../helpers/fixtures.js';
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
            join(FIXTURES_DIR, '__snapshots__', 'typical-checklist.md'),
        );
    });

    // Regression coverage for a fixed bug: core/set.ts used to write
    // `environments: [${env || selectedEnvs.join(', ')}]`, so an `--environment=dev`
    // filter silently discarded whatever the user actually selected at the prompt.
    // Fixed to merge both instead of one clobbering the other.
    it('merges the --environment filter with the selected envs instead of clobbering them', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            checklistName: 'pr-bug',
            selectedEnvs: ['staging'],
            selectedProjects: [],
            items: 'verify env',
            description: 'bug repro',
        } as never);

        await setChecklist('dev'); // filter says 'dev', user picks 'staging'

        const content = await readFile('.anchor/checklists/golden-pr.md', 'utf-8');
        const { data } = matter(content);

        // Strong assertion that survives snapshot deletion.
        expect(data.environments).toEqual(['dev', 'staging']);
        // Belt-and-braces: lock the timer fix in too so a future Vitest upgrade
        // that stops intercepting `new Date()` can never silently break this test.
        expect(data.createdAt).toBe('2024-06-15T12:00:00.000Z');

        // AND a snapshot to catch any further formatting drift.
        await expect(content).toMatchFileSnapshot(
            join(FIXTURES_DIR, '__snapshots__', 'bug-env-filter-override.md'),
        );
    });
});
