# Six main category profiles — operational checks

Status: `IMPLEMENTED_AWAITING_REVIEW`. Executing-agent checks only; not independent verification or release approval.

- Public categories API returns exactly six root categories, each with nonempty summary, Kurdistan-focused description, source attribution and image association.
- All six public image endpoints returned HTTP 200 with `image/webp`.
- Browser Explore renders six collection cards; all six category images completed decoding with nonzero natural width.
- Source contact sheet and individual Bekhal Spring preview were visually inspected before upload. All selected images depict the actual category subject. The map gives regional structural context, and museum display location is not confused with specimen provenance.
- Normal processor reported approved/clean for all six images; normal category publish readiness passed.
- Public scientific records API remains at zero records. All six running application services report healthy.
- No application source/build changed, so no build or automated application test suite was run for this content-only operation. Backup restoration was not rehearsed.

Content reference for structural setting: https://www.sciencedirect.com/science/article/abs/pii/S0264817222003920 (Fold formation in Kurdish Zagros, N Iraq). Groundwater terminology: https://www.usgs.gov/faqs/what-groundwater and https://www.usgs.gov/water-science-school/science/water-science-glossary. Image-source pages are listed in the content manifest.
