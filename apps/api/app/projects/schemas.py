from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.engine.limits import PICKER_MAX_ITEMS
from app.engine.schemas import (
    MAX_ID_LENGTH,
    PhotoItemPayload,
    ScanRequest,
    validate_picker_payload,
)

BoundedId = Annotated[str, Field(min_length=1, max_length=MAX_ID_LENGTH)]


class ProjectCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)


class ProjectResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    status: Literal["active", "archived"]
    scope: dict[str, Any] | None = None
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class ProjectScanResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    project_scan_id: str = Field(alias="projectScanId")
    envelope: dict[str, Any]


class ProjectScanRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    project_id: str = Field(alias="projectId")
    created_at: datetime = Field(alias="createdAt")
    source_type: str = Field(alias="sourceType")
    source_ref: dict[str, Any] = Field(alias="sourceRef")


class ProjectScanResult(BaseModel):
    envelope: dict[str, Any]
    reviews: dict[str, Any]


class ProjectScopeResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    project_id: str = Field(alias="projectId")
    scope: dict[str, Any]


class ProjectScanDiffGroup(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    group_fingerprint: str = Field(alias="groupFingerprint")
    category: Literal["NEW", "CHANGED", "UNCHANGED"]
    member_media_item_ids: list[str] = Field(alias="memberMediaItemIds")
    previous_group_fingerprint: str | None = Field(default=None, alias="previousGroupFingerprint")
    previous_member_media_item_ids: list[str] | None = Field(
        default=None, alias="previousMemberMediaItemIds"
    )
    review_state: str = Field(alias="reviewState")
    prior_review_state_preserved: bool = Field(alias="priorReviewStatePreserved")
    previously_reviewed: bool = Field(alias="previouslyReviewed")
    requires_review: bool = Field(alias="requiresReview")


class ProjectScanDiffResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    project_id: str = Field(alias="projectId")
    project_scan_id: str = Field(alias="projectScanId")
    previous_project_scan_id: str | None = Field(alias="previousProjectScanId")
    summary: dict[str, int]
    groups: list[ProjectScanDiffGroup]


class ProjectGroupReviewPatch(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    state: Literal["UNREVIEWED", "IN_PROGRESS", "DONE", "SNOOZED"] | None = None
    keep_media_item_id: BoundedId | None = Field(default=None, alias="keepMediaItemId")
    notes: str | None = Field(default=None, max_length=4096)


class ProjectGroupReviewResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    project_id: str = Field(alias="projectId")
    group_fingerprint: str = Field(alias="groupFingerprint")
    state: str
    keep_media_item_id: str | None = Field(alias="keepMediaItemId")
    notes: str | None
    updated_at: datetime = Field(alias="updatedAt")
    resolved_at: datetime | None = Field(alias="resolvedAt")


class ProjectScopeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    type: Literal["picker", "album_set"]
    album_ids: list[BoundedId] | None = Field(
        default=None,
        alias="albumIds",
        max_length=PICKER_MAX_ITEMS,
    )
    media_item_ids: list[BoundedId] | None = Field(
        default=None,
        alias="mediaItemIds",
        max_length=PICKER_MAX_ITEMS,
    )


class ProjectSourcePage(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    items: list[PhotoItemPayload] = Field(default_factory=list, max_length=PICKER_MAX_ITEMS)
    error_status: int | None = Field(default=None, alias="errorStatus")
    status: int | None = None
    failures_before_success: int = Field(
        default=0,
        alias="failuresBeforeSuccess",
        ge=0,
        le=5,
    )
    retry_after_seconds: float | None = Field(
        default=None,
        alias="retryAfterSeconds",
        ge=0,
        le=30,
    )


class ProjectSourceRef(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    type: Literal["picker", "album_set"] | None = None
    album_ids: list[BoundedId] = Field(
        default_factory=list,
        alias="albumIds",
        max_length=PICKER_MAX_ITEMS,
    )
    media_item_ids: list[BoundedId] = Field(
        default_factory=list,
        alias="mediaItemIds",
        max_length=PICKER_MAX_ITEMS,
    )
    media_items: list[PhotoItemPayload] = Field(
        default_factory=list,
        alias="mediaItems",
        max_length=PICKER_MAX_ITEMS,
    )
    paged_media_items: list[ProjectSourcePage] = Field(
        default_factory=list,
        alias="pagedMediaItems",
        max_length=PICKER_MAX_ITEMS,
    )
    resume_token: BoundedId | int | None = Field(default=None, alias="resumeToken")
    page_limit: int | None = Field(default=None, alias="pageLimit", ge=1, le=PICKER_MAX_ITEMS)
    max_retry_attempts: int | None = Field(default=None, alias="maxRetryAttempts", ge=1, le=5)
    retry_base_delay_seconds: float | None = Field(
        default=None,
        alias="retryBaseDelaySeconds",
        ge=0,
        le=30,
    )
    retry_max_delay_seconds: float | None = Field(
        default=None,
        alias="retryMaxDelaySeconds",
        ge=0,
        le=30,
    )
    disable_backoff_sleep: bool = Field(default=False, alias="disableBackoffSleep")

    @model_validator(mode="after")
    def validate_total_items(self) -> ProjectSourceRef:
        total_items = len(self.media_items) + sum(
            len(page.items) for page in self.paged_media_items
        )
        if total_items > PICKER_MAX_ITEMS:
            raise ValueError(f"sourceRef cannot exceed {PICKER_MAX_ITEMS} media items")
        return self

    def as_dict(self) -> dict[str, Any]:
        return self.model_dump(by_alias=True, exclude_none=True)


class ProjectScanRequest(ScanRequest):
    source_type: Literal["picker", "album_set"] = Field(default="picker", alias="sourceType")
    source_ref: ProjectSourceRef | None = Field(default=None, alias="sourceRef")
    resume: bool = False

    @model_validator(mode="after")
    def validate_payload(self) -> ProjectScanRequest:
        if self.photo_items and self.picker_payload:
            raise ValueError("provide exactly one scan input source")
        if self.source_type == "picker" and self.photo_items:
            if len(self.photo_items) > PICKER_MAX_ITEMS:
                raise ValueError(f"picker selection cannot exceed {PICKER_MAX_ITEMS} items")
            if any(not (item.download_url or "").strip() for item in self.photo_items):
                raise ValueError("picker photo items require a downloadUrl")
            return self
        if self.source_type == "picker" and self.picker_payload:
            validate_picker_payload(self.picker_payload)
            return self
        if self.photo_items or self.picker_payload:
            return self
        if self.source_type == "album_set" and self.source_ref:
            if (
                self.source_ref.album_ids
                or self.source_ref.media_item_ids
                or self.source_ref.media_items
                or self.source_ref.paged_media_items
            ):
                return self
        raise ValueError("photo_items or picker_payload is required")


class ProjectListResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    projects: list[ProjectResponse]
