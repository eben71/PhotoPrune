from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol
from urllib.parse import urlparse


class _DeepLinkItem(Protocol):
    @property
    def id(self) -> str: ...


@dataclass(frozen=True)
class _DeepLinkParts:
    _id: str
    deep_link: str | None

    @property
    def id(self) -> str:
        return self._id


def build_google_photos_deep_link(item: _DeepLinkItem) -> str | None:
    return _extract_deep_link(item)


def build_google_photos_deep_link_from_parts(
    item_id: str,
    deep_link: str | None,
) -> str | None:
    return build_google_photos_deep_link(_DeepLinkParts(_id=item_id, deep_link=deep_link))


def _extract_deep_link(item: _DeepLinkItem) -> str | None:
    for attr in ("deep_link", "google_photos_deep_link"):
        value = getattr(item, attr, None)
        if value and _is_exact_google_photos_item_url(str(value)):
            return str(value).strip()
    return None


def _is_exact_google_photos_item_url(value: str) -> bool:
    parsed = urlparse(value.strip())
    path_segments = [segment for segment in parsed.path.split("/") if segment]
    try:
        photo_index = path_segments.index("photo")
    except ValueError:
        return False
    return (
        parsed.scheme == "https"
        and parsed.hostname == "photos.google.com"
        and len(path_segments) > photo_index + 1
    )
