import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { listChecklists } from '../utils/list-checklists.js';

export const liftChecklist = async (env?: string[], projects?: string[]) => {
    const dir = '.anchor/checklists';

    const listing = await listChecklists(dir, env, projects);
    if (!listing) {
        console.log(`Directory not found: ${dir}`);
        return;
    }

    let hasPending = false;

    for (const { file, pendingCount } of listing.entries) {
        if (pendingCount === 0) {
            await unlink(join(dir, file));
            console.log(`Checklist completed and removed: ${file}`);
        } else {
            console.error(`❌  Checklist still pending: ${file}`);
            hasPending = true;
        }
    }

    if (hasPending) {
        process.exit(1);
    }
};
