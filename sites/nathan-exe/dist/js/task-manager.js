import { $, escapeHtml as esc, safeUrl } from './dom.js';
import { focusWindow } from './windows.js?v=2';
import { loadTaskManagerData, getProcessGroups } from './task-manager-data.js';

export function initTaskManager() {
  let processes = [];
  let pages = {};
  let settings = {};
  let loaded = false;
  let loadingError = null;
  let selected = null;
  let activeTab = 'Processes';
  const total = field => processes.reduce((sum, process) => sum + Number(process[field] || 0), 0);
  const restore = () => { $('#manager').hidden = false; focusWindow($('#manager')); };

  function inspect() {
    if (selected === null) return;
    const process = selected;
    const links = (process.links || []).map(link => {
      const url = /^projects\/[a-z0-9-]+\.html$/.test(link.url) ? link.url : safeUrl(link.url);
      return url ? `<a class="tag" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)}</a>` : '';
    }).join('');
    $('#detail-body').innerHTML = `<span class="eyebrow">${esc(process.type)} · process</span>
      <h2>${esc(process.name)}</h2><p>${esc(process.description)}</p>
      <div>${(process.tags || []).map(tag => `<span class="tag">${esc(tag)}</span>`).join('')}</div><div>${links}</div>`;
    $('#detail').hidden = false;
    $('#dismiss').focus();
  }

  const collapsed = new Set();
  function renderProcesses() {
    const visible = [];
    function rowHtml(process, depth = 0) {
      const index = visible.push(process) - 1;
      const parent = Boolean(process.children?.length);
      const expanded = parent && !collapsed.has(process);
      const color = /^#[0-9a-f]{3,8}$/i.test(process.color) ? process.color : '#657eab';
      const hasImageIcon = /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(process.icon || '');
      const iconHtml = hasImageIcon
        ? `<img class="process-icon-image" src="${esc(new URL(process.icon, window.location.href).href)}" alt="${esc(process.name)} icon" />`
        : `<span class="process-icon" style="--icon:${color}">${esc(process.icon)}</span>`;
      let result = `<tr class="process-row${depth ? ' subprocess' : ''}" tabindex="0" role="button" aria-label="${parent ? 'Toggle' : 'Inspect'} ${esc(process.name)}" ${parent ? `aria-expanded="${expanded}"` : ''} data-index="${index}">
        <td><span class="process-name" style="padding-left:${depth * 20}px"><span class="process-expander">${parent ? (expanded ? '⌄' : '›') : '·'}</span>${iconHtml}<span>${esc(process.name)}${parent ? ` (${process.children.length})` : ''}</span></span></td>
        <td class="status"><span>${process.status === 'Idle' ? '◌' : '●'}</span> ${esc(process.status)}</td>
        <td class="${process.focus > 20 ? 'heat' : ''}">${esc(process.focus)}%</td>
        <td>${process.hours ? esc(process.hours) + (process.hours === 1 ? ' hr' : ' hrs') : '—'}</td><td>${esc(process.stack)}</td></tr>`;
      if (expanded) result += process.children.map(child => rowHtml(child, depth + 1)).join('');
      return result;
    }
    let html = `<table class="process-table"><thead><tr><th>Name</th><th>Status</th>
      <th><strong>${total('focus')}%</strong>Focus</th><th><strong>${total('hours')} h</strong>Weekly time</th>
      <th><strong>${processes.length}</strong>Processes</th></tr></thead><tbody>`;
    for (const { label, items } of getProcessGroups(settings)) {
      html += `<tr class="group"><td colspan="5">${esc(label)} (${items.length})</td></tr>`;
      items.forEach(process => { html += rowHtml(process); });
    }
    $('#content').innerHTML = html + `</tbody></table><p class="table-note">${esc(settings.processNote)}</p>`;
    document.querySelectorAll('.process-row').forEach(row => {
      const select = () => {
        selected = visible[Number(row.dataset.index)];
        document.querySelectorAll('.process-row').forEach(item => item.classList.toggle('selected', item === row));
        $('#inspect').disabled = false;
      };
      function activate() {
        select();
        if (selected.children?.length) {
          if (collapsed.has(selected)) collapsed.delete(selected);
          else collapsed.add(selected);
          renderProcesses();
          const replacement = document.querySelector(`.process-row[data-index="${row.dataset.index}"]`);
          replacement?.classList.add('selected');
          replacement?.focus();
        }
      }
      row.onclick = activate;
      row.ondblclick = () => { select(); inspect(); };
      row.onkeydown = event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); if (!selected.children?.length) inspect(); }
      };
    });
  }

  function render() {
    selected = null;
    $('#inspect').disabled = true;
    document.querySelectorAll('#tabs button').forEach(button => {
      const active = button.textContent === activeTab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (!loaded) {
      $('#content').innerHTML = loadingError
        ? `<section class="tab-page" role="alert"><h2>Couldn’t load Task Manager</h2><p>${esc(loadingError)}</p><p>Edit data/task-manager.json, then try again.</p><button id="retry-data">Retry loading</button></section>`
        : '<section class="tab-page" role="status"><p>Loading Task Manager…</p></section>';
      if (loadingError) $('#retry-data').onclick = load;
      return;
    }
    if (activeTab === 'Processes') return renderProcesses();
    const page = pages[activeTab];
    if (!page) return;
    let html = `<span class="eyebrow">${esc(page.eyebrow)}</span><h2>${esc(page.title)}</h2><p>${esc(page.description)}</p>`;
    if (page.metrics) {
      for (const { label, items } of getProcessGroups(settings)) {
        const focus = items.reduce((sum, process) => sum + Number(process.focus || 0), 0);
        const width = Math.max(0, Math.min(100, focus));
        html += `<div class="metric"><div><span>${esc(label)}</span><span>${focus}%</span></div><div class="meter"><i style="width:${width}%"></i></div></div>`;
      }
    }
    if (page.sections?.length) html += '<div class="timeline">' + page.sections.map(section => {
      const body = section.html ?? `<p>${esc(section.text || '')}</p>`;
      return `<h3>${esc(section.title)}</h3>${body}`;
    }).join('') + '</div>';
    $('#content').innerHTML = `<section class="tab-page">${html}</section>`;
  }

  function renderTabs() {
  $('#tabs').replaceChildren();
  for (const name of ['Processes', ...Object.keys(pages)]) {
    const button = document.createElement('button');
    button.textContent = name;
    button.onclick = () => { activeTab = name; render(); };
    $('#tabs').append(button);
  }
  }
  document.querySelectorAll('[data-open]').forEach(button => {
    button.onclick = () => {
      restore();
      activeTab = pages[button.dataset.open] ? button.dataset.open : 'Processes';
      render();
    };
  });
  $('#inspect').onclick = inspect;
  $('#dismiss').onclick = () => { $('#detail').hidden = true; $('#inspect').focus(); };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('#detail').hidden) $('#dismiss').click();
  });
  $('#minimize').onclick = $('#close').onclick = () => { $('#manager').hidden = true; $('#detail').hidden = true; };
  $('#start').onclick = $('#task-manager').onclick = restore;
  $('#maximize').onclick = () => { $('#manager').classList.toggle('maximized'); $('#manager').style.transform = ''; };
  async function load() {
    loadingError = null;
    loaded = false;
    $('#inspect').disabled = true;
    render();
    try {
      settings = await loadTaskManagerData();
      processes = [...settings.processes, ...settings.backgroundProcesses];
      pages = settings.pages;
      $('.preview-label').textContent = settings.previewLabel;
      $('.window-footer > span').lastChild.textContent = ' ' + settings.status;
      loaded = true;
      renderTabs();
    } catch (error) {
      loadingError = error.message;
    }
    render();
  }
  renderTabs();
  load();
  return restore;
}
