// ONE TAB PER BROWSER, and it is a different lock from the one the service
// lends out.
//
// The service already refuses a second device, and a second TAB looks like a
// second device to it, so the ordinary case was covered: open the game twice
// and the second one is told the name is taken. What that lock cannot cover
// is the case where it is not there — with no network, both tabs fail to
// claim, both play locally, and both write the same save. Neither corrupts
// the other's fields (each writes the whole document from its own copy), but
// they take turns overwriting: the history strip and the run counter flip
// between two different sessions, and whichever uploads first when the
// network returns erases the other without saying so.
//
// So this one is local, and it is the browser's own: `navigator.locks` hands
// out an exclusive lock per origin and takes it back BY ITSELF when the tab
// that holds it goes away. No deadline, no heartbeat, no key in storage, and
// nothing to clean up after a crash — which is why it is ten lines and the
// service's lock is a whole file.
//
// NOT TESTABLE FROM THE SUITE, and the reason is worth stating: a real
// second holder needs a second browsing context, which `test/tests.js` has
// no way to make. Two tabs, by hand, is the check.

const LOCK = 'rogulidle-tab';

// True when this tab may run. Held for as long as the page lives — the
// callback below never settles on purpose, which is how the Web Locks API
// says "keep it until I am gone".
//
// A browser without the API gets TRUE. Refusing to run would be trading a
// rare mess for a certain one, and the game worked this way for its whole
// life until now.
export function claimTab() {
  if (typeof navigator === 'undefined' || !navigator.locks) return Promise.resolve(true);

  return new Promise((resolve) => {
    navigator.locks.request(LOCK, { ifAvailable: true }, (lock) => {
      if (!lock) {
        resolve(false);
        return undefined;
      }
      resolve(true);
      // Never settles: the lock is released when this page is.
      return new Promise(() => {});
    }).catch(() => resolve(true));
  });
}
