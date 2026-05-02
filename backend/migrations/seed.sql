-- Seed script: inserts a representative folder tree (3 levels deep, multiple siblings)
-- Uses PL/pgSQL DO block to capture inserted IDs and apply the 3-step closure table pattern.
--
-- Tree structure:
--   Root A
--     ├── A-Child 1
--     │     ├── A-Child 1-1
--     │     └── A-Child 1-2
--     └── A-Child 2
--   Root B
--     ├── B-Child 1
--     │     └── B-Child 1-1
--     └── B-Child 2
--           └── B-Child 2-1

DO $$
DECLARE
  root_a       UUID;
  root_b       UUID;
  a_child1     UUID;
  a_child2     UUID;
  a_child1_1   UUID;
  a_child1_2   UUID;
  b_child1     UUID;
  b_child2     UUID;
  b_child1_1   UUID;
  b_child2_1   UUID;
BEGIN

  -- =========================================================
  -- Root A (no parent)
  -- =========================================================
  INSERT INTO folders (name, parent_id)
    VALUES ('Root A', NULL)
    RETURNING id INTO root_a;

  INSERT INTO folder_paths (ancestor, descendant, depth)
    VALUES (root_a, root_a, 0);

  -- =========================================================
  -- Root B (no parent)
  -- =========================================================
  INSERT INTO folders (name, parent_id)
    VALUES ('Root B', NULL)
    RETURNING id INTO root_b;

  INSERT INTO folder_paths (ancestor, descendant, depth)
    VALUES (root_b, root_b, 0);

  -- =========================================================
  -- A-Child 1  (parent = Root A)
  -- =========================================================
  INSERT INTO folders (name, parent_id)
    VALUES ('A-Child 1', root_a)
    RETURNING id INTO a_child1;

  INSERT INTO folder_paths (ancestor, descendant, depth)
    VALUES (a_child1, a_child1, 0);

  INSERT INTO folder_paths (ancestor, descendant, depth)
    SELECT fp.ancestor, a_child1, fp.depth + 1
    FROM folder_paths fp
    WHERE fp.descendant = root_a;

  -- =========================================================
  -- A-Child 2  (parent = Root A)
  -- =========================================================
  INSERT INTO folders (name, parent_id)
    VALUES ('A-Child 2', root_a)
    RETURNING id INTO a_child2;

  INSERT INTO folder_paths (ancestor, descendant, depth)
    VALUES (a_child2, a_child2, 0);

  INSERT INTO folder_paths (ancestor, descendant, depth)
    SELECT fp.ancestor, a_child2, fp.depth + 1
    FROM folder_paths fp
    WHERE fp.descendant = root_a;

  -- =========================================================
  -- A-Child 1-1  (parent = A-Child 1)  — level 3
  -- =========================================================
  INSERT INTO folders (name, parent_id)
    VALUES ('A-Child 1-1', a_child1)
    RETURNING id INTO a_child1_1;

  INSERT INTO folder_paths (ancestor, descendant, depth)
    VALUES (a_child1_1, a_child1_1, 0);

  INSERT INTO folder_paths (ancestor, descendant, depth)
    SELECT fp.ancestor, a_child1_1, fp.depth + 1
    FROM folder_paths fp
    WHERE fp.descendant = a_child1;

  -- =========================================================
  -- A-Child 1-2  (parent = A-Child 1)  — level 3
  -- =========================================================
  INSERT INTO folders (name, parent_id)
    VALUES ('A-Child 1-2', a_child1)
    RETURNING id INTO a_child1_2;

  INSERT INTO folder_paths (ancestor, descendant, depth)
    VALUES (a_child1_2, a_child1_2, 0);

  INSERT INTO folder_paths (ancestor, descendant, depth)
    SELECT fp.ancestor, a_child1_2, fp.depth + 1
    FROM folder_paths fp
    WHERE fp.descendant = a_child1;

  -- =========================================================
  -- B-Child 1  (parent = Root B)
  -- =========================================================
  INSERT INTO folders (name, parent_id)
    VALUES ('B-Child 1', root_b)
    RETURNING id INTO b_child1;

  INSERT INTO folder_paths (ancestor, descendant, depth)
    VALUES (b_child1, b_child1, 0);

  INSERT INTO folder_paths (ancestor, descendant, depth)
    SELECT fp.ancestor, b_child1, fp.depth + 1
    FROM folder_paths fp
    WHERE fp.descendant = root_b;

  -- =========================================================
  -- B-Child 2  (parent = Root B)
  -- =========================================================
  INSERT INTO folders (name, parent_id)
    VALUES ('B-Child 2', root_b)
    RETURNING id INTO b_child2;

  INSERT INTO folder_paths (ancestor, descendant, depth)
    VALUES (b_child2, b_child2, 0);

  INSERT INTO folder_paths (ancestor, descendant, depth)
    SELECT fp.ancestor, b_child2, fp.depth + 1
    FROM folder_paths fp
    WHERE fp.descendant = root_b;

  -- =========================================================
  -- B-Child 1-1  (parent = B-Child 1)  — level 3
  -- =========================================================
  INSERT INTO folders (name, parent_id)
    VALUES ('B-Child 1-1', b_child1)
    RETURNING id INTO b_child1_1;

  INSERT INTO folder_paths (ancestor, descendant, depth)
    VALUES (b_child1_1, b_child1_1, 0);

  INSERT INTO folder_paths (ancestor, descendant, depth)
    SELECT fp.ancestor, b_child1_1, fp.depth + 1
    FROM folder_paths fp
    WHERE fp.descendant = b_child1;

  -- =========================================================
  -- B-Child 2-1  (parent = B-Child 2)  — level 3
  -- =========================================================
  INSERT INTO folders (name, parent_id)
    VALUES ('B-Child 2-1', b_child2)
    RETURNING id INTO b_child2_1;

  INSERT INTO folder_paths (ancestor, descendant, depth)
    VALUES (b_child2_1, b_child2_1, 0);

  INSERT INTO folder_paths (ancestor, descendant, depth)
    SELECT fp.ancestor, b_child2_1, fp.depth + 1
    FROM folder_paths fp
    WHERE fp.descendant = b_child2;

END $$;
