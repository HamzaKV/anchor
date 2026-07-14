import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Exercises bin/main.ts's own arg-parsing quirks (short flags, the `-e=val`
// equals-stripping hack, and --projects comma-splitting) end-to-end, since
// none of that logic is exported for unit testing in isolation.
describe('CLI — arg parsing', () => {
    let root: string;
    const mainPath = path.join(__dirname, '..', '..', 'bin', 'main.ts');

    beforeEach(async () => {
        root = await mkdtemp(path.join(tmpdir(), 'anchor-argparse-'));
        await mkdir(path.join(root, '.anchor', 'checklists'), { recursive: true });
        await writeFile(
            path.join(root, '.anchor', 'config.json'),
            JSON.stringify({ environments: ['dev', 'prod'], projects: ['api', 'docs'] }),
        );

        const devContent = [
            '---', 'name: dev-only', 'description: ', 'environments: [dev]',
            'createdAt: 2024-01-01', 'projects: [api]', '---', '', '- [x] done', '',
        ].join('\n');
        await writeFile(path.join(root, '.anchor', 'checklists', 'dev-only.md'), devContent);

        const prodContent = [
            '---', 'name: prod-only', 'description: ', 'environments: [prod]',
            'createdAt: 2024-01-01', 'projects: [docs]', '---', '', '- [x] done', '',
        ].join('\n');
        await writeFile(path.join(root, '.anchor', 'checklists', 'prod-only.md'), prodContent);
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    const run = (args: string[]) => execFileSync('bun', [mainPath, ...args], { cwd: root, encoding: 'utf-8' });

    it('-e (short flag, space-separated) filters by environment', () => {
        const stdout = run(['status', '-e', 'dev']);
        expect(stdout).toContain('dev-only.md');
        expect(stdout).not.toContain('prod-only.md');
    });

    it('-e=val (short flag with inline equals) strips the leading "=" correctly', () => {
        const stdout = run(['status', '-e=dev']);
        expect(stdout).toContain('dev-only.md');
        expect(stdout).not.toContain('prod-only.md');
    });

    it('--projects comma-splits and trims each entry', () => {
        const stdout = run(['status', '--projects', ' api , docs ']);
        expect(stdout).toContain('dev-only.md');
        expect(stdout).toContain('prod-only.md');
    });

    it('-p (short flag) filters by a single project', () => {
        const stdout = run(['status', '-p', 'docs']);
        expect(stdout).toContain('prod-only.md');
        expect(stdout).not.toContain('dev-only.md');
    });
});
