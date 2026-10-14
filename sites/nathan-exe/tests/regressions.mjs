import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateTaskManagerData, getProcessGroups } from '../dist/js/task-manager-data.js';
import { createRepositoryBrowser } from '../dist/js/repository-browser.js';
import { validateTerminalData } from '../dist/js/terminal-data.js';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const source = read('../dist/data/task-manager.json');
const valid = validateTaskManagerData(structuredClone(source));
assert.equal(getProcessGroups(valid).flatMap(group => group.items).length,
  valid.processes.length + valid.backgroundProcesses.length);

// Old editable files still load without losing their background entries.
const legacy = structuredClone(source);
legacy.processes.push(...legacy.backgroundProcesses);
delete legacy.backgroundProcesses;
const migrated = validateTaskManagerData(legacy);
assert.ok(migrated.backgroundProcesses.length > 0);
assert.equal(migrated.processes.length + migrated.backgroundProcesses.length,
  source.processes.length + source.backgroundProcesses.length);

// An empty children array must not erase explicitly configured metrics.
const leaf = { ...valid.backgroundProcesses[0], children: [], hours: 7, focus: 12 };
const fixture = { ...source, processes: [leaf], backgroundProcesses: [] };
validateTaskManagerData(fixture);
assert.equal(leaf.hours, 7);
assert.equal(leaf.focus, 12);

// An empty listing for another repo must link to that repo, not the cwd.
const browser = createRepositoryBrowser({ repositories: [
  { name: 'A', url: 'https://github.com/example/A', entries: [] },
  { name: 'B', url: 'https://github.com/example/B', entries: [] },
] });
browser.cd('A');
assert.equal(browser.repository('/B').name, 'B');
assert.equal(browser.pwd(), '~/A');
assert.throws(() => browser.cd('missing'));
assert.equal(browser.pwd(), '~/A');

validateTerminalData(read('../dist/data/terminal.json'));
console.log('Regression checks passed: JSON migration, metrics, directory context, and CLI configuration.');

const { completeInput } = await import('../dist/js/terminal-completion.js');
const commands = read('../dist/data/terminal.json').commands;
const repos = createRepositoryBrowser(read('../dist/data/repositories.json'));
assert.equal((await completeInput('he', commands, async () => repos)).value, 'help ');
assert.equal((await completeInput('cd Cho', commands, async () => repos)).value, 'cd Choom/');
assert.ok((await completeInput('cd SEG', commands, async () => repos)).matches.length > 1);
assert.equal((await completeInput('cd Choom/scr', commands, async () => repos)).value, 'cd Choom/scripts/');
assert.equal(repos.pwd(), '~');
const quoted = await completeInput('cd "My', commands, async () => ({ list: () => [{ text: 'My Project/' }] }));
assert.equal(quoted.value, 'cd "My Project/"');
assert.equal((await completeInput('cd unknown', commands, async () => repos)).value, 'cd unknown');
console.log('Tab completion passed: commands, unique/ambiguous repos, nested and quoted paths.');
