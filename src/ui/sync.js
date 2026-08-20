// THE SAVE, GOING UP AND COMING BACK DOWN.
//
// `docs/project/persistencia-e-login.md`, T5. The document that
// `src/ui/save.js` keeps in this browser is sent to the service in
// `server/save-worker.js`, so that typing the same name on another device
// finds the same game. Nothing in here knows what a run is; it moves one
// opaque object and holds one lock.
//
// THE LOCK IS THE POINT, not the transfer. Two devices playing the same name
// would write over each other and the history would end up belonging to
// nobody, so the service lends the name to ONE device at a time and refuses
// the second — which is the message the owner asked for. This module is the
// half of that mechanism that lives in the page.
//
// A SERVICE THAT IS DOWN MUST NOT TAKE THE GAME WITH IT. Every failure here
// resolves to "play locally", never to an exception: the page has worked
// without a network since it existed and it goes on doing so, with a mark on
// the header button saying nothing is being synced.

// Empty means local-only — the game plays exactly as it did before any of
// this, which is also what a fork of this repo gets until it deploys its own.
const SERVICE = 'https://rogulidle-save.vitorolg.workers.dev';

// HOW OFTEN THE SAVE GOES UP, and this number is a budget, not a taste. The
// free plan counts writes per DAY across the whole account, and a run lasts
// minutes — one upload per run, with a few friends playing for hours, spends
// the day's allowance by lunch. So the browser keeps writing every run
// (localStorage costs nothing) and only the trip up the wire is rationed.
//
// The cost is stated plainly in the study: changing device can lose the last
// few runs. It cannot lose more than that, because a closing tab hands its
// last save over on the way out.
//
// Half the lease, and that is the other half of the choice: every upload
// renews the lock, so at this spacing the lock is renewed twice over before
// it could lapse, and a game being watched never loses its own name.
const PUSH_EVERY_MS = 5 * 60 * 1000;

// Long enough for a phone on a bad connection, short enough that a service
// which is simply gone does not hold the first run hostage.
const TIMEOUT_MS = 8000;

// How often a page playing alone knocks on the door again. The same spacing
// as an upload: a request that fails costs nothing but a request, and one
// every five minutes is nobody's idea of hammering.
const RETRY_EVERY_MS = PUSH_EVERY_MS;

// Who holds the lock, from the moment a claim succeeds until something says
// otherwise.
let token = null;
let serverRev = 0;
let player = null;
let lastPush = 0;
let live = false;

// Did the last trip actually get there? Holding the lock and reaching the
// service are two different things — a page can hold a lease and be on a
// train — and the mark in the header is about the second one.
let reachable = false;

// When the last attempt to reach it was made, successful or not. What keeps
// a page that opened with no network from asking on every single run.
let lastTry = 0;

export function syncEnabled() {
  return Boolean(SERVICE);
}

// WHICH SERVER REVISION THIS PAGE HAS REACHED. The caller records it in the
// save itself after every successful trip, and that stored number is what
// the NEXT claim compares against to decide who is ahead — so a save that
// went up must say so, or the copy here starts looking older than it is and
// the last runs get thrown away for nothing.
export function serverRevision() {
  return serverRev;
}

// True while this page holds the lock AND is reaching the service. Anything
// else is "playing alone", which is one state to the player however many
// ways there are to arrive at it.
export function syncing() {
  return live && reachable;
}

// What the refusal on the OTHER device will name. Deliberately vague — the
// message only has to answer "which one of mine is it", and a fingerprint
// would answer questions nobody asked.
function deviceLabel() {
  const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  return touch ? 'um celular' : 'um computador';
}

