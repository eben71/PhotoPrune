from __future__ import annotations

import csv
import hashlib
import io
import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.engine.models import PhotoItem
from app.engine.schemas import ScanResult
from app.projects.schemas import ProjectGroupReviewPatch

DEFAULT_SCOPE = {"type": "picker", "albumIds": []}


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
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    scope TEXT,
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
                CREATE TABLE IF NOT EXISTS project_scan_items (
                    id TEXT PRIMARY KEY,
                    project_scan_id TEXT NOT NULL,
                    google_media_item_id TEXT NOT NULL,
                    UNIQUE(project_scan_id, google_media_item_id),
                    FOREIGN KEY(project_scan_id) REFERENCES project_scans(id)
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
                """)
            self._ensure_column(conn, "projects", "scope", "TEXT")
            conn.execute(
                "UPDATE projects SET scope = ? WHERE scope IS NULL",
                (json.dumps(DEFAULT_SCOPE),),
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_project_scans_project_id_created_at "
                "ON project_scans(project_id, created_at DESC)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_project_groups_project_scan_id "
                "ON project_groups(project_scan_id)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_project_reviews_project_id_fingerprint "
                "ON project_group_reviews(project_id, group_fingerprint)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_project_items_project_id_media_id "
                "ON project_items(project_id, google_media_item_id)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_project_scan_items_scan_id "
                "ON project_scan_items(project_scan_id)"
            )

    def _ensure_column(
        self,
        conn: sqlite3.Connection,
        table_name: str,
        column_name: str,
        definition: str,
    ) -> None:
        rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        existing_columns = {row["name"] for row in rows}
        if column_name in existing_columns:
            return
        conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")

    def create_project(self, name: str, user_id: str = "local-user") -> dict[str, Any]:
        now = _now_iso()
        project = {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": name,
            "status": "active",
            "scope": DEFAULT_SCOPE,
            "created_at": now,
            "updated_at": now,
        }
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO projects (id, user_id, name, status, scope, created_at, updated_at)
                VALUES (:id, :user_id, :name, :status, :scope, :created_at, :updated_at)
                """,
                {
                    **project,
                    "scope": json.dumps(project["scope"]),
                },
            )
        return project

    def list_projects(self) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute("SELECT * FROM projects ORDER BY updated_at DESC").fetchall()
        return [_project_row(row) for row in rows]

    def get_project(self, project_id: str) -> dict[str, Any] | None:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        return _project_row(row) if row else None

    def set_scope(self, project_id: str, scope: dict[str, Any]) -> dict[str, Any] | None:
        now = _now_iso()
        with self._conn() as conn:
            cursor = conn.execute(
                "UPDATE projects SET scope = ?, updated_at = ? WHERE id = ?",
                (json.dumps(scope), now, project_id),
            )
            if cursor.rowcount == 0:
                return None
            row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        return _project_row(row) if row else None

    def create_scan(
        self,
        project_id: str,
        source_type: str,
        source_ref: dict[str, Any],
        scan_result: ScanResult,
        input_items: list[PhotoItem],
        envelope: dict[str, Any],
    ) -> str:
        scan_id = str(uuid4())
        now = _now_iso()
        metrics = {
            "runId": scan_result.run_id,
            "inputCount": scan_result.input_count,
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

            for item in input_items:
                conn.execute(
                    """
                    INSERT INTO project_items (
                        id,
                        project_id,
                        google_media_item_id,
                        product_url,
                        deep_link,
                        create_time,
                        filename,
                        mime_type,
                        width,
                        height,
                        fingerprints,
                        first_seen_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(project_id, google_media_item_id) DO UPDATE SET
                        product_url=COALESCE(excluded.product_url, project_items.product_url),
                        deep_link=COALESCE(excluded.deep_link, project_items.deep_link),
                        create_time=COALESCE(excluded.create_time, project_items.create_time),
                        filename=COALESCE(excluded.filename, project_items.filename),
                        mime_type=COALESCE(excluded.mime_type, project_items.mime_type),
                        width=COALESCE(excluded.width, project_items.width),
                        height=COALESCE(excluded.height, project_items.height),
                        fingerprints=COALESCE(excluded.fingerprints, project_items.fingerprints)
                    """,
                    (
                        str(uuid4()),
                        project_id,
                        item.id,
                        item.deep_link,
                        item.deep_link,
                        item.create_time.isoformat(),
                        item.filename,
                        item.mime_type,
                        item.width,
                        item.height,
                        None,
                        now,
                    ),
                )
                conn.execute(
                    """
                    INSERT INTO project_scan_items (
                        id,
                        project_scan_id,
                        google_media_item_id
                    ) VALUES (?, ?, ?)
                    ON CONFLICT(project_scan_id, google_media_item_id) DO NOTHING
                    """,
                    (str(uuid4()), scan_id, item.id),
                )

            for group in _group_rows(scan_result):
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
                        id,
                        project_id,
                        group_fingerprint,
                        state,
                        keep_media_item_id,
                        notes,
                        updated_at,
                        resolved_at
                    ) VALUES (?, ?, ?, 'UNREVIEWED', NULL, NULL, ?, NULL)
                    ON CONFLICT(project_id, group_fingerprint) DO NOTHING
                    """,
                    (str(uuid4()), project_id, group["group_fingerprint"], now),
                )
        return scan_id

    def list_scans(self, project_id: str) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                (
                    "SELECT id, project_id, created_at, source_type, source_ref "
                    "FROM project_scans WHERE project_id = ? ORDER BY created_at DESC"
                ),
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

    def get_scan_results(
        self, project_id: str, scan_id: str
    ) -> tuple[dict[str, Any], dict[str, Any]] | None:
        with self._conn() as conn:
            scan_row = conn.execute(
                (
                    "SELECT created_at, metrics, scan_envelope_version FROM project_scans "
                    "WHERE id = ? AND project_id = ?"
                ),
                (scan_id, project_id),
            ).fetchone()
            if not scan_row:
                return None
            groups = conn.execute(
                (
                    "SELECT group_fingerprint, confidence_band, reason_codes, "
                    "representative_media_item_id, member_media_item_ids "
                    "FROM project_groups WHERE project_scan_id = ? ORDER BY rowid ASC"
                ),
                (scan_id,),
            ).fetchall()

            group_fingerprints = [row["group_fingerprint"] for row in groups]
            review_rows: list[sqlite3.Row] = []
            if group_fingerprints:
                review_placeholders = ",".join("?" for _ in group_fingerprints)
                review_rows = conn.execute(
                    (
                        "SELECT * FROM project_group_reviews WHERE project_id = ? "
                        f"AND group_fingerprint IN ({review_placeholders})"
                    ),
                    (project_id, *group_fingerprints),
                ).fetchall()

            member_ids = sorted(
                {
                    member_id
                    for row in groups
                    for member_id in json.loads(row["member_media_item_ids"])
                }
            )
            item_rows: list[sqlite3.Row] = []
            if member_ids:
                placeholders = ",".join("?" for _ in member_ids)
                item_rows = conn.execute(
                    (
                        "SELECT google_media_item_id, deep_link, filename, mime_type, "
                        "create_time, width, height FROM project_items "
                        f"WHERE project_id = ? AND google_media_item_id IN ({placeholders})"
                    ),
                    (project_id, *member_ids),
                ).fetchall()

            scan_item_rows = conn.execute(
                (
                    "SELECT google_media_item_id FROM project_scan_items "
                    "WHERE project_scan_id = ?"
                ),
                (scan_id,),
            ).fetchall()

        metrics = _load_json(scan_row["metrics"], {})
        review_map = {row["group_fingerprint"]: dict(row) for row in review_rows}
        item_map = {row["google_media_item_id"]: dict(row) for row in item_rows}
        scan_item_ids = {row["google_media_item_id"] for row in scan_item_rows}
        envelope_groups = []
        for row in groups:
            members = json.loads(row["member_media_item_ids"])
            items = []
            for member_id in members:
                item = item_map.get(member_id, {})
                items.append(
                    {
                        "itemId": member_id,
                        "type": "PHOTO",
                        "createTime": item.get("create_time") or scan_row["created_at"],
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
                                "fallbackQuery": member_id,
                                "fallbackUrl": f"https://photos.google.com/search/{member_id}",
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
                }
            )

        grouped_item_ids = {
            item_id for row in groups for item_id in json.loads(row["member_media_item_ids"])
        }
        input_count = int(metrics.get("inputCount", len(scan_item_ids or grouped_item_ids)))
        grouped_count = len(grouped_item_ids)
        cost = _load_json(json.dumps(metrics.get("cost", {})), {})
        timing_ms = int(sum(_load_json(json.dumps(metrics.get("timingsMs", {})), {}).values()))
        envelope = {
            "schemaVersion": scan_row["scan_envelope_version"],
            "run": {
                "runId": str(metrics.get("runId", scan_id)),
                "status": "COMPLETED",
                "startedAt": scan_row["created_at"],
                "finishedAt": scan_row["created_at"],
                "selection": {
                    "requestedCount": input_count,
                    "acceptedCount": input_count,
                    "rejectedCount": 0,
                },
            },
            "progress": {
                "stage": "FINALIZE",
                "message": "Project results loaded.",
                "counts": {"processed": input_count, "total": input_count},
            },
            "telemetry": {
                "cost": {
                    "apiCalls": 0,
                    "estimatedUnits": int(float(cost.get("totalCost", 0)) * 100000),
                    "softCapUnits": 1200,
                    "hardCapUnits": 2000,
                    "hitSoftCap": False,
                    "hitHardCap": False,
                },
                "timingMs": timing_ms,
                "warnings": [],
            },
            "results": {
                "summary": {
                    "groupsCount": len(envelope_groups),
                    "groupedItemsCount": grouped_count,
                    "ungroupedItemsCount": max(0, input_count - grouped_count),
                },
                "groups": envelope_groups,
                "skippedItems": [],
                "failedItems": [],
            },
        }
        return envelope, review_map

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
                (
                    state,
                    keep_media_item_id,
                    notes,
                    now,
                    resolved_at,
                    project_id,
                    group_fingerprint,
                ),
            )
        updated = self._get_review(project_id, group_fingerprint)
        return updated

    def _get_review(self, project_id: str, group_fingerprint: str) -> dict[str, Any] | None:
        with self._conn() as conn:
            row = conn.execute(
                (
                    "SELECT * FROM project_group_reviews WHERE project_id = ? "
                    "AND group_fingerprint = ?"
                ),
                (project_id, group_fingerprint),
            ).fetchone()
        return dict(row) if row else None

    def export_rows(self, project_id: str, scan_id: str | None = None) -> list[dict[str, Any]]:
        with self._conn() as conn:
            target_scan_id = scan_id or self._latest_scan_id(conn, project_id)
            if target_scan_id is None:
                return []
            if scan_id is not None and not self._scan_belongs_to_project(
                conn, project_id, target_scan_id
            ):
                return []
            rows = conn.execute(
                """
                SELECT pg.group_fingerprint, pg.confidence_band, pg.representative_media_item_id,
                    pg.member_media_item_ids, pr.keep_media_item_id, pr.state, pr.notes
                FROM project_groups pg
                LEFT JOIN project_group_reviews pr
                    ON pr.project_id = ? AND pr.group_fingerprint = pg.group_fingerprint
                WHERE pg.project_scan_id = ?
                ORDER BY pg.rowid ASC
                """,
                (project_id, target_scan_id),
            ).fetchall()
            items = conn.execute(
                "SELECT google_media_item_id, deep_link FROM project_items WHERE project_id = ?",
                (project_id,),
            ).fetchall()
        deep_links = {item["google_media_item_id"]: item["deep_link"] for item in items}
        export_rows = []
        for row in rows:
            members = json.loads(row["member_media_item_ids"])
            keep_media_item_id = row["keep_media_item_id"]
            export_rows.append(
                {
                    "group_fingerprint": row["group_fingerprint"],
                    "confidence_band": row["confidence_band"],
                    "state": row["state"] or "UNREVIEWED",
                    "representative_media_item_id": row["representative_media_item_id"],
                    "keep_media_item_id": keep_media_item_id,
                    "remove_media_item_ids": [
                        member for member in members if member != keep_media_item_id
                    ],
                    "member_media_item_ids": members,
                    "notes": row["notes"],
                    "deep_links": {member: deep_links.get(member) for member in members},
                }
            )
        return export_rows

    def _latest_scan_id(self, conn: sqlite3.Connection, project_id: str) -> str | None:
        row = conn.execute(
            (
                "SELECT id FROM project_scans WHERE project_id = ? "
                "ORDER BY created_at DESC LIMIT 1"
            ),
            (project_id,),
        ).fetchone()
        return str(row["id"]) if row else None

    def _scan_belongs_to_project(
        self, conn: sqlite3.Connection, project_id: str, scan_id: str
    ) -> bool:
        row = conn.execute(
            "SELECT 1 FROM project_scans WHERE id = ? AND project_id = ?",
            (scan_id, project_id),
        ).fetchone()
        return row is not None


def _project_row(row: sqlite3.Row) -> dict[str, Any]:
    data = dict(row)
    data["scope"] = _load_json(data.get("scope"), DEFAULT_SCOPE)
    return data


def _group_rows(scan_result: ScanResult) -> list[dict[str, Any]]:
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


def _load_json(value: str | None, fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def to_csv(rows: list[dict[str, Any]]) -> str:
    headers = [
        "group_fingerprint",
        "confidence_band",
        "state",
        "representative_media_item_id",
        "keep_media_item_id",
        "remove_media_item_ids",
        "member_media_item_ids",
        "notes",
        "deep_links",
    ]
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=headers)
    writer.writeheader()
    for row in rows:
        writer.writerow(
            {
                **row,
                "remove_media_item_ids": json.dumps(row["remove_media_item_ids"]),
                "member_media_item_ids": json.dumps(row["member_media_item_ids"]),
                "deep_links": json.dumps(row["deep_links"]),
            }
        )
    return out.getvalue()
