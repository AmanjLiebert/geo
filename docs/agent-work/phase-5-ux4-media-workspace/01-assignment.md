# Phase 5 UX-4 — Media Workspace

Status: `READY_FOR_IMPLEMENTATION`

## Goal

Turn the record Media section into a visual, understandable gallery and upload workflow while preserving the private media security boundary.

## Scope

- Show attached images in consistent square protected previews; use clear same-size states for videos, documents, processing, failure, and missing preview.
- Add an accessible drag-and-drop/select-file area for one supported file at a time.
- Show the selected image preview before upload and make selected filename/type obvious.
- Keep purpose, caption, image alt text, rights statement, and primary-image choice in the main flow.
- Put description, credit, and licence in an optional advanced disclosure.
- Make View and Make primary the prominent attachment actions; group reorder, edit, and detach as secondary management actions.
- Keep all existing processing states, private short-lived viewing, inline presentation, edit, reorder, primary, and detach behavior.

## Boundaries

- Do not change storage, scanning, approval, authorization, size/type limits, or backend API contracts.
- Do not expose original object keys, storage URLs, permanent public URLs, or download controls.
- Do not add batch upload, public media delivery, or new video-processing claims.
- Do not redesign sources/evidence in this task.

## Gate

A teacher or admin can see attached images without opening each file, select or drop a supported file, enter understandable required information, add multiple attachments one at a time, identify the primary image and processing state, and reach infrequent management actions without visual clutter.
