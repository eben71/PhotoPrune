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
        _ = (request, project_scope)
        raise UnsupportedProjectSourceError(
            "Album set scan ingestion is not implemented yet; use picker-selected photos."
        )


def resolve_project_source(
    request: ProjectScanRequest,
    project_scope: dict[str, Any] | None,
) -> ResolvedProjectSource:
    if request.source_type == "album_set":
        return AlbumSetSourceAdapter().resolve(request, project_scope)
    return PickerSourceAdapter().resolve(request, project_scope)
