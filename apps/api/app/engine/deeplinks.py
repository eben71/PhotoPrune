from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol
from urllib.parse import quote


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
    deep_link = _extract_deep_link(item)
    if deep_link:
        return deep_link
    item_id = getattr(item, "id", None)
    if not item_id:
        return None
    safe_id = quote(str(item_id))
    return f"https://photos.google.com/search/{safe_id}"


def build_google_photos_deep_link_from_parts(
    item_id: str,
    deep_link: str | None,
) -> str | None:
    return build_google_photos_deep_link(_DeepLinkParts(_id=item_id, deep_link=deep_link))


def _extract_deep_link(item: _DeepLinkItem) -> str | None:
    for attr in ("deep_link", "google_photos_deep_link"):
        value = getattr(item, attr, None)
        if value:
            return str(value)
    return None
