from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime
from typing import Any

from app.engine.deeplinks import build_google_photos_deep_link_from_parts
from app.engine.models import GPSLocation, PhotoItem
from app.engine.schemas import PhotoItemPayload


def normalize_photo_items(items: Iterable[PhotoItemPayload]) -> list[PhotoItem]:
    return [
        PhotoItem(
            id=item.id,
            create_time=item.create_time,
            filename=item.filename,
            mime_type=item.mime_type,
            width=item.width,
            height=item.height,
            gps=_build_gps(item.gps_latitude, item.gps_longitude),
            download_url=item.download_url,
            deep_link=build_google_photos_deep_link_from_parts(item.id, item.deep_link),
        )
        for item in items
    ]


def normalize_picker_payload(payload: dict[str, Any]) -> list[PhotoItem]:
    raw_items = _extract_picker_items(payload)
    selection = normalize_picker_selection(raw_items)
    normalized: list[PhotoItem] = []
    for item in selection["acceptedItems"]:
        if not isinstance(item, dict):
            continue
        item_id = _get_first_value(item, ("id",), ("mediaFile", "id"))
        create_time_raw = _get_first_value(
            item,
            ("createTime",),
            ("mediaFile", "createTime"),
            ("mediaFile", "mediaFileMetadata", "creationTime"),
        )
        if not item_id or not create_time_raw:
            continue
        create_time = _parse_datetime(create_time_raw)
        raw_deep_link = _get_first_value(item, ("productUrl",), ("mediaFile", "productUrl"))
        deep_link = build_google_photos_deep_link_from_parts(str(item_id), raw_deep_link)
        normalized.append(
            PhotoItem(
                id=str(item_id),
                create_time=create_time,
                filename=_get_first_value(item, ("filename",), ("mediaFile", "filename")),
                mime_type=_get_first_value(item, ("mimeType",), ("mediaFile", "mimeType")),
                width=_coerce_int(
                    _get_first_value(
                        item,
                        ("width",),
                        ("mediaFile", "width"),
                        ("mediaFile", "mediaFileMetadata", "width"),
                    )
                ),
                height=_coerce_int(
                    _get_first_value(
                        item,
                        ("height",),
                        ("mediaFile", "height"),
                        ("mediaFile", "mediaFileMetadata", "height"),
                    )
                ),
                gps=_extract_gps(item),
                download_url=_get_first_value(item, ("baseUrl",), ("mediaFile", "baseUrl")),
                deep_link=deep_link,
            )
        )
    return normalized


