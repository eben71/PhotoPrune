from __future__ import annotations

from datetime import UTC, datetime
from http.client import HTTPException as HTTPClientException
from http.client import IncompleteRead
from io import BytesIO

import pytest
from PIL import Image

from app.core.config import Settings
from app.engine import scan
from app.engine.downloads import DownloadManager, DownloadSecurityError
from app.engine.hashing import HashingService, PerceptualHashes
from app.engine.models import PhotoItem


def test_run_scan_tracks_counts_and_costs(monkeypatch):
    items = [
        _photo_item("one", "https://photos.google.com/one"),
        _photo_item("two", "https://photos.google.com/two"),
    ]
    downloader = DownloadManager(fetcher=_image_bytes)

    def fake_candidate_sets(_items):
        return [_items]

    def fake_near_duplicates(*_args, **_kwargs):
        return ([], [], 1)

    def fake_perceptual_hashes(self: HashingService, _item: PhotoItem) -> PerceptualHashes:
        self.perceptual_hash_count += 1
        return PerceptualHashes(dhash=0, phash=0)

    monkeypatch.setattr(scan, "build_candidate_sets", fake_candidate_sets)
    monkeypatch.setattr(scan, "group_near_duplicates", fake_near_duplicates)
    monkeypatch.setattr(HashingService, "get_perceptual_hashes", fake_perceptual_hashes)

    result = scan.run_scan(items, Settings(), download_manager=downloader)

    counts = result.stage_metrics.counts
    assert counts["selected_images"] == 2
    assert counts["candidate_sets"] == 1
    assert counts["candidate_items"] == 2
    assert counts["byte_hashes"] == 2
    assert counts["perceptual_hashes"] == 2
    assert counts["comparisons_executed"] == 1
    assert counts["downloads_performed"] == 2
    assert result.groups_exact == []
    assert result.groups_very_similar == []
    assert result.groups_possibly_similar == []

    costs = result.cost_estimate
    expected_download = 2 * Settings().scan_cost_per_download
    expected_hash = (
        2 * Settings().scan_cost_per_byte_hash + 2 * Settings().scan_cost_per_perceptual_hash
    )
    expected_comparison = 1 * Settings().scan_cost_per_comparison
    expected_total = expected_download + expected_hash + expected_comparison
    assert costs.download_cost == round(expected_download, 6)
    assert costs.hash_cost == round(expected_hash, 6)
    assert costs.comparison_cost == round(expected_comparison, 6)
    assert costs.total_cost == round(expected_total, 6)


def test_small_input_fallback_runs_hashing_and_comparisons(monkeypatch):
    items = [
        _photo_item("one", "https://photos.google.com/one"),
        _photo_item("two", "https://photos.google.com/two"),
        _photo_item("three", "https://photos.google.com/three"),
    ]
    downloader = DownloadManager(fetcher=_image_bytes)
    observed: dict[str, object] = {}

    def fake_candidate_sets(_items):
        return []

    def fake_near_duplicates(candidate_sets, _hashes, _thresholds):
        observed["candidate_sets"] = candidate_sets
        return ([], [], 1)

    def fake_perceptual_hashes(self: HashingService, _item: PhotoItem) -> PerceptualHashes:
        self.perceptual_hash_count += 1
        return PerceptualHashes(dhash=0, phash=0)

    monkeypatch.setattr(scan, "build_candidate_sets", fake_candidate_sets)
    monkeypatch.setattr(scan, "group_near_duplicates", fake_near_duplicates)
    monkeypatch.setattr(HashingService, "get_perceptual_hashes", fake_perceptual_hashes)

    result = scan.run_scan(items, Settings(), download_manager=downloader)

    counts = result.stage_metrics.counts
    assert counts["fallback_triggered"] == 1
    assert counts["fallback_candidate_items"] == 3
    assert counts["perceptual_hashes"] == 3
    assert counts["comparisons_executed"] == 1
    assert observed["candidate_sets"]


