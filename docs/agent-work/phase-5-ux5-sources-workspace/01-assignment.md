# Phase 5 UX-5 — Sources and Evidence Workspace

Status: `READY_FOR_IMPLEMENTATION`

## Goal

Make scientific citations understandable and efficient for teachers without weakening the structured evidence model.

## Scope

- Show attached sources as compact readable citation cards with verification and supported-record/field context.
- Present two clear paths: add a new source or reuse a saved source.
- Support the existing source types with source-specific labels and guidance: journal article, book, research/report, website or online image, geological map, dataset, institution, and catalogue.
- Infer the internal evidence kind from the selected source type instead of exposing technical values.
- Let the teacher connect a source to the whole record or an active scientific field in plain language.
- Keep optional notes and less-common bibliographic details in an advanced disclosure.
- Preserve title, author/institution, HTTPS link, identifier, publication, year, pages/figure, and rights metadata supported by the current API.

## Boundaries

- Do not change database schema, backend authorization, verification, publication, or evidence contracts.
- Do not add source-file uploads or pretend an uploaded record image is a bibliographic reference; protected files remain in Images and files.
- Do not add edit/delete/verify controls that the existing frontend API does not support.
- Do not redesign other record workspaces in this task.

## Gate

A teacher or admin can identify existing citations, add a type-appropriate source with understandable prompts, reuse a saved source, choose whether it supports the whole record or one field, and attach it without seeing internal evidence-kind terminology.
