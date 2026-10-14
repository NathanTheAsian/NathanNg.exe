# Nathan.exe

A static personal desktop portfolio. No framework or build step required.

## Personalized portfolio

`dist/projects/index.html` lists seven standalone project pages. Edit those HTML files directly to update project stories. Contact links, co-op availability (January 1, 2027), the résumé, and the Project Manager screenshot are included in the static site. Keep desktop summaries in `dist/data/task-manager.json` aligned with the project pages.

Weekly effort currently means reported time **outside scheduled classes**: 27 course hours, 4 hours for 2TheMoon, 6 for SimuO, and 1.5 for the Project Manager (the midpoint of 1–2). StudyHub and the wheelchair leg raiser are included in their course hours. Focus percentages total 100 and express this allocation, not skill. Unestimated activities have a dash for hours.

## Preview

From this directory run:

```powershell
python -m http.server 5173 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:5173. If it is already running, save your changes and refresh.
Use the server rather than opening index.html directly: the site uses JavaScript modules and fetches JSON.

## Edit Task Manager

Edit **dist/data/task-manager.json**. Task Manager fetches this file on every page load without using a cached copy.

- `processes`: anything you spend time on. `type` accepts any nonempty text: education, project, leisure, activity, club, or your own category.
- `backgroundProcesses`: background entries using exactly the same format as `processes`. Placement depends only on which array contains the entry; no `group` field is needed.
- `pages`: the Performance, App history, Startup, and Details tabs. Adding a page creates a tab automatically.
- `previewLabel`, `processNote`, `status`: the preview label, table note, and footer status.

Copy this object into the `processes` array, separating it from neighboring entries with a comma:

```json
{
  "name": "My project",
  "icon": ">_",
  "color": "#657eab",
  "type": "project",
  "status": "Building",
  "focus": 10,
  "hours": 2,
  "stack": "JavaScript",
  "description": "What I built and why.",
  "tags": ["Web", "In progress"],
  "links": [
    { "label": "Source", "url": "https://github.com/NathanTheAsian" }
  ]
}
```

Use double quotes and no comments or trailing commas: this is JSON, not JavaScript.
`focus` and `hours` are numbers, not quoted strings. Zero hours displays a dash.
Counts, total hours, focus totals, and performance bars are calculated automatically.
Aim for focus values totaling 100 when representing a full allocation of attention.
Tags and links are optional. Links accept http(s) URLs. Text is plain text, not HTML.

Each entry in `pages` has `eyebrow`, `title`, `description`, and optional
`sections: [{ "title": "Heading", "text": "Body text" }]` or `metrics: true`.
Keep the `Details` key for the About Nathan shortcut. `Processes` is reserved.

Invalid JSON or invalid field values show an error inside Task Manager with a Retry loading button.
Fix the file, save, then click Retry loading. The desktop and terminal remain usable.

## Edit nathangcli

Edit **dist/data/terminal.json**, save, and refresh. The CLI fetches it without caching on each page load.

- `name`, `prompt`, `greeting`, `hint`: terminal appearance and introductory text.
- `commands`: command definitions and aliases. `help` lists these automatically.
- The `ls` command's `url` is your GitHub link. Change it here.

Add an entry to `commands`, separating it with a comma:

```json
{
  "name": "about",
  "aliases": ["bio"],
  "description": "About me",
  "type": "text",
  "text": "Your short biography."
}
```

For a link command:

```json
{
  "name": "demo",
  "description": "Open a demo",
  "type": "link",
  "url": "https://example.com",
  "label": "Live demo",
  "text": "Visit → "
}
```

Supported types: `text`, `link`, `help`, `clear`, `exit`. Use unique lowercase command names and aliases without spaces.
Link commands require an http(s) `url`. Use double quotes, no comments, and no trailing commas.
Invalid JSON or fields display an error and a Retry loading button in the terminal; the rest of the desktop still works.

## Edit the desktop and startup

These settings remain in **dist/content.js**:

| Setting | Contents |
| --- | --- |
| `site` | Name and desktop introduction |
| `startup` | Boot messages, timing, whether to replay on visits |

All configuration files are public website content; never add secrets.

## Code map

- `dist/data/task-manager.json`: editable Task Manager data.
- `dist/data/terminal.json`: editable CLI settings and commands.
- `dist/content.js`: desktop and startup settings.
- `dist/index.html`: desktop and window markup.
- `dist/styles/`: desktop, typography, and terminal CSS, imported by `dist/style.css`.
- `dist/js/main.js`: initializes the modules and clock.
- `dist/js/task-manager.js`: process table, details, tabs, and totals.
- `dist/js/task-manager-data.js`: JSON loading and field validation.
- `dist/js/terminal.js`: command handling and input history.
- `dist/js/terminal-data.js`: CLI JSON loading and validation.
- `dist/js/boot.js`: startup sequence and session preferences.
- `dist/js/windows.js`: shared Task Manager and terminal dragging.
- `dist/js/dom.js`: DOM, text escaping, and URL helpers.
- `dist/fonts/`: Monocraft font and license.

Desktop and terminal use Monocraft; Task Manager uses Segoe UI. Change `styles/typography.css` to adjust that choice.

## Publishing

`dist/` is the complete static site; upload it to a static host without building.
Hosting metadata is preserved in `.hosting/hosting.json`. The folder was renamed for this repository; Sites publishing tools expect their original manifest path and require adapting before use.
The previous Sites packaging attempt required unavailable WSL; local preview works independently.

### Degree process and courses

`processes[0]` is **BaSC Software Engineering**. Edit its `children` array to add or remove courses.
Each child uses the same fields as a normal process. Parent `focus` and `hours` are calculated from children; omit these fields on the parent.
Click the degree row to expand or collapse its courses. Select it and use Inspect process for degree details.
Projects, Leisure, Activities, and Clubs live in `backgroundProcesses`. Move an unchanged object between `processes` and `backgroundProcesses` to move it between the two sections.

Types do not control placement. Both lists accept any type and the same optional children, tags, and links. Children stay under their parent. Counts, totals, and Performance bars include both lists automatically.
The Leisure, Activities, and Clubs entries are sample slots with zero allocated time; replace them with your own activities.

### Browse GitHub projects from nathangcli

- `ls` lists public repositories at `~`, or files/folders inside the current directory.
- `cd Choom` enters a repository and displays links to its contents.
- `cd folder/subfolder` explores nested directories. Quote paths containing spaces.
- `cd ..` goes up one level; `cd`, `cd ~`, or `cd /` returns to the project list.
- `ls /CSI2110` lists another repository without changing directories.
- `pwd` shows your current location. `github` opens your profile.

Each listed item links to its actual GitHub file/folder on the repository's default branch.
`dist/data/repositories.json` contains the fetched public directory snapshot (including forks).
It is not live-synced: refresh it when repositories or files change:

```powershell
python scripts/refresh-repositories.py
```

The refresh uses GitHub's public API, requires network access, and may be rate limited.
Empty repositories display a repository link. No private repositories or credentials are used.
CLI JSON command types also support `list`, `cd`, and `pwd`.

Tab completes commands, aliases, repository names, and directory paths for `cd` and `ls`.
A unique match is inserted; multiple matches extend the common prefix and show suggestions.
Completion supports nested paths and quoted directory names. Shift+Tab still moves keyboard focus.