async function ask(path, method, payload) {
  const response = await fetch(`${SERVICE}/${path}`, {
    method,
    headers: payload === undefined ? undefined : { 'content-type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

// Look without taking anything: is the name free, and at which revision?
// A read, so it costs nothing against the write budget — which is the whole
// reason the recovery below asks before it claims.
async function peek(name) {
  try {
    const { status, body } = await ask(`state?name=${encodeURIComponent(name)}`, 'GET');
    return status === 200 ? body : null;
  } catch {
    return null;
  }
}

// Take the lock and find out what is stored.
//
//   { state: 'ok', save, rev }              — it is ours, here is the save
//   { state: 'active', device, lastSeen }   — somebody else is playing it
//   { state: 'offline' }                    — no service; play locally
export async function claimName(name) {
  if (!SERVICE) return { state: 'offline' };
  // Remembered even when the claim fails: a page that opened with no network
  // still has to know whose name to ask for when it comes back.
  player = name;
  lastTry = Date.now();
  try {
    const { status, body } = await ask('claim', 'POST', { name, device: deviceLabel() });
    reachable = true;
    if (status === 409) {
      return { state: 'active', device: body.device || '', lastSeen: body.lastSeen || 0 };
    }
    // Anything else — a 400, a 500, a worker with no KV bound — is the
    // service being unusable, and that is one case, not five.
    if (status !== 200) return { state: 'offline' };

    token = body.token;
    serverRev = body.rev;
    live = true;
    lastPush = Date.now();
    return { state: 'ok', save: body.save, rev: body.rev };
  } catch {
    reachable = false;
    return { state: 'offline' };
  }
}

// KNOCKING AGAIN, for a page that has been playing alone.
//
// The mark in the header was never enough on its own: a tab that opened
// while the wifi was down would keep that mark until somebody thought to
// reload, which in a game meant to be left running is the same as never.
// This is the other half — every so often, at the end of a run, it asks.
//
// Returns null when there is nothing to say (already syncing, no service, or
// it is not time to ask yet), and otherwise the claim's own answer, which is
// the caller's to judge: only the caller knows which revision this browser's
// save corresponds to, and therefore whether what it played alone still
// counts.
export async function reconnect() {
  if (live || !SERVICE || !player) return null;
  if (Date.now() - lastTry < RETRY_EVERY_MS) return null;
  const got = await claimName(player);
  return got.state === 'offline' ? null : got;
}

// Send the document up, at most once every PUSH_EVERY_MS unless forced.
//
//   'ok' | 'skipped' | 'offline'  — nothing is wrong
//   'lost'                        — somebody else has the name; STOP
export async function pushSave(save, { force = false } = {}) {
  if (!live) return 'offline';
  const now = Date.now();
  if (!force && now - lastPush < PUSH_EVERY_MS) return 'skipped';

  let result;
  try {
    result = await ask('state', 'PUT', { name: player, token, rev: serverRev, save });
  } catch {
    // The wire, not the lock: the lease is still ours until it lapses, so
    // the next run tries again rather than giving the game away.
    reachable = false;
    lastTry = now;
    return 'offline';
  }

  reachable = true;
  if (result.status === 200) {
    serverRev = result.body.rev;
    lastPush = now;
    return 'ok';
  }

  // A REFUSAL IS NOT ALWAYS A SECOND DEVICE. This is an idle game: a tab
  // left paused for longer than the lease simply stops renewing, and the
  // name falls free with nobody else wanting it. Telling that player their
  // game "was opened somewhere else" would be a lie, so the honest move is
  // to knock again — if the name is still where we left it, carry on.
  if (result.status === 409 || result.status === 412) {
    const mine = serverRev;

    // IT ASKS BEFORE IT TAKES. Claiming first and deciding afterwards was
    // the obvious way to write this and it strands the lock: a page that
    // discovers it is behind, having just taken the name, would leave the
    // name held by a device that is about to stop — and the reload that
    // follows would be refused by its own abandoned token for the whole
    // lease. A read answers the same question and takes nothing.
    const there = await peek(player);
    if (there && !there.active && there.rev === mine) {
      const again = await claimName(player);
      if (again.state === 'ok' && again.rev === mine) {
        const retry = await pushSave(save, { force: true });
        if (retry === 'ok') return 'ok';
      }
    }

    live = false;
    return 'lost';
  }

  return 'offline';
}

// The last save, on the way out of the page, plus the lock handed back so
// the other device does not have to wait out the lease.
//
// CALLED WITH NOTHING, it hands the lock back and STORES NOTHING — which is
// what a page that has just discovered its own copy is an orphan has to do.
// It took the name to find that out; keeping it would leave the name held by
// a page about to stop, and uploading what it holds would put the discarded
// history over the real one. The worker ignores a save whose revision does
// not match anyway, but not sending it is the version that does not depend
// on the worker being careful.
//
// `sendBeacon` because a closing page does not stay alive for a `fetch`. It
// cannot set a content type and it cannot read the answer — the worker parses
// the body as JSON regardless, and there is nothing here to do with a reply.
export function releaseSave(save) {
  if (!live || typeof navigator === 'undefined' || !navigator.sendBeacon) return;
  const payload = JSON.stringify({ name: player, token, rev: serverRev, save });
  navigator.sendBeacon(`${SERVICE}/release`, payload);
  live = false;
}
