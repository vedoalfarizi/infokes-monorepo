# Implementation Plan: Folder Management Enhancements

## Overview

Implement four enhancements on top of the existing create-folder foundation: rename a folder, delete a folder (with full subtree cleanup), back navigation, and persistent folder selection across refreshes. Backend work comes first (model → repository → service → controller), followed by store additions, then UI components and wiring. Property-based and unit tests are placed alongside each layer for incremental validation.

## Tasks

- [x] 1. Extend backend model with new TypeBox schemas
  - Add `RenameFolderBodySchema` to `backend/src/modules/folders/model.ts`
  - Schema: `name` as `t.String({ minLength: 1 })`
  - Export the new schema alongside the existing ones
  - _Requirements: 1.8_

- [x] 2. Extend `FolderRepository` with new data-access methods
  - [x] 2.1 Implement `FolderRepository.findById` in `backend/src/modules/folders/repository.ts`
    - Query `SELECT id, name, created_at FROM folders WHERE id = $1`
    - Return `toFolder(row)` if found, `null` otherwise
    - _Requirements: 4.8_

  - [x] 2.2 Implement `FolderRepository.updateName` in `backend/src/modules/folders/repository.ts`
    - `UPDATE folders SET name = $1 WHERE id = $2 RETURNING id, name, created_at`
    - Catch PostgreSQL error code `23505` and re-throw as `DuplicateNameError`
    - Return the updated `Folder` via `toFolder`
    - _Requirements: 1.2, 1.8_

  - [x] 2.3 Implement `FolderRepository.deleteSubtree` in `backend/src/modules/folders/repository.ts`
    - Open a transaction with `pool.connect()`
    - Collect all descendant IDs (including target): `SELECT descendant FROM folder_paths WHERE ancestor = $1`
    - Delete closure-table rows: `DELETE FROM folder_paths WHERE ancestor = ANY($1::uuid[]) OR descendant = ANY($1::uuid[])`
    - Delete folder rows: `DELETE FROM folders WHERE id = ANY($1::uuid[])`
    - Commit; rollback and re-throw on any error
    - _Requirements: 2.2, 2.8_

  - [ ]* 2.4 Write unit tests for `FolderRepository.deleteSubtree`
    - Mock the pg client; verify closure-table rows deleted before folder rows
    - Verify rollback is called when an error is thrown mid-transaction
    - _Requirements: 2.2_

- [x] 3. Extend `FolderService` with new business-logic methods
  - [x] 3.1 Implement `FolderService.getFolder` in `backend/src/modules/folders/service.ts`
    - Call `FolderRepository.findById(id)`; throw `NotFoundError` if result is `null`
    - Return the `Folder`
    - _Requirements: 4.8_

  - [x] 3.2 Implement `FolderService.renameFolder` in `backend/src/modules/folders/service.ts`
    - Trim `name`; throw `ValidationError` if result is empty
    - Call `FolderRepository.exists(id)`; throw `NotFoundError` if false
    - Delegate to `FolderRepository.updateName(id, trimmed)` and return the result
    - _Requirements: 1.2, 1.4, 1.6, 1.8_

  - [ ]* 3.3 Write unit tests for `FolderService.renameFolder`
    - Mock `FolderRepository.exists` and `FolderRepository.updateName`
    - Test: whitespace-only name throws `ValidationError`
    - Test: non-existent ID throws `NotFoundError`
    - Test: valid inputs delegate to `updateName` and return its result
    - _Requirements: 1.4, 1.6_

  - [x] 3.4 Implement `FolderService.deleteFolder` in `backend/src/modules/folders/service.ts`
    - Call `FolderRepository.exists(id)`; throw `NotFoundError` if false
    - Delegate to `FolderRepository.deleteSubtree(id)`
    - _Requirements: 2.2, 2.6, 2.8_

  - [ ]* 3.5 Write unit tests for `FolderService.deleteFolder`
    - Mock `FolderRepository.exists` and `FolderRepository.deleteSubtree`
    - Test: non-existent ID throws `NotFoundError`
    - Test: valid ID delegates to `deleteSubtree`
    - _Requirements: 2.6_

- [x] 4. Add new routes to the controller
  - Add `GET /:id` route to `backend/src/modules/folders/index.ts`
    - Call `FolderService.getFolder(params.id)` and return `{ data }`
    - Use `{ params: UUIDParamSchema }` for TypeBox validation
    - _Requirements: 4.8_
  - Add `PATCH /:id` route
    - Call `FolderService.renameFolder(params.id, body.name)` and return `{ data }`
    - Use `{ params: UUIDParamSchema, body: RenameFolderBodySchema }`
    - _Requirements: 1.8_
  - Add `DELETE /:id` route
    - Call `FolderService.deleteFolder(params.id)`; set `set.status = 204` and return nothing
    - Use `{ params: UUIDParamSchema }`
    - _Requirements: 2.8_

