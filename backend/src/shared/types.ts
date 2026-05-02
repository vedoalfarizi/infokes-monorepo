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
