import { $, safeUrl } from './dom.js';
import { focusWindow } from './windows.js?v=2';
import { completeInput } from './terminal-completion.js';
import { loadTerminalData } from './terminal-data.js';
import { loadRepositoryBrowser } from './repository-browser.js';

export function initTerminal() {
  let terminal = null;
  let browser = null;
  async function repositories() {
    if (!browser) browser = await loadRepositoryBrowser();
    return browser;
  }
  function prompt() {
    return terminal.prompt.replace(/~(?=\$)/, browser?.pwd() || '~');
  }
  const history = [];
  let historyIndex = 0;
  const input = $('#terminal-input');
  const output = $('#terminal-output');
  function applySettings() {
  $('.terminal-title > span').textContent = '>_ ' + terminal.name;
  $('.terminal-welcome').textContent = terminal.greeting;
  $('.terminal-hint').textContent = terminal.hint;
  $('#terminal-form label').textContent = terminal.prompt;
  $('#open-cli').lastChild.textContent = terminal.name;
  $('#terminal').setAttribute('aria-label', terminal.name + ' terminal');
  $('#task-cli').setAttribute('aria-label', 'Open ' + terminal.name);
  }

  function line(text, className = '') {
    const element = document.createElement('div');
    element.className = 'terminal-line ' + className;
    element.textContent = text;
    output.append(element);
    return element;
  }
  function close() { $('#terminal').hidden = true; $('#open-cli').focus(); }
  $('#open-cli').onclick = $('#task-cli').onclick = () => { $('#terminal').hidden = false; focusWindow($('#terminal')); input.focus(); };
  $('#close-cli').onclick = close;

  function showLinks(entries, path = '.') {
    if (!entries.length) {
      line('No files in this directory in the saved GitHub snapshot.');
      const repo = browser.repository(path);
      if (repo) showLinks([{ text: 'Open repository on GitHub', url: repo.url }]);
      return;
    }
    for (const entry of entries) {
      const url = safeUrl(entry.url);
      if (!url) continue;
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = entry.text;
      line('').append(link);
    }
  }

  // Configurable commands are browser actions, never operating-system commands.
  const handlers = {
    list: async (_command, path) => showLinks((await repositories()).list(path || '.'), path || '.'),
    cd: async (_command, path) => {
      const directory = await repositories();
      const entries = directory.cd(path || '~');
      line(directory.pwd());
      showLinks(entries);
      $('#terminal-form label').textContent = prompt();
    },
    pwd: async () => line((await repositories()).pwd()),
    text: command => line(command.text),
    link: command => {
      const url = safeUrl(command.url);
      if (!url) return line('This command needs a valid http(s) URL in data/terminal.json.');
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = command.label || url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      line(command.text || '').append(link);
    },
    clear: () => output.replaceChildren(),
    help: () => line(terminal.commands.map(command => {
      const names = [command.name, ...(command.aliases || [])].join(', ');
      return names.padEnd(16) + command.description;
    }).join('\n')),
    exit: close,
  };
  $('#terminal-form').onsubmit = async event => {
    event.preventDefault();
    if (!terminal) return;
    const value = input.value.trim();
    input.value = '';
    if (!value) return;
    history.push(value);
    historyIndex = history.length;
    line(prompt() + ' ' + value, 'terminal-command');
    const [, name, rawPath = ''] = value.match(/^(\S+)(?:\s+([\s\S]*))?$/);
    const path = rawPath.replace(/^(["'])(.*)\1$/, '$2');
    const command = terminal.commands.find(item => [item.name, ...(item.aliases || [])].includes(name.toLowerCase()));
    input.disabled = true;
    $('.terminal-run').disabled = true;
    try {
      if (command && handlers[command.type]) await handlers[command.type](command, path);
      else line('Command not found: ' + name + '\nType help to see available commands.');
    } catch (error) {
      line(error.message);
    } finally {
      input.disabled = false;
      $('.terminal-run').disabled = false;
    }
    $('.terminal-body').scrollTop = $('.terminal-body').scrollHeight;
    if (!$('#terminal').hidden) input.focus();
  };
  let completionVersion = 0;
  input.addEventListener('input', () => { completionVersion++; });
  input.onkeydown = async event => {
    if (event.key === 'Tab' && !event.shiftKey && terminal) {
      event.preventDefault();
      // Complete at the end only, leaving edits/selections in the middle intact.
      if (input.selectionStart !== input.value.length || input.selectionEnd !== input.value.length) return;
      const original = input.value;
      const version = ++completionVersion;
      try {
        const result = await completeInput(original, terminal.commands, repositories);
        if (version !== completionVersion || input.value !== original || document.activeElement !== input) return;
        input.value = result.value;
        input.setSelectionRange(input.value.length, input.value.length);
        if (result.matches.length > 1) line(result.matches.join('  '));
        else if (!result.matches.length) line('No matching completions.');
        $('.terminal-body').scrollTop = $('.terminal-body').scrollHeight;
      } catch (error) {
        if (version === completionVersion) line(error.message);
      }
      return;
    }
    completionVersion++;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
      input.value = history[historyIndex] || '';
    }
    if (event.key === 'Escape') close();
  };
  async function load() {
    terminal = null;
    input.disabled = true;
    $('.terminal-run').disabled = true;
    output.replaceChildren();
    line('Loading terminal settings…');
    try {
      terminal = await loadTerminalData();
      applySettings();
      output.replaceChildren();
      input.disabled = false;
      $('.terminal-run').disabled = false;
      if (!$('#terminal').hidden) input.focus();
    } catch (error) {
      output.replaceChildren();
      line('Couldn’t load terminal.json: ' + error.message);
      line('Fix data/terminal.json, save, and retry.');
      const retry = document.createElement('button');
      retry.textContent = 'Retry loading';
      retry.onclick = load;
      output.append(retry);
    }
  }
  load();

}
