# Implementation Plan: File Explorer

## Overview

Implement a full-stack File Explorer with a PostgreSQL Closure Table backend (ElysiaJS/Bun) and a Vue 3 frontend (Pinia + PrimeVue layout primitives + custom recursive components). The plan follows a bottom-up order: shared types → database schema → backend layers → frontend store → frontend components → integration wiring.

## Tasks

- [x] 1. Set up project structure and shared types
  - Scaffold the monorepo or co-located project directories: `backend/` (Bun + ElysiaJS) and `frontend/` (Vite + Vue 3)
  - Create `backend/src/shared/types.ts` with the `Folder`, `FolderChild`, `ApiResponse<T>`, and `ApiError` TypeScript interfaces
  - Create `backend/src/shared/errors.ts` with typed `NotFoundError` and `ValidationError` classes
  - Install backend dependencies: `elysia`, `@elysiajs/cors`, `pg`, `uuid`; dev dependencies: `vitest`, `fast-check`, `@types/pg`
  - Install frontend dependencies: `vue`, `pinia`, `primevue`, `primeicons`; dev dependencies: `vitest`, `@vue/test-utils`, `fast-check`, `@vitejs/plugin-vue`
  - _Requirements: 7.4, 10.3_

- [x] 2. Implement database schema and migrations
  - [x] 2.1 Write SQL migration file for the `folders` table
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `name TEXT NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, optional `parent_id UUID REFERENCES folders(id)`
    - _Requirements: 6.1_

  - [x] 2.2 Write SQL migration file for the `folder_paths` closure table
    - `ancestor UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE`, `descendant UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE`, `depth INTEGER NOT NULL CHECK (depth >= 0)`, `PRIMARY KEY (ancestor, descendant)`
    - Add `CREATE INDEX idx_folder_paths_ancestor ON folder_paths (ancestor, depth)` and `CREATE INDEX idx_folder_paths_descendant ON folder_paths (descendant)`
    - _Requirements: 6.2, 6.3, 6.4_

  - [x] 2.3 Write a database seed/fixture script
    - Insert a representative tree (at least 3 levels deep, multiple siblings) for manual testing and integration tests
    - _Requirements: 5.1, 5.2_

  - [x] 2.4 Write SQL migration for sibling-name uniqueness constraint
    - Add `CREATE UNIQUE INDEX idx_folders_unique_name_per_parent ON folders (parent_id, name) WHERE parent_id IS NOT NULL`
    - Add `CREATE UNIQUE INDEX idx_folders_unique_name_root ON folders (name) WHERE parent_id IS NULL`
    - _Requirements: 11.1, 11.2, 11.3_

- [ ] 3. Implement the Repository layer
  - [x] 3.1 Create `backend/src/modules/folders/repository.ts`
    - Implement `findRoots(): Promise<Folder[]>` — query folders with no parent using `WHERE parent_id IS NULL` (or the closure-table subquery)
    - Implement `findChildren(parentId: string): Promise<FolderChild[]>` — join `folders` and `folder_paths` with `ancestor = parentId AND depth = 1`, include `childCount` sub-select
    - Implement `exists(id: string): Promise<boolean>`
    - Implement `insertFolder(name: string, parentId: string | null): Promise<Folder>` — three-step closure-table insert (folder row → self-ref row → ancestor propagation); catch PostgreSQL `23505` unique-violation and re-throw as `DuplicateNameError`
    - _Requirements: 2.4, 3.7, 5.2, 6.1, 6.2, 11.4_

  - [ ]* 3.2 Write unit tests for the Repository layer
    - Mock the `pg` client; verify correct SQL and parameters for `findRoots`, `findChildren`, `exists`, and `insertFolder`
    - _Requirements: 2.4, 3.7_

  - [ ]* 3.3 Write property test — Property 2: Closure Table child query returns only direct children
    - **Property 2: Closure Table child query returns only direct children**
    - Generate random tree structures, insert via Repository, call `findChildren`, assert exact depth=1 match
    - Tag: `// Feature: file-explorer, Property 2: Closure Table child query returns only direct children`
    - **Validates: Requirements 3.7, 5.4**

  - [ ]* 3.4 Write property test — Property 3: Closure Table insert propagates all ancestor rows
    - **Property 3: Closure Table insert propagates all ancestor rows**
    - Generate random parent chains, insert child, assert all ancestor rows exist with correct depths and total row count equals parent depth + 2
    - Tag: `// Feature: file-explorer, Property 3: Closure Table insert propagates all ancestor rows`
    - **Validates: Requirements 5.1, 5.2, 6.1, 6.2**

  - [ ]* 3.5 Write property test — Property 12: Closure Table delete cascades all related rows
    - **Property 12: Closure Table delete cascades all related rows**
    - Generate random trees, delete a folder, assert no `folder_paths` rows reference the deleted ID
    - Tag: `// Feature: file-explorer, Property 12: Closure Table delete cascades all related rows`
    - **Validates: Requirements 6.5**

  - [ ]* 3.6 Write property test — Property 13: Duplicate folder name at the same level is rejected
    - **Property 13: Duplicate folder name at the same level is rejected**
    - Generate folder names that already exist at a given level (both root and non-root), attempt `insertFolder`, assert `DuplicateNameError` is thrown and no new row exists in `folders` or `folder_paths`
    - Tag: `// Feature: file-explorer, Property 13: Duplicate folder name at the same level is rejected`
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.6**

