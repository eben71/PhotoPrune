import json
import logging
from collections.abc import Iterator
from functools import lru_cache
from typing import Annotated, Any

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Path,
    Query,
    Request,
    Response,
    status,
)
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.core.security import (
    AdmissionError,
    ScanAdmissionController,
    safe_validation_errors,
    security_detail,
)
from app.engine.downloads import DownloadSecurityError
from app.engine.models import PhotoItem
from app.engine.normalizer import normalize_photo_items, normalize_picker_payload
from app.engine.scan import run_scan
from app.engine.schemas import MAX_ID_LENGTH, ScanRequest, ScanResult
from app.projects.ingestion import (
    ProjectSourceUnavailableError,
    UnsupportedProjectSourceError,
    resolve_project_source,
)
from app.projects.repository import ProjectRepository, to_csv
from app.projects.schemas import (
    ProjectCreateRequest,
    ProjectGroupReviewPatch,
    ProjectGroupReviewResponse,
    ProjectListResponse,
    ProjectResponse,
    ProjectScanDiffResponse,
    ProjectScanRecord,
    ProjectScanRequest,
    ProjectScanResponse,
    ProjectScopeRequest,
    ProjectScopeResponse,
)
from app.projects.scope import ScopeDefinition, resolve_scope

router = APIRouter()
logger = logging.getLogger(__name__)
BoundedPathId = Annotated[str, Path(min_length=1, max_length=MAX_ID_LENGTH)]


@lru_cache
def get_project_repo() -> ProjectRepository:
    settings = get_settings()
    return ProjectRepository(settings.project_db_path)


def get_app_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


def require_scan_admission(request: Request) -> Iterator[None]:
    controller: ScanAdmissionController = request.app.state.scan_admission
    try:
        with controller.lease():
            yield
    except AdmissionError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=security_detail(request.scope, exc.category, exc.message),
            headers={"Retry-After": str(exc.retry_after)},
        ) from exc


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "phase": "feasibility"}


@router.post("/api/scan", response_model=ScanResult)
def scan(
    request: ScanRequest,
    http_request: Request,
    _admission: Annotated[None, Depends(require_scan_admission)],
    settings: Annotated[Settings, Depends(get_app_settings)],
    x_scan_explain: str | None = Header(default=None, alias="X-Scan-Explain"),
) -> ScanResult:
    items, explain_requested = _prepare_scan_items(
        request,
        settings,
        x_scan_explain=x_scan_explain,
    )
    require_image_bytes = request.picker_payload is not None or any(
        item.download_url is not None for item in items
    )
    try:
        return run_scan(
            items,
            settings,
            explain=explain_requested or settings.scan_explain,
            require_image_bytes=require_image_bytes,
        )
    except DownloadSecurityError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=security_detail(http_request.scope, exc.category, exc.safe_message),
        ) from exc
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
def get_project(project_id: BoundedPathId) -> ProjectResponse:
    project = get_project_repo().get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse(**project)


@router.post("/api/projects/{project_id}/scope")
def set_project_scope(
    project_id: BoundedPathId,
    request: ProjectScopeRequest,
) -> ProjectScopeResponse:
    project = get_project_repo().get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    resolved = resolve_scope(
        ScopeDefinition(
            type=request.type,
            album_ids=request.album_ids or [],
            media_item_ids=request.media_item_ids or [],
        )
    )
    updated = get_project_repo().set_scope(project_id, resolved)
    if not updated:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectScopeResponse(projectId=project_id, scope=updated["scope"])


@router.get("/api/projects/{project_id}/scope", response_model=ProjectScopeResponse)
def get_project_scope(project_id: BoundedPathId) -> ProjectScopeResponse:
    scope = get_project_repo().get_scope(project_id)
    if scope is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectScopeResponse(projectId=project_id, scope=scope)


