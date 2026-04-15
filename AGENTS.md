# Development History & Context (AGENTS.md)

This document tracks the evolution of the Hermes Agent Manager, documenting key architectural decisions and implementations for future reference.

## 1. Project Initialization (2026-04-15)
- **Goal**: Implement a control plane for remote Docker containers based on the `2026-04-14` design specs.
- **Base Stack**: Hono (Backend), Prisma + SQLite (DB), Vanilla JS + Pico.css (Frontend).

## 2. Key Architectural Decisions

### Agent Identification
- **Decision**: Use `container_name` (assigned as `slug`) as the primary identifier for remote operations (`start`, `stop`, `refresh`).
- **Reasoning**: The remote `docker-container-api` uses names as identifiers in its REST paths. ID is kept as a fallback.

### Data Normalization
- **Status Mapping**: Mapped remote Docker statuses (`running`, `exited`, `created`) to internal design statuses (`active`, `stopped`).
- **Port Extraction**: Implemented robust port extraction to handle various remote API response formats (`ports[0].host`, `port`, `service_port`).

### Loose Coupling: Agents & Templates
- **Decision**: Made `template_id` optional in the `Container` model with `onDelete: SetNull`.
- **Reasoning**: Allows users to delete or rotate templates without breaking existing agent records or losing audit history.

### Synchronous Orchestration
- **Workflow**: Create DB entry (reserved) -> Remote Provision -> Update DNS (Cloudflare) -> Update DB (active) -> Regenerate Caddyfile.
- **Validation**: Added explicit `GET` status check after `start`/`stop` commands to ensure DB consistency with actual remote state.

## 3. UI/UX Evolution
- **Grid Layout**: Shifted from table-based to card-based grid for "Agents" to provide a higher-density view with better readability.
- **Terminology**: Standardized on "Agents" instead of "Containers" to align with product goals.
- **Interactive Feedback**: Added `aria-busy` and button disabling during asynchronous operations to prevent race conditions and improve user feedback.
- **Clipboard Integration**: Enabled one-click copy for Domain names and API Keys.

## 4. Feature Log

### Infrastructure
- [x] Hono server with session-based Admin auth and API-Key auth.
- [x] Prisma schema with 5 core models.
- [x] Initial template seeding (`default` keyword).

### Services
- [x] **CloudflareService**: DNS record CRUD.
- [x] **CaddyfileService**: Template-based regeneration of routing rules.
- [x] **RemoteDockerService**: abstraction over `docker-container-api` using `X-API-KEY`.
- [x] **OrchestrationService**: Multi-step provisioning logic.

### API & Documentation
- [x] CRUD for Servers and Templates.
- [x] Search and filtering for Agents list.
- [x] Caddyfile content viewing and download API.
- [x] OpenAPI 3.0 specification (`public/openapi.yaml`).

## 5. Ongoing & Future Considerations
- **Load Balancer Integration**: Current design expects LB to pull `Caddyfile` via the download API.
- **Template Expansion**: `docker-container-api` needs to be updated to consume the `template` field passed in creation options.
- **E2E Testing**: Core API tests are in place using Vitest; further UI-level E2E tests could be added.
- **Capacity Management**: `max_agents` field is enforced in UI/API display but could be used for hard-limiting during provisioning in future iterations.
