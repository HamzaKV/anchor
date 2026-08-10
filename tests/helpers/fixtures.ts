import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM-safe `__dirname`. Vitest supports `import.meta.url` natively, and tsc-bundled
// Node ESM keeps it, so this works for both vitest runs and `tsx` debug runs.
const __dirname = dirname(fileURLToPath(import.meta.url));

// The fixtures live next to the test source, rooted at the project root.
// Compute as an absolute path so callers can use it from any process.cwd().
export const PROJECT_ROOT = join(__dirname, '..', '..');
export const FIXTURES_DIR = join(PROJECT_ROOT, 'tests', '__fixtures__');

/**
 * Copy a pre-made `.md` checklist from tests/__fixtures__/checklists/<name>
 * into the current `.anchor/checklists/` directory. Use absolute paths under
 * the hood because tests mutate `process.cwd()` before each run.
 */
export const copyChecklistFixture = async (name: string, destDir: string = '.anchor/checklists'): Promise<string> => {
    await mkdir(destDir, { recursive: true });
    const src = join(FIXTURES_DIR, 'checklists', name);
    const dst = join(destDir, name);
    await copyFile(src, dst);
    return dst;
};
