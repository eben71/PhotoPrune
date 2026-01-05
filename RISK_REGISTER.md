# RISK REGISTER

| ID | Risk | Severity | Impact | Mitigation | Status |
| --- | --- | --- | --- | --- | --- |
| R-001 | Google Photos Library API quota (10,000 requests/day) limits full-library scans. | High | Feasibility may be blocked for large libraries. | Measure requests per scan and compute scans/day ceiling. | Open |
| R-002 | `baseUrl` may expire quickly, requiring frequent refreshes. | High | Scans and review experience may break if URLs expire quickly. | Measure expiry at T+0/T+15/T+60 and test `mediaItems.get` refresh. | Open |
| R-003 | Missing checksum/hash fields in API responses. | High | Duplicate detection may require expensive downloads or heuristics. | Verify API fields and document fallback strategies. | Open |
| R-004 | Metadata completeness gaps (filename, creationTime, dimensions). | Medium | Matching accuracy and UX degrade if metadata is missing. | Track completeness during scans and classify GREEN/AMBER/RED. | Open |
| R-005 | OAuth refresh instability or forced re-auth mid-scan. | High | Long scans may fail or require user interaction. | Track refresh events and failures during scans. | Open |
| R-006 | Incremental scan infeasible (no filters or durable tokens). | Medium | Re-scans may burn quota and time. | Test `mediaItems.search` date filters and local diffing. | Open |
