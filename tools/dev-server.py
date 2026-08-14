"""Local dev server for Rogulidle.

Plain `python -m http.server` lets the browser cache ES modules, so after
editing src/sim/*.js you can end up testing code you are not actually
running. This serves the repo with caching switched off.

    python tools/dev-server.py [port]

Then open the URL it prints. The port comes from the argument, else $PORT,
else 8139 — the sibling roguidle project uses 8137/8138, so leave those free.
Nothing in the game depends on this file — GitHub Pages serves the repo as-is.
"""

import functools
import http.server
import os
import sys

if len(sys.argv) > 1:
    PORT = int(sys.argv[1])
else:
    PORT = int(os.environ.get("PORT", 8139))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    # Threaded: the single-threaded version stalls when a browser holds one
    # connection open and asks for style.css on another — the page then
    # renders unstyled, which looks like a CSS bug and is not one.
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(("", PORT), handler) as httpd:
        print(f"Rogulidle dev server: http://localhost:{PORT}/run-tests.html")
        httpd.serve_forever()
