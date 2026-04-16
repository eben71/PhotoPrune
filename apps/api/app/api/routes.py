import json
import logging
from functools import lru_cache
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query, Response, status

from app.core.config import get_settings
from app.engine.models import PhotoItem
from app.engine.normalizer import normalize_photo_items, normalize_picker_payload
from app.engine.scan import run_scan
from app.engine.schemas import ScanRequest, ScanResult
from app.projects.repository import ProjectRepository, to_csv
from app.projects.schemas import (
    ProjectCreateRequest,
    ProjectGroupReviewPatch,
    ProjectGroupReviewResponse,
    ProjectListResponse,
    ProjectResponse,
    ProjectScanRecord,
    ProjectScanRequest,
    ProjectScanResponse,
    ProjectScopeRequest,
)
from app.projects.scope import ScopeDefinition, resolve_scope

router = APIRouter()
logger = logging.getLogger(__name__)


@lru_cache
def get_project_repo() -> ProjectRepository:
    settings = get_settings()
    return ProjectRepository(settings.project_db_path)


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "phase": "feasibility"}


@router.post("/api/scan", response_model=ScanResult)
def scan(
    request: ScanRequest,
    x_scan_explain: str | None = Header(default=None, alias="X-Scan-Explain"),
) -> ScanResult:
    items, explain_requested = _prepare_scan_items(
        request,
        x_scan_explain=x_scan_explain,
    )
    settings = get_settings()
    try:
        return run_scan(items, settings, explain=explain_requested or settings.scan_explain)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


@router.post("/api/projects", response_model=ProjectResponse)
def create_project(request: ProjectCreateRequest) -> ProjectResponse:
    project = get_project_repo().create_project(request.name.strip())
    return ProjectResponse(**project)


@router.get("/api/projects", response_model=ProjectListResponse)
def list_projects() -> ProjectListResponse:
    projects = [ProjectResponse(**row) for row in get_project_repo().list_projects()]
    return ProjectListResponse(projects=projects)


@router.get("/api/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str) -> ProjectResponse:
    project = get_project_repo().get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse(**project)


@router.post("/api/projects/{project_id}/scope")
def set_project_scope(project_id: str, request: ProjectScopeRequest) -> dict[str, object]:
    project = get_project_repo().get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    resolved = resolve_scope(ScopeDefinition(type=request.type, album_ids=request.album_ids or []))
    updated = get_project_repo().set_scope(project_id, resolved)
    if not updated:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"projectId": project_id, "scope": updated["scope"]}


@router.post("/api/projects/{project_id}/scan", response_model=ProjectScanResponse)
def project_scan(project_id: str, request: ProjectScanRequest) -> ProjectScanResponse:
    project = get_project_repo().get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    items, explain_requested = _prepare_scan_items(request)
    settings = get_settings()
    try:
        scan_result = run_scan(items, settings, explain=explain_requested or settings.scan_explain)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    envelope = _to_envelope(scan_result)
    scan_id = get_project_repo().create_scan(
        project_id=project_id,
        source_type=request.source_type,
        source_ref=request.source_ref or {"type": request.source_type},
        scan_result=scan_result,
        input_items=items,
        envelope=envelope,
    )
    return ProjectScanResponse(projectScanId=scan_id, envelope=envelope)


@router.get("/api/projects/{project_id}/scans", response_model=list[ProjectScanRecord])
def list_project_scans(project_id: str) -> list[ProjectScanRecord]:
    return [ProjectScanRecord(**scan) for scan in get_project_repo().list_scans(project_id)]


@router.get("/api/projects/{project_id}/scans/{scan_id}/results")
def get_project_scan_results(project_id: str, scan_id: str) -> dict[str, object]:
    loaded = get_project_repo().get_scan_results(project_id, scan_id)
    if not loaded:
        raise HTTPException(status_code=404, detail="Scan not found")
    envelope, reviews = loaded
    return {"projectScanId": scan_id, "envelope": envelope, "reviews": reviews}


@router.patch(
    "/api/projects/{project_id}/groups/{group_fingerprint}/review",
    response_model=ProjectGroupReviewResponse,
)
def patch_group_review(
    project_id: str, group_fingerprint: str, request: ProjectGroupReviewPatch
) -> ProjectGroupReviewResponse:
    updated = get_project_repo().upsert_review(project_id, group_fingerprint, request)
    if not updated:
        raise HTTPException(status_code=404, detail="Review not found")
    return ProjectGroupReviewResponse(**updated)