- [ ] 4. Implement the Service layer
  - [x] 4.1 Create `backend/src/modules/folders/service.ts`
    - Implement `getRootFolders(): Promise<Folder[]>` — delegates to `FolderRepository.findRoots()`
    - Implement `getChildren(id: string): Promise<FolderChild[]>` — calls `FolderRepository.exists(id)`, throws `NotFoundError` if false, then calls `FolderRepository.findChildren(id)`
    - _Requirements: 7.2, 7.5_

  - [ ]* 4.2 Write unit tests for the Service layer
    - Mock Repository; verify `NotFoundError` is thrown for unknown IDs; verify delegation to Repository for valid IDs
    - _Requirements: 7.2, 7.5_

- [x] 5. Implement the Controller layer and TypeBox schemas
  - [x] 5.1 Create `backend/src/modules/folders/model.ts`
    - Define `FolderSchema`, `FolderChildSchema`, and `UUIDParamSchema` using TypeBox (`t` from `elysia`)
    - _Requirements: 7.4, 10.3_

  - [x] 5.2 Create `backend/src/modules/folders/index.ts` (Controller)
    - Register `GET /folders` route — delegates to `FolderService.getRootFolders()`, returns `ApiResponse<Folder[]>`
    - Register `GET /folders/:id/children` route — validates `:id` against `UUIDParamSchema` (400 on failure), delegates to `FolderService.getChildren(id)`, returns `ApiResponse<FolderChild[]>`
    - _Requirements: 2.3, 3.6, 7.1, 10.1, 10.2, 10.5_

  - [x] 5.3 Create `backend/src/index.ts` (app entry point)
    - Instantiate Elysia app, mount the folders module, register global `onError` handler mapping `NotFoundError` → 404, `DuplicateNameError` → 409, `VALIDATION` → 400, unhandled → 500
    - Enable CORS for frontend origin
    - _Requirements: 7.5, 7.6, 10.2, 11.5_

  - [ ]* 5.4 Write unit tests for the Controller layer
    - Use ElysiaJS `handle()` test utility; verify HTTP 200 for valid requests, 400 for non-UUID `:id`, 404 for unknown UUID, 500 for unhandled exception
    - _Requirements: 7.1, 7.5, 7.6, 10.5_

  - [ ]* 5.5 Write property test — Property 6: UUID validation rejects non-UUID path parameters
    - **Property 6: UUID validation rejects non-UUID path parameters**
    - Generate arbitrary non-UUID strings, call `GET /folders/:id/children`, assert HTTP 400 and `ApiError` body; assert Service layer is NOT invoked
    - Tag: `// Feature: file-explorer, Property 6: UUID validation rejects non-UUID path parameters`
    - **Validates: Requirements 10.5**

  - [ ]* 5.6 Write property test — Property 7: API response envelope is consistent
    - **Property 7: API response envelope is consistent**
    - Generate valid requests and error conditions, assert every success response has a `data` field and every error response has `error.code` and `error.message`
    - Tag: `// Feature: file-explorer, Property 7: API response envelope is consistent`
    - **Validates: Requirements 10.1, 10.2**

  - [ ]* 5.7 Write property test — Property 11: Non-existent folder ID returns 404
    - **Property 11: Non-existent folder ID returns 404**
    - Generate random UUIDs not present in the DB, call `GET /folders/:id/children`, assert HTTP 404 with `ApiError` body
    - Tag: `// Feature: file-explorer, Property 11: Non-existent folder ID returns 404`
    - **Validates: Requirements 7.5**

