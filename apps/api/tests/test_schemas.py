from __future__ import annotations

from app.engine.schemas import ScanRequest


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
