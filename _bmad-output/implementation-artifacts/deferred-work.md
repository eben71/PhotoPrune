- source_spec: `_bmad-output/implementation-artifacts/spec-pp-027-repair-real-photo-scan-input-and-picker-lifecycle.md`
  summary: Reloading a saved project scan currently reconstructs an envelope without the original per-item failed-item facts; PP-015 owns persisted run and scan lifecycle truth.
  evidence: PP-027 keeps failure details in the matching current-session envelope without persisting Picker URLs, while the existing repository reload path rebuilds `failedItems` as empty.

- source_spec: `_bmad-output/implementation-artifacts/spec-pp-039-preserve-user-activation-for-google-oauth-popup.md`
  summary: Reconcile the user-owned `packageManager` change with the pnpm version pinned by CI and repository setup guidance.
  evidence: The pending `package.json` change selects pnpm 11.20 while existing CI and documentation still pin pnpm 11.9; PP-039 does not own dependency-toolchain policy.

- source_spec: `_bmad-output/implementation-artifacts/spec-pp-039-preserve-user-activation-for-google-oauth-popup.md`
  summary: Decide whether the generated Next.js environment declaration should reference development-only route types.
  evidence: The pending `apps/web/next-env.d.ts` change references `.next/dev/types/routes.d.ts`, which may not exist on a clean production or CI checkout; PP-039 preserves this user-owned change unchanged.

- source_spec: `_bmad-output/implementation-artifacts/spec-pp-039-preserve-user-activation-for-google-oauth-popup.md`
  summary: Narrow the temporary BMAD backup ignore rule if it is intended to match only the repository-root directory.
  evidence: The pending `.gitignore` pattern is unanchored and can ignore same-named directories below other paths; PP-039 preserves this user-owned change unchanged.
