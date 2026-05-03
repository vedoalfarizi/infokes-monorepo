# Requirements Document

## Introduction

The Create Folder feature extends the File Explorer with the ability to create new folders directly from the UI. Users can create a root-level folder from the Left Pane and a child folder under the currently selected folder from the Right Pane. The feature covers the full stack: a new `POST /folders` API endpoint, backend service and repository logic, and Vue 3 UI components with inline name input, validation feedback, and store integration.

## Glossary

- **File_Explorer**: The complete web application, encompassing both frontend and backend.
- **Folder**: A node in the hierarchy that may contain zero or more child folders.
- **Root_Folder**: A folder with no parent; a top-level entry in the Left Pane.
- **Child_Folder**: A folder whose parent is another folder.
- **Selected_Folder**: The folder currently chosen by the user; its immediate children are displayed in the Right Pane.
- **Left_Pane**: The vertical split panel on the left that renders the folder tree.
- **Right_Pane**: The vertical split panel on the right that renders the immediate children of the Selected_Folder.
- **Create_Folder_Button**: A UI control that initiates the folder creation flow.
- **Inline_Name_Input**: A text input field rendered in place (within the Left Pane tree or the Right Pane table) where the user types the new folder name before confirming.
- **API_Server**: The ElysiaJS (Bun) backend application.
- **Repository_Layer**: The data-access layer responsible for all database queries.
- **Service_Layer**: The business-logic layer that orchestrates Repository_Layer calls.
- **Controller_Layer**: The HTTP-handling layer that receives requests and delegates to the Service_Layer.
- **Pinia_Store**: The centralized Pinia state management store on the frontend.
- **DuplicateNameError**: An error thrown when a folder name already exists at the same parent level.
- **Pretty_Printer**: A utility that serializes structured data back into a canonical string representation.

---

## Requirements

### Requirement 1: Create Root Folder from the Left Pane

**User Story:** As a user, I want to create a new root-level folder from the Left Pane, so that I can add top-level folders to the hierarchy without leaving the tree view.

#### Acceptance Criteria

1. THE Left_Pane SHALL display a Create_Folder_Button that initiates creation of a Root_Folder.
2. WHEN the Create_Folder_Button in the Left_Pane is clicked, THE Left_Pane SHALL render an Inline_Name_Input at the bottom of the root folder list.
3. WHEN the Inline_Name_Input is rendered, THE Left_Pane SHALL set focus on the Inline_Name_Input automatically.
4. WHEN the user confirms the name (by pressing Enter or clicking a confirm control), THE Pinia_Store SHALL call the API_Server to create a Root_Folder with the entered name and `parentId` of `null`.
5. WHEN the API_Server successfully creates the Root_Folder, THE Pinia_Store SHALL add the new folder to the root folders list and the Inline_Name_Input SHALL be dismissed.
6. WHEN the user cancels (by pressing Escape or clicking a cancel control), THE Inline_Name_Input SHALL be dismissed without creating a folder.
7. IF the user confirms with an empty or whitespace-only name, THEN THE Inline_Name_Input SHALL display a validation message and SHALL NOT call the API_Server.

---

### Requirement 2: Create Child Folder from the Right Pane

**User Story:** As a user, I want to create a new child folder under the currently selected folder from the Right Pane, so that I can add sub-folders while viewing the folder's contents.

#### Acceptance Criteria

1. WHILE a Selected_Folder is active, THE Right_Pane SHALL display a Create_Folder_Button that initiates creation of a Child_Folder under the Selected_Folder.
2. WHEN the Create_Folder_Button in the Right_Pane is clicked, THE Right_Pane SHALL render an Inline_Name_Input within the children table area.
3. WHEN the Inline_Name_Input is rendered, THE Right_Pane SHALL set focus on the Inline_Name_Input automatically.
4. WHEN the user confirms the name, THE Pinia_Store SHALL call the API_Server to create a Child_Folder with the entered name and the Selected_Folder's `id` as `parentId`.
5. WHEN the API_Server successfully creates the Child_Folder, THE Pinia_Store SHALL add the new folder to the Selected_Folder's children list and the Inline_Name_Input SHALL be dismissed.
6. WHEN the user cancels, THE Inline_Name_Input SHALL be dismissed without creating a folder.
7. IF the user confirms with an empty or whitespace-only name, THEN THE Inline_Name_Input SHALL display a validation message and SHALL NOT call the API_Server.
8. WHEN no folder is selected, THE Right_Pane SHALL NOT display the Create_Folder_Button.

