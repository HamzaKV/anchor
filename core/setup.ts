import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import inquirer from 'inquirer';
import { fileExists } from '../utils/file-exists.js';

export const setupAnchor = async () => {
    const dir = '.anchor';
    if (!await fileExists(dir)) await mkdir(dir);

    const configPath = join(dir, 'config.json');
    if (await fileExists(configPath)) {
        console.log(`⚠️  Config file already exists at ${configPath}. Skipping setup.`);
        return;
    }

    const { environments, projects } = await inquirer.prompt<{
        environments: string;
        projects?: string;
    }>([
        {
            type: 'input',
            name: 'environments',
            message: 'Comma-separated list of environments (e.g., dev, staging, prod):'
        },
        {
            type: 'input',
            name: 'projects',
            message: 'Comma-separated list of projects to include in the checklist (optional):',
            default: ''
        }
    ]);

    if (!environments) {
        console.error('❌  No environments provided. Setup aborted.');
        return;
    }

    const envArray = environments.split(',').map(env => env.trim());
    const projectsArray = projects ? projects.split(',').map(p => p.trim()) : [];
    const config = { 
        environments: envArray,
        projects: projectsArray
    };
    await writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Config written to ${configPath}`);
};
