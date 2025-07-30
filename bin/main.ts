#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { setupAnchor } from '../core/setup.js';
import { setChecklist } from '../core/set.js';
import { printStatus } from '../core/status.js';
import { liftChecklist } from '../core/lift.js';

const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    strict: true,
    allowPositionals: true,
    options: {
        environment: {
            type: 'string',
            short: 'e',
            description: 'The environment to run the application in (e.g., development, production)',
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

// strip an equal sign from the environment value if it exists
const environment = values.environment ? values.environment.replace(/^=/, '') : undefined;

const projects = values.projects ? values.projects.split(',').map(p => p.trim()) : undefined;

switch (command) {
    case 'setup':
        await setupAnchor();
        break;
    case 'set':
        await setChecklist(environment, projects);
        break;
    case 'status':
        await printStatus(environment);
        break;
    case 'lift':
        await liftChecklist(environment, projects);
        break;
    default:
        console.error(`Unknown command: ${command}`);
        console.log('Usage: anchor <setup|set|lift|status> [--environment=<env>]');
        process.exit(1);
}
