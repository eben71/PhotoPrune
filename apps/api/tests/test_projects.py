from __future__ import annotations

from fastapi.testclient import TestClient

from app.api import routes
from app.core import config
from app.engine.schemas import (
    CostEstimate,
    GroupRepresentativePair,
    GroupResult,
    PhotoItemSummary,
    ScanResult,
    StageMetrics,
)
from app.main import create_app


def _fake_scan_result() -> ScanResult:
    return _fake_scan_result_with_ids("item-1", "item-2")


def _fake_scan_result_with_ids(
    first_id: str,
    second_id: str,
    *,
    input_count: int = 2,
) -> ScanResult:
    first = PhotoItemSummary(
        id=first_id,
        createTime="2025-01-01T00:00:00Z",
        filename=f"{first_id}.jpg",
        mimeType="image/jpeg",
        width=100,
        height=100,
        googlePhotosDeepLink=f"https://photos.google.com/photo/{first_id}",
    )
    second = PhotoItemSummary(
        id=second_id,
        createTime="2025-01-01T00:00:01Z",
        filename=f"{second_id}.jpg",
        mimeType="image/jpeg",
        width=100,
        height=100,
        googlePhotosDeepLink=f"https://photos.google.com/photo/{second_id}",
    )
    return ScanResult(
        runId="run-1",
        inputCount=input_count,
        stageMetrics=StageMetrics(timingsMs={"group": 1.0}, counts={"downloads": 2}),
        costEstimate=CostEstimate(
            totalCost=0.01, downloadCost=0.0, hashCost=0.0, comparisonCost=0.0
        ),
        groupsExact=[
            GroupResult(
                groupId="group-1",
                category="EXACT",
                items=[first, second],
                representativePair=GroupRepresentativePair(earliest=first, latest=second),
                moreCount=0,
                explanation="exact",
                googlePhotosDeepLinks=[f"https://photos.google.com/photo/{first_id}"],
            )
        ],
        groupsVerySimilar=[],
        groupsPossiblySimilar=[],
    )


def _client(monkeypatch, tmp_path):
    monkeypatch.setenv("PROJECT_DB_PATH", str(tmp_path / "projects.db"))
    config.get_settings.cache_clear()
    routes.get_project_repo.cache_clear()
    client = TestClient(create_app())
    return client


def test_project_crud(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)

    created = client.post("/api/projects", json={"name": "Trip cleanup"})
    assert created.status_code == 200
    project_id = created.json()["id"]

    listed = client.get("/api/projects")
    assert listed.status_code == 200
    assert listed.json()["projects"][0]["id"] == project_id

    fetched = client.get(f"/api/projects/{project_id}")
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Trip cleanup"
    assert fetched.json()["scope"] == {"type": "picker", "albumIds": []}


def test_project_scope_persists(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)

    project_id = client.post("/api/projects", json={"name": "Trip cleanup"}).json()["id"]
    updated = client.post(
        f"/api/projects/{project_id}/scope",
        json={"type": "album_set", "albumIds": ["album-1", "album-2"]},
    )
    assert updated.status_code == 200
    assert updated.json()["scope"] == {
        "type": "album_set",
        "albumIds": ["album-1", "album-2"],
        "status": "stub",
    }

    fetched = client.get(f"/api/projects/{project_id}")
    assert fetched.status_code == 200
    assert fetched.json()["scope"]["type"] == "album_set"


