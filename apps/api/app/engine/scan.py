from __future__ import annotations

import time
from collections import defaultdict
from collections.abc import Iterable
from uuid import uuid4

from app.core.config import Settings
from app.engine.candidates import (
    CandidateDebug,
    build_candidate_sets,
    build_candidate_sets_with_debug,
)
from app.engine.downloads import DownloadManager
from app.engine.grouping import SimilarityThresholds, group_exact_duplicates, group_near_duplicates
from app.engine.hashing import HashingService
from app.engine.models import PhotoItem
from app.engine.schemas import CostEstimate, ScanResult, StageMetrics


def run_scan(
    items: Iterable[PhotoItem],
    settings: Settings,
    download_manager: DownloadManager | None = None,
    *,
    explain: bool = False,
) -> ScanResult:
    run_id = uuid4().hex
    photo_items = list(items)
    host_overrides = (
        settings.scan_download_host_overrides if settings.environment.lower() != "prod" else {}
    )
    allow_override_exceptions = settings.environment.lower() != "prod" and bool(host_overrides)
    fixture_bytes_dir = (
        settings.scan_fixture_bytes_dir if settings.environment.lower() != "prod" else ""
    )
    download_manager = download_manager or DownloadManager(
        allowed_hosts=settings.scan_allowed_download_hosts,
        host_overrides=host_overrides,
        allow_override_exceptions=allow_override_exceptions,
        fixture_bytes_dir=fixture_bytes_dir,
        fixture_bytes_strict=settings.scan_fixture_bytes_strict,
    )
    hashing_service = HashingService(download_manager)
    timings: dict[str, float] = {}
    counts: dict[str, int] = {"selected_images": len(photo_items)}

    start = time.perf_counter()
    explain_enabled = explain and settings.environment.lower() != "prod"
    candidate_debug: CandidateDebug | None = None
    if explain_enabled:
        candidate_sets, candidate_debug = build_candidate_sets_with_debug(photo_items)
    else:
        candidate_sets = build_candidate_sets(photo_items)
    timings["candidate_narrowing_ms"] = _elapsed_ms(start)
    counts["candidate_sets"] = len(candidate_sets)
    counts["candidate_items"] = sum(len(group) for group in candidate_sets)
    pre_fallback_candidate_sets = candidate_sets

    fallback_sets = _build_small_input_fallback(
        candidate_sets,
        photo_items,
        settings.scan_small_input_fallback_max,
    )
    fallback_candidate_items = sum(len(group) for group in fallback_sets)
    counts["fallback_triggered"] = 1 if fallback_sets else 0
    counts["fallback_candidate_items"] = fallback_candidate_items
    if fallback_sets:
        candidate_sets = fallback_sets
        counts["candidate_sets"] = len(candidate_sets)
        counts["candidate_items"] = fallback_candidate_items

    start = time.perf_counter()
    byte_hashes: dict[str, str] = {}
    for item in photo_items:
        if item.download_url is None:
            continue
        byte_hashes[item.id] = hashing_service.get_byte_hash(item)
    timings["byte_hashing_ms"] = _elapsed_ms(start)
    counts["byte_hashes"] = hashing_service.byte_hash_count

    start = time.perf_counter()
    groups_exact = group_exact_duplicates(photo_items, byte_hashes)
    timings["exact_grouping_ms"] = _elapsed_ms(start)

    exact_hash_counts: dict[str, int] = defaultdict(int)
    for digest in byte_hashes.values():
        exact_hash_counts[digest] += 1
    exact_duplicate_ids = {
        item_id for item_id, digest in byte_hashes.items() if exact_hash_counts[digest] >= 2
    }

    hashable_candidate_sets = [
        [
            item
            for item in group
            if item.download_url is not None and item.id not in exact_duplicate_ids
        ]
        for group in candidate_sets
    ]
    hashable_candidate_sets = [group for group in hashable_candidate_sets if len(group) >= 2]

    start = time.perf_counter()
    perceptual_hashes = {
        item.id: hashing_service.get_perceptual_hashes(item)
        for group in hashable_candidate_sets
        for item in group
    }
    thresholds = SimilarityThresholds(
        dhash_very=settings.scan_dhash_threshold_very,
        dhash_possible=settings.scan_dhash_threshold_possible,
        phash_very=settings.scan_phash_threshold_very,
        phash_possible=settings.scan_phash_threshold_possible,
    )
    groups_very, groups_possible, comparisons = group_near_duplicates(
        hashable_candidate_sets,
        perceptual_hashes,
        thresholds,
    )
    timings["perceptual_hashing_ms"] = _elapsed_ms(start)
    counts["perceptual_hashes"] = hashing_service.perceptual_hash_count
    counts["comparisons_executed"] = comparisons
    counts["downloads_performed"] = download_manager.download_count

    debug = _build_scan_debug(
        candidate_sets=pre_fallback_candidate_sets,
        candidate_debug=candidate_debug,
        explain_enabled=explain_enabled,
    )
    if explain_enabled and candidate_debug:
        counts.update(
            {
                "narrowing_reason_dropped_missing_dims": len(candidate_debug.missing_dims_ids),
                "narrowing_reason_time_bucket_mismatch": len(
                    candidate_debug.time_bucket_mismatch_ids
                ),
                "narrowing_reason_mime_mismatch": len(candidate_debug.mime_mismatch_ids),
            }
        )
    stage_metrics = StageMetrics(
        timingsMs=timings,
        counts=counts,
        debug=debug,
    )
    cost_estimate = _estimate_costs(settings, counts)
    return ScanResult(
        runId=run_id,
        inputCount=len(photo_items),
        stageMetrics=stage_metrics,
        costEstimate=cost_estimate,
        groupsExact=groups_exact,
        groupsVerySimilar=groups_very,
        groupsPossiblySimilar=groups_possible,
    )


