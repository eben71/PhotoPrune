from datetime import datetime
from typing import Any

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, model_validator

from app.engine.limits import PICKER_MAX_ITEMS

MAX_ID_LENGTH = 512
MAX_FILENAME_LENGTH = 1024
MAX_MIME_TYPE_LENGTH = 255
MAX_URL_LENGTH = 4096


class PhotoItemPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    id: str = Field(min_length=1, max_length=MAX_ID_LENGTH)
    create_time: datetime = Field(alias="createTime")
    filename: str | None = Field(default=None, max_length=MAX_FILENAME_LENGTH)
    mime_type: str | None = Field(default=None, alias="mimeType", max_length=MAX_MIME_TYPE_LENGTH)
    width: int | None = None
    height: int | None = None
    gps_latitude: float | None = Field(default=None, alias="gpsLatitude")
    gps_longitude: float | None = Field(default=None, alias="gpsLongitude")
    download_url: str | None = Field(default=None, alias="downloadUrl", max_length=MAX_URL_LENGTH)
    deep_link: str | None = Field(
        default=None,
        alias="googlePhotosDeepLink",
        max_length=MAX_URL_LENGTH,
    )


class PickerLocationPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    latitude: float | None = None
    longitude: float | None = None


class PickerMediaMetadataPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    creation_time: str | None = Field(default=None, alias="creationTime", max_length=64)
    width: int | None = None
    height: int | None = None
    location: PickerLocationPayload | None = None


class PickerMediaFilePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    id: str | None = Field(default=None, min_length=1, max_length=MAX_ID_LENGTH)
    create_time: str | None = Field(default=None, alias="createTime", max_length=64)
    filename: str | None = Field(default=None, max_length=MAX_FILENAME_LENGTH)
    mime_type: str | None = Field(
        default=None,
        alias="mimeType",
        max_length=MAX_MIME_TYPE_LENGTH,
    )
    width: int | None = None
    height: int | None = None
    base_url: str | None = Field(default=None, alias="baseUrl", max_length=MAX_URL_LENGTH)
    product_url: str | None = Field(default=None, alias="productUrl", max_length=MAX_URL_LENGTH)
    media_file_metadata: PickerMediaMetadataPayload | None = Field(
        default=None,
        alias="mediaFileMetadata",
    )


class PickerItemPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    id: str | None = Field(default=None, min_length=1, max_length=MAX_ID_LENGTH)
    create_time: str | None = Field(default=None, alias="createTime", max_length=64)
    filename: str | None = Field(default=None, max_length=MAX_FILENAME_LENGTH)
    mime_type: str | None = Field(
        default=None,
        alias="mimeType",
        max_length=MAX_MIME_TYPE_LENGTH,
    )
    width: int | None = None
    height: int | None = None
    base_url: str | None = Field(default=None, alias="baseUrl", max_length=MAX_URL_LENGTH)
    product_url: str | None = Field(default=None, alias="productUrl", max_length=MAX_URL_LENGTH)
    location: PickerLocationPayload | None = None
    media_file: PickerMediaFilePayload | None = Field(default=None, alias="mediaFile")

    def item_id(self) -> str | None:
        return self.id or (self.media_file.id if self.media_file else None)

    def download_url(self) -> str | None:
        return self.base_url or (self.media_file.base_url if self.media_file else None)


class PickerPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    media_items: list[PickerItemPayload] = Field(
        default_factory=list,
        validation_alias=AliasChoices("mediaItems", "items", "media_items"),
        serialization_alias="mediaItems",
        max_length=PICKER_MAX_ITEMS,
    )

    @model_validator(mode="after")
    def validate_items(self) -> "PickerPayload":
        if any(not item.download_url() for item in self.media_items):
            raise ValueError("picker payload items require a baseUrl")
        item_ids = [item.item_id() for item in self.media_items]
        if any(item_id is None for item_id in item_ids):
            raise ValueError("picker payload items require an id")
        if len(set(item_ids)) != len(item_ids):
            raise ValueError("picker payload items must have unique ids")
        return self


class ScanRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    photo_items: list[PhotoItemPayload] | None = Field(
        default=None,
        alias="photoItems",
        max_length=PICKER_MAX_ITEMS,
    )
    picker_payload: PickerPayload | None = Field(default=None, alias="pickerPayload")
    consent_confirmed: bool = Field(default=False, alias="consentConfirmed")

    @model_validator(mode="after")
    def validate_payload(self) -> "ScanRequest":
        if self.photo_items and self.picker_payload:
            raise ValueError("provide exactly one scan input source")
        if not self.photo_items and not self.picker_payload:
            raise ValueError("photo_items or picker_payload is required")
        return self


def validate_picker_payload(payload: PickerPayload | dict[str, Any]) -> None:
    if not isinstance(payload, PickerPayload):
        PickerPayload.model_validate(payload)


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
