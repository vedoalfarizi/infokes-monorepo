# Tech Stack

## Backend
- **Runtime**: Bun
- **Framework**: ElysiaJS with TypeBox for request/response validation
- **Database**: PostgreSQL via `pg` (connection pool from `DATABASE_URL` env var)
- **Language**: TypeScript (ESM, `.js` extensions in imports)

## Frontend
- **Build tool**: Vite
- **Framework**: Vue 3 (Composition API with `<script setup>` preferred; Options API used in recursive components like `FolderNode`)
- **State management**: Pinia (setup-store style with `defineStore`)
- **UI components**: PrimeVue 4
- **Language**: TypeScript

## Testing
- **Framework**: Vitest (both backend and frontend)
- **Property-based testing**: fast-check (installed in both workspaces)

## Common Commands

```bash
# Install all dependencies
make install

# Run dev servers (run each in a separate terminal)
make dev-backend    # bun --watch on port 3000
make dev-frontend   # vite on port 5173

# Database
make migrate        # run pending SQL migrations
make seed           # populate sample data

# Tests (run from respective directories)
cd backend && bun run test
cd frontend && npm run test
```

## Environment
- Backend reads `DATABASE_URL`, `PORT`, `FRONTEND_ORIGIN` from environment
- Frontend reads `VITE_API_URL` (defaults to `http://localhost:3000`)
- `.env` is auto-loaded by the Makefile
