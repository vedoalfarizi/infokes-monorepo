# File Explorer

A web application for browsing a hierarchical folder structure. It presents a two-pane layout: a collapsible folder tree on the left and a detail view of the selected folder's direct children on the right.

![Two-pane layout with folder tree on the left and child table on the right]

## Features

- Browse nested folders in a collapsible tree
- Lazy-load children on first expand — results are cached
- Right pane shows direct children with their own child counts
- Create, rename, and delete folders
- Folder names are unique within the same parent (enforced at the DB and API layers)

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | [Bun](https://bun.sh) |
| Backend framework | [ElysiaJS](https://elysiajs.com) + TypeBox |
| Database | PostgreSQL (closure table for hierarchy) |
| Frontend build | [Vite](https://vitejs.dev) |
| Frontend framework | Vue 3 (Composition API) |
| State management | Pinia |
| UI components | PrimeVue 4 |
| Testing | Vitest + fast-check (configured, no tests written yet) |

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- Node.js ≥ 18 (for the frontend)
- Docker (used to run PostgreSQL locally via `make migrate` / `make seed`)
- A running PostgreSQL container named `local-postgres` (see [Database setup](#database-setup))

## Getting Started

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd file-explorer
cp .env.example .env
```

Edit `.env` if your Postgres credentials or container name differ from the defaults.

### 2. Start a local Postgres container

```bash
docker run -d \
  --name local-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=file_explorer \
  -p 5432:5432 \
  postgres:16
```

### 3. Install dependencies

```bash
make install
```

### 4. Run database migrations

```bash
make migrate
```

Optionally seed sample data:

```bash
make seed
```

### 5. Start the dev servers

Open two terminals and run one command in each:

```bash
# Terminal 1 — backend (port 3000, auto-reloads on save)
make dev-backend

# Terminal 2 — frontend (port 5173, HMR)
make dev-frontend
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Environment Variables

All variables live in `.env` (copied from `.env.example`). The Makefile loads this file automatically.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/file_explorer` | Backend pg connection string |
| `PORT` | `3000` | Backend server port |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `VITE_API_BASE_URL` | `http://localhost:3000` | API base URL used by the frontend |
| `DB_CONTAINER` | `local-postgres` | Docker container name used by `make migrate` / `make seed` |

## API Reference

All responses are wrapped: `{ data: T }` on success, `{ error: { code, message } }` on failure.

| Method | Path | Description |
|---|---|---|
| `GET` | `/folders` | List all root folders |
| `POST` | `/folders` | Create a folder (`{ name, parentId? }`) |
| `GET` | `/folders/:id` | Get a single folder by ID |
| `GET` | `/folders/:id/children` | List direct children with child counts |
| `PATCH` | `/folders/:id` | Rename a folder (`{ name }`) |
| `DELETE` | `/folders/:id` | Delete a folder and its entire subtree |

### Error codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `INVALID_UUID` | `:id` is not a valid UUID |
| 404 | `NOT_FOUND` | Folder does not exist |
| 409 | `DUPLICATE_NAME` | A sibling folder with that name already exists |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## Database Schema

Folder hierarchy is stored using a **closure table** pattern.

```
folders
  id         UUID  PK
  name       TEXT
  parent_id  UUID  FK → folders(id)
  created_at TIMESTAMPTZ

folder_paths          -- closure table
  ancestor   UUID  FK → folders(id)
  descendant UUID  FK → folders(id)
  depth      INTEGER   -- 0 = self-reference, 1 = direct child, …
```

This allows efficient subtree queries and cascading deletes without recursive CTEs.

## Project Structure

```
/
├── backend/
│   ├── migrations/          # Ordered SQL migration files (001_, 002_, …)
│   └── src/
│       ├── index.ts         # App entry — mounts modules, global error handler
│       ├── migrate.ts       # Migration runner
│       ├── shared/          # Shared types and custom error classes
│       └── modules/
│           └── folders/
│               ├── index.ts       # Routes (controller)
│               ├── model.ts       # TypeBox validation schemas
│               ├── service.ts     # Business logic
│               └── repository.ts  # SQL queries
│
└── frontend/
    └── src/
        ├── main.ts              # App bootstrap
        ├── App.vue              # Root component
        ├── shared/types.ts      # API types (mirrored from backend)
        ├── stores/
        │   └── folderStore.ts   # Pinia store — normalized state, fetch status
        └── components/
            ├── FileExplorer.vue      # Top-level layout (Splitter)
            ├── LeftPane.vue          # Hosts FolderTree
            ├── FolderTree.vue        # Root folder list
            ├── FolderNode.vue        # Recursive tree node
            ├── RightPane.vue         # Selected folder detail
            └── FolderChildTable.vue  # Children table with counts
```

## Makefile Reference

```bash
make help            # Show all available targets
make install         # Install backend + frontend dependencies
make dev-backend     # Start backend dev server (port 3000)
make dev-frontend    # Start frontend dev server (port 5173)
make migrate         # Run pending SQL migrations
make seed            # Populate sample data
```
