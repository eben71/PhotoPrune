from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.engine.schemas import ScanRequest


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ProjectResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    user_id: str = Field(alias="userId")
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
    state: Literal["UNREVIEWED", "IN_PROGRESS", "DONE", "SNOOZED"] | None = None
    keep_media_item_id: str | None = Field(default=None, alias="keepMediaItemId")
    notes: str | None = None


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
    type: Literal["picker", "album_set"]
    album_ids: list[str] | None = Field(default=None, alias="albumIds")


class ProjectScanRequest(ScanRequest):
    source_type: Literal["picker", "album_set"] = Field(default="picker", alias="sourceType")
    source_ref: dict[str, Any] | None = Field(default=None, alias="sourceRef")


class ProjectListResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    projects: list[ProjectResponse]
