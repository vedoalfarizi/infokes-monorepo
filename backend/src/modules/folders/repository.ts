// Repository layer — all SQL queries for folder operations
import pg from 'pg'
import type { Folder, FolderChild } from '../../shared/types.js'

// Shared connection pool — reads DATABASE_URL from environment
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

// Row shapes returned by pg (snake_case)
interface FolderRow {
  id: string
  name: string
  created_at: Date
}

interface FolderChildRow extends FolderRow {
  child_count: string // pg returns bigint counts as strings
}

/** Map a raw DB row to the Folder interface */
function toFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at.toISOString(),
  }
}

/** Map a raw DB row to the FolderChild interface */
function toFolderChild(row: FolderChildRow): FolderChild {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at.toISOString(),
    childCount: parseInt(row.child_count, 10),
  }
}

export abstract class FolderRepository {
  /**
   * Returns all root folders (folders with no parent).
   * Uses the parent_id column for an efficient O(1) index scan.
   */
  static async findRoots(): Promise<Folder[]> {
    const result = await pool.query<FolderRow>(
      `SELECT id, name, created_at
       FROM folders
       WHERE parent_id IS NULL
       ORDER BY name ASC`
    )
    return result.rows.map(toFolder)
  }

  /**
   * Returns the direct children of a folder, including each child's
   * own direct-child count (for right-pane display).
   *
   * Uses the closure table with depth = 1 to find direct children,
   * and a correlated sub-select to count each child's own children.
   */
  static async findChildren(parentId: string): Promise<FolderChild[]> {
    const result = await pool.query<FolderChildRow>(
      `SELECT
         f.id,
         f.name,
         f.created_at,
         (
           SELECT COUNT(*)
           FROM folder_paths fp2
           WHERE fp2.ancestor = f.id
             AND fp2.depth = 1
         ) AS child_count
       FROM folders f
       JOIN folder_paths fp ON fp.descendant = f.id
       WHERE fp.ancestor = $1
         AND fp.depth = 1
       ORDER BY f.name ASC`,
      [parentId]
    )
    return result.rows.map(toFolderChild)
  }

  /**
   * Returns true if a folder with the given id exists in the database.
   */
  static async exists(id: string): Promise<boolean> {
    const result = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM folders WHERE id = $1) AS exists`,
      [id]
    )
    return result.rows[0].exists
  }

  /**
   * Inserts a new folder and maintains the closure table in a single
   * transaction using the three-step pattern:
   *   1. Insert the folder row (RETURNING id)
   *   2. Insert the self-referencing closure row (depth = 0)
   *   3. Propagate all ancestor rows from the parent (depth + 1)
   *
   * When parentId is null the folder becomes a root — only the
   * self-referencing row is inserted (step 3 is skipped).
   */
  static async insertFolder(
    name: string,
    parentId: string | null
  ): Promise<Folder> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Step 1: insert the folder row
      const folderResult = await client.query<FolderRow>(
        `INSERT INTO folders (name, parent_id)
         VALUES ($1, $2)
         RETURNING id, name, created_at`,
        [name, parentId]
      )
      const newFolder = folderResult.rows[0]
      const newId = newFolder.id

      // Step 2: insert self-referencing closure row
      await client.query(
        `INSERT INTO folder_paths (ancestor, descendant, depth)
         VALUES ($1, $1, 0)`,
        [newId]
      )

      // Step 3: propagate all ancestor relationships from parent
      if (parentId !== null) {
        await client.query(
          `INSERT INTO folder_paths (ancestor, descendant, depth)
           SELECT fp.ancestor, $1, fp.depth + 1
           FROM folder_paths fp
           WHERE fp.descendant = $2`,
          [newId, parentId]
        )
      }

      await client.query('COMMIT')
      return toFolder(newFolder)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }
}

// Export the pool so other modules (e.g. integration tests) can reuse it
export { pool }
