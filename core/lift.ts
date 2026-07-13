import { readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { validateChecklistFile } from '../utils/validate-checklist.js';
import { fileExists } from '../utils/file-exists.js';

export const liftChecklist = async (env?: string, projects?: string[]) => {
    const dir = '.anchor/checklists';

    if (!(await fileExists(dir))) {
        console.log(`Directory not found: ${dir}`);
        return;
    }

    const files = (await readdir(dir)).filter(f => f.endsWith('.md'));

    for (const file of files) {
        let data: Awaited<ReturnType<typeof validateChecklistFile>>['data'];
        let content: string;
        try {
            ({ data, content } = await validateChecklistFile(join(dir, file)));
        } catch (err) {
            console.error(`❌  Skipping invalid checklist ${file}: ${(err as Error).message}`);
            process.exitCode = 1;
            continue;
        }

        if (env && !data.environments.includes(env)) {
            continue; // Skip files not matching the specified environment
        }

        if (projects && data.projects && !projects.some(p => data.projects.includes(p))) {
            continue; // Skip files not matching the specified projects
        }

        if (!content.includes('[ ]')) {
            await unlink(join(dir, file));
            console.log(`Checklist completed and removed: ${file}`);
        } else {
            console.error(`❌  Checklist still pending: ${file}`);
            process.exit(1);
        }
    }
};