- [ ] 6. Checkpoint — Backend tests pass
  - Ensure all backend unit and property tests pass, ask the user if questions arise.

- [x] 7. Implement the Pinia store
  - [x] 7.1 Create `frontend/src/stores/folderStore.ts`
    - Define state: `folders: Record<string, Folder>`, `childrenMap: Record<string, string[]>`, `fetchStatus: Record<string, FetchStatus>`, `selectedFolderId: string | null`, `rootIds: string[]`
    - Implement `fetchRootFolders()` action — calls `GET /folders`, populates `folders` map and `rootIds`, sets fetch status for each root to `idle`
    - Implement `fetchChildren(folderId)` action — guards against re-fetch when status is `loaded`; sets status to `loading`; calls `GET /folders/:id/children`; on success stores children and sets status to `loaded`; on failure sets status to `error`
    - Implement `selectFolder(folderId)` action — sets `selectedFolderId`, calls `fetchChildren` if not already loaded
    - Implement getters: `getChildren(folderId)`, `getFetchStatus(folderId)`, `selectedFolder`, `rootFolders`
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 4.1, 4.3, 4.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 7.2 Write unit tests for the Pinia store
    - Test `fetchChildren` sets status to `error` on API failure; test `fetchRootFolders` populates `rootIds`; test idempotency guard for `loaded` folders
    - _Requirements: 3.4, 9.3, 9.5_

  - [ ]* 7.3 Write property test — Property 4: Pinia store fetch-children is idempotent for loaded folders
    - **Property 4: Pinia store fetch-children is idempotent for loaded folders**
    - Generate store states with `loaded` folders, dispatch `fetchChildren`, assert no API call is issued and children list is unchanged
    - Tag: `// Feature: file-explorer, Property 4: Pinia store fetch-children is idempotent for loaded folders`
    - **Validates: Requirements 3.5, 4.4, 9.5**

  - [ ]* 7.4 Write property test — Property 5: Pinia store normalized map consistency
    - **Property 5: Pinia store normalized map consistency**
    - Generate random sequences of `fetchRootFolders` and `fetchChildren` actions, assert every ID in `childrenMap` values exists in `folders` map and every `fetchStatus` value is a valid `FetchStatus` literal
    - Tag: `// Feature: file-explorer, Property 5: Pinia store normalized map consistency`
    - **Validates: Requirements 9.1, 9.6**

