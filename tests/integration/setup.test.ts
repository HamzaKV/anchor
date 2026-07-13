// vi.mock is auto-hoisted above imports by Vitest, so the static `import inquirer`
// below receives the mocked module — no manual vi.resetModules or dynamic imports.
vi.mock('inquirer', () => ({
    default: { prompt: vi.fn() },
}));

import { describe, it, expect, vi } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import inquirer from 'inquirer';
import { useTempCwd } from '../helpers/temp-dir.js';
import { setupAnchor } from '../../core/setup.js';

describe('setupAnchor', () => {
    useTempCwd();

    it('creates .anchor/config.json with environments and projects', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            environments: 'dev, staging, prod',
            projects: 'api, docs',
        } as never);

        await setupAnchor();

        const raw = await readFile('.anchor/config.json', 'utf-8');
        const cfg = JSON.parse(raw);
        expect(cfg.environments).toEqual(['dev', 'staging', 'prod']);
        expect(cfg.projects).toEqual(['api', 'docs']);
        expect((await stat('.anchor/config.json')).isFile()).toBe(true);
    });

    it('treats an empty projects string as []', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            environments: 'dev, prod',
            projects: '',
        } as never);

        await setupAnchor();

        const cfg = JSON.parse(await readFile('.anchor/config.json', 'utf-8'));
        expect(cfg.projects).toEqual([]);
    });

    it('is idempotent — second run sees an existing config and skips write', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            environments: 'dev',
            projects: '',
        } as never);
        await setupAnchor();

        vi.mocked(inquirer.prompt).mockClear();
        await setupAnchor();
        expect(inquirer.prompt).not.toHaveBeenCalled();

        const cfg = JSON.parse(await readFile('.anchor/config.json', 'utf-8'));
        expect(cfg.environments).toEqual(['dev']);
    });

    it('aborts when environments input is empty', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            environments: '',
            projects: '',
        } as never);

        await setupAnchor();

        await expect(stat('.anchor/config.json')).rejects.toThrow();
    });
});
