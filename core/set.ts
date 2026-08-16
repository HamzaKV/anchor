import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import inquirer from 'inquirer';
import matter from 'gray-matter';
import { fileExists } from '../utils/file-exists.js';
import { findAnchorRoot } from '../utils/find-anchor-root.js';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';

const getEnvironmentsFromConfig = async (root: string | null) => {
    const configPath = root ? join(root, '.anchor', 'config.json') : join('.anchor', 'config.json');
    if (!(await fileExists(configPath))) {
        throw new Error('Config file not found at .anchor/config.json');
    }
    let config: unknown;
    try {
        config = JSON.parse(await readFile(configPath, 'utf-8'));
    } catch {
        throw new Error(`Config file at ${configPath} is corrupt. Re-run \`anchor setup\`.`);
    }
    return config as { environments: string[]; projects: string[] };
};

export type NonInteractiveChecklist = {
    name: string;
    items: string;
    description?: string;
};

export const setChecklist = async (env?: string[], proj?: string[], nonInteractive?: NonInteractiveChecklist) => {
    const root = await findAnchorRoot();
    const { environments, projects } = await getEnvironmentsFromConfig(root);

    if (environments.length === 0) {
        throw new Error('No environments found in the configuration file. Please set up your environments first.');
    }

    let checklistName: string;
    let selectedEnvs: string[];
    let selectedProjects: string[] | undefined;
    let items: string;
    let description: string | undefined;

    if (nonInteractive) {
        // Scripted/CI path — skip inquirer entirely so this can run without a TTY.
        checklistName = nonInteractive.name;
        items = nonInteractive.items;
        description = nonInteractive.description;
        selectedEnvs = env ?? [];
        selectedProjects = proj ?? [];
    } else {
        ({ checklistName, selectedEnvs, selectedProjects, items, description } = await inquirer.prompt<{
            checklistName: string;
            selectedEnvs: string[];
            selectedProjects: string[] | undefined;
            items: string;
            description?: string;
        }>([
            {
                type: 'input',
                name: 'checklistName',
                message: 'Checklist name (e.g., pr-123):',
            },
            {
                type: 'checkbox',
                name: 'selectedEnvs',
                message: 'Which environments does this apply to?',
                choices: environments,
                default: env,
            },
            {
                type: 'checkbox',
                name: 'selectedProjects',
                message: 'Select projects to include in the checklist (optional):',
                choices: projects.length > 0 ? projects : [],
                default: proj ? proj : [],
                when: () => projects.length > 0,
            },
            {
                type: 'input',
                name: 'items',
                message: 'Checklist items (comma separated):',
            },
            {
                type: 'input',
                name: 'description',
                message: 'Description for the checklist (optional):',
            },
        ]));
    }

    if (!checklistName || !items) {
        throw new Error('Checklist name and items are required.');
    }

    const dir = root ? join(root, '.anchor', 'checklists') : '.anchor/checklists';
    if (!(await fileExists(dir))) await mkdir(dir, { recursive: true });

    const body = items
        .split(',')
        .map(item => `- [ ] ${item.trim()}`)
        .join('\n');

    const checklist = matter.stringify(`\n${body}\n`, {
        name: checklistName,
        description: description || '',
        environments: Array.from(new Set([...(env ?? []), ...selectedEnvs])),
        createdAt: new Date().toISOString(),
        projects: selectedProjects || [],
    });

    const MAX_NAME_ATTEMPTS = 10;
    let path: string | undefined;
    for (let attempt = 0; attempt < MAX_NAME_ATTEMPTS; attempt++) {
        const checklistFileName = uniqueNamesGenerator({
            dictionaries: [adjectives, colors, animals],
            separator: '-',
            style: 'lowerCase',
        });
        const candidate = join(dir, `${checklistFileName}.md`);
        try {
            await writeFile(candidate, checklist, { flag: 'wx' });
            path = candidate;
            break;
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
        }
    }

    if (!path) {
        throw new Error('Could not generate a unique checklist filename. Please try again.');
    }

    console.log(`Checklist created: ${path}`);
};
