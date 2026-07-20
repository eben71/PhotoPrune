from __future__ import annotations

import json
import runpy
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import cast

from fastapi.testclient import TestClient

from app.core import config
from app.main import create_app


def test_pp027_fixture_contract_uses_host_override_and_reports_partial_failures(
    monkeypatch,
):
    repo_root = Path(__file__).resolve().parents[3]
    fixture_path = repo_root / "tests" / "fixtures" / "picker" / "pp027_scan_contract.json"
    server_script = repo_root / "scripts" / "fixture_media_server.py"
    namespace = runpy.run_path(str(server_script))
    handler = cast(type[BaseHTTPRequestHandler], namespace["FixtureHandler"])
    server = HTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    port = server.server_address[1]
    monkeypatch.setenv(
        "SCAN_DOWNLOAD_HOST_OVERRIDES",
        json.dumps({"example.test": f"http://127.0.0.1:{port}"}),
    )
    config.get_settings.cache_clear()
    try:
        payload = json.loads(fixture_path.read_text(encoding="utf-8"))
        response = TestClient(create_app()).post("/api/scan", json=payload)

        assert response.status_code == 200
        result = response.json()
        assert len(result["groupsExact"]) == 1
        assert {item["itemId"] for item in result["failedItems"]} == {
            "pp027-invalid",
            "pp027-failing",
        }
    finally:
        config.get_settings.cache_clear()
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
