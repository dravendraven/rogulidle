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
// THE SERVER IS THE GAME; THIS BROWSER IS A COPY OF IT. Every run goes up
// before the next one starts, and a page that cannot reach the service does
// not play on alone — it waits (src/ui/spectator.js). That is the whole
// guarantee against two histories: nothing this page has counted is ever
// missing from the server for longer than one failed request. The rationed
// upload this replaced (one every few minutes, play locally meanwhile) let a
// browser play a hundred and fifty runs that never went up, while another
// took the name and continued from the copy that had —
// `docs/project/decisions.md`, "A subida espaçada".
//
// A service that is down therefore DOES take the game with it, and it says
// so on screen. That is the price of the guarantee, and the owner chose it.
// The page keeps trying by itself; nobody has to reload.

// Empty means local-only — the game plays exactly as it did before any of
// this, which is also what a fork of this repo gets until it deploys its own.
const SERVICE = 'https://rogulidle-save.vitorolg.workers.dev';

// Long enough for a phone on a bad connection, short enough that a service
// which is simply gone does not hold the first run hostage.
const TIMEOUT_MS = 8000;

// Who holds the lock, from the moment a claim succeeds until something says
// otherwise.
let token = null;
let serverRev = 0;
let player = null;
let live = false;

// When our lease runs out, as the service last told us. It is also our
// FINGERPRINT on the lock: the deadline moves every time the name is taken
// or renewed, so a lease whose deadline is not this one is not ours.
let leaseUntil = 0;

export function syncEnabled() {
  return Boolean(SERVICE);
}

// True while this page holds the lock. A page that does not is either
// waiting for the service or stopped; it is never playing.
export function syncing() {
  return live;
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
//   { state: 'offline' }                    — no service; the caller waits
//
// `force` takes the name even from a device that still holds it — the button
// behind the refusal, for when the player knows the other one is shut. Never
// automatic: only the person looking at the screen knows that.
export async function claimName(name, { force = false } = {}) {
  if (!SERVICE) return { state: 'offline' };
  player = name;
  try {
    const { status, body } = await ask('claim', 'POST', {
      name, device: deviceLabel(), force,
    });
    if (status === 409) {
      return { state: 'active', device: body.device || '', lastSeen: body.lastSeen || 0 };
    }
    // Anything else — a 400, a 500, a worker with no KV bound — is the
    // service being unusable, and that is one case, not five.
    if (status !== 200) return { state: 'offline' };

    token = body.token;
    serverRev = body.rev;
    leaseUntil = body.until;
    live = true;
    return { state: 'ok', save: body.save, rev: body.rev };
  } catch {
    return { state: 'offline' };
  }
}

// Send the document up. Every call is a trip; nothing is rationed here any
// more, and the caller does not go on until it hears 'ok'.
//
//   'ok' | 'offline'  — stored, or not reached; the caller retries 'offline'
//   'lost'            — somebody else has the name; STOP
export async function pushSave(save) {
  if (!live) return 'offline';

  let result;
  try {
    result = await ask('state', 'PUT', { name: player, token, rev: serverRev, save });
  } catch {
    // The wire, not the lock: the lease is still ours until it lapses, so
    // the retry tries again rather than giving the game away.
    return 'offline';
  }

  if (result.status === 200) {
    serverRev = result.body.rev;
    leaseUntil = result.body.until;
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
        const retry = await pushSave(save);
        if (retry === 'ok') return 'ok';
      }
    }

    live = false;
    return 'lost';
  }

  return 'offline';
}

// IS THE NAME STILL OURS? A read, not a write — which is why it can be asked
// on a clock while the save itself goes up once a run.
//
// It exists because of the button that takes a live lock (`force`): without
// it, a device that has just been displaced keeps playing until its next
// upload, which is a run's worth of minutes. "Takes over" should mean the
// other one stops, and this is what makes it prompt.
//
// A failed read answers TRUE. Not being able to reach the service is not
// evidence of anything, and stopping a game over a hiccup would be worse
// than the lag this exists to remove.
export async function stillOurs() {
  if (!live || !player) return true;
  const there = await peek(player);
  if (!there) return true;
  return there.until === leaseUntil;
}

// The last save, on the way out of the page, plus the lock handed back so
// the other device does not have to wait out the lease.
//
// CALLED WITH NOTHING, it hands the lock back and STORES NOTHING. The worker
// ignores a save whose revision does not match anyway, but not sending it is
// the version that does not depend on the worker being careful.
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
