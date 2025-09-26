import fs from 'node:fs/promises';

const INPUT = process.env.DATA_PATH || 'data/listening-history.json';
const OUTPUT = process.env.OUTPUT || 'spotify-history.html';

function groupByDate(items) {
  const groups = new Map();
  for (const it of items) {
    const d = new Date(it.played_at);
    const key = d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  return groups;
}

const css = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;
  margin: 1.5rem;
}
header {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: .75rem;
}
h1 {
  margin: 0;
  font-size: 1.1rem;
}
#content {
  max-width: 640px;
  margin: 1.25rem auto 2rem;
}
.group {
  margin-top: 1rem;
}
.group summary {
  cursor: pointer;
  font-weight: 600;
  margin-bottom: .25rem;
}
.group summary small {
  color: #6b7280;
  font-weight: 400;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}
.thumb {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
  flex: none;
  background: #e5e7eb;
}
.line {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.title {
  font-weight: 600;
}
.artist {
  color: #6b7280;
}
.time {
  color: #6b7280;
}
a {
  color: inherit;
  text-decoration-thickness: 2px;
}
`;

(async () => {
  const raw = await fs.readFile(INPUT, 'utf8');
  const all = JSON.parse(raw);
  const items = all.slice(0, 100); // only render a recent slice if desired

  let html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>My Spotify Listening History</title>
  <style>${css}</style>
</head>
<body>
  <header>
    <h1>My Spotify Listening History</h1>
    <small>${items.length} recent plays</small>
  </header>
  <div id="content">
`;

  const groups = groupByDate(items);
  for (const [date, arr] of groups) {
    html += `<details class="group" open><summary>${date} <small>(${arr.length})</small></summary><ul class="list">`;
    for (const it of arr) {
      const art =
        it.track.album?.images?.[2]?.url ||
        it.track.album?.images?.[1]?.url ||
        it.track.album?.images?.[0]?.url ||
        '';
      const artists = (it.track.artists || []).map(a => a.name).join(', ');
      const href = it.track.external_url || it.track.external_urls?.spotify || '#';
      const when = new Date(it.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      html += `<li><a class="row" href="${href}" target="_blank" rel="noopener"><img class="thumb" src="${art}" alt=""><div class="line"><span class="title">${it.track.name}</span> — <span class="artist">${artists}</span> · <time class="time" datetime="${it.played_at}">${when}</time></div></a></li>`;
    }
    html += `</ul></details>`;
  }

  html += `
  </div>
</body>
</html>
`;

  await fs.writeFile(OUTPUT, html, 'utf8');
})();