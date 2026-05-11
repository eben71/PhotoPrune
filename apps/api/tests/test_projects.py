from __future__ import annotations

import json
import sqlite3

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


def _fake_scan_result_with_group_ids(*ids: str) -> ScanResult:
    summaries = [
        PhotoItemSummary(
            id=item_id,
            createTime=f"2025-01-01T00:00:0{index}Z",
            filename=f"{item_id}.jpg",
            mimeType="image/jpeg",
            width=100,
            height=100,
            googlePhotosDeepLink=f"https://photos.google.com/photo/{item_id}",
        )
        for index, item_id in enumerate(ids)
    ]
    return ScanResult(
        runId=f"run-{'-'.join(ids)}",
        inputCount=len(ids),
        stageMetrics=StageMetrics(timingsMs={"group": 1.0}, counts={"downloads": len(ids)}),
        costEstimate=CostEstimate(
            totalCost=0.01, downloadCost=0.0, hashCost=0.0, comparisonCost=0.0
        ),
        groupsExact=[
            GroupResult(
                groupId=f"group-{'-'.join(ids)}",
                category="EXACT",
                items=summaries,
                representativePair=GroupRepresentativePair(
                    earliest=summaries[0], latest=summaries[-1]
                ),
                moreCount=max(0, len(summaries) - 2),
                explanation="exact",
                googlePhotosDeepLinks=[
                    f"https://photos.google.com/photo/{item_id}" for item_id in ids
                ],
            )
        ],
        groupsVerySimilar=[],
        groupsPossiblySimilar=[],
    )


def _photo_payloads(*ids: str) -> list[dict[str, str]]:
    return [
        {
            "id": item_id,
            "createTime": f"2025-01-01T00:00:0{index}Z",
            "filename": f"{item_id}.jpg",
            "mimeType": "image/jpeg",
        }
        for index, item_id in enumerate(ids)
    ]


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
        "mediaItemIds": [],
        "status": "ready",
    }

    fetched = client.get(f"/api/projects/{project_id}")
    assert fetched.status_code == 200
    assert fetched.json()["scope"]["type"] == "album_set"

    fetched_scope = client.get(f"/api/projects/{project_id}/scope")
    assert fetched_scope.status_code == 200
    assert fetched_scope.json()["scope"]["albumIds"] == ["album-1", "album-2"]