---

### Requirement 3: API Endpoint — Create Folder

**User Story:** As a developer, I want a `POST /folders` endpoint that creates a folder with an optional parent, so that the frontend can create both root and child folders through a single endpoint.

#### Acceptance Criteria

1. THE API_Server SHALL expose a `POST /folders` endpoint that accepts a JSON body with a `name` (non-empty string) and an optional `parentId` (UUID or null).
2. WHEN a valid request is received, THE Controller_Layer SHALL delegate to the Service_Layer, which SHALL delegate to the Repository_Layer to insert the new folder and maintain the Closure Table.
3. WHEN the folder is successfully created, THE API_Server SHALL return an HTTP 201 response with the created `Folder` object wrapped in the `ApiResponse` envelope.
4. IF the request body contains an empty or whitespace-only `name`, THEN THE Controller_Layer SHALL return an HTTP 400 response with a structured `ApiError` body before delegating to the Service_Layer.
5. IF the `parentId` is provided and is not a valid UUID, THEN THE Controller_Layer SHALL return an HTTP 400 response with a structured `ApiError` body before delegating to the Service_Layer.
6. IF the `parentId` is provided and does not correspond to an existing folder, THEN THE Service_Layer SHALL throw a `NotFoundError` and THE Controller_Layer SHALL return an HTTP 404 response with a structured `ApiError` body.
7. IF a folder with the same `name` already exists at the same parent level, THEN THE Repository_Layer SHALL throw a `DuplicateNameError` and THE Controller_Layer SHALL return an HTTP 409 response with a structured `ApiError` body containing `code: 'DUPLICATE_NAME'`.

---

### Requirement 4: Duplicate Name Feedback in the UI

**User Story:** As a user, I want to be informed when the folder name I entered already exists at the same level, so that I can choose a different name without losing my input.

#### Acceptance Criteria

1. WHEN the API_Server returns an HTTP 409 response for a duplicate name, THE Inline_Name_Input SHALL remain visible and SHALL display an error message indicating the name is already taken.
2. WHEN a duplicate name error is displayed, THE Inline_Name_Input SHALL retain the entered text so the user can edit it.
3. WHEN the user modifies the name after a duplicate name error, THE Inline_Name_Input SHALL clear the error message.

---

### Requirement 5: Store Integration — Create Folder Action

**User Story:** As a developer, I want the Pinia Store to expose a `createFolder` action, so that components remain stateless and folder creation is handled centrally.

#### Acceptance Criteria

1. THE Pinia_Store SHALL expose a `createFolder(name: string, parentId: string | null)` action that calls `POST /folders` and returns the created `Folder`.
2. WHEN `createFolder` is called with `parentId` of `null`, THE Pinia_Store SHALL add the new folder to `rootIds` and to the `folders` map upon success.
3. WHEN `createFolder` is called with a non-null `parentId` whose children are already in the `childrenMap` (status `loaded`), THE Pinia_Store SHALL append the new folder to that parent's children list in `childrenMap` and add it to the `folders` map.
4. WHEN `createFolder` is called with a non-null `parentId` whose children have NOT been fetched yet (status is not `loaded`), THE Pinia_Store SHALL add the new folder to the `folders` map but SHALL NOT modify `childrenMap` for that parent, so the next `fetchChildren` call retrieves the full and accurate list.
5. WHEN `createFolder` receives a `DuplicateNameError` response (HTTP 409) from the API_Server, THE Pinia_Store SHALL propagate the error to the calling component without modifying store state.
6. THE Pinia_Store SHALL initialize the new folder's fetch status to `idle` in `fetchStatus` upon successful creation.

