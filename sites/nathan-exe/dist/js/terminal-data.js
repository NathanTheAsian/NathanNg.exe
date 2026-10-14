import { safeUrl } from './dom.js';

export function validateTerminalData(data) {
  const require = (condition, message) => { if (!condition) throw new Error(message); };
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  require(object(data), 'The JSON root must be an object.');
  for (const key of ['name', 'prompt', 'greeting', 'hint']) {
    require(typeof data[key] === 'string', `${key} must be text.`);
  }
  require(Array.isArray(data.commands), 'commands must be an array.');
  const names = new Set();
  data.commands.forEach((command, index) => {
    const path = `commands[${index}]`;
    require(object(command), `${path} must be an object.`);
    require(typeof command.description === 'string', `${path}.description must be text.`);
    require(['text', 'link', 'help', 'clear', 'exit', 'list', 'cd', 'pwd'].includes(command.type), `${path}.type must be text, link, help, clear, exit, list, cd, or pwd.`);
    require(command.aliases === undefined || Array.isArray(command.aliases), `${path}.aliases must be an array.`);
    for (const name of [command.name, ...(command.aliases || [])]) {
      require(typeof name === 'string' && /^[a-z0-9_-]+$/.test(name), `${path} names and aliases must be lowercase without spaces.`);
      require(!names.has(name), `Duplicate command or alias: ${name}.`);
      names.add(name);
    }
    if (command.type === 'text') require(typeof command.text === 'string', `${path}.text must be text.`);
    if (command.type === 'link') require(typeof command.url === 'string' && safeUrl(command.url), `${path}.url must be an http(s) URL.`);
    for (const key of ['text', 'label']) {
      if (command[key] !== undefined) require(typeof command[key] === 'string', `${path}.${key} must be text.`);
    }
  });
  return data;
}

export async function loadTerminalData() {
  const response = await fetch(new URL('../data/terminal.json', import.meta.url), { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}.`);
  let data;
  try { data = await response.json(); }
  catch { throw new Error('Invalid JSON. Check double quotes and commas.'); }
  return validateTerminalData(data);
}
