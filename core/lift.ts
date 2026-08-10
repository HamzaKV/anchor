import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { listChecklists } from '../utils/list-checklists.js';
import { findAnchorRoot } from '../utils/find-anchor-root.js';

export const liftChecklist = async (env?: string[], projects?: string[], json = false) => {
    const root = await findAnchorRoot();
    const dir = root ? join(root, '.anchor', 'checklists') : '.anchor/checklists';

    const listing = await listChecklists(dir, env, projects);
    if (!listing) {
        if (json) {
            console.log(JSON.stringify([]));
        } else {
            console.log(`Directory not found: ${dir}`);
        }
        return;
    }

    let hasPending = false;
    const results: { file: string; status: 'removed' | 'pending' }[] = [];

    for (const { file, pendingCount } of listing.entries) {
        if (pendingCount === 0) {
            await unlink(join(dir, file));
            if (json) {
                results.push({ file, status: 'removed' });
            } else {
                console.log(`Checklist completed and removed: ${file}`);
            }
        } else {
            if (json) {
                results.push({ file, status: 'pending' });
            } else {
                console.error(`❌  Checklist still pending: ${file}`);
            }
            hasPending = true;
        }
    }

    if (json) {
        console.log(JSON.stringify(results));
    }

    if (hasPending) {
        process.exit(1);
    }
};
