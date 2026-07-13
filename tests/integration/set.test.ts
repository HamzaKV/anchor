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

    it('errors out when config.json is missing', async () => {
        await unlink('.anchor/config.json');
        await expect(setChecklist()).rejects.toThrow(/Config file not found/i);
    });

    it('uses --environment to preselect the env checkbox default', async () => {
        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            checklistName: 'pr-789',
            selectedEnvs: ['prod'],
            selectedProjects: [],
            items: 'Deploy, Monitor',
            description: 'prod rollout',
        } as never);

        await setChecklist('prod');

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

        await setChecklist();

        await expect(readdir('.anchor/checklists')).rejects.toThrow(/ENOENT/);
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
