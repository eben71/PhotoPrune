from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.engine.limits import PICKER_MAX_ITEMS


class PhotoItemPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    create_time: datetime = Field(alias="createTime")
    filename: str | None = None
    mime_type: str | None = Field(default=None, alias="mimeType")
    width: int | None = None
    height: int | None = None
    gps_latitude: float | None = Field(default=None, alias="gpsLatitude")
    gps_longitude: float | None = Field(default=None, alias="gpsLongitude")
    download_url: str | None = Field(default=None, alias="downloadUrl")
    deep_link: str | None = Field(default=None, alias="googlePhotosDeepLink")


class ScanRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    photo_items: list[PhotoItemPayload] | None = Field(default=None, alias="photoItems")
    picker_payload: dict[str, Any] | None = Field(default=None, alias="pickerPayload")
    consent_confirmed: bool = Field(default=False, alias="consentConfirmed")

    @model_validator(mode="after")
    def validate_payload(self) -> "ScanRequest":
        if not self.photo_items and not self.picker_payload:
            raise ValueError("photo_items or picker_payload is required")
        if self.photo_items and len(self.photo_items) > PICKER_MAX_ITEMS:
            raise ValueError(f"photo_items cannot exceed {PICKER_MAX_ITEMS} items")
        if self.picker_payload:
            validate_picker_payload(self.picker_payload)
        return self


def validate_picker_payload(payload: dict[str, Any]) -> None:
    raw_items = payload.get("mediaItems") or payload.get("items") or payload.get("media_items")
    if not isinstance(raw_items, list):
        return
    if len(raw_items) > PICKER_MAX_ITEMS:
        raise ValueError(f"picker selection cannot exceed {PICKER_MAX_ITEMS} items")
    if any(not _picker_item_base_url(item) for item in raw_items):
        raise ValueError("picker payload items require a baseUrl")
    item_ids = [_picker_item_id(item) for item in raw_items]
    if any(item_id is None for item_id in item_ids):
        raise ValueError("picker payload items require an id")
    if len(set(item_ids)) != len(item_ids):
        raise ValueError("picker payload items must have unique ids")


def _picker_item_base_url(item: Any) -> str | None:
    if not isinstance(item, dict):
        return None
    media_file = item.get("mediaFile")
    raw_url = item.get("baseUrl")
    if raw_url is None and isinstance(media_file, dict):
        raw_url = media_file.get("baseUrl")
    if not isinstance(raw_url, str) or not raw_url.strip():
        return None
    return raw_url


def _picker_item_id(item: Any) -> str | None:
    if not isinstance(item, dict):
        return None
    media_file = item.get("mediaFile")
    raw_id = item.get("id")
    if raw_id is None and isinstance(media_file, dict):
        raw_id = media_file.get("id")
    if not isinstance(raw_id, str) or not raw_id.strip():
        return None
    return raw_id


class PhotoItemSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    create_time: datetime = Field(alias="createTime")
    filename: str | None = None
    mime_type: str | None = Field(default=None, alias="mimeType")
    width: int | None = None
    height: int | None = None
    google_photos_deep_link: str | None = Field(default=None, alias="googlePhotosDeepLink")


class GroupRepresentativePair(BaseModel):
    earliest: PhotoItemSummary
    latest: PhotoItemSummary


class GroupResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    group_id: str = Field(alias="groupId")
    category: str
    items: list[PhotoItemSummary]
    representative_pair: GroupRepresentativePair = Field(alias="representativePair")
    more_count: int = Field(alias="moreCount")
    explanation: str
    google_photos_deep_links: list[str] = Field(alias="googlePhotosDeepLinks")


class StageMetrics(BaseModel):
    timings_ms: dict[str, float] = Field(alias="timingsMs")
    counts: dict[str, int]
    debug: dict[str, Any] | None = None


class CostEstimate(BaseModel):
    total_cost: float = Field(alias="totalCost")
    download_cost: float = Field(alias="downloadCost")
    hash_cost: float = Field(alias="hashCost")
    comparison_cost: float = Field(alias="comparisonCost")


class ScanItemIssue(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    item_id: str = Field(alias="itemId")
    reason_code: str = Field(alias="reasonCode")
    message: str


class ScanResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    run_id: str = Field(alias="runId")
    input_count: int = Field(alias="inputCount")
    stage_metrics: StageMetrics = Field(alias="stageMetrics")
    cost_estimate: CostEstimate = Field(alias="costEstimate")
    groups_exact: list[GroupResult] = Field(alias="groupsExact")
    groups_very_similar: list[GroupResult] = Field(alias="groupsVerySimilar")
    groups_possibly_similar: list[GroupResult] = Field(alias="groupsPossiblySimilar")
    failed_items: list[ScanItemIssue] = Field(default_factory=list, alias="failedItems")
