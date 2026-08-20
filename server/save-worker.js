// THE ONE PIECE THAT IS NOT THE REPOSITORY.
//
// `docs/project/persistencia-e-login.md`, T4. Everything else in Rogulidle
// is a file GitHub Pages hands to a browser; this is a service, with an
// account behind it and a limit on how often it may be written to. It exists
// because a save cannot follow a player to a second device without somewhere
// outside both of them to sit, and there is no version of that which is
// still only static files.
//
// It stores ONE document per name and lends out ONE lock, and it does not
// know what a run is. The whole game is in the save it never opens.
//
// NOT AUTHENTICATION. A name is an address, not a credential — anyone who
// types a name gets that save, which is the design the owner chose for a
// game shared between friends (§5 of the study). A password here would not
// change that: the page is public source and any secret it carried would be
// public with it. What this DOES protect is the save against itself — two
// devices writing over each other.
//
// ***** deploying it *****
//
// 1. Cloudflare dashboard → Workers & Pages → Create → Worker. Any name.
// 2. Edit code, paste this file whole, deploy.
// 3. Storage → KV → create a namespace, then bind it to the worker under the
//    variable name SAVES. Nothing else is configured; there are no secrets.
// 4. The worker's URL goes in `SERVICE`, at the top of `src/ui/sync.js`. A
//    page whose `SERVICE` is empty plays locally and syncs nothing.
//
// ***** running it here *****
//
//     node tools/save-server.mjs        # same file, fake KV, port 8142
//
// The routes can then be curled without an account existing. That harness is
// the reason this file uses nothing but `Request`, `Response` and the two KV
// calls below — it has to run unchanged in both places.

// How long a lock lasts without being renewed. Every write renews it, and a
// device that closes properly hands it back immediately (`/release`); this is
// only for the ones that do not — a dead battery, a killed tab. Too short and
// a player on a slow connection loses the lock they are still using; too long
// and their other device is locked out of a game nobody is playing.
const LEASE_MS = 10 * 60 * 1000;

// A save is a few kilobytes. Anything this size is not one.
const MAX_BODY = 64 * 1024;

// Exactly what `normalisePlayerName` produces (src/ui/save.js). The server
// does not fold names — it refuses anything that is not already folded, so
// there is one implementation of the fold and no chance of two.
const NAME = /^[a-z0-9-]{1,16}$/;

// The page is served from another origin (GitHub Pages, or a dev server), so
// every answer needs these and a preflight has to be answered.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' },
});

const keyFor = (name) => `save:${name}`;

// What a name that has never been claimed looks like. Returning a record
// rather than null means every handler below reads the same shape.
const EMPTY = { rev: 0, updatedAt: 0, save: null, lease: null };

async function read(env, name) {
  const stored = await env.SAVES.get(keyFor(name), { type: 'json' });
  return stored && typeof stored === 'object' ? { ...EMPTY, ...stored } : { ...EMPTY };
}

async function write(env, name, record) {
  await env.SAVES.put(keyFor(name), JSON.stringify(record));
}

// The body of every route, parsed the same way. `sendBeacon` cannot set a
// content type, so the type is never trusted — the text is parsed as JSON or
// the request is not one.
async function body(request) {
  const text = await request.text();
  if (text.length > MAX_BODY) return { tooBig: true };
  try {
    const parsed = JSON.parse(text || '{}');
    return parsed && typeof parsed === 'object' ? { value: parsed } : {};
  } catch {
    return {};
  }
}

const held = (record, now) => Boolean(record.lease && record.lease.until > now);

// ***** the routes *****

// Take the lock, and get back whatever is stored. This is the only way in:
// a device that did not claim has no token, and every write needs one.
//
// `force` INSISTS, and it is the answer to the case the lease alone handles
// badly: a device that died holding the lock. The lease frees the name by
// itself, but only after its whole term, and the person waiting is usually
// the one who knows perfectly well that the other device is shut. Forcing
// hands the name over now.
//
// It needs nothing new to be safe. The displaced device is stopped by the
// mechanism that was already there: its token is no longer the holder's, so
// its next write is refused and it says so on screen. What it had not sent
// up is lost, which is the honest price of insisting and is said out loud on
// the button that does it.
async function claim(env, given, now) {
  const name = given.name;
  const record = await read(env, name);

  // REFUSED WHILE SOMEBODY ELSE HOLDS IT — the message the owner asked for.
  // `lastSeen` is when that device last renewed, so the page can say how long
  // ago rather than just "somewhere else".
  if (held(record, now) && given.force !== true) {
    return json(409, {
      error: 'active',
      device: record.lease.device || '',
      lastSeen: record.lease.at,
    });
  }

  // An expired lease is simply taken over, and so is a live one somebody
  // insisted on. A lock that outlives the device holding it is a locked-out
  // player; the lease ends that by itself in time, and `force` ends it now.
  const lease = {
    token: crypto.randomUUID(),
    device: String(given.device || '').slice(0, 60),
    at: now,
    until: now + LEASE_MS,
  };
  await write(env, name, { ...record, lease });
  return json(200, {
    token: lease.token, until: lease.until, rev: record.rev, save: record.save,
  });
}

