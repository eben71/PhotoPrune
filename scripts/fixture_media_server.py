#!/usr/bin/env python3
from __future__ import annotations

import argparse
import io
import re
from http.server import BaseHTTPRequestHandler, HTTPServer

try:
    from PIL import Image
except ImportError as exc:  # pragma: no cover - runtime guard
    raise SystemExit("Pillow is required. Install API dev deps before running.") from exc


MEDIA_RE = re.compile(r"^/media/(?P<fixture>[a-z0-9_]+)\.picker-(?P<item_id>\d+)$")
PAIR_SEEDS = {
    "exact_dupes": {
        1: 1,
        12: 1,
        2: 2,
        9: 2,
        3: 3,
        8: 3,
        4: 4,
        11: 4,
        5: 5,
        10: 5,
        6: 6,
        7: 6,
    }
}


def _generate_png_bytes(seed: int) -> bytes:
    size = 64
    base = (seed * 37) % 256
    img = Image.new("L", (size, size), color=base)
    pixels = img.load()
    for x in range(0, size, 4):
        for y in range(0, size, 4):
            pixels[x, y] = (base + x + y) % 256
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


class FixtureHandler(BaseHTTPRequestHandler):
    server_version = "PhotoPruneFixture/1.0"
    _cache: dict[int, bytes] = {}

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler signature
        match = MEDIA_RE.match(self.path)
        if not match:
            self.send_error(404)
            return
        fixture = match.group("fixture")
        item_id = int(match.group("item_id"))
        fixture_pairs = PAIR_SEEDS.get(fixture, {})
        seed = fixture_pairs.get(item_id, item_id)
        payload = self._cache.get(seed)
        if payload is None:
            payload = _generate_png_bytes(seed)
            self._cache[seed] = payload
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        return


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve local fixture images for picker tests.")
    parser.add_argument("--bind", default="127.0.0.1", help="Bind address.")
    parser.add_argument("--port", type=int, default=8001, help="Port to listen on.")
    args = parser.parse_args()

    server = HTTPServer((args.bind, args.port), FixtureHandler)
    print(f"Fixture server listening on http://{args.bind}:{args.port}")
    print("Set SCAN_DOWNLOAD_HOST_OVERRIDES=example.test:http://127.0.0.1:8001")
    print("Then run the fixture curl in tests/fixtures/picker/README.md")
    server.serve_forever()


if __name__ == "__main__":
    main()