@router.get("/api/projects/{project_id}/export")
def export_project(
    project_id: str,
    format: str = Query(default="json"),
    scan_id: str | None = Query(default=None, alias="scanId"),
) -> Response:
    if format not in {"json", "csv"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="format must be one of: json, csv",
        )
    rows = get_project_repo().export_rows(project_id, scan_id=scan_id)
    if format == "csv":
        return Response(
            content=to_csv(rows),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=project_export.csv"},
        )
    return Response(content=json.dumps(rows), media_type="application/json")


def _to_envelope(scan_result: ScanResult) -> dict[str, object]:
    groups: list[dict[str, Any]] = []
    for bucket, confidence, reason, group_type in [
        (scan_result.groups_exact, "HIGH", ["HASH_MATCH"], "EXACT"),
        (scan_result.groups_very_similar, "MEDIUM", ["PHASH_CLOSE"], "NEAR_DUPLICATE"),
        (scan_result.groups_possibly_similar, "LOW", ["DHASH_CLOSE"], "NEAR_DUPLICATE"),
    ]:
        for group in bucket:
            group_items = []
            for item in group.items:
                group_items.append(
                    {
                        "itemId": item.id,
                        "type": "PHOTO",
                        "createTime": item.create_time.isoformat(),
                        "filename": item.filename or item.id,
                        "mimeType": item.mime_type or "image/jpeg",
                        "dimensions": {
                            "width": item.width or 300,
                            "height": item.height or 300,
                        },
                        "thumbnail": {
                            "baseUrl": "https://placehold.co/300x300/png?text=Photo",
                            "suggestedSizePx": 300,
                        },
                        "links": {
                            "googlePhotos": {
                                "url": item.google_photos_deep_link,
                                "fallbackQuery": item.id,
                                "fallbackUrl": f"https://photos.google.com/search/{item.id}",
                            }
                        },
                    }
                )
            groups.append(
                {
                    "groupId": group.group_id,
                    "groupType": group_type,
                    "confidence": confidence,
                    "reasonCodes": reason,
                    "itemsCount": len(group.items),
                    "representativeItemIds": [group.representative_pair.earliest.id],
                    "items": group_items,
                }
            )

    grouped_items = {item["itemId"] for group in groups for item in group["items"]}
    return {
        "schemaVersion": "2.2.0",
        "run": {
            "runId": scan_result.run_id,
            "status": "COMPLETED",
            "startedAt": "",
            "finishedAt": "",
            "selection": {
                "requestedCount": scan_result.input_count,
                "acceptedCount": scan_result.input_count,
                "rejectedCount": 0,
            },
        },
        "progress": {
            "stage": "FINALIZE",
            "message": "Scan completed",
            "counts": {"processed": scan_result.input_count, "total": scan_result.input_count},
        },
        "telemetry": {
            "cost": {
                "apiCalls": 0,
                "estimatedUnits": int(scan_result.cost_estimate.total_cost * 100000),
                "softCapUnits": 1200,
                "hardCapUnits": 2000,
                "hitSoftCap": False,
                "hitHardCap": False,
            },
            "timingMs": int(sum(scan_result.stage_metrics.timings_ms.values())),
            "warnings": [],
        },
        "results": {
            "summary": {
                "groupsCount": len(groups),
                "groupedItemsCount": len(grouped_items),
                "ungroupedItemsCount": max(0, scan_result.input_count - len(grouped_items)),
            },
            "groups": groups,
            "skippedItems": [],
            "failedItems": [],
        },
    }


def _parse_explain_header(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _prepare_scan_items(
    request: ScanRequest,
    *,
    x_scan_explain: str | None = None,
) -> tuple[list[PhotoItem], bool]:
    settings = get_settings()
    if request.photo_items:
        items = normalize_photo_items(request.photo_items)
    else:
        items = normalize_picker_payload(request.picker_payload or {})

    if not items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid photo items provided.",
        )

    input_count = len(items)
    if input_count > settings.scan_max_photos:
        message = f"Scan requested {input_count} items; max allowed is {settings.scan_max_photos}."
        if settings.enforce_scan_limits:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
        logger.warning(message)

    if input_count > settings.scan_consent_threshold and not request.consent_confirmed:
        message = "Scan exceeds consent threshold; explicit consent is required in production."
        if settings.enforce_scan_limits:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
        logger.warning(message)

    return items, _parse_explain_header(x_scan_explain)
