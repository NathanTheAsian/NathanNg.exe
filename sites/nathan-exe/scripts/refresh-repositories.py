"""Refresh the public GitHub directory snapshot used by nathangcli."""
import json
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import quote

OWNER = 'NathanTheAsian'
OUTPUT = Path(__file__).resolve().parents[1] / 'dist/data/repositories.json'

def get(path):
    request = Request('https://api.github.com' + path, headers={'User-Agent': 'Nathan.exe-portfolio', 'Accept': 'application/vnd.github+json'})
    with urlopen(request, timeout=30) as response:
        return json.load(response)

repos = []
page = 1
while True:
    batch = get(f'/users/{OWNER}/repos?per_page=100&sort=full_name&page={page}')
    repos.extend(batch)
    if len(batch) < 100:
        break
    page += 1

result = []
for repo in repos:
    name, branch = repo['name'], repo['default_branch']
    # Empty repositories have no Git tree.
    if repo['size'] == 0:
        tree = {'tree': [], 'truncated': False}
    else:
        tree = get(f'/repos/{OWNER}/{quote(name, safe="")}/git/trees/{quote(branch, safe="")}?recursive=1')
    if tree.get('truncated'):
        raise RuntimeError(f'{name}: tree truncated; keep the previous snapshot instead of saving partial data')
    entries = []
    for item in tree['tree']:
        kind = 'directory' if item['type'] == 'tree' else 'file'
        route = 'tree' if kind == 'directory' or item['type'] == 'commit' else 'blob'
        url = repo['html_url'] + '/' + route + '/' + quote(branch, safe='') + '/' + quote(item['path'], safe='/')
        entries.append({'path': item['path'], 'type': kind, 'url': url})
    result.append({'name': name, 'url': repo['html_url'], 'branch': branch, 'entries': entries})
    print(f'{name}: {len(entries)} entries')
OUTPUT.write_text(json.dumps({'owner': OWNER, 'repositories': result}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Saved {len(result)} repositories to {OUTPUT.name}')
