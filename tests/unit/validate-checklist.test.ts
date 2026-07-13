import { describe, it, expect } from 'vitest';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { useTempCwd } from '../helpers/temp-dir.js';
import { copyChecklistFixture } from '../helpers/fixtures.js';
import { validateChecklistFile } from '../../utils/validate-checklist.js';

describe('validateChecklistFile', () => {
    useTempCwd();

    it('parses valid frontmatter and content from a completed checklist', async () => {
        const dst = await copyChecklistFixture('completed.md');
        const { data, content } = await validateChecklistFile(dst);

        expect(data.name).toBe('pr-100');
        expect(data.environments).toEqual(['dev', 'staging']);
        expect(data.projects).toEqual(['api']);
        expect(content).toMatch(/- \[x\] Run unit tests/);
        expect(content).not.toMatch(/\[ \]/);
    });

    it('parses valid frontmatter and content from a pending checklist', async () => {
        const dst = await copyChecklistFixture('pending.md');
        const { data, content } = await validateChecklistFile(dst);

        expect(data.name).toBe('pr-101');
        expect(content).toMatch(/\[ \]/);
    });

    it('throws when `environments` is not an array', async () => {
        const dst = await copyChecklistFixture('missing-env-array.md');
        await expect(validateChecklistFile(dst)).rejects.toThrow(/environments.*must be an array/i);
    });

    it('throws when a body line fails the checkbox regex', async () => {
        const dst = await copyChecklistFixture('invalid-line.md');
        await expect(validateChecklistFile(dst)).rejects.toThrow(/Invalid checklist line format/);
    });

    it('accepts uppercase [X] as a checked item', async () => {
        await mkdir(join('.anchor', 'checklists'), { recursive: true });
        const p = join('.anchor', 'checklists', 'uppercase.md');
        await writeFile(
            p,
            `---\nname: uppercase\ndescription: \nenvironments: [dev]\ncreatedAt: 2024-01-01\nprojects: []\n---\n\n- [X] done\n- [ ] pending\n`,
        );

        const { content } = await validateChecklistFile(p);
        expect(content).toMatch(/- \[X\] done/);
    });

    it('tolerates blank lines between items', async () => {
        await mkdir(join('.anchor', 'checklists'), { recursive: true });
        const p = join('.anchor', 'checklists', 'blank-lines.md');
        await writeFile(
            p,
            `---\nname: blank\ndescription: \nenvironments: [dev]\ncreatedAt: 2024-01-01\nprojects: []\n---\n\n- [x] ok\n\n- [x] also ok\n`,
        );

        const { data, content } = await validateChecklistFile(p);
        expect(data.environments).toEqual(['dev']);
        expect(content.split('\n').filter((l) => l.includes('- [x]')).length).toBe(2);
    });
});
