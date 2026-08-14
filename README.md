# Geo-Kurdistan

Geo-Kurdistan is a geological knowledge platform focused on the geology, discoveries, resources, research, and geological heritage of the Kurdistan Region.

This repository is currently in the visitor-facing showcase phase. The showcase will use realistic mock data to help geology teachers and domain experts validate the information architecture, content model, and user experience before backend or database design begins.

## Repository structure

- frontend/ — Next.js visitor showcase
- backend/ — intentionally deferred; contains documentation only
- docs/ — product context, showcase requirements, and frontend architecture proposal

## Current scope

The current phase includes documentation and a frontend scaffold only. It explicitly excludes a production backend, database schema, authentication, AI, payments, premium accounts, and real administration features.

## Run the frontend

From the frontend directory:

    npm install
    npm run dev

Then open http://localhost:3000.

Useful checks:

    npm run lint
    npm run build

## Documentation

- docs/project-context.md — product vision, audience, constraints, and decision principles
- docs/requirements.md — showcase requirements and acceptance criteria
- docs/frontend-architecture.md — proposed frontend boundaries, routes, and mock-data approach

The requirements are a review baseline, not a finalized database contract. Teacher feedback from the showcase should be recorded before backend design begins.

