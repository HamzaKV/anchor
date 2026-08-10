// vi.mock is auto-hoisted above imports by Vitest, so the static `import inquirer`
// below receives the mocked module — no manual vi.resetModules or dynamic imports.
vi.mock('inquirer', () => ({
    default: { prompt: vi.fn() },
}));
vi.mock('unique-names-generator', () => ({
    uniqueNamesGenerator: vi.fn(() => 'mock-name'),
    adjectives: [],
    colors: [],
    animals: [],
}));

import { describe, it, expect, vi } from 'vitest';
import { join } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import inquirer from 'inquirer';
import { useTempCwd, seedConfig, chdirIntoSubdir } from '../helpers/temp-dir.js';
import { copyChecklistFixture } from '../helpers/fixtures.js';
import { printStatus } from '../../core/status.js';
import { liftChecklist } from '../../core/lift.js';
import { setChecklist } from '../../core/set.js';

// These commands hardcode `.anchor/...` relative to cwd, but should now walk
// upward — like `git` finding `.git` — to locate the nearest ancestor
// `.anchor` directory. Each test seeds `.anchor` at the temp root, then
// chdirs into an empty nested subdirectory before invoking the command.
describe('upward .anchor discovery', () => {
    const getTmpDir = useTempCwd();

    it('printStatus finds an ancestor .anchor/checklists from a nested subdirectory', async () => {
        await seedConfig({ environments: ['dev'] });
        const rootDir = getTmpDir();
        await copyChecklistFixture('completed.md', join(rootDir, '.anchor', 'checklists'));

        await chdirIntoSubdir('nested', 'deeper');

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await printStatus();
        const lines = logSpy.mock.calls.map(c => String(c[0])).join('\n');
        expect(lines).toMatch(/completed\.md.*2 done \/ 0 pending/);
        logSpy.mockRestore();
    });

    it('liftChecklist finds and removes a completed checklist from an ancestor .anchor/checklists', async () => {
        await seedConfig({ environments: ['dev'] });
        const rootDir = getTmpDir();
        const checklistsDir = join(rootDir, '.anchor', 'checklists');
        await copyChecklistFixture('completed.md', checklistsDir);

        await chdirIntoSubdir('nested', 'deeper');

        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(code => {
            throw new Error(`__process.exit:${code as number}`);
        });

        await liftChecklist();

        expect(await readdir(checklistsDir)).toEqual([]);
        exitSpy.mockRestore();
    });

    it('setChecklist reads config from and writes checklists into an ancestor .anchor/', async () => {
        await seedConfig({ environments: ['dev', 'staging'] });
        const rootDir = getTmpDir();

        await chdirIntoSubdir('nested', 'deeper');

        vi.mocked(inquirer.prompt).mockResolvedValueOnce({
            checklistName: 'pr-nested',
            selectedEnvs: ['dev'],
            selectedProjects: [],
            items: 'check things',
            description: '',
        } as never);

        await setChecklist();

        const checklistsDir = join(rootDir, '.anchor', 'checklists');
        const files = await readdir(checklistsDir);
        expect(files).toEqual(['mock-name.md']);

        const content = await readFile(join(checklistsDir, 'mock-name.md'), 'utf-8');
        expect(content).toContain('name: pr-nested');
    });
});
