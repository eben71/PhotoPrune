from __future__ import annotations

from collections import Counter, defaultdict
from collections.abc import Sequence
from dataclasses import dataclass

from app.engine.models import PhotoItem


def build_candidate_sets(items: Sequence[PhotoItem]) -> list[list[PhotoItem]]:
    candidate_sets, _ = build_candidate_sets_with_debug(items)
    return candidate_sets


@dataclass(frozen=True)
class CandidateDebug:
    bucket_size_counts: dict[int, int]
    missing_dims_ids: list[str]
    time_bucket_mismatch_ids: list[str]
    mime_mismatch_ids: list[str]


def build_candidate_sets_with_debug(
    items: Sequence[PhotoItem],
) -> tuple[list[list[PhotoItem]], CandidateDebug]:
    buckets: dict[str, list[PhotoItem]] = defaultdict(list)
    date_counts: Counter[str] = Counter()
    mime_counts: Counter[str] = Counter()
    missing_dims_ids: list[str] = []
    for item in items:
        buckets[_bucket_key(item)].append(item)
        date_counts[_date_bucket(item)] += 1
        mime_counts[_mime_bucket(item)] += 1
        if not item.width or not item.height:
            missing_dims_ids.append(item.id)

    candidate_sets: list[list[PhotoItem]] = []
    bucket_size_counts: Counter[int] = Counter()
    for key in sorted(buckets.keys()):
        bucket_items = sorted(
            buckets[key],
            key=lambda entry: (entry.create_time, entry.id),
        )
        bucket_size_counts[len(bucket_items)] += 1
        if len(bucket_items) >= 2:
            candidate_sets.append(bucket_items)

    time_bucket_mismatch_ids = [item.id for item in items if date_counts[_date_bucket(item)] <= 1]
    mime_mismatch_ids = [item.id for item in items if mime_counts[_mime_bucket(item)] <= 1]
    debug = CandidateDebug(
        bucket_size_counts=dict(bucket_size_counts),
        missing_dims_ids=missing_dims_ids,
        time_bucket_mismatch_ids=time_bucket_mismatch_ids,
        mime_mismatch_ids=mime_mismatch_ids,
    )
    return candidate_sets, debug


def _bucket_key(item: PhotoItem) -> str:
    date_key = item.create_time.date().isoformat()
    ratio_key = _aspect_ratio_class(item.width, item.height)
    resolution_key = _resolution_bucket(item.width, item.height)
    return f"{date_key}:{ratio_key}:{resolution_key}"


def _date_bucket(item: PhotoItem) -> str:
    return item.create_time.date().isoformat()


def _mime_bucket(item: PhotoItem) -> str:
    return item.mime_type or "unknown"


def _aspect_ratio_class(width: int | None, height: int | None) -> str:
    if not width or not height:
        return "unknown"
    ratio = width / height
    if ratio >= 1.2:
        return "landscape"
    if ratio <= 0.8:
        return "portrait"
    return "square"


def _resolution_bucket(width: int | None, height: int | None) -> str:
    if not width or not height:
        return "unknown"
    megapixels = int((width * height) / 1_000_000)
    return f"{megapixels}mp"
