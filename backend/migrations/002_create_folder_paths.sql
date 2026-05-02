CREATE TABLE folder_paths (
  ancestor   UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  descendant UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  depth      INTEGER NOT NULL CHECK (depth >= 0),
  PRIMARY KEY (ancestor, descendant)
);

CREATE INDEX idx_folder_paths_ancestor   ON folder_paths (ancestor, depth);
CREATE INDEX idx_folder_paths_descendant ON folder_paths (descendant);