- [ ] 5. Checkpoint — verify backend compiles and existing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Write backend property-based tests
  - [ ]* 6.1 Write property test for valid rename returning updated folder (Property 2)
    - **Property 2: PATCH /folders/:id always returns the updated folder for valid names**
    - Use `fc.string({ minLength: 1 })` filtered to non-whitespace; assert HTTP 200 with `data.name` equal to trimmed submitted name
    - **Validates: Requirements 1.2, 1.8**

  - [ ]* 6.2 Write property test for duplicate sibling name on rename (Property 5)
    - **Property 5: PATCH /folders/:id always returns DUPLICATE_NAME for sibling name conflicts**
    - Insert two sibling folders; rename one to the other's name; assert HTTP 409 with `code: 'DUPLICATE_NAME'`
    - **Validates: Requirements 1.5**

  - [ ]* 6.3 Write property test for NOT_FOUND on PATCH and DELETE (Property 6)
    - **Property 6: PATCH and DELETE /folders/:id always return NOT_FOUND for non-existent IDs**
    - Use `fc.uuid()` values not in DB; assert both endpoints return HTTP 404 with `code: 'NOT_FOUND'`
    - **Validates: Requirements 1.6, 2.6**

  - [ ]* 6.4 Write property test for atomic subtree deletion (Property 8)
    - **Property 8: DELETE /folders/:id always removes the entire subtree atomically**
    - Create a folder subtree; call `DELETE /folders/:id`; assert HTTP 204 and all descendant IDs absent from both `folders` and `folder_paths` tables
    - **Validates: Requirements 2.2, 2.8**

  - [ ]* 6.5 Write property test for GET /folders/:id envelope (Property 20)
    - **Property 20: GET /folders/:id always returns the correct envelope for existing and non-existing IDs**
    - Existing ID → assert HTTP 200 with `{ data: { id, name, createdAt } }`; `fc.uuid()` not in DB → assert HTTP 404 with `code: 'NOT_FOUND'`
    - **Validates: Requirements 4.8**

