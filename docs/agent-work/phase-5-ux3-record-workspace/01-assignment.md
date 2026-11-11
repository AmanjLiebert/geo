# Phase 5 UX-3 — Record Workspace

Status: `READY_FOR_IMPLEMENTATION`

## Goal

Replace the long stack of simultaneous record forms with a focused workspace designed around the teacher's sequence of decisions and frequent editing tasks.

## Scope

- Keep the record identity, status, and classification visible without technical template/version details.
- Add an accessible section navigator for details, scientific fields, sources, location, related items, and media.
- Show one work section at a time while keeping all section components mounted so switching sections does not discard unsaved input.
- Make record details the first section for an existing classified draft and keep the guided category/type selection first for a new or unclassified record.
- Retain clear return-to-list, save state, errors, and archived/read-only states.
- Provide a compact responsive layout with touch-safe controls and no page-scale horizontal scrolling.

## Boundaries

- Do not change API contracts, record mutation rules, review/publication behavior, or authorization.
- Do not redesign the internal media gallery or source-entry form in this task; those require separate focused tasks.
- Do not add autosave, fake completion percentages, or claims that unavailable workflows exist.
- Do not expose template IDs, internal record IDs, storage details, or security implementation.

## Gate

A teacher or admin can identify the record and classification, navigate among all existing record work sections without traversing one long page, and return to a partly completed section without losing its local input. Existing create, classify, save, archived, and read-only behavior continues to pass.
