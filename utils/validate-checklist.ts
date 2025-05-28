import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';

export const validateChecklistFile = async (path: string) => {
    const raw = await readFile(path, 'utf-8');
    const parsed = matter(raw);

    if (!Array.isArray(parsed.data.environments)) {
        throw new Error(`Invalid frontmatter: 'environments' must be an array in ${path}`);
    }

    const lines = parsed.content.split('\n');
    const checklistLineRegex = /^- \[( |x)\] .+/;

    for (const line of lines) {
        if (line.trim() === '') continue;
        if (!checklistLineRegex.test(line)) {
            throw new Error(`Invalid checklist line format in ${path}: "${line}"`);
        }
    }

    return {
        content: parsed.content,
        data: parsed.data,
    };
};
