# Requirements Document

## Introduction

The File Explorer is a high-performance, scalable web application that provides a dual-pane interface for navigating hierarchical folder structures of unlimited depth. The left pane renders a recursive tree-view of folders, while the right pane displays the immediate children of the currently selected folder. The system uses a PostgreSQL Closure Table for efficient tree traversal, an ElysiaJS (Bun) backend following Clean Architecture, and a Vue 3 frontend with Pinia state management and custom-built recursive components.

## Glossary

- **File_Explorer**: The complete web application, encompassing both frontend and backend.
- **Folder**: A node in the hierarchy that may contain zero or more child folders.
- **Root_Folder**: A folder with no parent; the top-level entry point of the tree.
- **Child_Folder**: A folder whose parent is another folder.
- **Folder_Tree**: The full hierarchical structure of folders rendered in the left pane.
- **Left_Pane**: The vertical split panel on the left that renders the Folder_Tree.
- **Right_Pane**: The vertical split panel on the right that renders the immediate children of the selected folder.
- **Folder_Node**: A single interactive element in the Left_Pane representing one folder.
- **FolderTree_Component**: The custom recursive Vue 3 component that renders the Folder_Tree in the Left_Pane.
- **FolderNode_Component**: The custom recursive Vue 3 component that renders a single Folder_Node and its children.
- **Selected_Folder**: The folder currently chosen by the user; its immediate children are displayed in the Right_Pane.
- **Expanded_Folder**: A folder whose direct children are visible in the Left_Pane.
- **Collapsed_Folder**: A folder whose children are hidden in the Left_Pane.
- **Lazy_Load**: The pattern of fetching child folders from the API only when a parent folder is first expanded or selected.
- **Closure_Table**: The PostgreSQL schema pattern using a `folder_paths` table with `ancestor`, `descendant`, and `depth` columns to represent all ancestor-descendant relationships.
- **API_Server**: The ElysiaJS (Bun) backend application.
- **Repository_Layer**: The data-access layer responsible for all database queries.
- **Service_Layer**: The business-logic layer that orchestrates Repository_Layer calls.
- **Controller_Layer**: The HTTP-handling layer that receives requests and delegates to the Service_Layer.
- **Pinia_Store**: The centralized Pinia state management store on the frontend.
- **Loading_State**: A visual indicator shown on a Folder_Node while its children are being fetched.
- **Pretty_Printer**: A utility that serializes structured data back into a canonical string representation.

---

## Requirements

### Requirement 1: Dual-Pane Layout

**User Story:** As a user, I want a split-screen interface with a folder tree on the left and a content view on the right, so that I can navigate the hierarchy and view folder contents simultaneously.

#### Acceptance Criteria

1. THE File_Explorer SHALL render a vertically split layout with a Left_Pane and a Right_Pane visible simultaneously.
2. THE Left_Pane SHALL display the FolderTree_Component.
3. THE Right_Pane SHALL display the immediate children of the Selected_Folder as a table or grid.
4. WHEN no folder has been selected, THE Right_Pane SHALL display an empty state message indicating that no folder is selected.

---

### Requirement 2: Root-Level Lazy Loading on Mount

**User Story:** As a user, I want the application to load quickly on first visit, so that I am not waiting for the entire folder hierarchy to be fetched upfront.

#### Acceptance Criteria

1. WHEN the File_Explorer mounts, THE Pinia_Store SHALL fetch only the Root_Folder entries from the API_Server.
2. WHEN the File_Explorer mounts, THE Pinia_Store SHALL NOT fetch any sub-folders beyond the root level.
3. THE API_Server SHALL expose a `GET /folders` endpoint that returns only Root_Folder entries (folders with no parent).
4. WHEN the `GET /folders` endpoint is called, THE Controller_Layer SHALL delegate to the Service_Layer, which SHALL delegate to the Repository_Layer to retrieve Root_Folder entries using the Closure_Table.

---

### Requirement 3: Lazy Loading on Folder Expansion

**User Story:** As a user, I want child folders to load only when I expand a parent folder in the tree, so that the application remains responsive with large hierarchies.

#### Acceptance Criteria

