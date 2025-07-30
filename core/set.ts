import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import inquirer from 'inquirer';
import { fileExists } from '../utils/file-exists.js';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';

const getEnvironmentsFromConfig = async () => {
    const configPath = join('.anchor', 'config.json');
    if (!await fileExists(configPath)) {
        throw new Error('Config file not found at .anchor/config.json');
    }
    const config = JSON.parse(await readFile(configPath, 'utf-8'));
    return config as { environments: string[]; projects: string[] };
};

export const setChecklist = async (env?: string, proj?: string[]) => {
    const { environments, projects } = await getEnvironmentsFromConfig();

    if (environments.length === 0) {
        console.error('No environments found in the configuration file. Please set up your environments first.');
        return;
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
        return;
    }

    const dir = '.anchor/checklists';
    if (!await fileExists(dir)) await mkdir(dir, { recursive: true });

    const checklist = `---
name: ${checklistName}
description: ${description || ''}
environments: [${env || selectedEnvs.join(', ')}]
createdAt: ${new Date().toISOString()}
projects: [${selectedProjects ? selectedProjects.join(', ') : ''}]
---

${items
            .split(',')
            .map(item => `- [ ] ${item.trim()}`)
            .join('\n')}
`;

    const checklistFileName = uniqueNamesGenerator({
        dictionaries: [adjectives, colors, animals],
        separator: '-',
        style: 'lowerCase'
    });

    const path = join(dir, `${checklistFileName}.md`)
    await writeFile(path, checklist)
    console.log(`Checklist created: ${path}`)
};
