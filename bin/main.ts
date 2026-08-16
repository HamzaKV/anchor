#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setupAnchor } from '../core/setup.js';
import { setChecklist } from '../core/set.js';
import { printStatus } from '../core/status.js';
import { liftChecklist } from '../core/lift.js';
import { editChecklist } from '../core/edit.js';
import { validateAllChecklists } from '../core/validate.js';
import { removeChecklist } from '../core/rm.js';

const USAGE = 'Usage: anchor <setup|set|status|lift|edit|validate|rm> [--environment=<env1,env2>] [--projects=<proj1,proj2>] [--json]';

const OPTION_DESCRIPTIONS = {
    environment: '-e, --environment <envs>   Comma-separated list of environments (e.g., dev,staging)',
    projects: '-p, --projects <projects>  Comma-separated list of projects',
    json: '    --json                  Output machine-readable JSON instead of human-readable text',
    'dry-run': '    --dry-run               Preview what would be lifted without deleting anything',
    name: '    --name <name>           Checklist name (skips the interactive prompt)',
    items: '    --items <items>         Comma-separated checklist items (skips the interactive prompt)',
    description: '    --description <text>    Checklist description (optional, non-interactive only)',
} as const;

type OptionKey = keyof typeof OPTION_DESCRIPTIONS;

const COMMANDS: Record<string, { summary: string; flags: OptionKey[] }> = {
    setup: { summary: 'Interactively create or update .anchor/config.json', flags: [] },
    set: { summary: 'Create a new checklist', flags: ['environment', 'projects', 'name', 'items', 'description'] },
    status: { summary: 'Show checklist status (informational only — never fails the build)', flags: ['environment', 'projects', 'json'] },
    lift: { summary: 'Delete completed checklists; exits 1 if any matching checklist is still pending', flags: ['environment', 'projects', 'json', 'dry-run'] },
    edit: { summary: 'Interactively toggle the checked state of items on an existing checklist', flags: [] },
    validate: { summary: 'Validate config.json and every checklist file', flags: [] },
    rm: { summary: 'Delete a checklist by filename, regardless of completion state', flags: [] },
};

const printCommandHelp = (command: string) => {
    const meta = COMMANDS[command];
    if (!meta) {
        console.log(USAGE);
        return;
    }
    const usage = command === 'rm' ? `Usage: anchor ${command} <name>` : `Usage: anchor ${command}${meta.flags.length ? ' [options]' : ''}`;
    console.log(usage);
    console.log(meta.summary);
    if (meta.flags.length) {
        console.log('\nOptions:');
        for (const flag of meta.flags) {
            console.log(`  ${OPTION_DESCRIPTIONS[flag]}`);
        }
    }
};

const printGeneralHelp = () => {
    console.log(USAGE);
    console.log('\nCommands:');
    for (const [name, meta] of Object.entries(COMMANDS)) {
        console.log(`  ${name.padEnd(9)} ${meta.summary}`);
    }
    console.log('\nRun `anchor <command> --help` for command-specific options.');
};

try {
    const args = process.argv.slice(2);

    const helpIndex = args.findIndex(a => a === '-h' || a === '--help');
    if (helpIndex !== -1) {
        const command = args.find(a => !a.startsWith('-'));
        if (command && COMMANDS[command]) {
            printCommandHelp(command);
        } else {
            printGeneralHelp();
        }
        process.exit(0);
    }

    if (args.includes('-v') || args.includes('--version')) {
        const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
        const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
        console.log(pkg.version);
        process.exit(0);
    }

    const { positionals, values } = parseArgs({
        args,
        strict: true,
        allowPositionals: true,
        options: {
            environment: { type: 'string', short: 'e' },
            projects: { type: 'string', short: 'p' },
            json: { type: 'boolean' },
            'dry-run': { type: 'boolean' },
            name: { type: 'string' },
            items: { type: 'string' },
            description: { type: 'string' },
        },
    });

    const command = positionals[0];

    if (!command) {
        console.error('No command provided. Please specify a command to run.');
        process.exit(1);
    }

    // strip a leading equal sign left over from short-flag `-e=val`/`-p=val` syntax
    const stripEquals = (value?: string) => (value ? value.replace(/^=/, '') : undefined);

    const environment = stripEquals(values.environment)
        ?.split(',')
        .map(e => e.trim());
    const projects = stripEquals(values.projects)
        ?.split(',')
        .map(p => p.trim());
    const json = values.json ?? false;
    const dryRun = values['dry-run'] ?? false;

    switch (command) {
        case 'setup':
            await setupAnchor();
            break;
        case 'set': {
            if ((values.name && !values.items) || (!values.name && values.items)) {
                console.error('--name and --items must be provided together for non-interactive checklist creation.');
                process.exit(1);
            }
            const nonInteractive = values.name && values.items ? { name: values.name, items: values.items, description: values.description } : undefined;
            await setChecklist(environment, projects, nonInteractive);
            break;
        }
        case 'status':
            await printStatus(environment, projects, json);
            break;
        case 'lift':
            await liftChecklist(environment, projects, json, dryRun);
            break;
        case 'edit':
            await editChecklist();
            break;
        case 'validate':
            await validateAllChecklists();
            break;
        case 'rm':
            await removeChecklist(positionals[1]);
            break;
        default:
            console.error(`Unknown command: ${command}`);
            console.log(USAGE);
            process.exit(1);
    }
} catch (err) {
    console.error(`❌  ${(err as Error).message}`);
    process.exit(1);
}
