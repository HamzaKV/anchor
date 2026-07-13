import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';

/**
 * Creates a fresh temp directory, chdirs into it, and schedules cleanup.
 * Anchor's core modules hardcode `.anchor/...` relative to cwd, so tests
 * must isolate their working directory to avoid polluting the repo.
 */
export const useTempCwd = () => {
    const originalCwd = process.cwd();
    let tmpDir: string;

    beforeEach(async () => {
        tmpDir = await mkdtemp(join(tmpdir(), 'anchor-test-'));
        process.chdir(tmpDir);
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await rm(tmpDir, { recursive: true, force: true });
    });

    return () => tmpDir;
};

/**
 * Seeds a valid `.anchor/config.json` so commands that read config (set/lift/status)
 * won't error out.
 */
export const seedConfig = async (
    overrides: { environments?: string[]; projects?: string[] } = {},
): Promise<void> => {
    await mkdir('.anchor', { recursive: true });
    const config = {
        environments: overrides.environments ?? ['dev', 'staging', 'prod'],
        projects: overrides.projects ?? [],
    };
    await writeFile('.anchor/config.json', JSON.stringify(config, null, 2));
};
