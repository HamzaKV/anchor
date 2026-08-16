import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileExists } from '../utils/file-exists.js';
import { findAnchorRoot } from '../utils/find-anchor-root.js';

// Removes a checklist by filename regardless of completion state — the gap
// `anchor lift` deliberately doesn't fill, since lift only removes completed
// checklists.
export const removeChecklist = async (target?: string) => {
    if (!target) {
        throw new Error('Checklist name required. Usage: anchor rm <name>');
    }

    const root = await findAnchorRoot();
    const dir = root ? join(root, '.anchor', 'checklists') : '.anchor/checklists';

    const file = target.endsWith('.md') ? target : `${target}.md`;
    const path = join(dir, file);

    if (!(await fileExists(path))) {
        throw new Error(`Checklist not found: ${file}`);
    }

    await unlink(path);
    console.log(`Checklist removed: ${file}`);
};
