# Implementation Plan: Create Folder

## Overview

Implement end-to-end folder creation across three layers: backend API endpoint, Pinia store action, and Vue 3 UI components. Backend work comes first (model → service → controller), followed by the store action, then the UI components (shared `InlineNameInput`, new `FolderIconGrid`, updated `RightPane` and `LeftPane`). Property-based and unit tests are placed alongside each layer so regressions are caught incrementally.

## Tasks

- [x] 1. Extend backend model with `CreateFolderBodySchema`
  - Add `CreateFolderBodySchema` to `backend/src/modules/folders/model.ts` using TypeBox
  - Schema: `name` as `t.String({ minLength: 1 })`, `parentId` as `t.Optional(t.Union([t.String({ format: 'uuid' }), t.Null()]))`
  - Export the new schema alongside the existing ones
  - _Requirements: 3.1, 3.4, 3.5_

- [x] 2. Extend `FolderService` with `createFolder`
  - [x] 2.1 Implement `FolderService.createFolder(name, parentId)` in `backend/src/modules/folders/service.ts`
    - Trim `name`; throw `ValidationError` if result is empty
    - When `parentId` is non-null, call `FolderRepository.exists`; throw `NotFoundError` if false
    - Delegate to `FolderRepository.insertFolder(trimmed, parentId)` and return the result
    - _Requirements: 3.2, 3.4, 3.6, 8.1_

  - [ ]* 2.2 Write unit tests for `FolderService.createFolder`
    - Mock `FolderRepository.exists` and `FolderRepository.insertFolder`
    - Test: whitespace-only name throws `ValidationError`
    - Test: non-existent `parentId` throws `NotFoundError`
    - Test: valid inputs delegate to repository and return its result
    - _Requirements: 3.4, 3.6, 8.1_

  - [ ]* 2.3 Write property test for service whitespace rejection (Property 9)
    - **Property 9: API always returns 400 for whitespace-only names**
    - Use `fc.string()` filtered to whitespace-only strings; assert `ValidationError` is always thrown
    - **Validates: Requirements 3.4**

- [x] 3. Add `POST /folders` route to the controller
  - Add the new route to `backend/src/modules/folders/index.ts`
  - Use `{ body: CreateFolderBodySchema }` for TypeBox validation
  - Call `FolderService.createFolder(body.name, body.parentId ?? null)`
  - Return `new Response(JSON.stringify({ data }), { status: 201 })`
  - Rely on the existing global `onError` handler for 404 and 409 responses — no new error handling needed
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4. Checkpoint — verify backend compiles and existing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Write backend property-based and integration tests
  - [ ]* 5.1 Write property test for non-UUID `parentId` rejection (Property 10)
    - **Property 10: API always returns 400 for non-UUID parentId**
    - Use `fc.string()` filtered to strings that fail UUID format; POST to `/folders`; assert HTTP 400
    - **Validates: Requirements 3.5**

  - [ ]* 5.2 Write property test for non-existent `parentId` (Property 11)
    - **Property 11: API always returns 404 for non-existent parentId**
    - Use `fc.uuid()` values not present in the DB; POST to `/folders`; assert HTTP 404 with `code: 'NOT_FOUND'`
    - **Validates: Requirements 3.6**

  - [ ]* 5.3 Write property test for duplicate name rejection (Property 12)
    - **Property 12: API always returns 409 for duplicate names at the same level**
    - Insert a folder, then POST the same name at the same parent level; assert HTTP 409 with `code: 'DUPLICATE_NAME'`
    - **Validates: Requirements 3.7**

  - [ ]* 5.4 Write property test for closure table consistency (Property 13)
    - **Property 13: Closure table is always consistent after insertion**
    - After `insertFolder`, query `folder_paths`; assert self-referencing row exists and all ancestor rows are propagated correctly
    - **Validates: Requirements 8.2, 8.3**

  - [ ]* 5.5 Write property test for name trimming (Property 14)
    - **Property 14: Repository always stores the trimmed name**
    - Use `fc.string()` padded with leading/trailing whitespace; call `insertFolder`; assert stored name equals `name.trim()`
    - **Validates: Requirements 8.4**

  - [ ]* 5.6 Write property test for valid inputs returning 201 (Property 8)
    - **Property 8: API always returns 201 with correct shape for valid inputs**
    - Use `fc.string({ minLength: 1 })` filtered to non-whitespace names with `parentId: null`; assert HTTP 201 and `{ data: { id, name, createdAt } }` shape
    - **Validates: Requirements 3.3**

