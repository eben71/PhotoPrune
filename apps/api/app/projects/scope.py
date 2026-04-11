from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class ScopeDefinition:
    type: str
    album_ids: list[str]


class ScopeProvider(Protocol):
    def resolve(self, definition: ScopeDefinition) -> dict[str, object]: ...


class PickerScopeProvider:
    def resolve(self, definition: ScopeDefinition) -> dict[str, object]:
        return {"type": "picker", "albumIds": []}


class AlbumSetScopeProvider:
    def resolve(self, definition: ScopeDefinition) -> dict[str, object]:
        # TODO(phase-3.4): Replace this stub with read-only album ingestion.
        # TODO(phase-3.4): Support incremental scans that preserve prior decisions.
        return {"type": "album_set", "albumIds": definition.album_ids, "status": "stub"}


def resolve_scope(definition: ScopeDefinition) -> dict[str, object]:
    if definition.type == "album_set":
        return AlbumSetScopeProvider().resolve(definition)
    return PickerScopeProvider().resolve(definition)
