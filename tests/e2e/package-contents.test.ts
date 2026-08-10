// Regression coverage for 7dcab53: tsconfig used to exclude test *.ts files
// but not the tests/ directory or vitest.config.ts, so tsc compiled
// dist/tests/** and dist/vitest.config.js into every publish. This asserts
// what `npm publish` (run from within dist/, per the `roll` script) actually
// ships, so that regression can't silently come back.

import { describe, it, expect, beforeAll } from 'vitest';
import { execa } from 'execa';
import { join as pathJoin } from 'node:path';
import { fileExists } from '../../utils/file-exists.js';

const DIST_DIR = pathJoin(process.cwd(), 'dist');

describe('e2e: published package contents', () => {
    beforeAll(async () => {
        if (!(await fileExists(DIST_DIR))) {
            throw new Error(
                `dist/ not found. Run \`bun run build\` first (or \`npm run test:e2e\` which builds automatically).`,
            );
        }
    });

    it('excludes tests, vitest config, and tsconfig from the packed tarball', async () => {
        const { stdout } = await execa('npm', ['pack', '--dry-run', '--json'], { cwd: DIST_DIR });
        const [{ files }] = JSON.parse(stdout) as { files: { path: string }[] }[];
        const paths = files.map((f) => f.path);

        for (const forbidden of [/^tests\//, /^vitest\.config\./, /^tsconfig/]) {
            expect(paths.some((p) => forbidden.test(p))).toBe(false);
        }
    });

    it('ships exactly the files declared', async () => {
        const { stdout } = await execa('npm', ['pack', '--dry-run', '--json'], { cwd: DIST_DIR });
        const [{ files }] = JSON.parse(stdout) as { files: { path: string }[] }[];
        const paths = files.map((f) => f.path).sort();

        expect(paths).toEqual([
            'LICENSE',
            'README.md',
            'bin/main.js',
            'core/lift.js',
            'core/set.js',
            'core/setup.js',
            'core/status.js',
            'package.json',
            'utils/file-exists.js',
            'utils/find-anchor-root.js',
            'utils/list-checklists.js',
            'utils/validate-checklist.js',
        ]);
    });
});
