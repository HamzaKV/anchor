// Static-asset checks for examples/pre-push (the README's Git Hooks recipe).
// Doesn't spin up a real git repo / invoke actual hooks -- just verifies the
// example is present, tracked as executable, and syntactically valid shell,
// since it's a copy-pasteable artifact rather than behavior under test.

import { describe, it, expect, beforeAll } from 'vitest';
import { execa } from 'execa';
import { readFile } from 'node:fs/promises';
import { join as pathJoin } from 'node:path';
import { fileExists } from '../../utils/file-exists.js';

const EXAMPLE_PATH = pathJoin(process.cwd(), 'examples', 'pre-push');

describe('examples/pre-push', () => {
    let shAvailable = true;

    beforeAll(async () => {
        if (!(await fileExists(EXAMPLE_PATH))) {
            throw new Error(`${EXAMPLE_PATH} not found.`);
        }
        try {
            await execa('sh', ['-c', 'true']);
        } catch {
            shAvailable = false;
        }
    });

    it('exists and invokes `anchor lift`, propagating its exit code', async () => {
        const content = await readFile(EXAMPLE_PATH, 'utf-8');
        expect(content).toMatch(/^#!/);
        expect(content).toMatch(/\banchor lift\b/);
        expect(content).toMatch(/exit \$\?/);
    });

    it('is tracked in git with the executable bit set (mode 100755)', async () => {
        const { stdout } = await execa('git', ['ls-files', '-s', 'examples/pre-push']);
        expect(stdout).toMatch(/^100755\b/);
    });

    it('is valid POSIX shell syntax', async ctx => {
        if (!shAvailable) {
            ctx.skip();
            return;
        }
        const { exitCode } = await execa('sh', ['-n', EXAMPLE_PATH], { reject: false });
        expect(exitCode).toBe(0);
    });
});
