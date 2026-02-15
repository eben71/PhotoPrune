from __future__ import annotations

from datetime import UTC, datetime

from app.engine import normalizer
from app.engine.schemas import PhotoItemPayload


def test_normalize_photo_items_builds_gps():
    payload = PhotoItemPayload(
        id="item-1",
        createTime=datetime(2024, 1, 1, tzinfo=UTC),
        filename="image.jpg",
        mimeType="image/jpeg",
        width=640,
        height=480,
        gpsLatitude=47.62,
        gpsLongitude=-122.33,
        downloadUrl="https://photos.google.com/image.jpg",
        googlePhotosDeepLink="https://photos.google.com/photo/1",
    )

    normalized = normalizer.normalize_photo_items([payload])

    assert normalized[0].gps is not None
    assert normalized[0].gps.latitude == 47.62
    assert normalized[0].gps.longitude == -122.33


def test_normalize_picker_payload_extracts_nested_fields():
    payload = {
        "mediaItems": [
            {
                "mediaFile": {
                    "id": "abc",
                    "createTime": "2024-01-01T10:00:00Z",
                    "filename": "photo.png",
                    "mimeType": "image/png",
                    "mediaFileMetadata": {
                        "width": "1200",
                        "height": "800",
                        "location": {"latitude": "40.7", "longitude": "-74.0"},
                    },
                    "baseUrl": "https://photos.google.com/media/abc",
                    "productUrl": "https://photos.google.com/photo/abc",
                }
            },
            {"mediaFile": {"id": "missing-create"}},
            "not-a-dict",
        ]
    }

    normalized = normalizer.normalize_picker_payload(payload)

    assert len(normalized) == 1
    item = normalized[0]
    assert item.id == "abc"
    assert item.create_time == datetime(2024, 1, 1, 10, 0, 0, tzinfo=UTC)
    assert item.width == 1200
    assert item.height == 800
    assert item.gps is not None
    assert item.gps.latitude == 40.7
    assert item.gps.longitude == -74.0
    assert item.download_url == "https://photos.google.com/media/abc"
    assert item.deep_link == "https://photos.google.com/photo/abc"


def test_normalize_picker_selection_single_item_no_warning():
    items = [
        {
            "id": "item-1",
            "createTime": "2024-01-01T10:00:00Z",
            "mediaFile": {
                "filename": "one photo.jpg",
                "mimeType": "image/jpeg",
                "baseUrl": "https://photos.google.com/media/one",
            },
        }
    ]

    result = normalizer.normalize_picker_selection(items)

    assert result["summaryCounts"]["accepted"] == 1
    assert result["summaryCounts"]["skipped"] == 0
    assert result["warnings"] == []


def test_normalize_picker_selection_handles_mixed_filenames():
    filenames = [
        "summer trip 2024.png",
        "東京の写真.jpg",
        "very-long-file-name-" + "x" * 80 + ".jpeg",
        "with-multiple.dots.and spaces.png",
    ]
    items = [
        {
            "id": f"item-{index}",
            "createTime": "2024-01-01T10:00:00Z",
            "mediaFile": {
                "filename": filename,
                "mimeType": "image/png" if filename.endswith(".png") else "image/jpeg",
            },
        }
        for index, filename in enumerate(filenames)
    ]

    result = normalizer.normalize_picker_selection(items)

    assert result["summaryCounts"]["accepted"] == len(items)
    assert result["summaryCounts"]["skipped"] == 0
    assert result["warnings"] == []


def test_normalize_picker_selection_deduplicates_ids_with_warning():
    items = [
        {
            "id": "dup-1",
            "createTime": "2024-01-01T10:00:00Z",
            "mediaFile": {"filename": "first.jpg", "mimeType": "image/jpeg"},
        },
        {
            "id": "dup-1",
            "createTime": "2024-01-01T10:00:00Z",
            "mediaFile": {"filename": "second.jpg", "mimeType": "image/jpeg"},
        },
    ]

    result = normalizer.normalize_picker_selection(items)

    assert result["summaryCounts"]["accepted"] == 1
    assert result["summaryCounts"]["skipped"] == 1
    duplicate_warning = next(
        warning for warning in result["warnings"] if warning["code"] == "DUPLICATE_ID"
    )
    assert duplicate_warning["count"] == 1


def test_normalize_picker_selection_skips_unsupported_media_with_warning():
    items = [
        {
            "id": "keep-1",
            "createTime": "2024-01-01T10:00:00Z",
            "mediaFile": {"filename": "keep.jpg", "mimeType": "image/jpeg"},
        },
        {
            "id": "skip-1",
            "createTime": "2024-01-01T10:00:00Z",
            "mediaFile": {"filename": "skip.heic", "mimeType": "image/heic"},
        },
    ]

    result = normalizer.normalize_picker_selection(items)

    assert result["summaryCounts"]["accepted"] == 1
    assert result["summaryCounts"]["skipped"] == 1
    unsupported_warning = next(
        warning for warning in result["warnings"] if warning["code"] == "UNSUPPORTED_MEDIA"
    )
    assert unsupported_warning["count"] == 1


def test_parse_datetime_handles_invalid_and_naive_values():
    invalid = normalizer._parse_datetime("not-a-date")
    assert invalid == datetime.fromtimestamp(0, tz=UTC)

    naive = normalizer._parse_datetime("2024-01-01T12:00:00")
    assert naive.tzinfo == UTC


def test_coerce_int_handles_bad_values():
    assert normalizer._coerce_int(None) is None
    assert normalizer._coerce_int("bad") is None
