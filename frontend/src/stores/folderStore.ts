import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Folder, FolderChild, ApiResponse, ApiError } from '../shared/types'

// Re-export shared types so consumers can import from the store as before
export type { Folder, FolderChild, ApiResponse, ApiError }

export type FetchStatus = 'idle' | 'loading' | 'loaded' | 'error'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const useFolderStore = defineStore('folders', () => {
  // State
  const folders = ref<Record<string, Folder>>({})
  const childrenMap = ref<Record<string, string[]>>({})
  const fetchStatus = ref<Record<string, FetchStatus>>({})
  const selectedFolderId = ref<string | null>(null)
  const rootIds = ref<string[]>([])

  // Getters
  const getChildren = (folderId: string): Folder[] => {
    const ids = childrenMap.value[folderId] ?? []
    return ids.map((id) => folders.value[id]).filter((f): f is Folder => f !== undefined)
  }

  const getFetchStatus = (folderId: string): FetchStatus => {
    return fetchStatus.value[folderId] ?? 'idle'
  }

  const selectedFolder = computed((): Folder | null => {
    if (selectedFolderId.value === null) return null
    return folders.value[selectedFolderId.value] ?? null
  })

  const rootFolders = computed((): Folder[] => {
    return rootIds.value.map((id) => folders.value[id]).filter((f): f is Folder => f !== undefined)
  })

  // Actions

  /**
   * Fetches root folders from GET /folders.
   * Populates the folders map and rootIds; sets fetch status for each root to 'idle'.
   * Requirements: 2.1, 2.3, 9.3
   */
  async function fetchRootFolders(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/folders`)
    if (!response.ok) {
      throw new Error(`Failed to fetch root folders: ${response.status}`)
    }
    const body: ApiResponse<Folder[]> = await response.json()
    const roots = body.data

    // Populate folders map
    for (const folder of roots) {
      folders.value[folder.id] = folder
      // Set fetch status to 'idle' for each root (if not already tracked)
      if (fetchStatus.value[folder.id] === undefined) {
        fetchStatus.value[folder.id] = 'idle'
      }
    }

    // Update rootIds
    rootIds.value = roots.map((f) => f.id)
  }

  /**
   * Fetches children of a given folder from GET /folders/:id/children.
   * Guards against re-fetch when status is already 'loaded'.
   * Requirements: 3.1, 3.3, 3.4, 3.5, 9.4, 9.5
   */
  async function fetchChildren(folderId: string): Promise<void> {
    // Guard: do not re-fetch if already loaded (Req 3.5, 9.5)
    if (fetchStatus.value[folderId] === 'loaded') {
      return
    }

    // Set status to loading
    fetchStatus.value[folderId] = 'loading'

    try {
      const response = await fetch(`${API_BASE_URL}/folders/${folderId}/children`)
      if (!response.ok) {
        fetchStatus.value[folderId] = 'error'
        return
      }
      const body: ApiResponse<FolderChild[]> = await response.json()
      const children = body.data

      // Store each child folder in the normalized map
      for (const child of children) {
        folders.value[child.id] = child
        // Initialize fetch status for child if not already tracked
        if (fetchStatus.value[child.id] === undefined) {
          fetchStatus.value[child.id] = 'idle'
        }
      }

      // Update childrenMap with child IDs
      childrenMap.value[folderId] = children.map((c) => c.id)

      // Mark as loaded
      fetchStatus.value[folderId] = 'loaded'
    } catch {
      // Network errors also result in 'error' status
      fetchStatus.value[folderId] = 'error'
    }
  }

  /**
   * Sets the selected folder and triggers fetchChildren if not already loaded.
   * Requirements: 4.1, 4.3, 4.4
   */
  async function selectFolder(folderId: string): Promise<void> {
    // Set selected folder (Req 4.1)
    selectedFolderId.value = folderId

    // Fetch children if not already loaded (Req 4.3, 4.4)
    if (getFetchStatus(folderId) !== 'loaded') {
      await fetchChildren(folderId)
    }
  }

  /**
   * Creates a new folder via POST /folders and updates normalized store state.
   *
   * - parentId === null  → root folder: added to rootIds (sorted alphabetically) and folders map
   * - parentId !== null, parent status 'loaded' → appended to childrenMap[parentId]
   * - parentId !== null, parent status not 'loaded' → childrenMap left untouched
   *
   * On API error the store state is left unchanged and an Error with a `code`
   * property (matching the ApiError code) is thrown.
   *
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.2, 6.3
   */
  async function createFolder(name: string, parentId: string | null): Promise<Folder> {
    const response = await fetch(`${API_BASE_URL}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId }),
    })

    if (!response.ok) {
      const body: ApiError = await response.json()
      const err = new Error(body.error.message) as Error & { code: string }
      err.code = body.error.code
      throw err
    }

    const body: ApiResponse<Folder> = await response.json()
    const folder = body.data

    // Add to normalized folders map and initialise fetch status (Req 5.6)
    folders.value[folder.id] = folder
    fetchStatus.value[folder.id] = 'idle'

    if (parentId === null) {
      // Root folder: append then sort alphabetically by name (Req 5.2, 6.2)
      rootIds.value = [...rootIds.value, folder.id].sort((a, b) =>
        folders.value[a].name.localeCompare(folders.value[b].name),
      )
    } else if (fetchStatus.value[parentId] === 'loaded') {
      // Loaded parent: append to childrenMap so the right pane updates immediately (Req 5.3)
      childrenMap.value[parentId] = [...(childrenMap.value[parentId] ?? []), folder.id]
    }
    // Unloaded parent: do not touch childrenMap — next fetchChildren will get the full list (Req 5.4)

    return folder
  }

  return {
    // State
    folders,
    childrenMap,
    fetchStatus,
    selectedFolderId,
    rootIds,
    // Getters
    getChildren,
    getFetchStatus,
    selectedFolder,
    rootFolders,
    // Actions
    fetchRootFolders,
    fetchChildren,
    selectFolder,
    createFolder,
  }
})
