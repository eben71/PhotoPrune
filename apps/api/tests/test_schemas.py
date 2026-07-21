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

    assert request.picker_payload == {"mediaItems": []}


def test_scan_request_rejects_duplicate_picker_payload_ids():
    item = {
        "id": "photo-1",
        "baseUrl": "https://photos.google.com/photo-1",
    }

    with pytest.raises(ValidationError, match="unique ids"):
        ScanRequest.model_validate({"pickerPayload": {"mediaItems": [item, item]}})


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
    assert request.source_ref["mediaItems"][0]["id"] == "item-1"


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
    assert request.source_ref["pagedMediaItems"][0]["items"][0]["id"] == "item-1"
