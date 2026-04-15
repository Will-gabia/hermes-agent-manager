# Hermes Agent Manager - Gemini Project Mandates

This file contains the foundational mandates and guidelines for Gemini CLI when working on the Hermes Agent Manager project. These instructions take precedence over general defaults.

## 1. Documentation Standards
- **Bilingual Maintenance**: ALL high-level documentation must be maintained in both English and Korean.
  - When `README.md` is updated, `README_ko.md` must be updated simultaneously.
  - When `AGENTS.md` is updated, a Korean counterpart or a combined bilingual structure should be considered for major updates.
- **Development History**: `AGENTS.md` serves as the primary source of truth for architectural decisions and implementation history.

## 2. Gemini Extensions & Skills Usage
This project utilizes the following Gemini CLI capabilities to ensure quality and consistency:

### Extensions
- **Code Review**: Used for validating implementation against design specs.
- **Security Analysis**: Critical for auditing container orchestration and API key management.
- **Context7 (MCP)**: Utilized for fetching up-to-date documentation for libraries like Hono, Prisma, and Vitest.

### Active Skills & Modes
- **using-superpowers**: The foundational skill for orchestrating tasks and selecting appropriate tools.
- **Task Management Mode**: Employed for complex, multi-phase implementations (Plan -> Act -> Validate).
- **Security-First Mindset**: Mandatory validation of all external inputs from remote `docker-container-api` nodes.

## 3. Engineering Guidelines
- **Frameworks**: Backend (Hono/TypeScript), ORM (Prisma/SQLite), Frontend (Vanilla JS/Pico.css).
- **State Normalization**: Always map remote agent statuses to internal `active`/`stopped` types.
- **Loose Coupling**: Prefer optional relations (e.g., Agents to Templates) to allow independent resource management.
- **Caddy Sync**: Always trigger Caddyfile regeneration immediately after status changes (Start/Stop/Provision).

## 4. Operational Protocols
- **API Specification**: Always update `public/openapi.yaml` when modifying API endpoints.
- **Testing**: Run `npm test` before finalizing any logic change.
- **Git Hygiene**: Do not stage or commit changes unless explicitly requested (as per core mandates).
