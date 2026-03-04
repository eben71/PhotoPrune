from __future__ import annotations

from fastapi.testclient import TestClient

from app.api import routes
from app.core import config
from app.engine.schemas import CostEstimate, GroupRepresentativePair, GroupResult, PhotoItemSummary, ScanResult, StageMetrics
from app.main import create_app


def _fake_scan_result() -> ScanResult:
    item = PhotoItemSummary(
        id="item-1",
        createTime="2025-01-01T00:00:00Z",
        filename="IMG_1.jpg",
        mimeType="image/jpeg",
        width=100,
        height=100,
        googlePhotosDeepLink="https://photos.google.com/photo/item-1",
    )
    item2 = PhotoItemSummary(
        id="item-2",
        createTime="2025-01-01T00:00:01Z",
        filename="IMG_2.jpg",
        mimeType="image/jpeg",
        width=100,
        height=100,
        googlePhotosDeepLink="https://photos.google.com/photo/item-2",
    )
    return ScanResult(
        runId="run-1",
        inputCount=2,
        stageMetrics=StageMetrics(timingsMs={"group": 1.0}, counts={"downloads": 2}),
        costEstimate=CostEstimate(totalCost=0.01, downloadCost=0.0, hashCost=0.0, comparisonCost=0.0),
        groupsExact=[
            GroupResult(
                groupId="group-1",
                category="EXACT",
                items=[item, item2],
                representativePair=GroupRepresentativePair(earliest=item, latest=item2),
                moreCount=0,
                explanation="exact",
                googlePhotosDeepLinks=["https://photos.google.com/photo/item-1"],
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


def test_project_scan_persists_groups_and_reviews(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    monkeypatch.setattr("app.api.routes.scan", lambda *_: _fake_scan_result())

    project_id = client.post("/api/projects", json={"name": "Campaign"}).json()["id"]
    scan = client.post(
        f"/api/projects/{project_id}/scan",
        json={"photoItems": [{"id": "item-1", "createTime": "2025-01-01T00:00:00Z"}]},
    )
    assert scan.status_code == 200
    scan_id = scan.json()["projectScanId"]

    results = client.get(f"/api/projects/{project_id}/scans/{scan_id}/results")
    assert results.status_code == 200
    assert results.json()["envelope"]["results"]["summary"]["groupsCount"] == 1
    assert len(results.json()["reviews"]) == 1


def test_review_patch_and_export(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    monkeypatch.setattr("app.api.routes.scan", lambda *_: _fake_scan_result())
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

    exported = client.get(f"/api/projects/{project_id}/export?format=json")
    assert exported.status_code == 200
    assert "group_fingerprint" in exported.text
