from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Protocol

from app.projects.schemas import ProjectScanRequest


class UnsupportedProjectSourceError(ValueError):
    pass


class ProjectSourceUnavailableError(RuntimeError):
    def __init__(self, message: str, *, resume_token: str | None = None) -> None:
        super().__init__(message)
        self.resume_token = resume_token


@dataclass(frozen=True)
class ResolvedProjectSource:
    source_type: str
    source_ref: dict[str, Any]
    photo_items: list[dict[str, Any]] | None = None
    partial: bool = False
    resume_token: str | None = None
    warning: str | None = None


CheckpointWriter = Callable[[str | None], None]


class ProjectSourceAdapter(Protocol):
    def resolve(
        self,
        request: ProjectScanRequest,
        project_scope: dict[str, Any] | None,
        *,
        checkpoint_writer: CheckpointWriter | None = None,
    ) -> ResolvedProjectSource: ...


class PickerSourceAdapter:
    def resolve(
        self,
        request: ProjectScanRequest,
        project_scope: dict[str, Any] | None,
        *,
        checkpoint_writer: CheckpointWriter | None = None,
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
        *,
        checkpoint_writer: CheckpointWriter | None = None,
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
            return self._resolve_paged(
                request,
                project_scope,
                source_ref,
                album_ids,
                media_item_ids,
                paged,
                checkpoint_writer=checkpoint_writer,
            )

        media_items = _dedupe_media_items(source_ref.get("mediaItems") or [])
        return ResolvedProjectSource(
            source_type="album_set",
            source_ref={
                "type": "album_set",
                "albumIds": album_ids,
                "mediaItemIds": media_item_ids,
            },
            photo_items=media_items if media_items else None,
        )

    def _resolve_paged(
        self,
        request: ProjectScanRequest,
        project_scope: dict[str, Any] | None,
        source_ref: dict[str, Any],
        album_ids: list[str],
        media_item_ids: list[str],
        paged: list[dict[str, Any]],
        *,
        checkpoint_writer: CheckpointWriter | None,
    ) -> ResolvedProjectSource:
        start = _coerce_resume_token(source_ref.get("resumeToken"))
        if request.resume:
            start = _coerce_resume_token(
                source_ref.get("resumeToken") or (project_scope or {}).get("resumeToken")
            )
        page_limit = int(source_ref.get("pageLimit") or len(paged))
        retry_policy = _RetryPolicy.from_source_ref(source_ref)
        sleep = _sleep if source_ref.get("disableBackoffSleep", True) else time.sleep

        photo_items: list[dict[str, Any]] = []
        next_token: str | None = str(start) if start < len(paged) else None
        end = min(start + page_limit, len(paged))
        for page_index in range(start, end):
            try:
                page = _fetch_page_with_retries(paged[page_index], retry_policy, sleep=sleep)
            except _RetryablePageError as exc:
                if not photo_items:
                    if checkpoint_writer:
                        checkpoint_writer(str(page_index))
                    raise ProjectSourceUnavailableError(
                        _PARTIAL_FAILURE_WARNING,
                        resume_token=str(page_index),
                    ) from exc
                next_token = str(page_index)
                if checkpoint_writer:
                    checkpoint_writer(next_token)
                return ResolvedProjectSource(
                    source_type="album_set",
                    source_ref={
                        "type": "album_set",
                        "albumIds": album_ids,
                        "mediaItemIds": media_item_ids,
                        "resumeToken": next_token,
                    },
                    photo_items=_dedupe_media_items(photo_items),
                    partial=True,
                    resume_token=next_token,
                    warning=_PARTIAL_FAILURE_WARNING,
                )

            photo_items.extend(page.get("items") or [])
            next_token = str(page_index + 1) if page_index + 1 < len(paged) else None
            if checkpoint_writer:
                checkpoint_writer(next_token)

        if end < len(paged):
            next_token = str(end)
        warning = "Album scan paused. Resume to continue remaining pages." if next_token else None
        return ResolvedProjectSource(
            source_type="album_set",
            source_ref={
                "type": "album_set",
                "albumIds": album_ids,
                "mediaItemIds": media_item_ids,
                "resumeToken": next_token,
            },
            photo_items=_dedupe_media_items(photo_items),
            partial=next_token is not None,
            resume_token=next_token,
            warning=warning,
        )


@dataclass(frozen=True)
class _RetryPolicy:
    max_attempts: int = 3
    base_delay_seconds: float = 0.1
    max_delay_seconds: float = 2.0

    @classmethod
    def from_source_ref(cls, source_ref: dict[str, Any]) -> _RetryPolicy:
        return cls(
            max_attempts=max(1, int(source_ref.get("maxRetryAttempts") or cls.max_attempts)),
            base_delay_seconds=max(0.0, float(source_ref.get("retryBaseDelaySeconds") or 0.0)),
            max_delay_seconds=max(
                0.0, float(source_ref.get("retryMaxDelaySeconds") or cls.max_delay_seconds)
            ),
        )


class _RetryablePageError(RuntimeError):
    pass


_RETRYABLE_STATUSES = {408, 429, 500, 502, 503, 504}
_PARTIAL_FAILURE_WARNING = (
    "Album scan paused after a temporary Google Photos API issue. Resume to continue."
)


def _fetch_page_with_retries(
    page: dict[str, Any],
    policy: _RetryPolicy,
    *,
    sleep: Callable[[float], None],
) -> dict[str, Any]:
    failures_before_success = int(page.get("failuresBeforeSuccess") or 0)
    for attempt in range(1, policy.max_attempts + 1):
        status = _page_error_status(page)
        if failures_before_success and attempt > failures_before_success:
            status = None
        if status not in _RETRYABLE_STATUSES:
            return page
        if attempt == policy.max_attempts:
            raise _RetryablePageError(f"Google Photos API returned retryable status {status}")
        retry_after = page.get("retryAfterSeconds")
        delay = (
            float(retry_after)
            if retry_after is not None
            else policy.base_delay_seconds * 2 ** (attempt - 1)
        )
        sleep(min(delay, policy.max_delay_seconds))
    return page


def _page_error_status(page: dict[str, Any]) -> int | None:
    raw_status = page.get("errorStatus") or page.get("status")
    if raw_status is None:
        return None
    return int(raw_status)


def _dedupe_media_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in items:
        item_id = item.get("id")
        if not item_id or item_id in seen:
            continue
        seen.add(item_id)
        deduped.append(item)
    return deduped


def _coerce_resume_token(value: Any) -> int:
    if value in (None, ""):
        return 0
    return max(0, int(value))


def _sleep(seconds: float) -> None:
    return None


def resolve_project_source(
    request: ProjectScanRequest,
    project_scope: dict[str, Any] | None,
    *,
    checkpoint_writer: CheckpointWriter | None = None,
) -> ResolvedProjectSource:
    if request.source_type == "album_set":
        return AlbumSetSourceAdapter().resolve(
            request,
            project_scope,
            checkpoint_writer=checkpoint_writer,
        )
    return PickerSourceAdapter().resolve(
        request,
        project_scope,
        checkpoint_writer=checkpoint_writer,
    )
