import http from 'node:http';
process.exit(1);
}


const scope = [
'user-read-recently-played',
].join(' ');


const authUrl = new URL('https://accounts.spotify.com/authorize');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('scope', scope);


authUrl.searchParams.set('show_dialog', 'true');


const server = http.createServer(async (req, res) => {
if (!req.url.startsWith('/callback')) {
res.writeHead(200, { 'Content-Type': 'text/plain' });
res.end('Waiting for Spotify auth callback...');
return;
}
const u = new URL(req.url, 'http://localhost:5173');
const code = u.searchParams.get('code');
if (!code) {
res.writeHead(400, { 'Content-Type': 'text/plain' });
res.end('No code in callback');
return;
}
try {
const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
method: 'POST',
headers: {
'Authorization': `Basic ${basic}`,
'Content-Type': 'application/x-www-form-urlencoded'
},
body: new URLSearchParams({
grant_type: 'authorization_code',
code,
redirect_uri: redirectUri,
})
});
const tokens = await tokenRes.json();
if (!tokenRes.ok) throw new Error(JSON.stringify(tokens));


res.writeHead(200, { 'Content-Type': 'text/plain' });
res.end('Auth complete! You can close this tab. Check your terminal for the refresh token.');


console.log('\nYour SPOTIFY_REFRESH_TOKEN (save to GitHub Secrets):');
console.log(tokens.refresh_token);
} catch (err) {
console.error(err);
res.writeHead(500, { 'Content-Type': 'text/plain' });
res.end('Error exchanging code. See terminal.');
} finally {
setTimeout(() => server.close(), 500);
}
});


server.listen(5173, () => {
console.log('Auth server on http://127.0.0.1:5173 . Opening Spotify consent...');
// Open the browser (works on macOS / Windows / most Linux)
const url = new URL('https://accounts.spotify.com/authorize');
url.search = authUrl.search;
const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
open.exec(`${cmd} ${url.toString()}`);
});