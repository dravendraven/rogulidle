// The clock the spectator runs on, and the one reason it is not setTimeout.
//
// Everything the page paces goes through `sleep()`: the delay between frames,
// the shop's thirty seconds, the summary card, the coin popup, the loop that
// waits out a pause. One primitive, so there is one place to get this right.
//
// A browser clamps `setTimeout` in a tab you are not looking at — once a
// second while hidden, and in Chrome once a MINUTE after five minutes hidden.
// For a game whose whole premise is that it keeps playing while you do
// something else, that is not a slowdown, it is the product failing quietly
// and without a message. Measured with `tools/timer-probe.html`, which runs
// both sources in one page and counts only the ticks that land while the tab
// is hidden: `setTimeout` got 1.11 calls per second where 9.09 were asked
// for, the same interval inside a Worker got all 9.09, worst gap a tenth of
// a second.
//
// The clamp is on TIMERS. A worker's message is not a timer, so the worker
// keeps time and the page only answers the phone. Nothing else changes: the
// game is paced exactly as before, and a visible tab cannot tell the
// difference.
//
// What this does NOT survive is the browser freezing or discarding the page
// outright — Chrome's Memory/Energy Saver, or a phone putting the browser to
// sleep. Nothing in the page runs then, workers included, and the only answer
// to that is the game noticing the lost time and catching up on return. That
// is a different change, with a cost of its own, and `decisions.md` says why
// it was not made here.

// One timer per sleep, held by the worker, which posts the id back when it is
// due. Nothing ticks between sleeps.
const WORKER_SOURCE =
  'onmessage = (e) => setTimeout(() => postMessage(e.data.id), e.data.ms);';

let worker = null;      // null: not tried yet. false: unavailable, use timers.
let nextId = 1;
const pending = new Map();

function startWorker() {
  const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
  const w = new Worker(url);
  w.onmessage = (e) => {
    const resolve = pending.get(e.data);
    if (!resolve) return;
    pending.delete(e.data);
    resolve();
  };
  // A worker that fails to start must not take the game down with it: the
  // loop is a chain of awaited sleeps, so one that never resolves is a frozen
  // page. Release whatever is already waiting and fall back for good.
  w.onerror = () => {
    worker = false;
    const waiting = [...pending.values()];
    pending.clear();
    for (const resolve of waiting) resolve();
  };
  return w;
}

// Resolves after `ms`, same as it always did.
export function sleep(ms) {
  if (worker === null) {
    // A blob worker is blocked on `file://` and by some content policies.
    // There the game still runs, just throttled in the background — which is
    // exactly what it did before this file existed.
    try {
      worker = startWorker();
    } catch {
      worker = false;
    }
  }
  if (!worker) return new Promise((resolve) => setTimeout(resolve, ms));
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    worker.postMessage({ id, ms });
  });
}

// For the probe and for tests: which source is actually keeping time.
export function clockSource() {
  return worker ? 'worker' : (worker === false ? 'timeout' : 'unstarted');
}