def test_run_scan_reports_an_unreadable_item_and_keeps_valid_duplicates():
    items = [
        _photo_item("one", "https://photos.google.com/one"),
        _photo_item("two", "https://photos.google.com/two"),
        _photo_item("bad", "https://photos.google.com/bad"),
    ]
    duplicate_bytes = _image_bytes(items[0])

    def fetch(item: PhotoItem) -> bytes:
        if item.id == "bad":
            return b"not-an-image"
        return duplicate_bytes

    result = scan.run_scan(items, Settings(), download_manager=DownloadManager(fetcher=fetch))

    assert len(result.groups_exact) == 1
    assert [issue.item_id for issue in result.failed_items] == ["bad"]
    assert result.failed_items[0].reason_code == "IMAGE_BYTES_UNAVAILABLE"


def test_run_scan_fails_when_no_selected_item_has_readable_image_bytes():
    items = [
        _photo_item("one", "https://photos.google.com/one"),
        _photo_item("two", "https://photos.google.com/two"),
    ]
    downloader = DownloadManager(fetcher=lambda _item: b"not-an-image")

    with pytest.raises(ValueError, match="None of the selected photos"):
        scan.run_scan(
            items,
            Settings(),
            download_manager=downloader,
            require_image_bytes=True,
        )


@pytest.mark.parametrize(
    "exception_factory",
    [
        pytest.param(lambda: HTTPClientException("connection interrupted"), id="http-client"),
        pytest.param(lambda: IncompleteRead(b"partial", 128), id="incomplete-read"),
        pytest.param(
            lambda: Image.DecompressionBombError("image is too large"),
            id="decompression-bomb",
        ),
    ],
)
def test_run_scan_reports_expected_read_failures_per_item(exception_factory):
    items = [
        _photo_item("one", "https://photos.google.com/one"),
        _photo_item("two", "https://photos.google.com/two"),
        _photo_item("bad", "https://photos.google.com/bad"),
    ]
    duplicate_bytes = _image_bytes(items[0])

    def fetch(item: PhotoItem) -> bytes:
        if item.id == "bad":
            raise exception_factory()
        return duplicate_bytes

    result = scan.run_scan(
        items,
        Settings(),
        download_manager=DownloadManager(fetcher=fetch),
        require_image_bytes=True,
    )

    assert len(result.groups_exact) == 1
    assert [issue.item_id for issue in result.failed_items] == ["bad"]
    assert result.failed_items[0].reason_code == "IMAGE_BYTES_UNAVAILABLE"


def test_run_scan_preserves_metadata_only_compatibility_unless_bytes_are_required():
    item = _photo_item("metadata-only", None)

    result = scan.run_scan([item], Settings())

    assert result.failed_items == []
    assert result.groups_exact == []
    with pytest.raises(ValueError, match="None of the selected photos"):
        scan.run_scan([item], Settings(), require_image_bytes=True)


def test_run_scan_stops_after_fatal_aggregate_budget_failure():
    calls: list[str] = []

    class FatalBudgetManager(DownloadManager):
        def get_bytes(self, item: PhotoItem) -> bytes:
            calls.append(item.id)
            raise DownloadSecurityError(
                "download_size",
                "The scan exceeded its download size limit.",
                fatal_to_scan=True,
            )

    items = [
        _photo_item("one", "https://photos.google.com/one"),
        _photo_item("two", "https://photos.google.com/two"),
    ]

    with pytest.raises(DownloadSecurityError) as caught:
        scan.run_scan(
            items,
            Settings(),
            download_manager=FatalBudgetManager(),
            require_image_bytes=True,
        )

    assert caught.value.category == "download_size"
    assert calls == ["one"]


def _photo_item(item_id: str, download_url: str | None) -> PhotoItem:
    return PhotoItem(
        id=item_id,
        create_time=datetime(2024, 1, 1, tzinfo=UTC),
        filename=f"{item_id}.jpg",
        mime_type="image/jpeg",
        width=100,
        height=100,
        gps=None,
        download_url=download_url,
        deep_link=None,
    )


def _image_bytes(item: PhotoItem) -> bytes:
    output = BytesIO()
    color = (sum(item.id.encode()) % 255, len(item.id) * 17 % 255, 80)
    Image.new("RGB", (4, 4), color=color).save(output, format="PNG")
    return output.getvalue()