@router.post("/api/projects/{project_id}/scan", response_model=ProjectScanResponse)
def project_scan(
    project_id: BoundedPathId,
    request: ProjectScanRequest,
    http_request: Request,
    _admission: Annotated[None, Depends(require_scan_admission)],
    settings: Annotated[Settings, Depends(get_app_settings)],
) -> ProjectScanResponse:
    project = get_project_repo().get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    def _write_album_checkpoint(resume_token: str | None) -> None:
        next_scope = dict(project.get("scope") or {"type": "album_set"})
        if resume_token is None:
            next_scope.pop("resumeToken", None)
        else:
            next_scope["resumeToken"] = resume_token
        get_project_repo().set_scope(project_id, next_scope)
        project["scope"] = next_scope

    try:
        source = resolve_project_source(
            request,
            project.get("scope"),
            checkpoint_writer=(
                _write_album_checkpoint if request.source_type == "album_set" else None
            ),
        )
    except UnsupportedProjectSourceError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except ProjectSourceUnavailableError as exc:
        if request.source_type == "album_set":
            _write_album_checkpoint(exc.resume_token)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    scan_request = request
    if source.photo_items is not None:
        try:
            scan_request = ProjectScanRequest.model_validate(
                {
                    "photoItems": source.photo_items,
                    "sourceType": request.source_type,
                    "sourceRef": request.source_ref.as_dict() if request.source_ref else None,
                }
            )
        except ValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=safe_validation_errors(exc.errors()),
            ) from exc
    items, explain_requested = _prepare_scan_items(scan_request, settings)
    try:
        scan_result = run_scan(
            items,
            settings,
            explain=explain_requested or settings.scan_explain,
            require_image_bytes=source.source_type == "picker",
        )
    except DownloadSecurityError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=security_detail(http_request.scope, exc.category, exc.safe_message),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    envelope = _to_envelope(scan_result)
    if source.warning:
        warnings = envelope["telemetry"].get("warnings", [])
        warnings.append(source.warning)
        envelope["telemetry"]["warnings"] = warnings
    if source.partial:
        envelope["run"]["status"] = "PARTIAL"
        envelope["progress"]["message"] = "Scan paused. Resume to continue."
    scan_id = get_project_repo().create_scan(
        project_id=project_id,
        source_type=source.source_type,
        source_ref=source.source_ref,
        scan_result=scan_result,
        input_items=items,
        envelope=envelope,
    )
    if source.source_type == "album_set" and "resumeToken" in source.source_ref:
        next_scope = dict(project.get("scope") or {"type": "album_set"})
        if source.resume_token is None:
            next_scope.pop("resumeToken", None)
        else:
            next_scope["resumeToken"] = source.resume_token
        get_project_repo().set_scope(project_id, next_scope)
    return ProjectScanResponse(projectScanId=scan_id, envelope=envelope)


@router.get("/api/projects/{project_id}/scans", response_model=list[ProjectScanRecord])
def list_project_scans(project_id: BoundedPathId) -> list[ProjectScanRecord]:
    return [ProjectScanRecord(**scan) for scan in get_project_repo().list_scans(project_id)]


@router.get("/api/projects/{project_id}/scans/{scan_id}/results")
def get_project_scan_results(
    project_id: BoundedPathId,
    scan_id: BoundedPathId,
) -> dict[str, object]:
    loaded = get_project_repo().get_scan_results(project_id, scan_id)
    if not loaded:
        raise HTTPException(status_code=404, detail="Scan not found")
    envelope, reviews = loaded
    return {"projectScanId": scan_id, "envelope": envelope, "reviews": reviews}


@router.get(
    "/api/projects/{project_id}/scans/{scan_id}/diff",
    response_model=ProjectScanDiffResponse,
)
def get_project_scan_diff(
    project_id: BoundedPathId,
    scan_id: BoundedPathId,
) -> ProjectScanDiffResponse:
    diff = get_project_repo().get_scan_diff(project_id, scan_id)
    if not diff:
        raise HTTPException(status_code=404, detail="Scan not found")
    return ProjectScanDiffResponse(**diff)


@router.patch(
    "/api/projects/{project_id}/groups/{group_fingerprint}/review",
    response_model=ProjectGroupReviewResponse,
)
def patch_group_review(
    project_id: BoundedPathId,
    group_fingerprint: BoundedPathId,
    request: ProjectGroupReviewPatch,
) -> ProjectGroupReviewResponse:
    updated = get_project_repo().upsert_review(project_id, group_fingerprint, request)
    if not updated:
        raise HTTPException(status_code=404, detail="Review not found")
    return ProjectGroupReviewResponse(**updated)


@router.get("/api/projects/{project_id}/export")
def export_project(
    project_id: BoundedPathId,
    format: str = Query(default="json"),
    scan_id: Annotated[
        str | None,
        Query(min_length=1, max_length=MAX_ID_LENGTH, alias="scanId"),
    ] = None,
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


def _to_envelope(scan_result: ScanResult) -> dict[str, Any]:
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
    failed_count = len(scan_result.failed_items)
    accepted_count = max(0, scan_result.input_count - failed_count)
    return {
        "schemaVersion": "2.2.0",
        "run": {
            "runId": scan_result.run_id,
            "status": "COMPLETED",
            "startedAt": "",
            "finishedAt": "",
            "selection": {
                "requestedCount": scan_result.input_count,
                "acceptedCount": accepted_count,
                "rejectedCount": failed_count,
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
                "ungroupedItemsCount": max(0, accepted_count - len(grouped_items)),
            },
            "groups": groups,
            "skippedItems": [],
            "failedItems": [issue.model_dump(by_alias=True) for issue in scan_result.failed_items],
        },
    }


def _parse_explain_header(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _prepare_scan_items(
    request: ScanRequest,
    settings: Settings,
    *,
    x_scan_explain: str | None = None,
) -> tuple[list[PhotoItem], bool]:
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