- [x] 6. Add `createFolder` action to `folderStore`
  - [x] 6.1 Implement `createFolder(name, parentId)` in `frontend/src/stores/folderStore.ts`
    - POST to `/folders` with `{ name, parentId }`
    - On non-OK response: parse `ApiError` body, attach `code` to the thrown `Error`, re-throw
    - On success: add folder to `folders` map, set `fetchStatus[folder.id] = 'idle'`
    - If `parentId === null`: append to `rootIds` and re-sort alphabetically by name
    - If `parentId !== null` and `fetchStatus[parentId] === 'loaded'`: append to `childrenMap[parentId]`
    - If `parentId !== null` and status is not `'loaded'`: do not touch `childrenMap`
    - Return the created `Folder`
    - Export the action in the store's return object
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.2, 6.3_

  - [ ]* 6.2 Write unit tests for `folderStore.createFolder`
    - Mock `fetch` for each scenario
    - Test: `parentId === null` → folder added to `rootIds` and `folders`, status `'idle'`
    - Test: loaded parent → folder appended to `childrenMap[parentId]`
    - Test: unloaded parent → `childrenMap[parentId]` unchanged
    - Test: 409 response → store state unchanged, error with `code === 'DUPLICATE_NAME'` thrown
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [ ]* 6.3 Write property test for root creation state invariant (Property 4)
    - **Property 4: Successful root creation always adds the folder to rootIds and folders map**
    - Use `fc.string({ minLength: 1 })` filtered to non-whitespace; mock fetch to return 201; assert folder in `rootIds`, `folders`, and `fetchStatus === 'idle'`
    - **Validates: Requirements 5.2, 5.6, 6.3**

  - [ ]* 6.4 Write property test for loaded-parent childrenMap update (Property 5)
    - **Property 5: Successful child creation with loaded parent always updates childrenMap**
    - Use `fc.string()` × `fc.uuid()` with parent pre-set to `'loaded'`; assert new folder id in `childrenMap[parentId]`
    - **Validates: Requirements 5.3**

  - [ ]* 6.5 Write property test for unloaded-parent childrenMap invariant (Property 6)
    - **Property 6: Child creation with unloaded parent never modifies childrenMap**
    - Use `fc.string()` × `fc.uuid()` with parent status not `'loaded'`; assert `childrenMap[parentId]` is unchanged
    - **Validates: Requirements 5.4**

  - [ ]* 6.6 Write property test for duplicate error state immutability (Property 7)
    - **Property 7: Duplicate name errors never modify store state**
    - Mock fetch to return 409; capture state snapshot before call; assert all state refs are identical after the thrown error is caught
    - **Validates: Requirements 5.5**

  - [ ]* 6.7 Write property test for alphabetical sort after root creation (Property 16)
    - **Property 16: Root folders list is always alphabetically sorted after creation**
    - Use `fc.array(fc.string())` as existing root names + `fc.string()` as new name; assert `rootIds` maps to alphabetically sorted names after `createFolder`
    - **Validates: Requirements 6.2**

- [ ] 7. Checkpoint — verify store tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create `InlineNameInput.vue` component
  - [x] 8.1 Create `frontend/src/components/InlineNameInput.vue`
    - Props: `{ placeholder?: string; error?: string }`
    - Emits: `confirm(name: string)`, `cancel()`
    - Render a text `<input>`, a confirm button (✓), and a cancel button (✗)
    - Auto-focus the input on mount via `onMounted`
    - Emit `confirm` on Enter key or confirm button click; emit `cancel` on Escape key or cancel button click
    - Display the `error` prop as an inline validation message below the input when non-empty
    - Clear the error message when the user modifies the input (emit a `update:error` or handle locally via a watcher)
    - _Requirements: 1.3, 1.6, 1.7, 2.3, 2.6, 2.7, 4.1, 4.2, 4.3_

  - [ ]* 8.2 Write unit tests for `InlineNameInput.vue`
    - Test: input is focused on mount
    - Test: Enter key emits `confirm` with the current input value
    - Test: Escape key emits `cancel`
    - Test: confirm button click emits `confirm`
    - Test: cancel button click emits `cancel`
    - Test: `error` prop renders the validation message
    - _Requirements: 1.3, 1.6, 2.3, 2.6, 4.1, 4.2_

  - [ ]* 8.3 Write property test for whitespace-name local validation (Property 1)
    - **Property 1: Whitespace names are always rejected before reaching the API**
    - Use `fc.string()` filtered to whitespace-only strings; simulate confirm event; assert `createFolder` store action is never called
    - **Validates: Requirements 1.7, 2.7**

- [x] 9. Create `FolderIconGrid.vue` component
  - [x] 9.1 Create `frontend/src/components/FolderIconGrid.vue`
    - Props: `{ children: FolderChild[]; isCreating: boolean }`
    - Emits: `select(folderId: string)`, `createConfirm(name: string)`, `createCancel()`
    - Render children as a CSS grid of folder icon cards (folder emoji + name label below)
    - When `isCreating` is true, render an extra card at the end of the grid containing `<InlineNameInput>`; forward its `confirm` and `cancel` events as `createConfirm` and `createCancel`
    - When `children` is empty and `isCreating` is false, show an empty-state message: "This folder is empty"
    - Double-click on a card emits `select` with that folder's id
    - _Requirements: 9.1, 9.2, 9.3, 9.6, 9.7, 9.8_

  - [ ]* 9.2 Write unit tests for `FolderIconGrid.vue`
    - Test: renders one card per child
    - Test: empty state shown when `children` is empty and `isCreating` is false
    - Test: empty state hidden when `isCreating` is true (inline input card shown instead)
    - Test: double-click on a card emits `select` with the correct folder id
    - Test: `InlineNameInput` confirm emits `createConfirm`; cancel emits `createCancel`
    - _Requirements: 9.1, 9.2, 9.6, 9.8_

  - [ ]* 9.3 Write property test for double-click select (Property 15)
    - **Property 15: Double-click on any grid item always selects that folder**
    - Use `fc.array(fc.record({ id: fc.uuid(), name: fc.string(), createdAt: fc.string(), childCount: fc.integer() }), { minLength: 1 })`; double-click a random card; assert `select` is emitted with exactly that folder's id
    - **Validates: Requirements 9.4**

