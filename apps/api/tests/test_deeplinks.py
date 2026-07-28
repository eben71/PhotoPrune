from __future__ import annotations

from datetime import UTC, datetime

from app.engine.deeplinks import build_google_photos_deep_link
from app.engine.models import PhotoItem
from app.engine.schemas import PhotoItemPayload, PhotoItemSummary


def test_build_google_photos_deep_link_prefers_existing_payload_link():
    payload = PhotoItemPayload(
        id="photo-1",
        createTime=datetime(2024, 1, 1, tzinfo=UTC),
        googlePhotosDeepLink="https://photos.google.com/photo/1",
    )

    assert build_google_photos_deep_link(payload) == "https://photos.google.com/photo/1"


def test_build_google_photos_deep_link_returns_none_without_source_link():
    summary = PhotoItemSummary(
        id="photo-2",
        createTime=datetime(2024, 1, 1, tzinfo=UTC),
        googlePhotosDeepLink=None,
    )

    assert build_google_photos_deep_link(summary) is None


def test_build_google_photos_deep_link_uses_photo_item_deep_link():
    item = PhotoItem(
        id="photo-3",
        create_time=datetime(2024, 1, 1, tzinfo=UTC),
        filename="photo-3.jpg",
        mime_type="image/jpeg",
        width=10,
        height=10,
        gps=None,
        download_url=None,
        deep_link="https://photos.google.com/photo/3",
    )

    assert build_google_photos_deep_link(item) == "https://photos.google.com/photo/3"


def test_build_google_photos_deep_link_rejects_unproven_fallbacks():
    for url in (
        "https://photos.google.com/",
        "https://photos.google.com/search/photo-4",
        "https://example.com/photo/photo-4",
        "http://photos.google.com/photo/photo-4",
    ):
        payload = PhotoItemPayload(
            id="photo-4",
            createTime=datetime(2024, 1, 1, tzinfo=UTC),
            googlePhotosDeepLink=url,
        )

        assert build_google_photos_deep_link(payload) is None