- [x] 7. Add new state and actions to `folderStore`
  - [x] 7.1 Add `navigationHistory` state and `canGoBack` computed to `frontend/src/stores/folderStore.ts`
    - Add `const navigationHistory = ref<string[]>([])`
    - Add `const SELECTED_FOLDER_KEY = 'fileExplorer:selectedFolderId'`
    - Add `const canGoBack = computed((): boolean => navigationHistory.value.length > 0)`
    - Export `navigationHistory` and `canGoBack` in the store's return object
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 7.2 Modify `selectFolder` in `folderStore.ts` to push history and persist to localStorage
    - Before updating `selectedFolderId`, push the current value onto `navigationHistory` if it is non-null
    - After updating `selectedFolderId`, call `localStorage.setItem(SELECTED_FOLDER_KEY, folderId)`
    - Keep the existing `fetchChildren` guard unchanged
    - _Requirements: 3.1, 3.2, 4.1, 4.7_

  - [ ]* 7.3 Write property test for selectFolder history push (Property 12)
    - **Property 12: selectFolder always pushes the previous selection onto navigationHistory**
    - Use `fc.array(fc.uuid(), { minLength: 2 })`; call `selectFolder` for each ID in sequence; assert `navigationHistory` contains the first N−1 IDs in order
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 7.4 Write property test for selectFolder localStorage persistence (Property 16)
    - **Property 16: selectFolder always persists the selected ID to localStorage**
    - Use `fc.uuid()`; after `selectFolder`, assert `localStorage.getItem(SELECTED_FOLDER_KEY)` equals the ID
    - **Validates: Requirements 4.1, 4.7**

  - [x] 7.5 Implement `navigateBack` action in `folderStore.ts`
    - Pop entries from `navigationHistory` in a loop, skipping IDs absent from `folders.value`
    - On finding a valid ID: set `selectedFolderId.value`, write to `localStorage`, call `fetchChildren` if not loaded, return
    - If stack exhausted: set `selectedFolderId.value = null`, call `localStorage.removeItem(SELECTED_FOLDER_KEY)`
    - Export `navigateBack` in the store's return object
    - _Requirements: 3.5, 3.6, 3.7, 3.8_

  - [ ]* 7.6 Write property test for navigateBack with all-valid history (Property 14)
    - **Property 14: navigateBack always pops the top valid entry and sets it as the selection**
    - Use `fc.array(fc.uuid(), { minLength: 1 })` with all IDs pre-populated in `folders`; assert `selectedFolderId` equals the top entry and stack length decreases by 1
    - **Validates: Requirements 3.5**

  - [ ]* 7.7 Write property test for navigateBack skipping deleted IDs (Property 15)
    - **Property 15: navigateBack always skips deleted IDs and lands on the first valid one**
    - Use `fc.array(fc.uuid(), { minLength: 1 })` with a mix of IDs present and absent in `folders`; assert `selectedFolderId` is set to the first ID that is present in `folders`
    - **Validates: Requirements 3.8**

  - [ ]* 7.8 Write property test for canGoBack reflecting history length (Property 13)
    - **Property 13: canGoBack reflects whether navigationHistory is non-empty**
    - Use `fc.array(fc.uuid())`; set `navigationHistory` directly; assert `canGoBack` is `true` iff array is non-empty
    - **Validates: Requirements 3.3, 3.4**

  - [x] 7.9 Implement `renameFolder` action in `folderStore.ts`
    - `PATCH` to `${API_BASE_URL}/folders/${folderId}` with `{ name: newName }`
    - On non-OK: parse `ApiError` body, attach `code` to thrown `Error`, re-throw
    - On success: update `folders.value[folderId]` with the returned folder in-place
    - Export `renameFolder` in the store's return object
    - _Requirements: 1.3_

  - [ ]* 7.10 Write property test for renameFolder store update (Property 3)
    - **Property 3: Successful rename always updates the folder name in the store**
    - Use `fc.uuid()` × `fc.string({ minLength: 1 })` filtered to non-whitespace; mock fetch to return 200; assert `folders[id].name` equals the new name
    - **Validates: Requirements 1.3**

  - [x] 7.11 Implement `deleteFolder` action in `folderStore.ts`
    - `DELETE` to `${API_BASE_URL}/folders/${folderId}`
    - On non-OK: parse `ApiError` body, attach `code`, re-throw
    - On 204: call `collectSubtreeIds(folderId)` to get all known descendant IDs
    - Remove each ID from `folders.value`, `childrenMap.value`, and `fetchStatus.value`
    - Remove `folderId` from the parent's `childrenMap` entry (scan all entries)
    - Filter `rootIds.value` to exclude all IDs in the subtree set
    - If `selectedFolderId.value` is in the subtree: set it to `null` and call `localStorage.removeItem(SELECTED_FOLDER_KEY)`
    - Filter `navigationHistory.value` to exclude all IDs in the subtree set
    - Export `deleteFolder` in the store's return object
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 7.12 Implement `collectSubtreeIds` helper in `folderStore.ts`
    - BFS over `childrenMap.value` starting from `folderId`
    - Return a `Set<string>` of all IDs in the subtree (including `folderId` itself)
    - Keep as a private (non-exported) function inside the store
    - _Requirements: 2.3_

  - [ ]* 7.13 Write property test for deleteFolder subtree removal from store (Property 9)
    - **Property 9: Successful delete always removes the entire known subtree from the store**
    - Use `fc.array(fc.uuid(), { minLength: 1 })` as subtree IDs pre-populated in store; mock fetch to return 204; assert all IDs absent from `folders`, `childrenMap`, `fetchStatus`, and `rootIds`
    - **Validates: Requirements 2.3**

  - [ ]* 7.14 Write property test for deleteFolder clearing selection and history (Property 10)
    - **Property 10: Deleting the selected folder always clears the selection and removes it from history**
    - Use `fc.uuid()` set as `selectedFolderId` and present in `navigationHistory`; mock fetch to return 204; assert `selectedFolderId` is `null` and ID absent from `navigationHistory`
    - **Validates: Requirements 2.4, 3.8**

  - [ ]* 7.15 Write property test for deleteFolder removing child from parent's childrenMap (Property 11)
    - **Property 11: Deleting a child always removes it from the parent's childrenMap entry**
    - Use `fc.uuid()` as parent (status `'loaded'`) × `fc.uuid()` as child in `childrenMap[parentId]`; mock fetch to return 204; assert child absent from `childrenMap[parentId]`
    - **Validates: Requirements 2.5**

  - [x] 7.16 Implement `initializeStore` action in `folderStore.ts`
    - Call `fetchRootFolders()` first
    - Read `localStorage.getItem(SELECTED_FOLDER_KEY)`; if null, return early
    - `GET ${API_BASE_URL}/folders/${persistedId}`; on non-OK response, call `localStorage.removeItem(SELECTED_FOLDER_KEY)` and return
    - On 200: add folder to `folders.value`, set `fetchStatus` to `'idle'` if not already tracked, set `selectedFolderId.value` directly (no history push), call `fetchChildren(id)`
    - Wrap in try/catch; on network error, call `localStorage.removeItem(SELECTED_FOLDER_KEY)`
    - Export `initializeStore` in the store's return object
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 7.17 Write property test for initializeStore with existing persisted folder (Property 18)
    - **Property 18: initializeStore sets selection and fetches children when the persisted folder exists**
    - Use `fc.uuid()` in `localStorage`; mock `GET /folders/:id` to return 200; assert `selectedFolderId` equals the ID and `fetchChildren` was called
    - **Validates: Requirements 4.4**

  - [ ]* 7.18 Write property test for initializeStore clearing localStorage when folder is gone (Property 19)
    - **Property 19: initializeStore clears localStorage and leaves no selection when the persisted folder is gone**
    - Use `fc.uuid()` in `localStorage`; mock `GET /folders/:id` to return 404; assert `localStorage.getItem(SELECTED_FOLDER_KEY)` is `null` and `selectedFolderId` is `null`
    - **Validates: Requirements 4.5**

