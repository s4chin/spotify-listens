import fs from 'node:fs/promises';
import {
    Buffer
} from 'node:buffer';


const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;


if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error('Missing one of SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET / SPOTIFY_REFRESH_TOKEN');
    process.exit(1);
}


const DATA_PATH = 'data/listening-history.json';
const LATEST_PATH = 'data/latest.json';


async function getAccessToken() {
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: REFRESH_TOKEN
        })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`token error: ${res.status} ${JSON.stringify(json)}`);
    return json.access_token;
}

async function readJson(path) {
    try {
        const raw = await fs.readFile(path, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        if (e.code === 'ENOENT') return [];
        throw e;
    }
}


function toKey(item) {
    return `${item.played_at}|${item.track.id}`;
}


function simplify(item) {
    const t = item.track;
    const album = t.album || {};
    return {
        played_at: item.played_at,
        track: {
            id: t.id,
            name: t.name,
            uri: t.uri,
            external_url: t.external_urls?.spotify,
            duration_ms: t.duration_ms,
            artists: (t.artists || []).map(a => ({
                id: a.id,
                name: a.name,
                uri: a.uri,
                external_url: a.external_urls?.spotify
            })),
            album: {
                id: album.id,
                name: album.name,
                uri: album.uri,
                external_url: album.external_urls?.spotify,
                images: album.images || []
            }
        },
        context: item.context ? {
            type: item.context.type,
            uri: item.context.uri
        } : null
    };
}

async function fetchSince(accessToken, afterMs) {
    const collected = [];
    let after = afterMs;
    while (true) {
        const url = new URL('https://api.spotify.com/v1/me/player/recently-played');
        url.searchParams.set('limit', '50');
        if (after) url.searchParams.set('after', String(after));
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const json = await res.json();
        if (!res.ok) throw new Error(`recently-played error: ${res.status} ${JSON.stringify(json)}`);


        const items = (json.items || []);
        collected.push(...items);


        if (items.length < 50) break;
        // advance the cursor to last played_at + 1ms
        const last = items[items.length - 1];
        after = new Date(last.played_at).getTime() + 1;
    }
    return collected.map(simplify);
}

(async () => {
    const existing = await readJson(DATA_PATH);
    const existingKeys = new Set(existing.map(toKey));


    const lastPlayedMs = existing.length ?
        Math.max(...existing.map(e => Date.parse(e.played_at))) :
        undefined;


    const accessToken = await getAccessToken();
    // Spotify only returns the last ~50 plays and within ~24h; running hourly is fine to accumulate going forward.
    const fresh = await fetchSince(accessToken, lastPlayedMs);


    const merged = [...existing];
    for (const item of fresh) {
        const key = toKey(item);
        if (!existingKeys.has(key)) {
            merged.push(item);
            existingKeys.add(key);
        }
    }


    // sort newest first
    merged.sort((a, b) => Date.parse(b.played_at) - Date.parse(a.played_at));


    await fs.writeFile(DATA_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf8');


    const latest = merged.slice(0, 100);
    await fs.writeFile(LATEST_PATH, JSON.stringify(latest, null, 2) + '\n', 'utf8');


    console.log(`Added ${fresh.length} new plays. Total: ${merged.length}.`);
})().catch(err => {
    console.error(err);
    process.exit(1);
});