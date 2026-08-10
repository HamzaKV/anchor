import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import inquirer from 'inquirer';
import matter from 'gray-matter';
import { listChecklists } from '../utils/list-checklists.js';
import { findAnchorRoot } from '../utils/find-anchor-root.js';

// Matches a single checklist item line, capturing the check state (group 1)
// and the item text (group 2). The trailing `\r?` tolerates CRLF-checked-out
// files, since `.` never matches a line-terminator character in JS regexes.
const ITEM_LINE = /^- \[( |x|X)\] (.+?)\r?$/;

export const editChecklist = async () => {
    const root = await findAnchorRoot();
    const dir = root ? join(root, '.anchor', 'checklists') : '.anchor/checklists';

    const listing = await listChecklists(dir);
    if (!listing) {
        console.log(`Directory not found: ${dir}`);
        return;
    }

    if (listing.totalFiles === 0) {
        console.log('⚠️ No checklists found. If needed, run `anchor set` to create one.');
        return;
    }

    const { selectedFile } = await inquirer.prompt<{ selectedFile: string }>([
        {
            type: 'list',
            name: 'selectedFile',
            message: 'Which checklist do you want to edit?',
            choices: listing.entries.map(({ file, data }) => ({
                name: data?.name ? `${file} (${data.name})` : file,
                value: file,
            })),
        },
    ]);

    const entry = listing.entries.find(({ file }) => file === selectedFile);
    if (!entry) {
        console.error(`Checklist not found: ${selectedFile}`);
        process.exit(1);
    }

    const lines = entry.content.split('\n');
    const items: { text: string; checked: boolean; trailingCr: string }[] = [];
    const itemLineIndexes: number[] = [];

    lines.forEach((line, idx) => {
        const match = line.match(ITEM_LINE);
        if (match) {
            itemLineIndexes.push(idx);
            items.push({
                text: match[2]!,
                checked: match[1] !== ' ',
                trailingCr: line.endsWith('\r') ? '\r' : '',
            });
        }
    });

    if (items.length === 0) {
        console.log(`Checklist ${selectedFile} has no items.`);
        return;
    }

    const { checkedItems } = await inquirer.prompt<{ checkedItems: number[] }>([
        {
            type: 'checkbox',
            name: 'checkedItems',
            message: 'Toggle items to update their checked state:',
            choices: items.map((item, idx) => ({
                name: item.text,
                value: idx,
                checked: item.checked,
            })),
        },
    ]);

    const checkedSet = new Set(checkedItems);

    // Rewrite only the item lines, in place, so blank lines and the original
    // ordering are preserved exactly regardless of selection order.
    itemLineIndexes.forEach((lineIdx, itemIdx) => {
        const { text, trailingCr } = items[itemIdx]!;
        const checked = checkedSet.has(itemIdx);
        lines[lineIdx] = `- [${checked ? 'x' : ' '}] ${text}${trailingCr}`;
    });

    const updatedContent = lines.join('\n');
    const updated = matter.stringify(updatedContent, entry.data);

    const path = join(dir, selectedFile);
    await writeFile(path, updated);

    console.log(`Checklist updated: ${path}`);
};
