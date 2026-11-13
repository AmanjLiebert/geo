# Explore image delivery checks

Status: `IMPLEMENTED_AWAITING_REVIEW`. Checks by implementing Codex; no independent release approval.

- Focused media/HTTP tests: 18 passed, including unchanged revalidation without object fetch, rejected media denial despite matching validator, changed content, distinct derivative validators, 304/private response, unpublished-record denial, and rejected original/unknown size.
- Full backend suite: 52 files, 417 tests passed. Full frontend suite: 30 files, 326 tests passed.
- Backend and frontend type checks passed. Full backend lint initially found three issues in the new test fixture only; these were corrected and focused fixture lint passed. Frontend component lint passed. Focused tests reran successfully after fixture correction.
- Docker API/frontend production builds passed; existing frontend fallback-font warning remains. Build dependency prune reported existing dependency advisories; no dependency changes were made here.
- Both affected local services recreated and became healthy; all six Compose services healthy.
- Live requests: display/thumbnail 200 with WebP, changed size selection, private mandatory-revalidation headers, ETags and empty 304 responses. `size=original` returns 400. Image sizes/timings recorded in implementation report.
- Browser: fossil collection images loaded with `?size=thumbnail`; opened record loaded a default display image at natural width 1438. Existing title/facts/sources remained visible.
- Negative content/media revocation covered by focused tests and source order; no real teacher record was unpublished just to probe caching.
- Scoped `git diff --check` passed. Whole-workspace diff check reported an unrelated pre-existing blank line in account CSS, which was preserved.

Limits: cold storage requests remain remote; no load/soak test, target-host benchmark, independent audit or remote release performed. Private browser storage is permitted but mandatory revalidation prevents reuse without a fresh public-eligibility decision. Previously downloaded public pixels cannot be retroactively revoked, as with any image viewing.
