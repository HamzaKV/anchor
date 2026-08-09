vi.mock('inquirer', () => ({
    default: { prompt: vi.fn() },
}));
vi.mock('unique-names-generator', () => ({
    uniqueNamesGenerator: vi.fn(() => 'mock-name'),
    adjectives: [],
    colors: [],
    animals: [],
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import inquirer from 'inquirer';
import matter from 'gray-matter';
import { uniqueNamesGenerator } from 'unique-names-generator';
import { useTempCwd, seedConfig } from '../helpers/temp-dir.js';
import { setChecklist } from '../../core/set.js';

describe('setChecklist', () => {
    useTempCwd();

    beforeEach(async () => {
        await seedConfig();
    });

    it('creates a checklist markdown file with correct frontmatter and items', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            checklistName: 'pr-456',
            selectedEnvs: ['dev', 'staging'],
            selectedProjects: ['api'],
            items: ' Update env,Run tests , Validate keys',
            description: 'Add SSO',
        } as never);

        await setChecklist();

        const files = await readdir('.anchor/checklists');
        expect(files).toEqual(['mock-name.md']);

        const content = await readFile('.anchor/checklists/mock-name.md', 'utf-8');
        const { data } = matter(content);
        expect(data.name).toBe('pr-456');
        expect(data.description).toBe('Add SSO');
        expect(data.environments).toEqual(['dev', 'staging']);
        expect(data.projects).toEqual(['api']);
        expect(content).toMatch(/- \[ \] Update env/);
        expect(content).toMatch(/- \[ \] Run tests/);
        expect(content).toMatch(/- \[ \] Validate keys/);
    });

    it('safely serializes a description containing YAML-breaking characters', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            checklistName: 'pr-injection',
            selectedEnvs: ['dev', 'staging'],
            selectedProjects: ['api'],
            items: 'check',
            description: '\nenvironments: []\nfoo: bar',
        } as never);

        await setChecklist();

        const content = await readFile('.anchor/checklists/mock-name.md', 'utf-8');
        const { data } = matter(content);

        // The injected "environments: []" must NOT override the real frontmatter field.
        expect(data.environments).toEqual(['dev', 'staging']);
        expect(data.foo).toBeUndefined();
        expect(data.description).toContain('environments: []');
    });

    it('retries with a new name when the generated filename already exists', async () => {
        await mkdir('.anchor/checklists', { recursive: true });
        await writeFile('.anchor/checklists/mock-name.md', 'existing content');

        vi.mocked(uniqueNamesGenerator)
            .mockReturnValueOnce('mock-name') // collides with the file above
            .mockReturnValueOnce('mock-name-2');

        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            checklistName: 'pr-collide',
            selectedEnvs: ['dev'],
            selectedProjects: [],
            items: 'thing',
            description: '',
        } as never);

        await setChecklist();

        // The pre-existing file must survive untouched, and the new one lands
        // under the retried name instead of silently overwriting it.
        expect(await readFile('.anchor/checklists/mock-name.md', 'utf-8')).toBe('existing content');
        const newContent = await readFile('.anchor/checklists/mock-name-2.md', 'utf-8');
        expect(newContent).toContain('name: pr-collide');
    });

    it('gives up after MAX_NAME_ATTEMPTS name collisions in a row', async () => {
        await mkdir('.anchor/checklists', { recursive: true });
        await writeFile('.anchor/checklists/mock-name.md', 'existing content');

        // Every attempt returns the same colliding name, exhausting all retries.
        vi.mocked(uniqueNamesGenerator).mockReturnValue('mock-name');

        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            checklistName: 'pr-exhausted',
            selectedEnvs: ['dev'],
            selectedProjects: [],
            items: 'thing',
            description: '',
        } as never);

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`__process.exit:${code as number}`);
        });
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(setChecklist()).rejects.toThrow(/__process.exit:1/);

        expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/could not generate a unique checklist filename/i));
        expect(uniqueNamesGenerator).toHaveBeenCalledTimes(10); // MAX_NAME_ATTEMPTS
        // The pre-existing file must survive untouched — no partial/overwritten output.
        expect(await readFile('.anchor/checklists/mock-name.md', 'utf-8')).toBe('existing content');

        exitSpy.mockRestore();
        errorSpy.mockRestore();
    });

    it('errors out when config.json is missing', async () => {
        await unlink('.anchor/config.json');
        await expect(setChecklist()).rejects.toThrow(/Config file not found/i);
    });

    it('errors out cleanly when config.json is corrupt', async () => {
        await writeFile('.anchor/config.json', '{ not valid json');
        await expect(setChecklist()).rejects.toThrow(/corrupt.*anchor setup/i);
    });

    it('uses --environment to preselect the env checkbox default', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            checklistName: 'pr-789',
            selectedEnvs: ['prod'],
            selectedProjects: [],
            items: 'Deploy, Monitor',
            description: 'prod rollout',
        } as never);

        await setChecklist(['prod']);

        const calls = vi.mocked(inquirer.prompt).mock.calls[0]![0] as unknown as Array<{
            name: string;
            default?: unknown;
        }>;
        const envPrompt = calls.find((q) => q.name === 'selectedEnvs');
        expect(envPrompt?.default).toEqual(['prod']);
    });

    it('writes empty projects list when no projects in config', async () => {
        await writeFile(
            '.anchor/config.json',
            JSON.stringify({ environments: ['dev'], projects: [] }, null, 2),
        );

        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            checklistName: 'pr-no-proj',
            selectedEnvs: ['dev'],
            selectedProjects: undefined,
            items: 'smoke',
            description: '',
        } as never);

        await setChecklist();

        const content = await readFile('.anchor/checklists/mock-name.md', 'utf-8');
        expect(content).toContain('projects: []');
    });

    it('aborts gracefully when checklist name or items missing', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            checklistName: '',
            selectedEnvs: ['dev'],
            selectedProjects: [],
            items: 'stuff',
            description: '',
        } as never);

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`__process.exit:${code as number}`);
        });

        await expect(setChecklist()).rejects.toThrow(/__process.exit:1/);

        await expect(readdir('.anchor/checklists')).rejects.toThrow(/ENOENT/);
        exitSpy.mockRestore();
    });

    it('creates .anchor/checklists/ directory if missing', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            checklistName: 'pr-auto-mkdir',
            selectedEnvs: ['dev'],
            selectedProjects: [],
            items: 'first',
            description: '',
        } as never);

        await setChecklist();

        const files = await readdir('.anchor/checklists');
        expect(files).toEqual(['mock-name.md']);
    });
});
