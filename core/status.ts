import { listChecklists } from '../utils/list-checklists.js';

export const printStatus = async (env?: string[], projects?: string[], json = false) => {
    const dir = '.anchor/checklists';

    const listing = await listChecklists(dir, env, projects);
    if (!listing) {
        if (json) {
            console.log(JSON.stringify([]));
        } else {
            console.log(`Directory not found: ${dir}`);
        }
        return;
    }

    if (listing.totalFiles === 0) {
        if (json) {
            console.log(JSON.stringify([]));
        } else {
            console.log('⚠️ No checklists found. If needed, run `anchor set` to create one.');
        }
        return;
    }

    if (json) {
        const result = listing.entries.map(({ file, doneCount, pendingCount, data }) => ({
            file,
            doneCount,
            pendingCount,
            environments: data.environments,
            projects: data.projects ?? [],
        }));
        console.log(JSON.stringify(result));
        return;
    }

    for (const { file, doneCount, pendingCount } of listing.entries) {
        console.log(`📄 ${file} — ${doneCount} done / ${pendingCount} pending`);
    }
};
