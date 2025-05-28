import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import inquirer from 'inquirer';
import { fileExists } from '../utils/file-exists.js';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';

const getEnvironmentsFromConfig = async (): Promise<string[]> => {
    const configPath = join('.anchor', 'config.json');
    if (!await fileExists(configPath)) {
        throw new Error('Config file not found at .anchor/config.json');
    }
    const config = JSON.parse(await readFile(configPath, 'utf-8'));
    return config.environments || [];
};

export const setChecklist = async (env?: string) => {
    const environments = await getEnvironmentsFromConfig();

    if (environments.length === 0) {
        console.error('No environments found in the configuration file. Please set up your environments first.');
        return;
    }

    const { 
        checklistName, 
        selectedEnvs, 
        items, 
        description 
    } = await inquirer.prompt<{
        checklistName: string;
        selectedEnvs: string[];
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