- [ ] 8. Checkpoint — verify store tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Create `RenameDialog.vue` component
  - [x] 9.1 Create `frontend/src/components/RenameDialog.vue`
    - Props: `{ folder: Folder }`
    - Emits: `confirm: (newName: string)`, `cancel: []`
    - Render a PrimeVue `Dialog` (modal, visible by default) with a title of "Rename Folder"
    - Inside the dialog, render `<InlineNameInput>` with `:placeholder="folder.name"` and the input pre-filled with `folder.name` via a local `ref`
    - Local whitespace validation: if the submitted name trims to empty, show an inline error and do NOT emit `confirm`
    - Emit `confirm(trimmedName)` when `InlineNameInput` emits `confirm` and the name is valid
    - Emit `cancel` when `InlineNameInput` emits `cancel` or the dialog is closed
    - _Requirements: 1.1, 1.4, 1.7_

  - [ ]* 9.2 Write unit tests for `RenameDialog.vue`
    - Test: input is pre-filled with `folder.name`
    - Test: whitespace-only submission shows validation error and does not emit `confirm`
    - Test: valid name emits `confirm` with the trimmed name
    - Test: cancel emits `cancel`
    - _Requirements: 1.1, 1.4, 1.7_

  - [ ]* 9.3 Write property test for RenameDialog pre-fill (Property 1)
    - **Property 1: Rename dialog always pre-fills the current folder name**
    - Use `fc.record({ id: fc.uuid(), name: fc.string({ minLength: 1 }), createdAt: fc.string() })`; render `RenameDialog`; assert input's initial value equals `folder.name`
    - **Validates: Requirements 1.1**

  - [ ]* 9.4 Write property test for whitespace rejection in RenameDialog (Property 4)
    - **Property 4: Whitespace-only names are always rejected before reaching the API**
    - Use `fc.string()` filtered to whitespace-only; simulate confirm; assert `renameFolder` store action is never called
    - **Validates: Requirements 1.4**

- [x] 10. Create `ConfirmDeleteDialog.vue` component
  - [x] 10.1 Create `frontend/src/components/ConfirmDeleteDialog.vue`
    - Props: `{ folder: Folder }`
    - Emits: `confirm: []`, `cancel: []`
    - Render a PrimeVue `Dialog` (modal, visible by default) with a title of "Delete Folder"
    - Display the folder name and a warning message: "This will permanently delete «folder.name» and all its sub-folders."
    - Two buttons: "Delete" (calls `emit('confirm')`) and "Cancel" (calls `emit('cancel')`)
    - Emit `cancel` when the dialog is closed via the X button or Escape
    - _Requirements: 2.1, 2.7_

  - [ ]* 10.2 Write unit tests for `ConfirmDeleteDialog.vue`
    - Test: folder name is rendered in the dialog body
    - Test: "Delete" button emits `confirm`
    - Test: "Cancel" button emits `cancel`
    - _Requirements: 2.1, 2.7_

  - [ ]* 10.3 Write property test for ConfirmDeleteDialog displaying folder name (Property 7)
    - **Property 7: Delete confirmation dialog always displays the folder name**
    - Use `fc.record({ id: fc.uuid(), name: fc.string({ minLength: 1 }), createdAt: fc.string() })`; render `ConfirmDeleteDialog`; assert rendered output contains `folder.name`
    - **Validates: Requirements 2.1**