def test_album_set_scan_accepts_media_items(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    monkeypatch.setattr("app.api.routes.run_scan", lambda *_args, **_kwargs: _fake_scan_result())
    project_id = client.post("/api/projects", json={"name": "Album cleanup"}).json()["id"]
    client.post(
        f"/api/projects/{project_id}/scope",
        json={"type": "album_set", "albumIds": ["album-1"], "mediaItemIds": ["item-1", "item-2"]},
    )
    scan = client.post(
        f"/api/projects/{project_id}/scan",
        json={
            "sourceType": "album_set",
            "sourceRef": {
                "type": "album_set",
                "albumIds": ["album-1"],
                "mediaItems": _photo_payloads("item-1", "item-2"),
            },
        },
    )
    assert scan.status_code == 200


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


def test_scan_diff_preserves_reviewed_unchanged_groups(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    scans = [
        _fake_scan_result_with_group_ids("item-a", "item-b"),
        _fake_scan_result_with_group_ids("item-a", "item-b"),
    ]

    def _next_scan(*_args, **_kwargs):
        return scans.pop(0)

    monkeypatch.setattr("app.api.routes.run_scan", _next_scan)
    project_id = client.post("/api/projects", json={"name": "Campaign"}).json()["id"]
    first_scan_id = client.post(
        f"/api/projects/{project_id}/scan",
        json={"photoItems": _photo_payloads("item-a", "item-b")},
    ).json()["projectScanId"]
    first_results = client.get(f"/api/projects/{project_id}/scans/{first_scan_id}/results").json()
    group_id = first_results["envelope"]["results"]["groups"][0]["groupId"]
    client.patch(
        f"/api/projects/{project_id}/groups/{group_id}/review",
        json={"state": "DONE", "keepMediaItemId": "item-a"},
    )

    second_scan_id = client.post(
        f"/api/projects/{project_id}/scan",
        json={"photoItems": _photo_payloads("item-a", "item-b")},
    ).json()["projectScanId"]

    diff = client.get(f"/api/projects/{project_id}/scans/{second_scan_id}/diff")
    assert diff.status_code == 200
    assert diff.json()["summary"]["unchanged"] == 1
    assert diff.json()["summary"]["previouslyReviewedUnchanged"] == 1
    assert diff.json()["summary"]["requiresReview"] == 0
    assert diff.json()["groups"][0]["category"] == "UNCHANGED"
    assert diff.json()["groups"][0]["priorReviewStatePreserved"] is True

    second_results = client.get(f"/api/projects/{project_id}/scans/{second_scan_id}/results").json()
    assert second_results["reviews"][group_id]["state"] == "DONE"


def test_scan_diff_marks_changed_groups_for_review(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    scans = [
        _fake_scan_result_with_group_ids("item-a", "item-b"),
        _fake_scan_result_with_group_ids("item-a", "item-b", "item-c"),
    ]

    def _next_scan(*_args, **_kwargs):
        return scans.pop(0)

    monkeypatch.setattr("app.api.routes.run_scan", _next_scan)
    project_id = client.post("/api/projects", json={"name": "Campaign"}).json()["id"]
    first_scan_id = client.post(
        f"/api/projects/{project_id}/scan",
        json={"photoItems": _photo_payloads("item-a", "item-b")},
    ).json()["projectScanId"]
    first_results = client.get(f"/api/projects/{project_id}/scans/{first_scan_id}/results").json()
    first_group_id = first_results["envelope"]["results"]["groups"][0]["groupId"]
    client.patch(
        f"/api/projects/{project_id}/groups/{first_group_id}/review",
        json={"state": "DONE", "keepMediaItemId": "item-a"},
    )

    second_scan_id = client.post(
        f"/api/projects/{project_id}/scan",
        json={"photoItems": _photo_payloads("item-a", "item-b", "item-c")},
    ).json()["projectScanId"]

    diff = client.get(f"/api/projects/{project_id}/scans/{second_scan_id}/diff")
    assert diff.status_code == 200
    assert diff.json()["summary"]["changed"] == 1
    assert diff.json()["summary"]["requiresReview"] == 1
    assert diff.json()["groups"][0]["category"] == "CHANGED"
    assert diff.json()["groups"][0]["priorReviewStatePreserved"] is False
    assert diff.json()["groups"][0]["previousGroupFingerprint"] == first_group_id

    second_results = client.get(f"/api/projects/{project_id}/scans/{second_scan_id}/results").json()
    second_group_id = second_results["envelope"]["results"]["groups"][0]["groupId"]
    assert second_group_id != first_group_id
    assert second_results["reviews"][second_group_id]["state"] == "UNREVIEWED"


def test_scan_diff_marks_first_scan_groups_as_new(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    monkeypatch.setattr(
        "app.api.routes.run_scan",
        lambda *_args, **_kwargs: _fake_scan_result_with_group_ids("item-a", "item-b"),
    )
    project_id = client.post("/api/projects", json={"name": "Campaign"}).json()["id"]
    scan_id = client.post(
        f"/api/projects/{project_id}/scan",
        json={"photoItems": _photo_payloads("item-a", "item-b")},
    ).json()["projectScanId"]

    diff = client.get(f"/api/projects/{project_id}/scans/{scan_id}/diff")

    assert diff.status_code == 200
    assert diff.json()["previousProjectScanId"] is None
    assert diff.json()["summary"]["new"] == 1
    assert diff.json()["groups"][0]["category"] == "NEW"


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


def test_export_rejects_scan_from_another_project(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    monkeypatch.setattr(
        "app.api.routes.run_scan",
        lambda *_args, **_kwargs: _fake_scan_result_with_ids("item-a", "item-b"),
    )
    first_project_id = client.post("/api/projects", json={"name": "First"}).json()["id"]
    second_project_id = client.post("/api/projects", json={"name": "Second"}).json()["id"]
    first_scan_id = client.post(
        f"/api/projects/{first_project_id}/scan",
        json={"photoItems": [{"id": "item-a", "createTime": "2025-01-01T00:00:00Z"}]},
    ).json()["projectScanId"]

    exported = client.get(
        f"/api/projects/{second_project_id}/export?format=json&scanId={first_scan_id}"
    )

    assert exported.status_code == 200
    assert exported.json() == []


def test_export_rejects_unsupported_format(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    project_id = client.post("/api/projects", json={"name": "Campaign"}).json()["id"]

    exported = client.get(f"/api/projects/{project_id}/export?format=xml")

    assert exported.status_code == 400
    assert exported.json()["detail"] == "format must be one of: json, csv"


def test_scan_results_legacy_count_fallback_uses_scan_items(monkeypatch, tmp_path):
    db_path = tmp_path / "projects.db"
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
        json={
            "photoItems": [
                {"id": "item-a", "createTime": "2025-01-01T00:00:00Z"},
                {"id": "item-b", "createTime": "2025-01-01T00:00:01Z"},
            ]
        },
    ).json()["projectScanId"]
    client.post(
        f"/api/projects/{project_id}/scan",
        json={
            "photoItems": [
                {"id": "item-c", "createTime": "2025-01-01T00:00:00Z"},
                {"id": "item-d", "createTime": "2025-01-01T00:00:01Z"},
            ]
        },
    )

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            "SELECT metrics FROM project_scans WHERE id = ?",
            (first_scan_id,),
        ).fetchone()
        metrics = json.loads(row[0])
        metrics.pop("inputCount")
        conn.execute(
            "UPDATE project_scans SET metrics = ? WHERE id = ?",
            (json.dumps(metrics), first_scan_id),
        )

    first_results = client.get(f"/api/projects/{project_id}/scans/{first_scan_id}/results")

    assert first_results.status_code == 200
    assert first_results.json()["envelope"]["run"]["selection"]["requestedCount"] == 2


def test_album_set_scan_accepts_source_ref_media_items_without_top_level_payload(
    monkeypatch, tmp_path
):
    client = _client(monkeypatch, tmp_path)
    seen_item_ids: list[list[str]] = []

    def _scan(items, *_args, **_kwargs):
        seen_item_ids.append([item.id for item in items])
        return _fake_scan_result_with_ids("item-1", "item-2", input_count=len(items))

    monkeypatch.setattr("app.api.routes.run_scan", _scan)
    project_id = client.post("/api/projects", json={"name": "Album cleanup"}).json()["id"]
    client.post(
        f"/api/projects/{project_id}/scope",
        json={"type": "album_set", "albumIds": ["album-1"]},
    )

    scan = client.post(
        f"/api/projects/{project_id}/scan",
        json={
            "sourceType": "album_set",
            "sourceRef": {
                "type": "album_set",
                "albumIds": ["album-1"],
                "mediaItems": _photo_payloads("item-1", "item-2"),
            },
        },
    )

    assert scan.status_code == 200
    assert seen_item_ids == [["item-1", "item-2"]]


def test_album_set_scan_resumes_from_persisted_scope_token(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    seen_item_ids: list[list[str]] = []

    def _scan(items, *_args, **_kwargs):
        seen_item_ids.append([item.id for item in items])
        return _fake_scan_result_with_ids(items[0].id, items[0].id, input_count=len(items))

    monkeypatch.setattr("app.api.routes.run_scan", _scan)
    project_id = client.post("/api/projects", json={"name": "Album cleanup"}).json()["id"]
    client.post(
        f"/api/projects/{project_id}/scope",
        json={"type": "album_set", "albumIds": ["album-1"]},
    )
    source_ref = {
        "type": "album_set",
        "albumIds": ["album-1"],
        "pageLimit": 1,
        "pagedMediaItems": [
            {"items": _photo_payloads("item-1")},
            {"items": _photo_payloads("item-2")},
        ],
    }

    first_scan = client.post(
        f"/api/projects/{project_id}/scan",
        json={"sourceType": "album_set", "sourceRef": source_ref},
    )
    assert first_scan.status_code == 200
    assert first_scan.json()["envelope"]["run"]["status"] == "PARTIAL"
    assert client.get(f"/api/projects/{project_id}/scope").json()["scope"]["resumeToken"] == "1"

    resumed_scan = client.post(
        f"/api/projects/{project_id}/scan",
        json={"sourceType": "album_set", "sourceRef": source_ref, "resume": True},
    )

    assert resumed_scan.status_code == 200
    assert seen_item_ids == [["item-1"], ["item-2"]]
    assert "resumeToken" not in client.get(f"/api/projects/{project_id}/scope").json()["scope"]


def test_album_set_scan_rejects_invalid_source_ref_media_items(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    run_scan_called = False

    def _scan(*_args, **_kwargs):
        nonlocal run_scan_called
        run_scan_called = True
        return _fake_scan_result()

    monkeypatch.setattr("app.api.routes.run_scan", _scan)
    project_id = client.post("/api/projects", json={"name": "Album cleanup"}).json()["id"]

    scan = client.post(
        f"/api/projects/{project_id}/scan",
        json={
            "sourceType": "album_set",
            "sourceRef": {
                "type": "album_set",
                "albumIds": ["album-1"],
                "mediaItems": [{"id": "bad"}],
            },
        },
    )

    assert scan.status_code == 422
    assert run_scan_called is False
    assert scan.json()["detail"][0]["loc"] == ["photoItems", 0, "createTime"]


def test_album_set_scan_rejects_invalid_source_ref_paged_media_items(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    run_scan_called = False

    def _scan(*_args, **_kwargs):
        nonlocal run_scan_called
        run_scan_called = True
        return _fake_scan_result()

    monkeypatch.setattr("app.api.routes.run_scan", _scan)
    project_id = client.post("/api/projects", json={"name": "Album cleanup"}).json()["id"]

    scan = client.post(
        f"/api/projects/{project_id}/scan",
        json={
            "sourceType": "album_set",
            "sourceRef": {
                "type": "album_set",
                "albumIds": ["album-1"],
                "pagedMediaItems": [{"items": [{"id": "bad"}]}],
            },
        },
    )

    assert scan.status_code == 422
    assert run_scan_called is False
    assert scan.json()["detail"][0]["loc"] == ["photoItems", 0, "createTime"]


def test_album_set_scan_retries_rate_limited_pages_and_dedupes_items(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    seen_item_ids: list[list[str]] = []

    def _scan(items, *_args, **_kwargs):
        seen_item_ids.append([item.id for item in items])
        return _fake_scan_result_with_ids(items[0].id, items[-1].id, input_count=len(items))

    monkeypatch.setattr("app.api.routes.run_scan", _scan)
    project_id = client.post("/api/projects", json={"name": "Large album"}).json()["id"]
    client.post(
        f"/api/projects/{project_id}/scope",
        json={"type": "album_set", "albumIds": ["album-1"]},
    )

    scan = client.post(
        f"/api/projects/{project_id}/scan",
        json={
            "sourceType": "album_set",
            "sourceRef": {
                "type": "album_set",
                "albumIds": ["album-1"],
                "maxRetryAttempts": 3,
                "pagedMediaItems": [
                    {"items": _photo_payloads("item-1")},
                    {
                        "errorStatus": 429,
                        "failuresBeforeSuccess": 2,
                        "retryAfterSeconds": 0,
                        "items": _photo_payloads("item-2", "item-1"),
                    },
                    {"items": _photo_payloads("item-3")},
                ],
            },
        },
    )

    assert scan.status_code == 200
    assert seen_item_ids == [["item-1", "item-2", "item-3"]]
    assert "resumeToken" not in client.get(f"/api/projects/{project_id}/scope").json()["scope"]

    with sqlite3.connect(tmp_path / "projects.db") as conn:
        item_count = conn.execute(
            "SELECT COUNT(*) FROM project_items WHERE project_id = ?",
            (project_id,),
        ).fetchone()[0]
    assert item_count == 3


def test_album_set_scan_checkpoints_partial_failure_and_resumes(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    seen_item_ids: list[list[str]] = []

    def _scan(items, *_args, **_kwargs):
        seen_item_ids.append([item.id for item in items])
        return _fake_scan_result_with_ids(items[0].id, items[-1].id, input_count=len(items))

    monkeypatch.setattr("app.api.routes.run_scan", _scan)
    project_id = client.post("/api/projects", json={"name": "Interrupted album"}).json()["id"]
    client.post(
        f"/api/projects/{project_id}/scope",
        json={"type": "album_set", "albumIds": ["album-1"]},
    )
    interrupted_source = {
        "type": "album_set",
        "albumIds": ["album-1"],
        "maxRetryAttempts": 2,
        "pagedMediaItems": [
            {"items": _photo_payloads("item-1")},
            {"errorStatus": 503, "items": _photo_payloads("item-2")},
            {"items": _photo_payloads("item-3")},
        ],
    }

    first_scan = client.post(
        f"/api/projects/{project_id}/scan",
        json={"sourceType": "album_set", "sourceRef": interrupted_source},
    )

    assert first_scan.status_code == 200
    assert first_scan.json()["envelope"]["run"]["status"] == "PARTIAL"
    assert seen_item_ids == [["item-1"]]
    assert client.get(f"/api/projects/{project_id}/scope").json()["scope"]["resumeToken"] == "1"

    resumed_source = {
        **interrupted_source,
        "pagedMediaItems": [
            {"items": _photo_payloads("item-1")},
            {"items": _photo_payloads("item-2")},
            {"items": _photo_payloads("item-3")},
        ],
    }
    resumed_scan = client.post(
        f"/api/projects/{project_id}/scan",
        json={"sourceType": "album_set", "sourceRef": resumed_source, "resume": True},
    )

    assert resumed_scan.status_code == 200
    assert seen_item_ids == [["item-1"], ["item-2", "item-3"]]
    assert "resumeToken" not in client.get(f"/api/projects/{project_id}/scope").json()["scope"]

    with sqlite3.connect(tmp_path / "projects.db") as conn:
        item_count = conn.execute(
            "SELECT COUNT(*) FROM project_items WHERE project_id = ?",
            (project_id,),
        ).fetchone()[0]
    assert item_count == 3


def test_album_set_scan_persists_checkpoint_when_first_page_is_rate_limited(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    run_scan_called = False

    def _scan(*_args, **_kwargs):
        nonlocal run_scan_called
        run_scan_called = True
        return _fake_scan_result()

    monkeypatch.setattr("app.api.routes.run_scan", _scan)
    project_id = client.post("/api/projects", json={"name": "Rate limited album"}).json()["id"]
    client.post(
        f"/api/projects/{project_id}/scope",
        json={"type": "album_set", "albumIds": ["album-1"]},
    )

    scan = client.post(
        f"/api/projects/{project_id}/scan",
        json={
            "sourceType": "album_set",
            "sourceRef": {
                "type": "album_set",
                "albumIds": ["album-1"],
                "maxRetryAttempts": 1,
                "pagedMediaItems": [{"errorStatus": 429, "items": _photo_payloads("item-1")}],
            },
        },
    )

    assert scan.status_code == 503
    assert run_scan_called is False
    assert client.get(f"/api/projects/{project_id}/scope").json()["scope"]["resumeToken"] == "0"


def test_large_album_rescans_diff_new_changed_and_unchanged_groups(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path)
    scans = [
        _scan_result_for_groups(
            ["keep-a", "keep-b"],
            ["changed-a", "changed-b"],
            ["old-a", "old-b"],
            input_count=300,
        ),
        _scan_result_for_groups(
            ["keep-a", "keep-b"],
            ["changed-a", "changed-b", "changed-c"],
            ["new-a", "new-b"],
            input_count=302,
        ),
    ]

    def _next_scan(*_args, **_kwargs):
        return scans.pop(0)

    monkeypatch.setattr("app.api.routes.run_scan", _next_scan)
    project_id = client.post("/api/projects", json={"name": "Large recurring album"}).json()["id"]
    client.post(
        f"/api/projects/{project_id}/scope",
        json={"type": "album_set", "albumIds": ["album-1"]},
    )
    first_source = _large_album_source("album-1", 300)
    second_source = _large_album_source("album-1", 302)

    first_scan_id = client.post(
        f"/api/projects/{project_id}/scan",
        json={"sourceType": "album_set", "sourceRef": first_source},
    ).json()["projectScanId"]
    first_results = client.get(f"/api/projects/{project_id}/scans/{first_scan_id}/results").json()
    unchanged_group_id = first_results["envelope"]["results"]["groups"][0]["groupId"]
    client.patch(
        f"/api/projects/{project_id}/groups/{unchanged_group_id}/review",
        json={"state": "DONE", "keepMediaItemId": "keep-a"},
    )

    second_scan_id = client.post(
        f"/api/projects/{project_id}/scan",
        json={"sourceType": "album_set", "sourceRef": second_source},
    ).json()["projectScanId"]

    diff = client.get(f"/api/projects/{project_id}/scans/{second_scan_id}/diff")
    assert diff.status_code == 200
    assert diff.json()["summary"]["unchanged"] == 1
    assert diff.json()["summary"]["changed"] == 1
    assert diff.json()["summary"]["new"] == 1
    assert diff.json()["summary"]["previouslyReviewedUnchanged"] == 1
    assert diff.json()["summary"]["requiresReview"] == 2
    by_category = {group["category"]: group for group in diff.json()["groups"]}
    assert by_category["UNCHANGED"]["priorReviewStatePreserved"] is True
    assert by_category["UNCHANGED"]["reviewState"] == "DONE"
    assert by_category["CHANGED"]["requiresReview"] is True
    assert by_category["NEW"]["requiresReview"] is True


def _scan_result_for_groups(*groups: list[str], input_count: int) -> ScanResult:
    results = []
    for group_index, ids in enumerate(groups):
        summaries = [
            PhotoItemSummary(
                id=item_id,
                createTime=f"2025-01-01T00:{group_index:02d}:{item_index:02d}Z",
                filename=f"{item_id}.jpg",
                mimeType="image/jpeg",
                width=100,
                height=100,
                googlePhotosDeepLink=f"https://photos.google.com/photo/{item_id}",
            )
            for item_index, item_id in enumerate(ids)
        ]
        results.append(
            GroupResult(
                groupId=f"group-{group_index}",
                category="EXACT",
                items=summaries,
                representativePair=GroupRepresentativePair(
                    earliest=summaries[0], latest=summaries[-1]
                ),
                moreCount=max(0, len(summaries) - 2),
                explanation="exact",
                googlePhotosDeepLinks=[
                    f"https://photos.google.com/photo/{item_id}" for item_id in ids
                ],
            )
        )
    return ScanResult(
        runId=f"run-{input_count}",
        inputCount=input_count,
        stageMetrics=StageMetrics(timingsMs={"group": 1.0}, counts={"downloads": input_count}),
        costEstimate=CostEstimate(
            totalCost=0.01, downloadCost=0.0, hashCost=0.0, comparisonCost=0.0
        ),
        groupsExact=results,
        groupsVerySimilar=[],
        groupsPossiblySimilar=[],
    )


def _large_album_source(album_id: str, count: int) -> dict[str, object]:
    return {
        "type": "album_set",
        "albumIds": [album_id],
        "pagedMediaItems": [
            {
                "items": [
                    {
                        "id": f"large-{item_index}",
                        "createTime": "2025-01-01T00:00:00Z",
                        "filename": f"large-{item_index}.jpg",
                        "mimeType": "image/jpeg",
                    }
                    for item_index in range(index, min(index + 25, count))
                ]
            }
            for index in range(0, count, 25)
        ],
    }