- [x] 8. Implement frontend components
  - [x] 8.1 Create `frontend/src/components/FolderTree.vue`
    - Composition API component; accepts `rootFolders: Folder[]` prop
    - Renders one `FolderNode` per entry in `rootFolders` using `v-for`
    - Does NOT use PrimeVue Tree or TreeSelect
    - _Requirements: 8.1, 8.6_

  - [x] 8.2 Create `frontend/src/components/FolderNode.vue`
    - Composition API component; props: `folder: Folder`, `depth: number`
    - Internal state: `isExpanded = ref(false)`; computed: `children`, `fetchStatus`, `isSelected`, `isLeaf`
    - Renders expand toggle (hidden when `isLeaf`), folder name (clickable → `selectFolder`), loading spinner (`v-if="fetchStatus === 'loading'"`), error badge with retry button (`v-if="fetchStatus === 'error'"`)
    - Recursively renders `FolderNode` for each child using `v-for`; references itself by `name: 'FolderNode'`
    - Applies `v-memo="[isSelected, isExpanded, fetchStatus]"` to prevent unnecessary re-renders
    - `toggleExpand()` calls `store.fetchChildren` if not loaded, then toggles `isExpanded`
    - _Requirements: 3.2, 3.3, 3.4, 4.6, 5.3, 8.2, 8.3, 8.4, 8.5_

  - [x] 8.3 Create `frontend/src/components/FolderChildTable.vue`
    - Displays a PrimeVue DataTable (or plain table) listing `FolderChild` entries with columns: name and child count
    - _Requirements: 4.5_

  - [x] 8.4 Create `frontend/src/components/RightPane.vue`
    - Shows empty-state message when `selectedFolder` is null
    - Renders `FolderChildTable` with the selected folder's children when a folder is selected
    - _Requirements: 1.3, 1.4, 4.2_

  - [x] 8.5 Create `frontend/src/components/LeftPane.vue`
    - Wraps `FolderTree`, passes `store.rootFolders` as prop
    - _Requirements: 1.2_

  - [x] 8.6 Create `frontend/src/components/FileExplorer.vue`
    - Uses PrimeVue `Splitter` / `SplitterPanel` for the dual-pane layout
    - Mounts `LeftPane` and `RightPane` side by side
    - Calls `store.fetchRootFolders()` in `onMounted`
    - _Requirements: 1.1, 2.1, 2.2_

  - [x] 8.7 Wire `FileExplorer.vue` into `App.vue` and register Pinia + PrimeVue in `main.ts`
    - _Requirements: 1.1_

  - [ ]* 8.8 Write unit tests for FolderNode component
    - Test: shows spinner when `fetchStatus === 'loading'`; shows error badge when `fetchStatus === 'error'`; clicking folder name calls `selectFolder`; expand toggle hidden when `isLeaf`
    - _Requirements: 3.2, 3.4, 8.3, 8.4_

  - [ ]* 8.9 Write unit tests for RightPane component
    - Test: renders empty-state message when no folder selected; renders `FolderChildTable` when folder is selected
    - _Requirements: 1.3, 1.4_

  - [ ]* 8.10 Write property test — Property 8: FolderNode toggle visibility reflects fetch state
    - **Property 8: FolderNode toggle visibility reflects fetch state**
    - Generate folders with varying `fetchStatus` and children arrays, render `FolderNode`, assert toggle is visible for `idle`/`loading`, hidden for `loaded` + empty children, visible for `loaded` + non-empty children
    - Tag: `// Feature: file-explorer, Property 8: FolderNode toggle visibility reflects fetch state`
    - **Validates: Requirements 8.3, 8.4**

  - [ ]* 8.11 Write property test — Property 9: Right pane displays children of selected folder
    - **Property 9: Right pane displays children of selected folder**
    - Generate random `FolderChild` arrays, set as selected folder's children in store, render `RightPane`, assert name and `childCount` are displayed for each entry
    - Tag: `// Feature: file-explorer, Property 9: Right pane displays children of selected folder`
    - **Validates: Requirements 1.3, 4.2, 4.5**

  - [ ]* 8.12 Write property test — Property 10: FolderTree renders one node per root folder
    - **Property 10: FolderTree renders one node per root folder**
    - Generate random arrays of root folders (0–20 items), render `FolderTree`, assert exactly N top-level `FolderNode` components are rendered
    - Tag: `// Feature: file-explorer, Property 10: FolderTree renders one node per root folder`
    - **Validates: Requirements 8.6**

- [ ] 9. Checkpoint — Frontend tests pass
  - Ensure all frontend unit and property tests pass, ask the user if questions arise.

- [x] 10. Implement shared serialization and round-trip property test
  - [x] 10.1 Ensure `shared/types.ts` is importable by the frontend (copy or symlink, or use a shared package)
    - _Requirements: 7.4, 10.3_

  - [ ]* 10.2 Write property test — Property 1: Folder serialization round-trip
    - **Property 1: Folder serialization round-trip**
    - Generate random valid `Folder` objects, `JSON.stringify` then `JSON.parse`, assert structural equivalence of all fields (`id`, `name`, `createdAt`)
    - Tag: `// Feature: file-explorer, Property 1: Folder serialization round-trip`
    - **Validates: Requirements 10.4**

- [ ] 11. Write backend integration tests
  - [ ] 11.1 Set up a test PostgreSQL instance (Docker or in-memory) and run migrations before the test suite
    - _Requirements: 6.1, 6.2_

  - [ ]* 11.2 Write integration tests for `GET /folders`
    - Seed root folders, call endpoint, assert only root entries are returned with correct shape
    - _Requirements: 2.3, 2.4_

  - [ ]* 11.3 Write integration tests for `GET /folders/:id/children`
    - Seed a multi-level tree, call endpoint for folders at various depths, assert correct direct children are returned; verify schema indexes exist (smoke)
    - _Requirements: 3.6, 3.7, 5.4_

- [ ] 12. Final checkpoint — All tests pass
  - Ensure all backend and frontend unit, property, and integration tests pass. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with a minimum of 100 iterations each and are tagged with `// Feature: file-explorer, Property N: ...`
- Unit tests and property tests are complementary — both are needed for full coverage
- The backend integration tests (task 11) require a running PostgreSQL instance; use Docker Compose or a CI service
- PrimeVue is used only for layout primitives (`Splitter`, `DataTable`, icons) — no `Tree` or `TreeSelect` components
