- source_spec: `_bmad-output/implementation-artifacts/spec-pp-027-repair-real-photo-scan-input-and-picker-lifecycle.md`
  summary: Reloading a saved project scan currently reconstructs an envelope without the original per-item failed-item facts; PP-015 owns persisted run and scan lifecycle truth.
  evidence: PP-027 keeps failure details in the matching current-session envelope without persisting Picker URLs, while the existing repository reload path rebuilds `failedItems` as empty.