- [x] 11. Update `FolderNode.vue` to support rename and delete
  - Add a context menu trigger (a `⋮` button) to each folder row in `frontend/src/components/FolderNode.vue`
  - Add local state: `isRenaming = ref(false)`, `isDeleting = ref(false)`, `actionError = ref('')`
  - On "Rename" menu item: set `isRenaming.value = true`
  - On "Delete" menu item: set `isDeleting.value = true`
  - Render `<RenameDialog>` when `isRenaming` is true; on `confirm`: call `store.renameFolder(folder.id, newName)`; on success set `isRenaming = false`; on `DUPLICATE_NAME` or `NOT_FOUND` error, pass the error message back to the dialog; on `cancel`: set `isRenaming = false`
  - Render `<ConfirmDeleteDialog>` when `isDeleting` is true; on `confirm`: call `store.deleteFolder(folder.id)`; on error show a toast or inline message; on `cancel`: set `isDeleting = false`
  - _Requirements: 1.1, 1.3, 1.5, 1.6, 2.1, 2.3, 2.4, 2.5_

- [ ] 12. Update `FolderIconGrid.vue` to emit rename and delete events
  - Add `rename: [folderId: string]` and `delete: [folderId: string]` to the emits definition in `frontend/src/components/FolderIconGrid.vue`
  - Add a `⋮` button (or right-click context menu) to each folder card
  - On "Rename": emit `rename(child.id)`
  - On "Delete": emit `delete(child.id)`
  - _Requirements: 1.1, 2.1_

- [ ] 13. Update `RightPane.vue` to handle rename and delete from the grid
  - Add local state: `renamingFolder = ref<Folder | null>(null)`, `deletingFolder = ref<Folder | null>(null)` in `frontend/src/components/RightPane.vue`
  - Handle `@rename` from `FolderIconGrid`: set `renamingFolder.value = store.folders[folderId]`
  - Handle `@delete` from `FolderIconGrid`: set `deletingFolder.value = store.folders[folderId]`
  - Render `<RenameDialog :folder="renamingFolder">` when `renamingFolder` is non-null; on `confirm`: call `store.renameFolder`; on success clear `renamingFolder`; on error pass error back to dialog; on `cancel`: clear `renamingFolder`
  - Render `<ConfirmDeleteDialog :folder="deletingFolder">` when `deletingFolder` is non-null; on `confirm`: call `store.deleteFolder`; on error show a generic message; on `cancel`: clear `deletingFolder`
  - _Requirements: 1.3, 1.5, 1.6, 2.3, 2.4, 2.5, 2.6_

- [ ] 14. Update `LeftPane.vue` to add the Back button
  - Import `useFolderStore` (already imported) in `frontend/src/components/LeftPane.vue`
  - Add a "Back" button to the `.left-pane__toolbar` div, to the left of the "Folders" label
  - Bind `:disabled="!store.canGoBack"` and `@click="store.navigateBack()"`
  - Style the button as disabled (reduced opacity, `cursor: not-allowed`) when `canGoBack` is false
  - _Requirements: 3.3, 3.4, 3.5_

  - [ ]* 14.1 Write unit tests for `LeftPane.vue` Back button
    - Test: Back button is disabled when `canGoBack` is false
    - Test: Back button is enabled when `canGoBack` is true
    - Test: clicking Back button calls `store.navigateBack()`
    - _Requirements: 3.3, 3.4, 3.5_

- [ ] 15. Update `FileExplorer.vue` to use `initializeStore`
  - In `frontend/src/components/FileExplorer.vue`, replace `store.fetchRootFolders()` with `store.initializeStore()` in the `onMounted` callback
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 16. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Backend tasks (1–6) must be completed before frontend tasks (7–15)
- `collectSubtreeIds` is a private helper inside the store — it is not exported
- `initializeStore` sets `selectedFolderId` directly (bypassing `selectFolder`) to avoid pushing `null` onto `navigationHistory` during initialization
- `navigateBack` does NOT push to `navigationHistory` — it only pops, matching browser back-button semantics
- `RenameDialog` and `ConfirmDeleteDialog` are stateless with respect to API calls — parent components own the store calls and error handling
- The existing global `onError` handler in `backend/src/index.ts` already maps `ValidationError` → 400, `NotFoundError` → 404, `DuplicateNameError` → 409; no changes needed there
- All backend imports use `.js` extensions (ESM)
- Property tests use fast-check with a minimum of 100 iterations each
