import { writeFile, rename, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import inquirer from 'inquirer';
import { fileExists } from '../utils/file-exists.js';

export const setupAnchor = async () => {
    const dir = '.anchor';
    if (!(await fileExists(dir))) await mkdir(dir);

    const configPath = join(dir, 'config.json');
    const configExists = await fileExists(configPath);

    let currentEnvironments: string[] = [];
    let currentProjects: string[] = [];
    if (configExists) {
        console.log(`⚠️  Config file already exists at ${configPath}. Re-prompting to update it.`);
        const existing = JSON.parse(await readFile(configPath, 'utf-8'));
        currentEnvironments = Array.isArray(existing.environments) ? existing.environments : [];
        currentProjects = Array.isArray(existing.projects) ? existing.projects : [];
    }

    const { environments, projects } = await inquirer.prompt<{
        environments: string;
        projects?: string;
    }>([
        {
            type: 'input',
            name: 'environments',
            message: 'Comma-separated list of environments (e.g., dev, staging, prod):',
            default: currentEnvironments.join(', '),
        },
        {
            type: 'input',
            name: 'projects',
            message: 'Comma-separated list of projects to include in the checklist (optional):',
            default: currentProjects.join(', '),
        },
    ]);

    if (!environments) {
        throw new Error('No environments provided. Setup aborted.');
    }

    const envArray = environments.split(',').map(env => env.trim());
    const projectsArray = projects ? projects.split(',').map(p => p.trim()) : [];
    const config = {
        environments: envArray,
        projects: projectsArray,
    };

    // Write via temp file + rename so a crash mid-write can't corrupt config.json.
    const tmpPath = `${configPath}.${process.pid}.tmp`;
    await writeFile(tmpPath, JSON.stringify(config, null, 2));
    await rename(tmpPath, configPath);
    console.log(configExists ? `✅ Config at ${configPath} updated.` : `✅ Config written to ${configPath}`);
};
