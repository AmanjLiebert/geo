# Maintenance architecture and delivery operating model

## Objective

Create a durable plan for completing and maintaining Geo-Kurdistan while product behavior is still evolving. The plan must keep the existing modular-monolith architecture, make unfinished capabilities easy to add safely, control server resource use, and define the future OpenCode implementation / Codex review workflow.

## Authorized scope

- Update `PLAN.md` with the ordered evolution and maintenance roadmap.
- Update `MAP.md` with extension boundaries, deployment/resource boundaries, and the change-safety model.
- Update `AGENTS.md` with the OpenCode / Codex ownership and handoff rules.
- Add one detailed maintenance guide under `docs/maintenance/`.
- Update `MEMORY.md` and this task's report/verification files.

No production code, schema, API, UI, deployment, secrets, or live data may change in this task.

## Required decisions

1. Preserve the Next.js + NestJS modular monolith + PostgreSQL + worker architecture until measurements justify a split.
2. Define completion workstreams for the existing records/categories flow, research, managed site pages, discovery, and optional AI.
3. Require backwards-compatible API/schema evolution, feature flags for incomplete capabilities, migrations, rollback instructions, and preserved content history.
4. Define performance budgets and measurement gates for RAM, CPU, database queries, media jobs, pages, and optional AI.
5. Keep AI optional, externally hosted first, isolated behind a provider interface and kill switch, and unable to mutate canonical content.
6. Formalize one active task at a time: Codex assigns and reviews; OpenCode implements and reports.

## Completion gate

- The roadmap produces a usable result after each stage.
- Every future feature has an owner module, contract boundary, test gate, resource impact, and rollback path.
- The OpenCode / Codex workflow is unambiguous and prevents self-approval.
- Documentation is internally consistent and `git diff --check` passes.
