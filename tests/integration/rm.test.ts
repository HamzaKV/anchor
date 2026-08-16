import { describe, it, expect, beforeEach } from 'vitest';
import { readdir, mkdir } from 'node:fs/promises';
import { useTempCwd, seedConfig } from '../helpers/temp-dir.js';
import { copyChecklistFixture } from '../helpers/fixtures.js';
import { removeChecklist } from '../../core/rm.js';

describe('removeChecklist', () => {
    useTempCwd();

    beforeEach(async () => {
        await seedConfig();
        await mkdir('.anchor/checklists', { recursive: true });
    });

    it('deletes a checklist by filename', async () => {
        await copyChecklistFixture('pending.md');

        await removeChecklist('pending.md');

        expect(await readdir('.anchor/checklists')).toEqual([]);
    });

    it('deletes a checklist referenced without the .md extension', async () => {
        await copyChecklistFixture('pending.md');

        await removeChecklist('pending');

        expect(await readdir('.anchor/checklists')).toEqual([]);
    });

    it('deletes a checklist that still has pending items — unlike lift', async () => {
        await copyChecklistFixture('pending.md'); // has an unchecked item

        await removeChecklist('pending');

        expect(await readdir('.anchor/checklists')).toEqual([]);
    });

    it('throws when the checklist does not exist', async () => {
        await expect(removeChecklist('missing')).rejects.toThrow(/Checklist not found: missing\.md/);
    });

    it('throws when no target is given', async () => {
        await expect(removeChecklist()).rejects.toThrow(/Checklist name required/);
    });
});
