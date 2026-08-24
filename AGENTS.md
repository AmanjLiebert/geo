# Geo-Kurdistan Development Rules

## Current Phase

We are currently building the visitor-facing showcase.

Do NOT implement:
- Production backend
- PostgreSQL schema
- Prisma models
- Authentication
- Admin dashboard
- FIB payment integration
- AI integration
- Premium accounts
- Production storage architecture

unless explicitly requested.

## Development Philosophy

The showcase exists to validate the project's information architecture with geology teachers before backend development begins.

Use realistic mock data.

Do not hardcode the application around one example item.

Keep components reusable.

Keep mock content/data separate from UI components where practical.

Do not assume every geological category has identical fields.

Do not create unnecessary complexity.

## Design

The website should feel:
- Scientific
- Modern
- Trustworthy
- Organized
- Educational
- Visually interesting

Use a modern Neo/Neo-scientific direction combined with clean Material-style organization.

Avoid generic corporate/university website aesthetics.

The design should prioritize:
1. Clear information hierarchy
2. Excellent exploration
3. Strong typography
4. Good spacing
5. Visual geological content
6. Responsive behavior
7. Accessibility

The website should feel impressive through exploration rather than relying on excessive visual effects.

## Engineering

Use:
- Next.js
- TypeScript
- React
- Component-based architecture

Prefer:
- Reusable components
- Clear naming
- Small focused components
- Type safety
- Maintainable architecture

Avoid:
- Giant components
- Duplicate UI
- Unnecessary dependencies
- Premature backend/database decisions

## Important

When requirements are uncertain, do not silently invent permanent business rules.

Use mock data and make the UI flexible so the requirements can be changed after teacher feedback.