-- Enforce unique folder names within the same parent level.
-- Two partial indexes are needed because NULL != NULL in standard SQL,
-- so a single unique index on (parent_id, name) would not catch duplicate
-- root-level names (where parent_id IS NULL).

-- Uniqueness among non-root folders: same parent_id + same name is forbidden.
CREATE UNIQUE INDEX idx_folders_unique_name_per_parent
  ON folders (parent_id, name)
  WHERE parent_id IS NOT NULL;

-- Uniqueness among root folders: two roots with the same name are forbidden.
CREATE UNIQUE INDEX idx_folders_unique_name_root
  ON folders (name)
  WHERE parent_id IS NULL;
