import { join } from 'node:path';
import { listChecklists } from '../utils/list-checklists.js';
import { findAnchorRoot } from '../utils/find-anchor-root.js';

export const printStatus = async (env?: string[], projects?: string[]) => {
    const root = await findAnchorRoot();
    const dir = root ? join(root, '.anchor', 'checklists') : '.anchor/checklists';

    const listing = await listChecklists(dir, env, projects);
    if (!listing) {
        console.log(`Directory not found: ${dir}`);
        return;
    }

    if (listing.totalFiles === 0) {
        console.log('⚠️ No checklists found. If needed, run `anchor set` to create one.');
        return;
    }

    for (const { file, doneCount, pendingCount } of listing.entries) {
        console.log(`📄 ${file} — ${doneCount} done / ${pendingCount} pending`);
    }
};
