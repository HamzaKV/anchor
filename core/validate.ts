import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateChecklistFile } from '../utils/validate-checklist.js';
import { fileExists } from '../utils/file-exists.js';
import { findAnchorRoot } from '../utils/find-anchor-root.js';

// Returns an error message if config.json exists but is malformed, or null
// if it's missing (not this command's job to require setup) or well-formed.
const validateConfigFile = async (configPath: string): Promise<string | null> => {
    if (!(await fileExists(configPath))) return null;

    let config: unknown;
    try {
        config = JSON.parse(await readFile(configPath, 'utf-8'));
    } catch {
        return `Invalid config: ${configPath} is not valid JSON`;
    }

    const { environments, projects } = config as { environments?: unknown; projects?: unknown };
    if (!Array.isArray(environments) || !environments.every(e => typeof e === 'string')) {
        return `Invalid config: 'environments' must be an array of strings in ${configPath}`;
    }
    if (projects !== undefined && (!Array.isArray(projects) || !projects.every(p => typeof p === 'string'))) {
        return `Invalid config: 'projects' must be an array of strings in ${configPath}`;
    }

    return null;
};

// Validates .anchor/config.json plus every checklist file under
// .anchor/checklists/, ignoring any environment/project filters — a
// malformed checklist or config is a repo-hygiene bug regardless of
// environment, so this always checks the full set of files.
export const validateAllChecklists = async () => {
    const root = await findAnchorRoot();
    const configPath = root ? join(root, '.anchor', 'config.json') : '.anchor/config.json';
    const dir = root ? join(root, '.anchor', 'checklists') : '.anchor/checklists';

    let hasInvalid = false;

    const configError = await validateConfigFile(configPath);
    if (configError) {
        console.error(`❌  ${configError}`);
        hasInvalid = true;
    }

    if (await fileExists(dir)) {
        const files = (await readdir(dir)).filter(f => f.endsWith('.md'));

        for (const file of files) {
            try {
                await validateChecklistFile(join(dir, file));
            } catch (err) {
                console.error(`❌  Invalid checklist ${file}: ${(err as Error).message}`);
                hasInvalid = true;
            }
        }
    } else if (!hasInvalid) {
        console.log(`Directory not found: ${dir}`);
        return;
    }

    if (hasInvalid) {
        process.exit(1);
    }

    console.log('✅  All checklists valid');
};
