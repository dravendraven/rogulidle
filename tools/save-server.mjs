// The save worker, running here instead of at Cloudflare.
//
//     node tools/save-server.mjs [port]      # 8142 by default
//
// SAME FILE, faked storage. `server/save-worker.js` is written against two
// things only — the web `Request`/`Response` pair and a storage with `get`
// and `put` — so this harness is thirty lines of plumbing and not a second
// implementation. What gets curled here is what gets deployed there.
//
// The store is a Map per name: it dies with the process. That is the point —
// this is for seeing the routes work, not for keeping anything.
//
//     curl -s localhost:8142/claim -d '{"name":"vito","device":"curl"}'
//     curl -s 'localhost:8142/state?name=vito'
//     curl -s -X PUT localhost:8142/state \
//       -d '{"name":"vito","token":"<token>","rev":0,"save":{"hello":1}}'
//     curl -s localhost:8142/release -d '{"name":"vito","token":"<token>"}'

import http from 'node:http';
import worker, { SaveRoom } from '../server/save-worker.js';

const PORT = Number(process.argv[2] || process.env.PORT || 8142);

// What Cloudflare binds as `env.SAVES`: a namespace that turns a name into
// an id and an id into the one object that answers for it. Only the calls
// the worker makes.
const rooms = new Map();
const env = {
  SAVES: {
    idFromName: (name) => name,
    get(id) {
      if (!rooms.has(id)) {
        const store = new Map();
        rooms.set(id, new SaveRoom({ storage: {
          async get(key) { return store.get(key); },
          async put(key, value) { store.set(key, value); },
        } }));
      }
      return rooms.get(id);
    },
  },
};

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const server = http.createServer(async (req, res) => {
  try {
    const raw = await readBody(req);
    const request = new Request(`http://localhost:${PORT}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: raw.length ? raw : undefined,
    });

    const response = await worker.fetch(request, env);
    const text = await response.text();
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(text);

    // One line per request, so a curl session reads as a story.
    console.log(`${req.method} ${req.url} → ${response.status} ${text.slice(0, 120)}`);
  } catch (error) {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'harness', message: error.message }));
    console.error(error);
  }
});

server.listen(PORT, () => {
  console.log(`save worker on http://localhost:${PORT} — storage is in memory and dies with this process`);
});
