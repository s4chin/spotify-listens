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
body {
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;
  margin: 2rem;
}
header {
  display: flex;
  align-items: baseline;
  gap: 1rem;
}
h1 {
  margin: 0;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 1rem;
}
.card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
}
.cover {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  object-fit: cover;
}
.meta {
  display: grid;
  gap: 4px;
}
.title {
  font-weight: 600;
}
.artist,
.when {
  color: #6b7280;
  font-size: .9rem;
}
.group {
  margin-top: 2rem;
}
.group h2 {
  font-size: 1rem;
  color: #374151;
  margin: 0 0 .5rem 0;
  text-transform: uppercase;
  letter-spacing: .06em;
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
  const groups = groupByDate(items);

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

  for (const [date, arr] of groups) {
    html += `<section class="group"><h2>${date}</h2><div class="grid">`;
    for (const it of arr) {
      const art = it.track.album?.images?.[0]?.url || '';
      const artists = (it.track.artists || []).map(a => a.name).join(', ');
      const when = new Date(it.played_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const href = it.track.external_url || '#';
      html += `<a class="card" href="${href}" target="_blank" rel="noopener"><img class="cover" src="${art}" alt="album art"><div class="meta"><div class="title">${it.track.name}</div><div class="artist">${artists}</div><div class="when">${when}</div></div></a>`;
    }
    html += `</div></section>`;
  }

  html += `
  </div>
</body>
</html>
`;

  await fs.writeFile(OUTPUT, html, 'utf8');
})();