1. WHEN a user expands a Collapsed_Folder in the Left_Pane, THE Pinia_Store SHALL fetch the direct children of that folder from the API_Server if they have not been fetched previously.
2. WHEN a Folder_Node is being fetched, THE FolderNode_Component SHALL display a Loading_State indicator on that node.
3. WHEN the fetch completes successfully, THE Pinia_Store SHALL store the child folders and THE FolderNode_Component SHALL remove the Loading_State indicator and render the children.
4. IF the fetch for a Folder_Node's children fails, THEN THE FolderNode_Component SHALL display an error indicator on that node and THE Pinia_Store SHALL record the error state for that folder.
5. WHEN a folder's children have already been fetched and stored in the Pinia_Store, THE FolderNode_Component SHALL render them from the store without issuing a new API request.
6. THE API_Server SHALL expose a `GET /folders/:id/children` endpoint that returns the direct children of the folder identified by `:id`.
7. WHEN the `GET /folders/:id/children` endpoint is called, THE Repository_Layer SHALL query the Closure_Table for rows where `ancestor = :id` AND `depth = 1`.

---

### Requirement 4: Folder Selection and Right-Pane Display

**User Story:** As a user, I want to click a folder to see its immediate children in the right pane, so that I can browse folder contents without expanding the tree.

#### Acceptance Criteria

1. WHEN a user clicks a Folder_Node in the Left_Pane, THE Pinia_Store SHALL set that folder as the Selected_Folder.
2. WHEN the Selected_Folder changes, THE Right_Pane SHALL display the immediate children of the Selected_Folder.
3. WHEN a folder is clicked and its children have not been fetched, THE Pinia_Store SHALL fetch the children from the API_Server before populating the Right_Pane.
4. WHEN a folder is clicked and its children are already in the Pinia_Store, THE Right_Pane SHALL render them immediately without issuing a new API request.
5. THE Right_Pane table SHALL display at minimum the folder name and the count of direct children for each child folder.
6. WHEN the Selected_Folder is set, THE FolderNode_Component corresponding to that folder SHALL apply a visual selected style.

---

### Requirement 5: Unlimited Folder Depth

**User Story:** As a developer, I want the system to support arbitrarily deep folder nesting, so that users are not constrained by a fixed hierarchy limit.

#### Acceptance Criteria

1. THE Closure_Table schema SHALL store a row for every ancestor-descendant pair, including self-referencing rows where `ancestor = descendant` and `depth = 0`.
2. WHEN a new Folder is created as a child of an existing folder, THE Repository_Layer SHALL insert into the Closure_Table all ancestor-descendant pairs from every ancestor of the parent folder to the new folder, plus the self-referencing row.
3. THE FolderTree_Component SHALL render folder hierarchies of any depth by recursively rendering FolderNode_Components without a hard-coded depth limit.
4. THE API_Server SHALL return correct direct children for a folder at any depth level when `GET /folders/:id/children` is called.

---

### Requirement 6: Database Schema — Closure Table

**User Story:** As a developer, I want a well-defined Closure Table schema, so that tree traversal queries are efficient and maintainable.

#### Acceptance Criteria

1. THE Repository_Layer SHALL use a `folders` table with at minimum the columns: `id` (UUID primary key), `name` (non-null text), and `created_at` (timestamp with time zone).
2. THE Repository_Layer SHALL use a `folder_paths` table with columns: `ancestor` (UUID, foreign key to `folders.id`), `descendant` (UUID, foreign key to `folders.id`), and `depth` (non-negative integer); the combination of `ancestor` and `descendant` SHALL be the primary key.
3. THE Repository_Layer SHALL maintain an index on `folder_paths.ancestor` to optimize child-lookup queries.
4. THE Repository_Layer SHALL maintain an index on `folder_paths.descendant` to optimize ancestor-lookup queries.
5. WHEN a folder is deleted, THE Repository_Layer SHALL delete all rows in `folder_paths` where `ancestor` or `descendant` equals the deleted folder's `id`.

---

### Requirement 7: Clean Architecture — Backend Layers

**User Story:** As a developer, I want the backend to follow Clean Architecture with distinct Controller, Service, and Repository layers, so that the codebase is maintainable and testable.

#### Acceptance Criteria

1. THE Controller_Layer SHALL handle HTTP request parsing and response serialization, and SHALL NOT contain business logic or direct database queries.
2. THE Service_Layer SHALL contain all business logic and SHALL NOT directly execute database queries.
3. THE Repository_Layer SHALL contain all database queries and SHALL NOT contain business logic.
4. THE API_Server SHALL provide end-to-end TypeScript type safety for all API request and response shapes using shared type definitions.
5. WHEN the Service_Layer receives an invalid folder `id` that does not exist in the database, THE Service_Layer SHALL return a structured error that the Controller_Layer maps to an HTTP 404 response.
6. IF an unhandled exception occurs in the Controller_Layer, THEN THE API_Server SHALL return an HTTP 500 response with a structured error body and SHALL log the exception details.

