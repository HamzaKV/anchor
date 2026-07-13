import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import inquirer from 'inquirer';
import matter from 'gray-matter';
import { fileExists } from '../utils/file-exists.js';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';

const getEnvironmentsFromConfig = async () => {
    const configPath = join('.anchor', 'config.json');
    if (!await fileExists(configPath)) {
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

export const setChecklist = async (env?: string, proj?: string[]) => {
    const { environments, projects } = await getEnvironmentsFromConfig();

    if (environments.length === 0) {
        console.error('No environments found in the configuration file. Please set up your environments first.');
        process.exit(1);
    }

    const { 
        checklistName, 
        selectedEnvs, 
        selectedProjects,
        items, 
        description 
    } = await inquirer.prompt<{
        checklistName: string;
        selectedEnvs: string[];
        selectedProjects: string[] | undefined;
        items: string;
        description?: string;
    }>([
        {
            type: 'input',
            name: 'checklistName',
            message: 'Checklist name (e.g., pr-123):'
        },
        {
            type: 'checkbox',
            name: 'selectedEnvs',
            message: 'Which environments does this apply to?',
            choices: environments,
            default: env ? [env] : undefined,
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
            message: 'Checklist items (comma separated):'
        },
        {
            type: 'input',
            name: 'description',
            message: 'Description for the checklist (optional):',
        }
    ]);

    if (!checklistName || !items) {
        console.error('Checklist name and items are required.');
        process.exit(1);
    }

    const dir = '.anchor/checklists';
    if (!await fileExists(dir)) await mkdir(dir, { recursive: true });

    const body = items
        .split(',')
        .map(item => `- [ ] ${item.trim()}`)
        .join('\n');

    const checklist = matter.stringify(`\n${body}\n`, {
        name: checklistName,
        description: description || '',
        environments: Array.from(new Set([...(env ? [env] : []), ...selectedEnvs])),
        createdAt: new Date().toISOString(),
        projects: selectedProjects || [],
    });

    const MAX_NAME_ATTEMPTS = 10;
    let path: string | undefined;
    for (let attempt = 0; attempt < MAX_NAME_ATTEMPTS; attempt++) {
        const checklistFileName = uniqueNamesGenerator({
            dictionaries: [adjectives, colors, animals],
            separator: '-',
            style: 'lowerCase'
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
        console.error('Could not generate a unique checklist filename. Please try again.');
        process.exit(1);
    }

    console.log(`Checklist created: ${path}`)
};