def normalize_picker_selection(items: Iterable[Any]) -> dict[str, Any]:
    supported_mime_types = {"image/jpeg", "image/png"}
    accepted: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    warnings: dict[str, dict[str, Any]] = {}
    summary_counts = {
        "input": 0,
        "accepted": 0,
        "skipped": 0,
        "duplicates": 0,
        "unsupported": 0,
    }
    seen_ids: set[str] = set()

    iterable_items: Iterable[Any]
    if isinstance(items, dict) or isinstance(items, (str, bytes)):
        iterable_items = []
    else:
        iterable_items = items

    for item in iterable_items:
        summary_counts["input"] += 1
        if not isinstance(item, dict):
            skipped.append(
                {
                    "reasonCode": "MALFORMED_ITEM",
                    "message": "Picker item is not an object.",
                    "item": item,
                }
            )
            summary_counts["skipped"] += 1
            continue

        item_id = _get_first_value(item, ("id",), ("mediaFile", "id"))
        create_time_raw = _get_first_value(
            item,
            ("createTime",),
            ("mediaFile", "createTime"),
            ("mediaFile", "mediaFileMetadata", "creationTime"),
        )
        if not item_id or not create_time_raw:
            skipped.append(
                {
                    "reasonCode": "MISSING_FIELDS",
                    "message": "Picker item is missing an id or createTime.",
                    "item": item,
                }
            )
            summary_counts["skipped"] += 1
            continue

        if item_id in seen_ids:
            _add_warning(
                warnings,
                "DUPLICATE_ID",
                "Duplicate picker item id detected; keeping first occurrence.",
            )
            skipped.append(
                {
                    "reasonCode": "DUPLICATE_ID",
                    "message": "Duplicate picker item id detected.",
                    "item": item,
                }
            )
            summary_counts["duplicates"] += 1
            summary_counts["skipped"] += 1
            continue
        seen_ids.add(item_id)

        mime_type = _get_first_value(item, ("mimeType",), ("mediaFile", "mimeType"))
        normalized_mime = mime_type.lower() if mime_type else None
        if normalized_mime not in supported_mime_types:
            _add_warning(
                warnings,
                "UNSUPPORTED_MEDIA",
                "Picker item mime type is not supported.",
            )
            skipped.append(
                {
                    "reasonCode": "UNSUPPORTED_MEDIA",
                    "message": "Picker item mime type is not supported.",
                    "item": item,
                }
            )
            summary_counts["unsupported"] += 1
            summary_counts["skipped"] += 1
            continue

        accepted_item: dict[str, Any] = {
            "id": str(item_id),
            "createTime": str(create_time_raw),
            "filename": _get_first_value(item, ("filename",), ("mediaFile", "filename")),
            "mimeType": mime_type,
            "width": _get_first_value(
                item,
                ("width",),
                ("mediaFile", "width"),
                ("mediaFile", "mediaFileMetadata", "width"),
            ),
            "height": _get_first_value(
                item,
                ("height",),
                ("mediaFile", "height"),
                ("mediaFile", "mediaFileMetadata", "height"),
            ),
            "baseUrl": _get_first_value(item, ("baseUrl",), ("mediaFile", "baseUrl")),
            "productUrl": _get_first_value(item, ("productUrl",), ("mediaFile", "productUrl")),
        }
        latitude_raw = _get_first_value(
            item,
            ("mediaFile", "mediaFileMetadata", "location", "latitude"),
            ("location", "latitude"),
        )
        longitude_raw = _get_first_value(
            item,
            ("mediaFile", "mediaFileMetadata", "location", "longitude"),
            ("location", "longitude"),
        )
        if latitude_raw is not None or longitude_raw is not None:
            accepted_item["location"] = {
                "latitude": latitude_raw,
                "longitude": longitude_raw,
            }

        accepted.append(accepted_item)

    summary_counts["accepted"] = len(accepted)
    summary_counts["skipped"] = len(skipped)

    return {
        "acceptedItems": accepted,
        "skippedItems": skipped,
        "warnings": list(warnings.values()),
        "summaryCounts": summary_counts,
    }


def _extract_picker_items(payload: dict[str, Any]) -> list[Any]:
    items = payload.get("mediaItems") or payload.get("items") or payload.get("media_items")
    if isinstance(items, list):
        return items
    return []


def _get_first_value(item: dict[str, Any], *paths: tuple[str, ...]) -> str | None:
    for path in paths:
        cursor: Any = item
        for key in path:
            if not isinstance(cursor, dict) or key not in cursor:
                cursor = None
                break
            cursor = cursor[key]
        if cursor is not None:
            return str(cursor)
    return None


def _parse_datetime(value: str) -> datetime:
    cleaned = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError:
        return datetime.fromtimestamp(0, tz=UTC)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _coerce_int(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def _build_gps(latitude: float | None, longitude: float | None) -> GPSLocation | None:
    if latitude is None or longitude is None:
        return None
    return GPSLocation(latitude=latitude, longitude=longitude)


def _extract_gps(item: dict[str, Any]) -> GPSLocation | None:
    latitude_raw = _get_first_value(
        item,
        ("mediaFile", "mediaFileMetadata", "location", "latitude"),
        ("location", "latitude"),
    )
    longitude_raw = _get_first_value(
        item,
        ("mediaFile", "mediaFileMetadata", "location", "longitude"),
        ("location", "longitude"),
    )
    try:
        latitude = float(latitude_raw) if latitude_raw is not None else None
        longitude = float(longitude_raw) if longitude_raw is not None else None
    except ValueError:
        return None
    return _build_gps(latitude, longitude)


def _add_warning(
    warnings: dict[str, dict[str, Any]], code: str, message: str, count: int = 1
) -> None:
    if code in warnings:
        warnings[code]["count"] += count
        return
    warnings[code] = {"code": code, "message": message, "count": count}
