import { describe, it, expect, vi } from 'vitest';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { useTempCwd, seedConfig } from '../helpers/temp-dir.js';
import { liftChecklist } from '../../core/lift.js';
import { printStatus } from '../../core/status.js';

// Regression coverage for a fixed bug: lift/status detected pending items by
// checking whether the literal text "[ ]" appeared *anywhere* in the file,
// so a checked item whose own text contains "[ ]" (e.g. describing a UI
// checkbox) was read as pending forever. Detection is now anchored to the
// start of a checklist line.
describe('checkbox detection ignores "[ ]" inside item text', () => {
    useTempCwd();

    const content = [
        '---',
        'name: literal-brackets',
        'description: ',
        'environments: [dev]',
        'createdAt: 2024-01-01',
        'projects: []',
        '---',
        '',
        '- [x] fix [ ] rendering on mobile',
        '',
    ].join('\n');

    it('lift treats the checklist as complete and removes it', async () => {
        await seedConfig();
        await mkdir('.anchor/checklists', { recursive: true });
        await writeFile('.anchor/checklists/literal-brackets.md', content);

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`__process.exit:${code as number}`);
        });

        await liftChecklist();

        expect(await readdir('.anchor/checklists')).toEqual([]);
        exitSpy.mockRestore();
    });

    it('status reports 1 done / 0 pending', async () => {
        await seedConfig();
        await mkdir('.anchor/checklists', { recursive: true });
        await writeFile('.anchor/checklists/literal-brackets.md', content);

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await printStatus();

        expect(logSpy.mock.calls.flat().join('\n')).toMatch(/literal-brackets\.md.*1 done \/ 0 pending/);
        logSpy.mockRestore();
    });
});
