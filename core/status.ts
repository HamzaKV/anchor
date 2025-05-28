import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { validateChecklistFile } from '../utils/validate-checklist.js';
import { fileExists } from '../utils/file-exists.js';

export const printStatus = async (env?: string) => {
    const dir = '.anchor/checklists';

    if (!(await fileExists(dir))) {
        console.log(`Directory not found: ${dir}`);
        return;
    }

    const files = (await readdir(dir)).filter(f => f.endsWith('.md'));

    if (files.length === 0) {
        console.log('⚠️ No checklists found. If needed, run `anchor set` to create one.');
        return;
    }

    for (const file of files) {
        const { data, content } = await validateChecklistFile(join(dir, file));
        if (env && !data.environments.includes(env)) {
            continue; // Skip files not matching the specified environment
        }
        const unchecked = (content.match(/\[ \]/g) || []).length;
        const checked = (content.match(/\[x\]/gi) || []).length;
        console.log(`📄 ${file} — ${checked} done / ${unchecked} pending`);
    }
};