---

### Requirement 6: Left Pane Tree Reflects New Root Folders

**User Story:** As a user, I want newly created root folders to appear immediately in the Left Pane tree, so that I can see and navigate to them without refreshing the page.

#### Acceptance Criteria

1. WHEN a Root_Folder is successfully created, THE Left_Pane SHALL render the new folder as a Folder_Node in the root folder list without requiring a page reload.
2. THE new Root_Folder SHALL appear in alphabetical order among existing root folders, consistent with the sort order returned by the API_Server.
3. WHEN the new Root_Folder is added to the tree, THE Pinia_Store SHALL set its fetch status to `idle`.

---

### Requirement 7: Right Pane Table Reflects New Child Folders

**User Story:** As a user, I want newly created child folders to appear immediately in the Right Pane table, so that I can confirm the creation was successful.

#### Acceptance Criteria

1. WHEN a Child_Folder is successfully created under the Selected_Folder, THE Right_Pane SHALL render the new folder in the children table without requiring a page reload.
2. THE new Child_Folder SHALL display a `childCount` of `0` in the Right Pane table, as it has no children at creation time.
3. WHEN a Child_Folder is successfully created, THE Left_Pane SHALL update the expand toggle of the parent Folder_Node to reflect that it now has at least one child, if the parent was previously confirmed as a leaf.

---

### Requirement 8: Backend — Service and Repository Layer for Folder Creation

**User Story:** As a developer, I want the Service and Repository layers to handle folder creation with proper validation and Closure Table maintenance, so that the hierarchy remains consistent.

#### Acceptance Criteria

1. THE Service_Layer SHALL expose a `createFolder(name: string, parentId: string | null)` method that validates the parent exists (when `parentId` is non-null) and delegates to the Repository_Layer.
2. THE Repository_Layer SHALL insert the new folder and maintain the Closure Table in a single database transaction: inserting the folder row, the self-referencing closure row, and all ancestor rows propagated from the parent.
3. WHEN `parentId` is `null`, THE Repository_Layer SHALL insert only the folder row and the self-referencing closure row (no ancestor propagation step).
4. THE Repository_Layer SHALL trim leading and trailing whitespace from `name` before inserting.
5. IF the database transaction fails for any reason other than a unique constraint violation, THEN THE Repository_Layer SHALL roll back the transaction and re-throw the original error.


---

### Requirement 9: Icon Grid View in the Right Pane

**User Story:** As a user, I want the Right Pane to display folders as an icon grid (like Windows Explorer or macOS Finder), so that I can browse folder contents in a more visual and familiar way.

#### Acceptance Criteria

1. THE Right_Pane SHALL display the children of the Selected_Folder as an icon grid instead of a table, where each item is rendered as a folder icon with the folder name below it.
2. WHEN the Selected_Folder has no children, THE Right_Pane SHALL display an empty-state message in place of the icon grid.
3. THE Right_Pane SHALL arrange folder items in a responsive grid that wraps to additional rows when the available width is exceeded.
4. WHEN the user double-clicks a folder icon in the icon grid, THE Pinia_Store SHALL set that folder as the Selected_Folder, equivalent to selecting it from the Left_Pane tree.
5. WHEN a folder is selected via double-click in the icon grid, THE Right_Pane SHALL update to display the children of the newly Selected_Folder.
6. WHEN the Create_Folder_Button in the Right_Pane is clicked, THE Right_Pane SHALL render the Inline_Name_Input as an item within the icon grid, styled consistently with the other folder items (icon placeholder and text input below it).
7. WHEN the Inline_Name_Input is rendered inside the icon grid, THE Right_Pane SHALL set focus on the Inline_Name_Input automatically.
8. WHEN the Inline_Name_Input is dismissed (confirmed or cancelled), THE Right_Pane SHALL remove the inline input item from the icon grid.
