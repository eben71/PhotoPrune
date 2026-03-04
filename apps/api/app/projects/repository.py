from __future__ import annotations

import csv
import hashlib
import io
import json
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterator
from uuid import uuid4

from app.engine.schemas import GroupResult, ScanResult
from app.projects.schemas import ProjectGroupReviewPatch


class ProjectRepository:
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    @contextmanager
    def _conn(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_db(self) -> None:
        with self._conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS project_scans (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    source_type TEXT NOT NULL,
                    source_ref TEXT NOT NULL,
                    scan_envelope_version TEXT NOT NULL,
                    metrics TEXT NOT NULL,
                    FOREIGN KEY(project_id) REFERENCES projects(id)
                );
                CREATE TABLE IF NOT EXISTS project_items (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    google_media_item_id TEXT NOT NULL,
                    product_url TEXT,
                    deep_link TEXT,
                    create_time TEXT,
                    filename TEXT,
                    mime_type TEXT,
                    width INTEGER,
                    height INTEGER,
                    fingerprints TEXT,
                    first_seen_at TEXT NOT NULL,
                    UNIQUE(project_id, google_media_item_id),
                    FOREIGN KEY(project_id) REFERENCES projects(id)
                );
                CREATE TABLE IF NOT EXISTS project_groups (
                    id TEXT PRIMARY KEY,
                    project_scan_id TEXT NOT NULL,
                    group_fingerprint TEXT NOT NULL,
                    confidence_band TEXT NOT NULL,
                    reason_codes TEXT NOT NULL,
                    representative_media_item_id TEXT NOT NULL,
                    member_media_item_ids TEXT NOT NULL,
                    FOREIGN KEY(project_scan_id) REFERENCES project_scans(id)
                );
                CREATE TABLE IF NOT EXISTS project_group_reviews (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    group_fingerprint TEXT NOT NULL,
                    state TEXT NOT NULL,
                    keep_media_item_id TEXT,
                    notes TEXT,
                    updated_at TEXT NOT NULL,
                    resolved_at TEXT,
                    UNIQUE(project_id, group_fingerprint),
                    FOREIGN KEY(project_id) REFERENCES projects(id)
                );
                """
            )

    def create_project(self, name: str, user_id: str = "local-user") -> dict[str, Any]:
        now = _now_iso()
        project = {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": name,
            "status": "active",
            "created_at": now,
            "updated_at": now,
        }
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO projects (id, user_id, name, status, created_at, updated_at)
                VALUES (:id, :user_id, :name, :status, :created_at, :updated_at)
                """,
                project,
            )
        return project

    def list_projects(self) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM projects ORDER BY updated_at DESC"
            ).fetchall()
        return [dict(row) for row in rows]

    def get_project(self, project_id: str) -> dict[str, Any] | None:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        return dict(row) if row else None

    def create_scan(
        self,
        project_id: str,
        source_type: str,
        source_ref: dict[str, Any],
        envelope: dict[str, Any],
        scan_result: ScanResult,
    ) -> str:
        scan_id = str(uuid4())
        now = _now_iso()
        metrics = {
            "timingsMs": scan_result.stage_metrics.timings_ms,
            "counts": scan_result.stage_metrics.counts,
            "cost": scan_result.cost_estimate.model_dump(by_alias=True),
        }
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO project_scans (id, project_id, created_at, source_type, source_ref,
                    scan_envelope_version, metrics)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    scan_id,
                    project_id,
                    now,
                    source_type,
                    json.dumps(source_ref),
                    str(envelope.get("schemaVersion", "2.2.0")),
                    json.dumps(metrics),
                ),
            )
            conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now, project_id))

            items = envelope.get("results", {}).get("groups", [])
            for group in items:
                for item in group.get("items", []):
                    conn.execute(
                        """
                        INSERT INTO project_items (
                            id, project_id, google_media_item_id, product_url, deep_link, create_time,
                            filename, mime_type, width, height, fingerprints, first_seen_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(project_id, google_media_item_id) DO UPDATE SET
                            product_url=excluded.product_url,
                            deep_link=excluded.deep_link,
                            filename=COALESCE(excluded.filename, project_items.filename),
                            mime_type=COALESCE(excluded.mime_type, project_items.mime_type),
                            width=COALESCE(excluded.width, project_items.width),
                            height=COALESCE(excluded.height, project_items.height)
                        """,
                        (
                            str(uuid4()),
                            project_id,
                            item["itemId"],
                            item.get("links", {}).get("googlePhotos", {}).get("url"),
                            item.get("links", {}).get("googlePhotos", {}).get("url")
                            or item.get("links", {}).get("googlePhotos", {}).get("fallbackUrl"),
                            item.get("createTime"),
                            item.get("filename"),
                            item.get("mimeType"),
                            item.get("dimensions", {}).get("width"),
                            item.get("dimensions", {}).get("height"),
                            None,
                            now,
                        ),
                    )

            for group in _group_rows(scan_id, scan_result):
                conn.execute(
                    """
                    INSERT INTO project_groups (
                        id, project_scan_id, group_fingerprint, confidence_band, reason_codes,
                        representative_media_item_id, member_media_item_ids
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid4()),
                        scan_id,
                        group["group_fingerprint"],
                        group["confidence_band"],
                        json.dumps(group["reason_codes"]),
                        group["representative_media_item_id"],
                        json.dumps(group["member_media_item_ids"]),
                    ),
                )
                conn.execute(
                    """
                    INSERT INTO project_group_reviews (
                        id, project_id, group_fingerprint, state, keep_media_item_id, notes, updated_at, resolved_at
                    ) VALUES (?, ?, ?, 'UNREVIEWED', NULL, NULL, ?, NULL)
                    ON CONFLICT(project_id, group_fingerprint) DO NOTHING
                    """,
                    (str(uuid4()), project_id, group["group_fingerprint"], now),
                )
        return scan_id

    def list_scans(self, project_id: str) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT id, project_id, created_at, source_type, source_ref FROM project_scans WHERE project_id = ? ORDER BY created_at DESC",
                (project_id,),
            ).fetchall()
        return [
            {
                "id": row["id"],
                "project_id": row["project_id"],
                "created_at": row["created_at"],
                "source_type": row["source_type"],
                "source_ref": json.loads(row["source_ref"]),
            }
            for row in rows
        ]

    def get_scan_results(self, project_id: str, scan_id: str) -> tuple[dict[str, Any], dict[str, Any]] | None:
        with self._conn() as conn:
            scan_row = conn.execute(
                "SELECT metrics, scan_envelope_version FROM project_scans WHERE id = ? AND project_id = ?",
                (scan_id, project_id),
            ).fetchone()
            if not scan_row:
                return None
            groups = conn.execute(
                "SELECT group_fingerprint, confidence_band, reason_codes, representative_media_item_id, member_media_item_ids FROM project_groups WHERE project_scan_id = ?",
                (scan_id,),
            ).fetchall()
            review_rows = conn.execute(
                "SELECT * FROM project_group_reviews WHERE project_id = ?",
                (project_id,),
            ).fetchall()
            item_rows = conn.execute(
                "SELECT google_media_item_id, deep_link, filename, mime_type, create_time, width, height FROM project_items WHERE project_id = ?",
                (project_id,),
            ).fetchall()

        item_map = {row["google_media_item_id"]: dict(row) for row in item_rows}
        envelope_groups = []
        for index, row in enumerate(groups):
            members = json.loads(row["member_media_item_ids"])
            items = []
            for member_id in members:
                item = item_map.get(member_id, {})
                items.append(
                    {
                        "itemId": member_id,
                        "type": "PHOTO",
                        "createTime": item.get("create_time") or _now_iso(),
                        "filename": item.get("filename") or member_id,
                        "mimeType": item.get("mime_type") or "image/jpeg",
                        "dimensions": {
                            "width": item.get("width") or 300,
                            "height": item.get("height") or 300,
                        },
                        "thumbnail": {
                            "baseUrl": "https://placehold.co/300x300/png?text=Photo",
                            "suggestedSizePx": 300,
                        },
                        "links": {
                            "googlePhotos": {
                                "url": item.get("deep_link"),
                                "fallbackQuery": f"{member_id}",
                                "fallbackUrl": "https://photos.google.com/search/"
                                f"{member_id}",
                            }
                        },
                    }
                )
            envelope_groups.append(
                {
                    "groupId": row["group_fingerprint"],
                    "groupType": "EXACT" if row["confidence_band"] == "HIGH" else "NEAR_DUPLICATE",
                    "confidence": row["confidence_band"],
                    "reasonCodes": json.loads(row["reason_codes"]),
                    "itemsCount": len(members),
                    "representativeItemIds": [row["representative_media_item_id"]],
                    "items": items,
                    "review": next(
                        (
                            {
                                "state": rev["state"],
                                "keepMediaItemId": rev["keep_media_item_id"],
                                "notes": rev["notes"],
                            }
                            for rev in review_rows
                            if rev["group_fingerprint"] == row["group_fingerprint"]
                        ),
                        {"state": "UNREVIEWED", "keepMediaItemId": None, "notes": None},
                    ),
                    "order": index,
                }
            )

        envelope = {
            "schemaVersion": scan_row["scan_envelope_version"],
            "run": {
                "runId": scan_id,
                "status": "COMPLETED",
                "startedAt": _now_iso(),
                "finishedAt": _now_iso(),
                "selection": {"requestedCount": len(item_rows), "acceptedCount": len(item_rows), "rejectedCount": 0},
            },
            "progress": {
                "stage": "FINALIZE",
                "message": "Project scan loaded.",
                "counts": {"processed": len(item_rows), "total": len(item_rows)},
            },
            "telemetry": {
                "cost": {
                    "apiCalls": 0,
                    "estimatedUnits": 0,
                    "softCapUnits": 1200,
                    "hardCapUnits": 2000,
                    "hitSoftCap": False,
                    "hitHardCap": False,
                },
                "warnings": [],
            },
            "results": {
                "summary": {
                    "groupsCount": len(envelope_groups),
                    "groupedItemsCount": len(item_rows),
                    "ungroupedItemsCount": 0,
                },
                "groups": envelope_groups,
                "skippedItems": [],
                "failedItems": [],
            },
        }
        reviews = {row["group_fingerprint"]: dict(row) for row in review_rows}
        return envelope, reviews

    def upsert_review(
        self, project_id: str, group_fingerprint: str, patch: ProjectGroupReviewPatch
    ) -> dict[str, Any] | None:
        existing = self._get_review(project_id, group_fingerprint)
        if not existing:
            return None
        now = _now_iso()
        state = patch.state or existing["state"]
        keep_media_item_id = (
            patch.keep_media_item_id
            if patch.keep_media_item_id is not None
            else existing["keep_media_item_id"]
        )
        notes = patch.notes if patch.notes is not None else existing["notes"]
        resolved_at = now if state == "DONE" else None
        with self._conn() as conn:
            conn.execute(
                """
                UPDATE project_group_reviews
                SET state = ?, keep_media_item_id = ?, notes = ?, updated_at = ?, resolved_at = ?
                WHERE project_id = ? AND group_fingerprint = ?
                """,
                (state, keep_media_item_id, notes, now, resolved_at, project_id, group_fingerprint),
            )
        updated = self._get_review(project_id, group_fingerprint)
        return updated

    def _get_review(self, project_id: str, group_fingerprint: str) -> dict[str, Any] | None:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM project_group_reviews WHERE project_id = ? AND group_fingerprint = ?",
                (project_id, group_fingerprint),
            ).fetchone()
        return dict(row) if row else None

    def export_rows(self, project_id: str) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT pg.group_fingerprint, pg.confidence_band, pg.representative_media_item_id,
                    pg.member_media_item_ids, pr.keep_media_item_id
                FROM project_groups pg
                JOIN project_scans ps ON ps.id = pg.project_scan_id
                LEFT JOIN project_group_reviews pr
                    ON pr.project_id = ps.project_id AND pr.group_fingerprint = pg.group_fingerprint
                WHERE ps.project_id = ?
                """,
                (project_id,),
            ).fetchall()
            items = conn.execute(
                "SELECT google_media_item_id, deep_link FROM project_items WHERE project_id = ?",
                (project_id,),
            ).fetchall()
        deep_links = {item["google_media_item_id"]: item["deep_link"] for item in items}
        export_rows = []
        for row in rows:
            members = json.loads(row["member_media_item_ids"])
            export_rows.append(
                {
                    "group_fingerprint": row["group_fingerprint"],
                    "confidence_band": row["confidence_band"],
                    "representative_media_item_id": row["representative_media_item_id"],
                    "keep_media_item_id": row["keep_media_item_id"],
                    "member_media_item_ids": members,
                    "deep_links": {member: deep_links.get(member) for member in members},
                }
            )
        return export_rows


