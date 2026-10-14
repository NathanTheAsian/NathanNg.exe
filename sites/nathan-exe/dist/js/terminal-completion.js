// Returns suggestions without navigating or executing a command.
export async function completeInput(value, commands, getBrowser) {
  const match = value.match(/^(\s*)(\S*)(\s+)?([\s\S]*)$/);
  const [, leading, name, separator, argument] = match;
  let candidates;
  let prefix;
  let wrap = text => text;
  if (!separator) {
    prefix = name;
    candidates = [...new Set(commands.flatMap(command => [command.name, ...(command.aliases || [])]))]
      .filter(command => command.startsWith(name.toLowerCase())).sort();
    wrap = text => leading + text + (candidates.length === 1 ? ' ' : '');
  } else {
    const command = commands.find(command => [command.name, ...(command.aliases || [])].includes(name.toLowerCase()));
    if (!command || !['cd', 'list'].includes(command.type)) return { value, matches: [] };
    const quote = /^["']/.test(argument) ? argument[0] : '';
    prefix = quote ? argument.slice(1) : argument;
    if (quote && prefix.endsWith(quote)) prefix = prefix.slice(0, -1);
    const slash = prefix.lastIndexOf('/');
    const base = slash >= 0 ? prefix.slice(0, slash + 1) : '';
    const partial = prefix.slice(slash + 1);
    const browser = await getBrowser();
    let entries;
    try { entries = browser.list(base || '.'); }
    catch { return { value, matches: [] }; }
    // cd and ls accept directory paths; file links are opened from the listing.
    candidates = entries.filter(entry => entry.text.endsWith('/') && entry.text.toLowerCase().startsWith(partial.toLowerCase()))
      .map(entry => base + entry.text);
    wrap = text => {
      const delimiter = quote || (/\s/.test(text) ? '"' : '');
      return leading + name + separator + delimiter + text + delimiter;
    };
  }
  if (!candidates.length) return { value, matches: [] };
  let common = candidates[0];
  for (const candidate of candidates.slice(1)) {
    while (common && !candidate.startsWith(common)) common = common.slice(0, -1);
  }
  return {
    value: candidates.length === 1 || common.length > prefix.length ? wrap(common) : value,
    matches: candidates,
  };
}
