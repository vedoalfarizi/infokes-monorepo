# Project Structure

```
/
├── backend/                    # Bun + ElysiaJS API
│   ├── migrations/             # Ordered SQL migration files (001_, 002_, ...)
│   ├── src/
│   │   ├── index.ts            # App entry point — mounts modules, global error handler
│   │   ├── migrate.ts          # Migration runner
│   │   ├── shared/
│   │   │   ├── types.ts        # Shared interfaces (Folder, FolderChild, ApiResponse, ApiError)
│   │   │   └── errors.ts       # Custom error classes (NotFoundError, DuplicateNameError, ValidationError)
│   │   └── modules/
│   │       └── folders/        # Feature module (one folder per domain feature)
│   │           ├── index.ts    # Controller — ElysiaJS routes
│   │           ├── model.ts    # TypeBox schemas for validation
│   │           ├── repository.ts # Data access — all SQL queries
│   │           └── service.ts  # Business logic — orchestrates repository calls
│   └── package.json
│
├── frontend/                   # Vite + Vue 3 SPA
│   ├── src/
│   │   ├── main.ts             # App bootstrap — registers PrimeVue, Pinia
│   │   ├── App.vue             # Root component
│   │   ├── shared/
│   │   │   └── types.ts        # API types mirrored from backend (kept in sync manually)
│   │   ├── stores/
│   │   │   └── folderStore.ts  # Pinia store — normalized folder state, fetch status, actions
│   │   └── components/
│   │       ├── FileExplorer.vue     # Top-level layout (Splitter)
│   │       ├── LeftPane.vue         # Hosts FolderTree
│   │       ├── FolderTree.vue       # Renders root folders as FolderNode list
│   │       ├── FolderNode.vue       # Recursive tree node (expand/select/lazy-load)
│   │       ├── RightPane.vue        # Shows children of selected folder
│   │       └── FolderChildTable.vue # Table of children with child counts
│   └── package.json
│
└── Makefile                    # Top-level dev commands
```

## Architecture Patterns

**Backend — layered module structure**
Each domain feature lives in `src/modules/<feature>/` with four files:
1. `index.ts` — controller (routes only, no business logic)
2. `model.ts` — TypeBox schemas for validation
3. `service.ts` — business logic, throws domain errors
4. `repository.ts` — SQL queries, maps DB rows to typed interfaces

Errors flow upward: repository throws `DuplicateNameError`, service throws `NotFoundError`, the global handler in `index.ts` maps them to HTTP status codes.

**Database — closure table**
Folder hierarchy is stored using a closure table (`folder_paths`) alongside the `folders` table. Direct children are queried with `depth = 1`. All inserts use a transaction to maintain the closure table.

**Frontend — normalized store**
`folderStore` keeps a flat `folders` map keyed by UUID and a separate `childrenMap`. Fetch status per folder (`idle | loading | loaded | error`) prevents redundant network calls. Components read from the store via computed properties.

**API contract**
All responses are wrapped: `{ data: T }` for success, `{ error: { code, message } }` for errors. Types are defined in `backend/src/shared/types.ts` and mirrored in `frontend/src/shared/types.ts`.
