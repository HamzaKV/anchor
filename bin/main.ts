#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setupAnchor } from '../core/setup.js';
import { setChecklist } from '../core/set.js';
import { printStatus } from '../core/status.js';
import { liftChecklist } from '../core/lift.js';
import { validateAllChecklists } from '../core/validate.js';

const USAGE = 'Usage: anchor <setup|set|lift|status|validate> [--environment=<env1,env2>] [--projects=<proj1,proj2>]';

try {
    const args = process.argv.slice(2);

    if (args.includes('-h') || args.includes('--help')) {
        console.log(USAGE);
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
            environment: {
                type: 'string',
                short: 'e',
                description: 'Comma-separated list of environments to run the application in (e.g., dev,staging)',
            },
            projects: {
                type: 'string',
                short: 'p',
                description: 'Comma-separated list of projects to include in the checklist',
            },
        }
    });

    const command = positionals[0];

    if (!command) {
        console.error('No command provided. Please specify a command to run.');
        process.exit(1);
    }

    // strip a leading equal sign left over from short-flag `-e=val`/`-p=val` syntax
    const stripEquals = (value?: string) => value ? value.replace(/^=/, '') : undefined;

    const environment = stripEquals(values.environment)?.split(',').map(e => e.trim());
    const projects = stripEquals(values.projects)?.split(',').map(p => p.trim());

    switch (command) {
        case 'setup':
            await setupAnchor();
            break;
        case 'set':
            await setChecklist(environment, projects);
            break;
        case 'status':
            await printStatus(environment, projects);
            break;
        case 'lift':
            await liftChecklist(environment, projects);
            break;
        case 'validate':
            await validateAllChecklists();
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
