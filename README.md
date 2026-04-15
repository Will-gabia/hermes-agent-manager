# Hermes Agent Manager

Remote Docker Management Manager to provision and manage agent containers across multiple remote nodes.

## Features

- **Modern Admin Dashboard**: Responsive grid-based UI for managing Agents, Servers, and Templates.
- **Agent Lifecycle Management**: Provision, Start, Stop, Delete, and Sync status of remote agents.
- **Remote Node Registry**: Manage multiple remote servers with capacity tracking (Current/Max Agents).
- **Template System**: Keyword-based (e.g., `default`) template management with JSON metadata support.
- **DNS Automation**: Automatic Cloudflare DNS record management synchronized with agent lifecycle.
- **Dynamic Routing**: Automatic Caddyfile generation and secure download API for load balancer sync.
- **Search & Filter**: Real-time agent search by domain and "Show Deleted" filter for auditing.
- **API First**: Full REST API protected by `X-API-KEY`, with OpenAPI 3.0 specification.

## Prerequisites

- Node.js v20+
- SQLite3 (managed via Prisma)
- Remote servers running `docker-container-api`

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment:**
   Copy `.env.example` to `.env` and fill in the values (Admin credentials, API Key, etc.).
   ```bash
   cp .env.example .env
   ```

3. **Database setup:**
   ```bash
   npx prisma migrate dev
   npx tsx prisma/seed.ts
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000/admin-ui` in your browser.

## Tech Stack

- **Backend**: Hono (Node.js)
- **ORM**: Prisma + SQLite3
- **Frontend**: Vanilla JS + Pico.css (Custom modern dashboard)
- **Documentation**: OpenAPI 3.0 (YAML)
- **Testing**: Vitest + Supertest

## API & Integration

### API Documentation
Download the OpenAPI specification directly from the Admin UI or access it at `/openapi.yaml`.

### Caddyfile Sync
Load balancers can fetch the latest routing configuration via:
```bash
curl -H "X-API-KEY: {your-api-key}" http://{manager-ip}:3000/api/caddy/download -o Caddyfile
```

## License

ISC
