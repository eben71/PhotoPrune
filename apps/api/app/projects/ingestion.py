from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from app.projects.schemas import ProjectScanRequest


class UnsupportedProjectSourceError(ValueError):
    pass


@dataclass(frozen=True)
class ResolvedProjectSource:
    source_type: str
    source_ref: dict[str, Any]
    photo_items: list[dict[str, Any]] | None = None
    partial: bool = False
    resume_token: str | None = None
    warning: str | None = None


class ProjectSourceAdapter(Protocol):
    def resolve(
        self,
        request: ProjectScanRequest,
        project_scope: dict[str, Any] | None,
    ) -> ResolvedProjectSource: ...


class PickerSourceAdapter:
    def resolve(
        self,
        request: ProjectScanRequest,
        project_scope: dict[str, Any] | None,
    ) -> ResolvedProjectSource:
        return ResolvedProjectSource(
            source_type="picker",
            source_ref={"type": "picker", "scopeType": (project_scope or {}).get("type", "picker")},
        )


class AlbumSetSourceAdapter:
    def resolve(
        self,
        request: ProjectScanRequest,
        project_scope: dict[str, Any] | None,
    ) -> ResolvedProjectSource:
        source_ref = request.source_ref or {}
        album_ids = list(source_ref.get("albumIds") or (project_scope or {}).get("albumIds") or [])
        media_item_ids = list(
            source_ref.get("mediaItemIds") or (project_scope or {}).get("mediaItemIds") or []
        )
        paged = list(source_ref.get("pagedMediaItems") or [])
        if not album_ids and not media_item_ids and not paged:
            raise UnsupportedProjectSourceError(
                "Album set source requires albumIds, mediaItemIds, or pagedMediaItems."
            )

        if paged:
            start = 0
            resume_token = source_ref.get("resumeToken")
            if request.resume:
                resume_token = resume_token or (project_scope or {}).get("resumeToken")
            if request.resume and resume_token:
                start = int(resume_token)
            page_limit = int(source_ref.get("pageLimit") or len(paged))
            selected = paged[start : start + page_limit]
            photo_items = [item for page in selected for item in (page.get("items") or [])]
            next_token = str(start + len(selected)) if start + len(selected) < len(paged) else None
            warning = None
            if next_token:
                warning = "Album scan paused. Resume to continue remaining pages."
            return ResolvedProjectSource(
                source_type="album_set",
                source_ref={
                    "type": "album_set",
                    "albumIds": album_ids,
                    "mediaItemIds": media_item_ids,
                    "resumeToken": next_token,
                },
                photo_items=photo_items,
                partial=next_token is not None,
                resume_token=next_token,
                warning=warning,
            )

        media_items = source_ref.get("mediaItems")
        return ResolvedProjectSource(
            source_type="album_set",
            source_ref={
                "type": "album_set",
                "albumIds": album_ids,
                "mediaItemIds": media_item_ids,
            },
            photo_items=media_items if media_items else None,
        )


def resolve_project_source(
    request: ProjectScanRequest,
    project_scope: dict[str, Any] | None,
) -> ResolvedProjectSource:
    if request.source_type == "album_set":
        return AlbumSetSourceAdapter().resolve(request, project_scope)
    return PickerSourceAdapter().resolve(request, project_scope)
