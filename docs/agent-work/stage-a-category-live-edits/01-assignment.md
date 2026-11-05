# Stage A — category edits reach the public frontend

## Problem

The category editor only saves a private draft. Publishing that draft requires leaving the editor, finding a secondary action menu, and choosing “Publish changes.” Users reasonably believe editing a category should update the visitor frontend, but the primary workflow stops before publication.

## Authorized scope

- Make the edit screen's primary action save the category revision and publish it.
- Keep an explicit secondary action for saving without publishing.
- Explain clearly when a revision was saved but could not yet be published.
- Preserve high-risk reauthentication and permission behavior.
- Confirm public Explore continues to read the promoted canonical category with no stale application cache.
- Add focused frontend tests for the save/publish orchestration and action-state rules.

Do not remove draft revisions, weaken readiness checks, bypass media approval, change permissions, alter public projections, or auto-publish newly created categories.

## Completion gate

1. Existing published category: edit → **Save and publish changes** → new title/summary/description appears through the public categories API.
2. **Save draft** preserves changes without altering the public version.
3. If saving succeeds but publication fails, the UI says the draft is safe and provides the correct next action; it never claims the changes are live.
4. Reauthentication is distinguished from permission and validation failures.
5. Focused frontend tests, lint, typecheck, and diff checks pass.