def test_project_scan_persists_groups_and_reviews(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    monkeypatch.setattr(
        "app.api.routes.run_scan",
        lambda *_args, **_kwargs: _fake_scan_result_with_ids("item-1", "item-2", input_count=3),
    )

    project_id = client.post("/api/projects", json={"name": "Campaign"}).json()["id"]
    scan = client.post(
        f"/api/projects/{project_id}/scan",
        json={
            "photoItems": [
                {"id": "item-1", "createTime": "2025-01-01T00:00:00Z"},
                {"id": "item-2", "createTime": "2025-01-01T00:00:01Z"},
                {"id": "item-3", "createTime": "2025-01-01T00:00:02Z"},
            ]
        },
    )
    assert scan.status_code == 200
    scan_id = scan.json()["projectScanId"]

    results = client.get(f"/api/projects/{project_id}/scans/{scan_id}/results")
    assert results.status_code == 200
    assert results.json()["envelope"]["results"]["summary"]["groupsCount"] == 1
    assert results.json()["envelope"]["run"]["selection"]["requestedCount"] == 3
    assert results.json()["envelope"]["results"]["summary"]["ungroupedItemsCount"] == 1
    assert len(results.json()["reviews"]) == 1


def test_project_scan_results_are_scoped_to_requested_scan(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    scans = [
        _fake_scan_result_with_ids("item-a", "item-b"),
        _fake_scan_result_with_ids("item-c", "item-d"),
    ]

    def _next_scan(*_args, **_kwargs):
        return scans.pop(0)

    monkeypatch.setattr("app.api.routes.run_scan", _next_scan)
    project_id = client.post("/api/projects", json={"name": "Campaign"}).json()["id"]

    first_scan_id = client.post(
        f"/api/projects/{project_id}/scan",
        json={"photoItems": [{"id": "item-a", "createTime": "2025-01-01T00:00:00Z"}]},
    ).json()["projectScanId"]
    client.post(
        f"/api/projects/{project_id}/scan",
        json={"photoItems": [{"id": "item-c", "createTime": "2025-01-01T00:00:00Z"}]},
    )

    first_results = client.get(f"/api/projects/{project_id}/scans/{first_scan_id}/results").json()
    first_item_ids = {
        item["itemId"]
        for group in first_results["envelope"]["results"]["groups"]
        for item in group["items"]
    }

    assert first_item_ids == {"item-a", "item-b"}
    assert first_results["envelope"]["run"]["selection"]["requestedCount"] == 2


def test_review_patch_and_export(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    monkeypatch.setattr("app.api.routes.run_scan", lambda *_args, **_kwargs: _fake_scan_result())
    project_id = client.post("/api/projects", json={"name": "Campaign"}).json()["id"]
    scan_id = client.post(
        f"/api/projects/{project_id}/scan",
        json={"photoItems": [{"id": "item-1", "createTime": "2025-01-01T00:00:00Z"}]},
    ).json()["projectScanId"]

    results = client.get(f"/api/projects/{project_id}/scans/{scan_id}/results").json()
    group_id = results["envelope"]["results"]["groups"][0]["groupId"]

    patched = client.patch(
        f"/api/projects/{project_id}/groups/{group_id}/review",
        json={"state": "DONE", "keepMediaItemId": "item-1"},
    )
    assert patched.status_code == 200
    assert patched.json()["state"] == "DONE"

    exported = client.get(f"/api/projects/{project_id}/export?format=json&scanId={scan_id}")
    assert exported.status_code == 200
    assert "remove_media_item_ids" in exported.text
    assert "DONE" in exported.text


def test_export_defaults_to_latest_scan(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    scans = [
        _fake_scan_result_with_ids("item-a", "item-b"),
        _fake_scan_result_with_ids("item-c", "item-d"),
    ]

    def _next_scan(*_args, **_kwargs):
        return scans.pop(0)

    monkeypatch.setattr("app.api.routes.run_scan", _next_scan)
    project_id = client.post("/api/projects", json={"name": "Campaign"}).json()["id"]

    first_scan_id = client.post(
        f"/api/projects/{project_id}/scan",
        json={"photoItems": [{"id": "item-a", "createTime": "2025-01-01T00:00:00Z"}]},
    ).json()["projectScanId"]
    client.post(
        f"/api/projects/{project_id}/scan",
        json={"photoItems": [{"id": "item-c", "createTime": "2025-01-01T00:00:00Z"}]},
    )

    latest_export = client.get(f"/api/projects/{project_id}/export?format=json")
    assert latest_export.status_code == 200
    assert "item-c" in latest_export.text
    assert "item-a" not in latest_export.text

    first_export = client.get(
        f"/api/projects/{project_id}/export?format=json&scanId={first_scan_id}"
    )
    assert first_export.status_code == 200
    assert "item-a" in first_export.text
