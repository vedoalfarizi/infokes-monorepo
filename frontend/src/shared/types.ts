/**
 * Shared API types — mirrored from backend/src/shared/types.ts.
 * These types are the single source of truth for Folder, FolderChild,
 * ApiResponse, and ApiError shapes used across the frontend.
 *
 * Requirements: 7.4, 10.3
 */

export interface Folder {
  id: string        // UUID
  name: string
  createdAt: string // ISO 8601
}

export interface FolderChild extends Folder {
  childCount: number  // count of direct children (for right-pane display)
}

export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  error: {
    code: string    // e.g. 'NOT_FOUND', 'INVALID_UUID', 'INTERNAL_ERROR'
    message: string
  }
}
