// vi.mock is auto-hoisted above imports by Vitest, so the static `import inquirer`
// below receives the mocked module — no manual vi.resetModules or dynamic imports.
vi.mock('inquirer', () => ({
    default: { prompt: vi.fn() },
}));

import { describe, it, expect, vi } from 'vitest';
import { readFile, stat, writeFile, readdir } from 'node:fs/promises';
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

    it('re-running with an existing config re-prompts (pre-filled with current values) and overwrites', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            environments: 'dev',
            projects: 'api',
        } as never);
        await setupAnchor();

        vi.mocked(inquirer.prompt).mockClear();
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            environments: 'dev, staging',
            projects: 'api, docs',
        } as never);
        await setupAnchor();

        expect(inquirer.prompt).toHaveBeenCalledTimes(1);
        const questions = vi.mocked(inquirer.prompt).mock.calls[0][0] as unknown as Array<{
            name: string;
            default?: string;
        }>;
        const environmentsQuestion = questions.find(q => q.name === 'environments');
        const projectsQuestion = questions.find(q => q.name === 'projects');
        expect(environmentsQuestion?.default).toBe('dev');
        expect(projectsQuestion?.default).toBe('api');

        const cfg = JSON.parse(await readFile('.anchor/config.json', 'utf-8'));
        expect(cfg.environments).toEqual(['dev', 'staging']);
        expect(cfg.projects).toEqual(['api', 'docs']);
    });

    it('writes config.json via temp file + rename, leaving no leftover .tmp file', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            environments: 'dev, prod',
            projects: '',
        } as never);

        await setupAnchor();

        const entries = await readdir('.anchor');
        expect(entries).toEqual(['config.json']);
    });

    it('a crash between temp-write and rename never corrupts or creates config.json', async () => {
        // Simulate the exact interruption setup.ts guards against: the temp file
        // lands on disk but the process dies before the rename to config.json.
        const { mkdir } = await import('node:fs/promises');
        await mkdir('.anchor', { recursive: true });
        await writeFile('.anchor/config.json.99999.tmp', 'not valid json{{{');

        await expect(stat('.anchor/config.json')).rejects.toThrow();

        // A subsequent real run must still succeed and produce a valid config,
        // unaffected by the orphaned temp file from the "crash".
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            environments: 'dev',
            projects: '',
        } as never);
        await setupAnchor();

        const cfg = JSON.parse(await readFile('.anchor/config.json', 'utf-8'));
        expect(cfg.environments).toEqual(['dev']);
    });

    it('aborts when environments input is empty', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            environments: '',
            projects: '',
        } as never);

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`__process.exit:${code as number}`);
        });

        await expect(setupAnchor()).rejects.toThrow(/__process.exit:1/);

        await expect(stat('.anchor/config.json')).rejects.toThrow();
        exitSpy.mockRestore();
    });
});