// Look without taking anything. Not used by the game — it is how a save is
// inspected with `curl`, and how "is somebody playing right now" is answered
// without becoming that somebody.
async function peek(env, name, now) {
  const record = await read(env, name);
  return json(200, {
    rev: record.rev,
    updatedAt: record.updatedAt,
    active: held(record, now),
    // WHOSE lease it is, without saying whose. The deadline changes every
    // time the lock is taken or renewed, so a device that knows its own can
    // tell "still mine" from "somebody else's" by comparing one number —
    // and it costs a read rather than a write, which is why the page can
    // afford to ask after every run. The token itself is never handed out.
    until: record.lease ? record.lease.until : 0,
    save: record.save,
  });
}

// Store the save and renew the lock, in that order and in one write — the
// write budget is the reason the client only calls this every few minutes
// (§6 of the study), so the heartbeat cannot be a separate request.
async function store(env, given, now) {
  const record = await read(env, given.name);

  // THE LOCK IS THE WHOLE PROTECTION. A device that lost it — because it went
  // quiet long enough for the lease to lapse and somebody else claimed — is
  // told so and must stop. This is what keeps two devices from overwriting
  // each other, and the client turns it into the message on screen.
  if (!held(record, now) || record.lease.token !== given.token) {
    return json(409, { error: 'lost' });
  }

  // A revision behind means this device is writing over something it never
  // saw. It cannot happen while one lock is honoured, which is exactly why it
  // is worth saying out loud when it does — and the current save comes back
  // with the refusal so the client can catch up instead of guessing.
  if (Number(given.rev) !== record.rev) {
    return json(412, { error: 'stale', rev: record.rev, save: record.save });
  }

  const next = {
    rev: record.rev + 1,
    updatedAt: now,
    save: given.save === undefined ? record.save : given.save,
    lease: { ...record.lease, at: now, until: now + LEASE_MS },
  };
  await write(env, given.name, next);
  return json(200, { rev: next.rev, until: next.lease.until });
}

// Hand the lock back, with one last save. This is what a closing tab sends,
// so it has to be cheap and it has to be safe to arrive late: a token that is
// no longer the holder's changes nothing at all, or a device coming back from
// the dead would unlock the one that replaced it.
async function release(env, given, now) {
  const record = await read(env, given.name);
  if (!record.lease || record.lease.token !== given.token) {
    return json(409, { error: 'lost' });
  }

  const keep = given.save !== undefined && Number(given.rev) === record.rev;
  await write(env, given.name, {
    rev: keep ? record.rev + 1 : record.rev,
    updatedAt: keep ? now : record.updatedAt,
    save: keep ? given.save : record.save,
    lease: null,
  });
  return new Response(null, { status: 204, headers: CORS });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (!env || !env.SAVES) {
      return json(500, { error: 'no-kv', hint: 'bind a KV namespace as SAVES' });
    }

    // The last path segment, so the worker answers the same whether it is
    // mounted at the root of a subdomain or under a route with a prefix.
    const url = new URL(request.url);
    const route = url.pathname.split('/').filter(Boolean).pop() || '';
    const now = Date.now();

    if (request.method === 'GET' && route === 'state') {
      const name = url.searchParams.get('name') || '';
      if (!NAME.test(name)) return json(400, { error: 'name' });
      return peek(env, name, now);
    }

    if (request.method !== 'POST' && request.method !== 'PUT') {
      return json(405, { error: 'method' });
    }

    const parsed = await body(request);
    if (parsed.tooBig) return json(413, { error: 'too-big' });
    if (!parsed.value) return json(400, { error: 'body' });

    const given = parsed.value;
    if (!NAME.test(String(given.name || ''))) return json(400, { error: 'name' });

    if (request.method === 'POST' && route === 'claim') return claim(env, given, now);
    if (request.method === 'PUT' && route === 'state') return store(env, given, now);
    if (request.method === 'POST' && route === 'release') return release(env, given, now);

    return json(404, { error: 'route' });
  },
};

// Exported for the tests and the local harness, which have to agree with the
// worker about how long a lease lasts rather than restating the number.
export { LEASE_MS };
