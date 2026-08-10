import { dirname, join } from 'node:path';
import { fileExists } from './file-exists.js';

/**
 * Walks upward from `startDir` toward the filesystem root looking for the
 * nearest ancestor directory that contains a `.anchor` directory — the same
 * upward-discovery strategy `git` uses to find `.git`.
 *
 * Returns the directory that CONTAINS `.anchor` (not the `.anchor` path
 * itself), so callers build paths with `join(root, '.anchor', 'checklists')`.
 * Returns `null` if no `.anchor` directory is found before reaching the
 * filesystem root.
 */
export const findAnchorRoot = async (startDir: string = process.cwd()): Promise<string | null> => {
    let dir = startDir;
    while (true) {
        if (await fileExists(join(dir, '.anchor'))) {
            return dir;
        }
        const parent = dirname(dir);
        if (parent === dir) {
            return null;
        }
        dir = parent;
    }
};
