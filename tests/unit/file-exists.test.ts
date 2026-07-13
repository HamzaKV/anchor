import { describe, it, expect } from 'vitest';
import { writeFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { useTempCwd } from '../helpers/temp-dir.js';
import { fileExists } from '../../utils/file-exists.js';

describe('fileExists', () => {
    useTempCwd();

    it('returns true when a file exists', async () => {
        await writeFile('present.txt', 'hi');
        expect(await fileExists('present.txt')).toBe(true);
    });

    it('returns false when a file is missing', async () => {
        expect(await fileExists('missing.txt')).toBe(false);
    });

    it('returns true for directories as well', async () => {
        await mkdir('somedir');
        expect(await fileExists(join('somedir'))).toBe(true);
    });

    it('round-trips correctly after file deletion', async () => {
        await writeFile('ephemeral.txt', 'tmp');
        expect(await fileExists('ephemeral.txt')).toBe(true);
        await unlink('ephemeral.txt');
        expect(await fileExists('ephemeral.txt')).toBe(false);
    });
});
