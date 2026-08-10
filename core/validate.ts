import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { validateChecklistFile } from '../utils/validate-checklist.js';
import { fileExists } from '../utils/file-exists.js';
import { findAnchorRoot } from '../utils/find-anchor-root.js';

// Validates every checklist file under .anchor/checklists/, ignoring any
// environment/project filters — a malformed checklist is a repo-hygiene bug
// regardless of environment, so this always checks the full set of files.
export const validateAllChecklists = async () => {
    const root = await findAnchorRoot();
    const dir = root ? join(root, '.anchor', 'checklists') : '.anchor/checklists';

    if (!(await fileExists(dir))) {
        console.log(`Directory not found: ${dir}`);
        return;
    }

    const files = (await readdir(dir)).filter(f => f.endsWith('.md'));

    let hasInvalid = false;

    for (const file of files) {
        try {
            await validateChecklistFile(join(dir, file));
        } catch (err) {
            console.error(`❌  Invalid checklist ${file}: ${(err as Error).message}`);
            hasInvalid = true;
        }
    }

    if (hasInvalid) {
        process.exit(1);
    }

    console.log('✅  All checklists valid');
};
