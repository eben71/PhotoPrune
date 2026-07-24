from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.engine.schemas import ScanRequest
from app.projects.schemas import ProjectScanRequest


def test_scan_request_parses_photo_items_by_alias():
    payload = {
        "photoItems": [
            {
                "id": "photo-1",
                "createTime": "2024-01-01T00:00:00Z",
                "filename": "IMG_0001.jpg",
            }
        ],
        "consentConfirmed": True,
    }

    request = ScanRequest.model_validate(payload)

    assert request.photo_items is not None
    assert request.photo_items[0].id == "photo-1"
    assert request.photo_items[0].filename == "IMG_0001.jpg"
    assert request.consent_confirmed is True


def test_scan_request_parses_picker_payload_by_alias():
    payload = {"pickerPayload": {"mediaItems": []}}

    request = ScanRequest.model_validate(payload)

    assert request.picker_payload is not None
    assert request.picker_payload.model_dump(by_alias=True) == {"mediaItems": []}


def test_scan_request_rejects_duplicate_picker_payload_ids():
    item = {
        "id": "photo-1",
        "baseUrl": "https://photos.google.com/photo-1",
    }

    with pytest.raises(ValidationError, match="unique ids"):
        ScanRequest.model_validate({"pickerPayload": {"mediaItems": [item, item]}})


def test_scan_request_rejects_two_input_sources():
    with pytest.raises(ValidationError, match="exactly one scan input source"):
        ScanRequest.model_validate(
            {
                "photoItems": [
                    {
                        "id": "photo-1",
                        "createTime": "2024-01-01T00:00:00Z",
                    }
                ],
                "pickerPayload": {
                    "mediaItems": [
                        {
                            "id": "picker-1",
                            "baseUrl": "https://lh3.googleusercontent.com/item",
                        }
                    ]
                },
            }
        )


def test_project_scan_request_allows_album_set_source_ref_media_items():
    request = ProjectScanRequest.model_validate(
        {
            "sourceType": "album_set",
            "sourceRef": {
                "type": "album_set",
                "mediaItems": [{"id": "item-1", "createTime": "2025-01-01T00:00:00Z"}],
            },
        }
    )

    assert request.source_type == "album_set"
    assert request.source_ref is not None
    assert request.source_ref.media_items[0].id == "item-1"


def test_project_scan_request_allows_album_set_source_ref_paged_media_items():
    request = ProjectScanRequest.model_validate(
        {
            "sourceType": "album_set",
            "sourceRef": {
                "type": "album_set",
                "pagedMediaItems": [
                    {"items": [{"id": "item-1", "createTime": "2025-01-01T00:00:00Z"}]}
                ],
            },
        }
    )

    assert request.source_type == "album_set"
    assert request.source_ref is not None
    assert request.source_ref.paged_media_items[0].items[0].id == "item-1"


@pytest.mark.parametrize(
    "payload",
    [
        {"photoItems": [], "unexpected": True},
        {
            "pickerPayload": {
                "mediaItems": [
                    {
                        "id": "item-1",
                        "baseUrl": "https://photos.google.com/item-1",
                        "unexpected": True,
                    }
                ]
            }
        },
        {
            "sourceType": "album_set",
            "sourceRef": {"albumIds": ["album-1"], "unexpected": True},
        },
    ],
)
def test_scan_boundaries_forbid_unknown_keys(payload):
    model = ProjectScanRequest if "sourceType" in payload else ScanRequest

    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        model.model_validate(payload)


@pytest.mark.parametrize(
    "payload",
    [
        {
            "photoItems": [
                {
                    "id": "x" * 513,
                    "createTime": "2025-01-01T00:00:00Z",
                }
            ]
        },
        {
            "photoItems": [
                {
                    "id": "item-1",
                    "createTime": "2025-01-01T00:00:00Z",
                    "filename": "x" * 1025,
                }
            ]
        },
        {
            "photoItems": [
                {
                    "id": "item-1",
                    "createTime": "2025-01-01T00:00:00Z",
                    "downloadUrl": f"https://example.test/{'x' * 4096}",
                }
            ]
        },
    ],
)
def test_scan_boundaries_reject_oversized_strings(payload):
    with pytest.raises(ValidationError, match="at most"):
        ScanRequest.model_validate(payload)