- [x] 10. Update `RightPane.vue`
  - [x] 10.1 Replace `FolderChildTable` with `FolderIconGrid` in `frontend/src/components/RightPane.vue`
    - Remove the `FolderChildTable` import and usage
    - Import and render `FolderIconGrid` with `:children` and `:isCreating` props
    - Add a "New Folder" button visible only when `store.selectedFolder !== null`
    - Add local `isCreating` (`ref(false)`) and `duplicateError` (`ref('')`) state
    - On button click: set `isCreating = true`, clear `duplicateError`
    - On `createConfirm`: validate name is non-whitespace locally; call `store.createFolder(name, store.selectedFolderId)`; on success set `isCreating = false`; on 409 set `duplicateError` to the error message; on other errors show a generic message
    - On `createCancel`: set `isCreating = false`, clear `duplicateError`
    - Pass `duplicateError` as the `error` prop to `InlineNameInput` (via `FolderIconGrid`)
    - On `select` event from grid: call `store.selectFolder(folderId)`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 4.2, 4.3, 7.1, 9.1–9.8_

  - [ ]* 10.2 Write unit tests for `RightPane.vue`
    - Test: "New Folder" button not rendered when no folder is selected
    - Test: "New Folder" button rendered when a folder is selected
    - Test: clicking button sets `isCreating = true` and renders `FolderIconGrid` with `isCreating` prop
    - Test: `createConfirm` with valid name calls `store.createFolder` and dismisses input on success
    - Test: `createConfirm` with 409 response sets `duplicateError` and keeps input open
    - Test: `createCancel` dismisses input without calling store
    - Test: `select` event calls `store.selectFolder` with correct id
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.8, 4.1, 4.2_

  - [ ]* 10.3 Write property test for child folder parentId (Property 3)
    - **Property 3: Child folder creation always uses the selected folder's id as parentId**
    - Use `fc.string({ minLength: 1 })` filtered to non-whitespace × `fc.uuid()` as selected folder id; assert `store.createFolder` is always called with `(name, selectedFolderId)`
    - **Validates: Requirements 2.4**

- [ ] 11. Update `LeftPane.vue`
  - [ ] 11.1 Update `frontend/src/components/LeftPane.vue` to support root folder creation
    - Add a "New Folder" button above the `FolderTree`
    - Import `InlineNameInput`
    - Add local `isCreating` (`ref(false)`) and `duplicateError` (`ref('')`) state
    - When `isCreating` is true, render `<InlineNameInput>` at the bottom of the root folder list (after `<FolderTree>`)
    - On confirm: validate name is non-whitespace locally; call `store.createFolder(name, null)`; on success set `isCreating = false`; on 409 set `duplicateError`; on other errors show a generic message
    - On cancel: set `isCreating = false`, clear `duplicateError`
    - Pass `duplicateError` as the `error` prop to `InlineNameInput`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 4.1, 4.2, 4.3, 6.1, 6.2_

  - [ ]* 11.2 Write unit tests for `LeftPane.vue`
    - Test: "New Folder" button is always rendered
    - Test: clicking button renders `InlineNameInput`
    - Test: confirm with valid name calls `store.createFolder(name, null)` and dismisses input
    - Test: confirm with 409 response sets `duplicateError` and keeps input open
    - Test: cancel dismisses input without calling store
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 4.1, 4.2_

  - [ ]* 11.3 Write property test for root folder parentId (Property 2)
    - **Property 2: Root folder creation always uses parentId null**
    - Use `fc.string({ minLength: 1 })` filtered to non-whitespace; assert `store.createFolder` is always called with `(name, null)` from `LeftPane`
    - **Validates: Requirements 1.4**

- [ ] 12. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Backend tasks (1–5) must be completed before frontend tasks (6–11)
- `FolderNode.vue` requires no code changes — `isLeaf` reacts automatically when `childrenMap` is updated by the store
- `FolderChildTable.vue` is replaced by `FolderIconGrid.vue`; the old file can be deleted once `RightPane.vue` no longer imports it
- Property tests use fast-check with a minimum of 100 iterations each
- All backend imports use `.js` extensions (ESM)
- The global `onError` handler in `backend/src/index.ts` already maps `ValidationError` → 400, `NotFoundError` → 404, `DuplicateNameError` → 409; no changes needed there
