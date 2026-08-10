import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdir, rm } from 'node:fs/promises';
import { useTempCwd, seedConfig } from '../helpers/temp-dir.js';
import { copyChecklistFixture } from '../helpers/fixtures.js';
import { validateAllChecklists } from '../../core/validate.js';

describe('validateAllChecklists', () => {
    useTempCwd();

    beforeEach(async () => {
        await seedConfig({
            environments: ['dev', 'staging', 'prod'],
            projects: ['api', 'docs'],
        });
        await mkdir('.anchor/checklists', { recursive: true });
    });

    it('prints a success message and does not exit non-zero when all checklists are valid', async () => {
        await copyChecklistFixture('completed.md');
        await copyChecklistFixture('pending.md');

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`__process.exit:${code as number}`);
        });
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await validateAllChecklists();

        const lines = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
        expect(lines).toMatch(/All checklists valid/);
        expect(exitSpy).not.toHaveBeenCalled();

        logSpy.mockRestore();
        exitSpy.mockRestore();
    });

    it('exits with code 1 and reports the specific error when one checklist is invalid, without flagging valid ones', async () => {
        await copyChecklistFixture('invalid-line.md'); // malformed checklist line
        await copyChecklistFixture('completed.md'); // valid

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`__process.exit:${code as number}`);
        });
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await expect(validateAllChecklists()).rejects.toThrow(/__process.exit:1/);

        expect(errorSpy.mock.calls.some((c) => String(c[0]).includes('invalid-line.md'))).toBe(true);
        expect(errorSpy.mock.calls.some((c) => String(c[0]).includes('completed.md'))).toBe(false);
        // Success message must not print once any checklist is invalid.
        expect(logSpy.mock.calls.some((c) => String(c[0]).match(/All checklists valid/))).toBe(false);

        logSpy.mockRestore();
        errorSpy.mockRestore();
        exitSpy.mockRestore();
    });

    it('does not throw when .anchor/checklists directory missing, same convention as status/lift', async () => {
        await rm('.anchor/checklists', { recursive: true, force: true });

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await expect(validateAllChecklists()).resolves.toBeUndefined();

        const lines = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
        expect(lines).toContain('Directory not found');

        logSpy.mockRestore();
    });

    it('does not apply -e/-p style filtering — a checklist scoped to an environment outside a status/lift filter is still validated', async () => {
        // envs: dev (invalid: 'environments' must be an array, not a bare string).
        // If `printStatus`/`liftChecklist` were called with `-e staging`, this file
        // would be silently skipped by their env-filtering. `validate` has no such
        // filter (it doesn't even accept environment/projects args), so it must
        // still be checked and reported.
        await copyChecklistFixture('missing-env-array.md');

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`__process.exit:${code as number}`);
        });
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await expect(validateAllChecklists()).rejects.toThrow(/__process.exit:1/);

        expect(errorSpy.mock.calls.some((c) => String(c[0]).includes('missing-env-array.md'))).toBe(true);

        logSpy.mockRestore();
        errorSpy.mockRestore();
        exitSpy.mockRestore();
    });
});
