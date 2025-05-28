import { readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { validateChecklistFile } from '../utils/validate-checklist.js';

export const liftChecklist = async (env?: string) => {
    const dir = '.anchor/checklists';
    const files = (await readdir(dir)).filter(f => f.endsWith('.md'));

    for (const file of files) {
        const { data, content } = await validateChecklistFile(join(dir, file));
        if (env && !data.environments.includes(env)) {
            continue; // Skip files not matching the specified environment
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
