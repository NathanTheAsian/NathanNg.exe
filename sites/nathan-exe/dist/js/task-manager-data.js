// Validate editable JSON before it reaches the renderer, with useful field errors.
export function validateTaskManagerData(data) {
  const require = (condition, message) => { if (!condition) throw new Error(message); };
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const text = (value, path) => require(typeof value === 'string', `${path} must be text.`);
  require(object(data), 'The JSON root must be an object.');
  for (const key of ['previewLabel', 'processNote', 'status']) text(data[key], key);
  // Accept the earlier single-list format without dropping existing entries.
  if (data.backgroundProcesses === undefined && Array.isArray(data.processes)) {
    const background = process => process.group === 'Background processes' ||
      (!process.group && ['project', 'leisure', 'activity', 'club'].includes(process.type));
    data.backgroundProcesses = data.processes.filter(background);
    data.processes = data.processes.filter(process => !background(process));
  }
  for (const key of ['processes', 'backgroundProcesses']) require(Array.isArray(data[key]), `${key} must be an array.`);
  function validateProcess(process, path) {
    require(object(process), `${path} must be an object.`);
    for (const key of ['name', 'icon', 'color', 'status', 'stack', 'description']) text(process[key], `${path}.${key}`);
    require(typeof process.type === 'string' && process.type.trim().length > 0, `${path}.type must be nonempty text.`);
    if (process.children !== undefined) {
      require(Array.isArray(process.children), `${path}.children must be an array.`);
      process.children.forEach((child, index) => validateProcess(child, `${path}.children[${index}]`));
      if (process.children.length) {
        for (const field of ['focus', 'hours']) process[field] = process.children.reduce((sum, child) => sum + child[field], 0);
      } else {
        process.focus ??= 0;
        process.hours ??= 0;
      }
    }
    for (const key of ['focus', 'hours']) require(typeof process[key] === 'number' && Number.isFinite(process[key]) && process[key] >= 0, `${path}.${key} must be a nonnegative number.`);
    require(process.focus <= 100, `${path}.focus must be at most 100.`);
    if (process.tags !== undefined) require(Array.isArray(process.tags) && process.tags.every(tag => typeof tag === 'string'), `${path}.tags must be an array of text.`);
    if (process.links !== undefined) {
      require(Array.isArray(process.links), `${path}.links must be an array.`);
      process.links.forEach((link, index) => {
        require(object(link), `${path}.links[${index}] must be an object.`);
        text(link.label, `${path}.links[${index}].label`);
        text(link.url, `${path}.links[${index}].url`);
      });
    }
  }
  for (const key of ['processes', 'backgroundProcesses']) {
    data[key].forEach((process, index) => validateProcess(process, `${key}[${index}]`));
  }
  require(object(data.pages), 'pages must be an object.');
  require(!Object.hasOwn(data.pages, 'Processes'), 'Processes is a reserved tab name.');
  for (const [name, page] of Object.entries(data.pages)) {
    require(object(page), `pages.${name} must be an object.`);
    for (const key of ['eyebrow', 'title', 'description']) text(page[key], `pages.${name}.${key}`);
    if (page.metrics !== undefined) require(typeof page.metrics === 'boolean', `pages.${name}.metrics must be true or false.`);
    if (page.sections !== undefined) {
      require(Array.isArray(page.sections), `pages.${name}.sections must be an array.`);
      page.sections.forEach((section, index) => {
        require(object(section), `pages.${name}.sections[${index}] must be an object.`);
        text(section.title, `pages.${name}.sections[${index}].title`);
        if (section.text === undefined && section.html === undefined) {
          throw new Error(`pages.${name}.sections[${index}] must include either text or html.`);
        }
        if (section.text !== undefined) text(section.text, `pages.${name}.sections[${index}].text`);
        if (section.html !== undefined) text(section.html, `pages.${name}.sections[${index}].html`);
      });
    }
  }
  return data;
}

export async function loadTaskManagerData() {
  const response = await fetch(new URL('../data/task-manager.json', import.meta.url), { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to read task-manager.json (HTTP ${response.status}).`);
  let data;
  try { data = await response.json(); }
  catch { throw new Error('task-manager.json contains invalid JSON. Check double quotes and commas.'); }
  return validateTaskManagerData(data);
}

// Both lists share exactly the same schema; location alone controls placement.
export function getProcessGroups(data) {
  return [
    { label: 'Processes', items: data.processes || [] },
    { label: 'Background processes', items: data.backgroundProcesses || [] },
  ];
}
