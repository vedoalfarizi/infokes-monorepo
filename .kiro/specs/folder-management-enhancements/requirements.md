# Requirements Document

## Introduction

This feature extends the File Explorer application with three enhancements to folder management:

1. **Rename and Delete** — Users can rename an existing folder or delete it (along with all its descendants) directly from the UI.
2. **Navigation History (Back)** — Users can navigate back to the previously selected folder, mirroring browser-style back navigation within the explorer.
3. **Persistent Selection** — The last selected folder is persisted across page refreshes so the user returns to the same view without having to re-navigate.

The backend uses Bun + ElysiaJS with PostgreSQL (closure table for hierarchy). The frontend uses Vue 3 + Pinia. All API responses follow the `{ data: T }` / `{ error: { code, message } }` envelope.

---

## Glossary

- **File_Explorer**: The web application as a whole.
- **Folder_Tree**: The collapsible tree in the left pane listing all folders hierarchically.
- **Right_Pane**: The right panel that displays the direct children of the currently selected folder.
- **Selected_Folder**: The folder whose children are currently displayed in the Right_Pane.
- **Navigation_History**: The ordered list of previously selected folder IDs maintained in memory during a session.
- **Closure_Table**: The `folder_paths` PostgreSQL table that stores all ancestor–descendant relationships with depth values.
- **Folder_Store**: The Pinia store (`folderStore`) that holds normalized folder state on the frontend.
- **API**: The ElysiaJS HTTP backend exposing folder endpoints.
- **Rename_Dialog**: The inline or modal UI element that allows the user to enter a new folder name.
- **Confirmation_Dialog**: The modal UI element that asks the user to confirm a destructive action (delete).

---

## Requirements

### Requirement 1: Rename a Folder

**User Story:** As a User, I want to rename an existing folder, so that I can correct mistakes or better organize my folder structure.

#### Acceptance Criteria

1. WHEN the user activates the rename action on a folder, THE Rename_Dialog SHALL display the folder's current name as the pre-filled input value.
2. WHEN the user submits a non-empty name in the Rename_Dialog, THE API SHALL update the folder's name in the database and return the updated folder.
3. WHEN the rename succeeds, THE Folder_Store SHALL update the folder's name in its normalized state so that both the Folder_Tree and the Right_Pane reflect the new name without a full page reload.
4. IF the submitted name is empty or whitespace-only, THEN THE Rename_Dialog SHALL display a validation error message and SHALL NOT submit the request to the API.
5. IF the submitted name already exists among siblings at the same parent level, THEN THE API SHALL return an error with code `DUPLICATE_NAME` and THE Rename_Dialog SHALL display the error message to the user.
6. IF the folder to be renamed does not exist, THEN THE API SHALL return an error with code `NOT_FOUND` and THE File_Explorer SHALL display an appropriate error message.
7. WHEN the user cancels the Rename_Dialog, THE Folder_Store SHALL remain unchanged.
8. THE API SHALL expose a `PATCH /folders/:id` endpoint that accepts a `name` field and returns the updated folder wrapped in `{ data: Folder }`.

---

### Requirement 2: Delete a Folder

**User Story:** As a User, I want to delete a folder and all its sub-folders, so that I can remove an entire branch of my folder structure in one action.

#### Acceptance Criteria

1. WHEN the user activates the delete action on a folder, THE Confirmation_Dialog SHALL display the folder's name and warn that all sub-folders will also be deleted.
2. WHEN the user confirms deletion, THE API SHALL delete the target folder, all its descendants, and all corresponding rows in the Closure_Table within a single database transaction.
3. WHEN deletion succeeds, THE Folder_Store SHALL remove the deleted folder and all its known descendants from its normalized state (folders map, childrenMap, fetchStatus, and rootIds where applicable).
4. WHEN the deleted folder was the Selected_Folder, THE Folder_Store SHALL clear the selected folder so the Right_Pane returns to the empty state.
5. WHEN the deleted folder was a child of the currently loaded parent, THE Folder_Store SHALL remove it from the parent's entry in childrenMap.
6. IF the folder to be deleted does not exist, THEN THE API SHALL return an error with code `NOT_FOUND` and THE File_Explorer SHALL display an appropriate error message.
7. WHEN the user cancels the Confirmation_Dialog, THE Folder_Store SHALL remain unchanged and no API call SHALL be made.
8. THE API SHALL expose a `DELETE /folders/:id` endpoint that returns HTTP 204 on success.

---

### Requirement 3: Navigate Back to Previous Folder

**User Story:** As a User, I want to go back to the previously selected folder, so that I can quickly return to where I was after navigating into a sub-folder.

#### Acceptance Criteria

1. THE Folder_Store SHALL maintain a Navigation_History stack of previously selected folder IDs within the current browser session.
2. WHEN the user selects a folder, THE Folder_Store SHALL push the previously selected folder ID onto the Navigation_History stack before updating the Selected_Folder.
3. WHEN the Navigation_History stack is non-empty, THE File_Explorer SHALL display an active "Back" button.
4. WHEN the Navigation_History stack is empty, THE File_Explorer SHALL display a disabled "Back" button.
5. WHEN the user activates the "Back" button, THE Folder_Store SHALL pop the most recent entry from the Navigation_History stack and set it as the Selected_Folder.
6. WHEN the user navigates back to a folder whose children are already loaded, THE Folder_Store SHALL display the cached children without making a new API call.
7. WHEN the user navigates back to a folder whose children are not loaded, THE Folder_Store SHALL fetch the children from the API.
8. IF a folder in the Navigation_History no longer exists (e.g., it was deleted), THEN THE Folder_Store SHALL skip that entry and pop the next one until a valid folder is found or the stack is empty.

---

### Requirement 4: Persist Selected Folder Across Page Refreshes

**User Story:** As a User, when I refresh the browser, I want the screen to still show my last selected folder, so that I do not lose my place in the folder hierarchy.

#### Acceptance Criteria

1. WHEN the user selects a folder, THE Folder_Store SHALL persist the selected folder's ID to `localStorage` under a defined key.
2. WHEN the File_Explorer initializes, THE Folder_Store SHALL read the persisted folder ID from `localStorage` and attempt to restore the Selected_Folder.
3. WHEN restoring the Selected_Folder on initialization, THE Folder_Store SHALL fetch the folder's data from the API to confirm it still exists before setting it as selected.
4. WHEN the persisted folder ID is confirmed to exist, THE Folder_Store SHALL set it as the Selected_Folder and fetch its children so the Right_Pane is populated.
5. IF the persisted folder ID no longer exists in the API (e.g., it was deleted), THEN THE Folder_Store SHALL clear the persisted value from `localStorage` and initialize with no folder selected.
6. IF no persisted folder ID is found in `localStorage`, THEN THE Folder_Store SHALL initialize with no folder selected.
7. WHEN the user selects a different folder, THE Folder_Store SHALL overwrite the previously persisted folder ID in `localStorage` with the new selection.
8. THE API SHALL expose a `GET /folders/:id` endpoint that returns the folder wrapped in `{ data: Folder }` or a `NOT_FOUND` error, to support existence checks during restore.
