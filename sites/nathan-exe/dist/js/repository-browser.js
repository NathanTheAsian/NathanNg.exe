// A virtual directory browser backed by the checked-in GitHub JSON snapshot.
export function createRepositoryBrowser(data) {
  if (!Array.isArray(data.repositories)) throw new Error('Invalid repository snapshot.');
  let current = [];
  function resolve(path = '.') {
    const parts = path.startsWith('/') || path.startsWith('~') ? [] : [...current];
    for (const part of path.replace(/^~\/?/, '').split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') parts.pop();
      else parts.push(part);
    }
    if (parts.length) {
      const repo = data.repositories.find(repo => repo.name.toLowerCase() === parts[0].toLowerCase());
      if (!repo) throw new Error(`No such project: ${parts[0]}. Type ls / to list projects.`);
      parts[0] = repo.name;
      const inside = parts.slice(1).join('/');
      if (inside && !repo.entries.some(entry => entry.path === inside && entry.type === 'directory')) {
        throw new Error(`Not a project directory: ${path}. Use the file links in ls to open files.`);
      }
    }
    return parts;
  }
  function list(path = '.') {
    const parts = resolve(path);
    if (!parts.length) return data.repositories.map(repo => ({ text: repo.name + '/', url: repo.url }));
    const repo = data.repositories.find(repo => repo.name === parts[0]);
    const prefix = parts.length > 1 ? parts.slice(1).join('/') + '/' : '';
    return repo.entries.filter(entry => entry.path.startsWith(prefix) && !entry.path.slice(prefix.length).includes('/'))
      .sort((a, b) => (a.type === b.type ? a.path.localeCompare(b.path) : a.type === 'directory' ? -1 : 1))
      .map(entry => ({ text: entry.path.slice(prefix.length) + (entry.type === 'directory' ? '/' : ''), url: entry.url }));
  }
  return {
    list,
    cd(path = '~') { const target = resolve(path); current = target; return list(); },
    pwd() { return '~' + (current.length ? '/' + current.join('/') : ''); },
    repository(path = '.') { const parts = resolve(path); return data.repositories.find(repo => repo.name === parts[0]); },
  };
}

export async function loadRepositoryBrowser() {
  const response = await fetch(new URL('../data/repositories.json', import.meta.url), { cache: 'no-store' });
  if (!response.ok) throw new Error(`Couldn’t load repositories.json (HTTP ${response.status}).`);
  return createRepositoryBrowser(await response.json());
}
