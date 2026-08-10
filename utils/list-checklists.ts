import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { validateChecklistFile } from './validate-checklist.js';
import { fileExists } from './file-exists.js';

const UNCHECKED_LINE = /^- \[ \] .+$/gm;
const CHECKED_LINE = /^- \[(?:x|X)\] .+$/gm;

export type ChecklistEntry = {
    file: string;
    content: string;
    data: Awaited<ReturnType<typeof validateChecklistFile>>['data'];
    pendingCount: number;
    doneCount: number;
};

export type ChecklistListing = {
    totalFiles: number;
    entries: ChecklistEntry[];
};

// Returns null when the checklists directory doesn't exist.
export const listChecklists = async (dir: string, env?: string[], projects?: string[]): Promise<ChecklistListing | null> => {
    if (!(await fileExists(dir))) {
        return null;
    }

    const files = (await readdir(dir)).filter(f => f.endsWith('.md'));
    const entries: ChecklistEntry[] = [];

    for (const file of files) {
        let parsed: Awaited<ReturnType<typeof validateChecklistFile>>;
        try {
            parsed = await validateChecklistFile(join(dir, file));
        } catch (err) {
            console.error(`❌  Skipping invalid checklist ${file}: ${(err as Error).message}`);
            process.exitCode = 1;
            continue;
        }

        if (env?.length && !env.some(e => parsed.data.environments.includes(e))) {
            continue; // Skip files not matching any of the specified environments
        }

        if (projects?.length && parsed.data.projects?.length && !projects.some((p: string) => parsed.data.projects.includes(p))) {
            continue; // Skip files not matching any of the specified projects
        }

        entries.push({
            file,
            content: parsed.content,
            data: parsed.data,
            pendingCount: (parsed.content.match(UNCHECKED_LINE) || []).length,
            doneCount: (parsed.content.match(CHECKED_LINE) || []).length,
        });
    }

    return { totalFiles: files.length, entries };
};
