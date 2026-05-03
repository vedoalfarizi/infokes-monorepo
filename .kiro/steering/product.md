# Product

File Explorer is a web application for browsing a hierarchical folder structure. It presents a two-pane layout: a left pane with a collapsible folder tree and a right pane showing the direct children of the selected folder.

Key behaviors:
- Root folders are loaded on startup
- Children are fetched lazily on first expand/select, then cached
- Selecting a folder updates the right pane with its direct children and each child's own child count
- Folder names must be unique within the same parent level (enforced at DB and API layers)