---

### Requirement 8: Custom Recursive Vue Components

**User Story:** As a developer, I want custom-built recursive FolderTree and FolderNode components, so that the implementation demonstrates algorithmic proficiency without relying on third-party tree components.

#### Acceptance Criteria

1. THE FolderTree_Component SHALL be implemented as a Vue 3 Composition API component and SHALL NOT use the Tree or TreeSelect components from PrimeVue or any other UI library.
2. THE FolderNode_Component SHALL be implemented as a Vue 3 Composition API component that recursively renders child FolderNode_Components for each child folder.
3. WHEN a Folder_Node has no children and has been confirmed as a leaf node by the API, THE FolderNode_Component SHALL NOT render an expand toggle.
4. WHEN a Folder_Node has not yet been fetched, THE FolderNode_Component SHALL render an expand toggle to indicate potential children.
5. THE FolderNode_Component SHALL use Vue's `v-memo` or `shouldComponentUpdate`-equivalent optimization to prevent re-rendering of unchanged nodes during lazy load operations.
6. THE FolderTree_Component SHALL accept the list of Root_Folder entries as a prop and render a FolderNode_Component for each root entry.

---

### Requirement 9: Pinia Store — Tree State Management

**User Story:** As a developer, I want a centralized Pinia store to manage all folder tree state, so that components remain stateless and the tree state is predictable.

#### Acceptance Criteria

1. THE Pinia_Store SHALL maintain a normalized map of folder `id` to folder data, including the folder's fetched children list and fetch status (`idle`, `loading`, `loaded`, `error`).
2. THE Pinia_Store SHALL maintain the `id` of the Selected_Folder as a separate state property.
3. THE Pinia_Store SHALL expose an action to fetch root folders that updates the store state and sets the fetch status for each root folder.
4. THE Pinia_Store SHALL expose an action to fetch children of a given folder `id` that sets the fetch status to `loading`, calls the API, then sets the status to `loaded` or `error`.
5. WHEN the fetch-children action is dispatched for a folder whose status is already `loaded`, THE Pinia_Store SHALL NOT issue a new API request.
6. THE Pinia_Store SHALL expose a getter that returns the children of a given folder `id` from the normalized map.

---

### Requirement 10: API Response Serialization and Type Safety

**User Story:** As a developer, I want all API responses to follow a consistent, typed schema, so that the frontend can consume them reliably without runtime type errors.

#### Acceptance Criteria

1. THE API_Server SHALL serialize all successful responses as JSON objects with a `data` field containing the response payload.
2. THE API_Server SHALL serialize all error responses as JSON objects with an `error` field containing a `code` (string) and `message` (string).
3. THE API_Server SHALL define shared TypeScript types for `Folder`, `FolderChild`, and `ApiError` that are used by both the Controller_Layer and consumed by the frontend.
4. FOR ALL valid `Folder` objects serialized by the Pretty_Printer and then parsed by the frontend type definitions, the resulting object SHALL be structurally equivalent to the original (round-trip property).
5. WHEN the `GET /folders/:id/children` endpoint is called with a non-UUID `:id` parameter, THE Controller_Layer SHALL return an HTTP 400 response with a structured error body before delegating to the Service_Layer.

---

### Requirement 11: Unique Folder Names Within the Same Level

**User Story:** As a user, I want to be prevented from creating two folders with the same name under the same parent, so that the folder hierarchy remains unambiguous and navigable.

#### Acceptance Criteria

1. THE `folders` table SHALL enforce that no two folders share the same `name` under the same `parent_id` using database-level partial unique indexes.
2. A partial unique index on `(parent_id, name) WHERE parent_id IS NOT NULL` SHALL prevent duplicate names among sibling folders.
3. A partial unique index on `(name) WHERE parent_id IS NULL` SHALL prevent duplicate names among root-level folders.
4. WHEN `insertFolder` is called with a `name` that already exists at the same level, THE Repository_Layer SHALL throw a `DuplicateNameError`.
5. WHEN the Service_Layer propagates a `DuplicateNameError`, THE Controller_Layer SHALL return an HTTP 409 Conflict response with a structured `ApiError` body containing `code: 'DUPLICATE_NAME'`.
6. THE uniqueness constraint SHALL be enforced at the database level, ensuring correctness even under concurrent insert operations.