def _estimate_costs(settings: Settings, counts: dict[str, int]) -> CostEstimate:
    download_cost = counts.get("downloads_performed", 0) * settings.scan_cost_per_download
    hash_cost = (
        counts.get("byte_hashes", 0) * settings.scan_cost_per_byte_hash
        + counts.get("perceptual_hashes", 0) * settings.scan_cost_per_perceptual_hash
    )
    comparison_cost = counts.get("comparisons_executed", 0) * settings.scan_cost_per_comparison
    total_cost = download_cost + hash_cost + comparison_cost
    return CostEstimate(
        totalCost=round(total_cost, 6),
        downloadCost=round(download_cost, 6),
        hashCost=round(hash_cost, 6),
        comparisonCost=round(comparison_cost, 6),
    )


def _elapsed_ms(start: float) -> float:
    return round((time.perf_counter() - start) * 1000, 2)


def _build_small_input_fallback(
    candidate_sets: list[list[PhotoItem]],
    photo_items: list[PhotoItem],
    fallback_max: int,
) -> list[list[PhotoItem]]:
    if candidate_sets or len(photo_items) > fallback_max:
        return []
    ordered = sorted(photo_items, key=lambda entry: (entry.create_time, entry.id))
    return [ordered] if len(ordered) >= 2 else []


def _build_scan_debug(
    *,
    candidate_sets: list[list[PhotoItem]],
    candidate_debug: CandidateDebug | None,
    explain_enabled: bool,
) -> dict[str, object] | None:
    if not explain_enabled or candidate_debug is None:
        return None
    debug: dict[str, object] = {
        "candidate_bucket_sizes": candidate_debug.bucket_size_counts,
    }
    if not candidate_sets:
        debug["candidate_sets_empty"] = True
        debug["narrowing_reasons"] = {
            "missing_dims": candidate_debug.missing_dims_ids,
            "time_bucket_mismatch": candidate_debug.time_bucket_mismatch_ids,
            "mime_mismatch": candidate_debug.mime_mismatch_ids,
        }
    return debug