def _group_rows(scan_id: str, scan_result: ScanResult) -> list[dict[str, Any]]:
    rows = []
    for category, confidence, reason in [
        (scan_result.groups_exact, "HIGH", "HASH_MATCH"),
        (scan_result.groups_very_similar, "MEDIUM", "PHASH_CLOSE"),
        (scan_result.groups_possibly_similar, "LOW", "DHASH_CLOSE"),
    ]:
        for group in category:
            member_ids = [item.id for item in group.items]
            rows.append(
                {
                    "scan_id": scan_id,
                    "group_fingerprint": _fingerprint(member_ids),
                    "confidence_band": confidence,
                    "reason_codes": [reason],
                    "representative_media_item_id": group.representative_pair.earliest.id,
                    "member_media_item_ids": member_ids,
                }
            )
    return rows


def _fingerprint(ids: list[str]) -> str:
    joined = ",".join(sorted(ids))
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def to_csv(rows: list[dict[str, Any]]) -> str:
    headers = [
        "group_fingerprint",
        "confidence_band",
        "representative_media_item_id",
        "keep_media_item_id",
        "member_media_item_ids",
        "deep_links",
    ]
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=headers)
    writer.writeheader()
    for row in rows:
        writer.writerow(
            {
                **row,
                "member_media_item_ids": json.dumps(row["member_media_item_ids"]),
                "deep_links": json.dumps(row["deep_links"]),
            }
        )
    return out.getvalue()
