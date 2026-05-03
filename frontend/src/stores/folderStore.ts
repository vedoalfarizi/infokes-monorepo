import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Folder, FolderChild, ApiResponse, ApiError } from '../shared/types'

// Re-export shared types so consumers can import from the store as before
export type { Folder, FolderChild, ApiResponse, ApiError }

export type FetchStatus = 'idle' | 'loading' | 'loaded' | 'error'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const SELECTED_FOLDER_KEY = 'fileExplorer:selectedFolderId'

export const useFolderStore = defineStore('folders', () => {
  // State
  const folders = ref<Record<string, Folder>>({})
  const childrenMap = ref<Record<string, string[]>>({})
  const fetchStatus = ref<Record<string, FetchStatus>>({})
  const selectedFolderId = ref<string | null>(null)
  const rootIds = ref<string[]>([])
  const navigationHistory = ref<string[]>([])

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

  const canGoBack = computed((): boolean => navigationHistory.value.length > 0)

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
   * Pushes the previous selection onto navigationHistory before updating (Req 3.2).
   * Persists the new selection to localStorage (Req 4.1, 4.7).
   * Requirements: 3.1, 3.2, 4.1, 4.3, 4.4, 4.7
   */
  async function selectFolder(folderId: string): Promise<void> {
    // Push current selection onto history stack before changing (Req 3.2)
    if (selectedFolderId.value !== null) {
      navigationHistory.value = [...navigationHistory.value, selectedFolderId.value]
    }

    // Set selected folder (Req 4.1)
    selectedFolderId.value = folderId

    // Persist to localStorage (Req 4.1, 4.7)
    localStorage.setItem(SELECTED_FOLDER_KEY, folderId)

    // Fetch children if not already loaded (Req 4.3, 4.4)
    if (getFetchStatus(folderId) !== 'loaded') {
      await fetchChildren(folderId)
    }
  }

  /**
   * Navigates back to the most recent valid entry in navigationHistory.
   * Skips IDs that no longer exist in the folders map (e.g. deleted folders).
   * If the stack is exhausted, clears the selection.
   * Requirements: 3.5, 3.6, 3.7, 3.8
   */
  async function navigateBack(): Promise<void> {
    while (navigationHistory.value.length > 0) {
      const stack = [...navigationHistory.value]
      const previousId = stack.pop()!
      navigationHistory.value = stack

      // Skip deleted folders (Req 3.8)
      if (folders.value[previousId] !== undefined) {
        selectedFolderId.value = previousId
        localStorage.setItem(SELECTED_FOLDER_KEY, previousId)
        if (getFetchStatus(previousId) !== 'loaded') {
          await fetchChildren(previousId)
        }
        return
      }
    }
    // Stack exhausted — clear selection
    selectedFolderId.value = null
    localStorage.removeItem(SELECTED_FOLDER_KEY)
  }

  /**
   * Renames a folder via PATCH /folders/:id.
   * On success, updates the folder in-place in the store.
   * On error, attaches the API error code to the thrown Error.
   * Requirements: 1.3
   */
  async function renameFolder(folderId: string, newName: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })

    if (!response.ok) {
      const body: ApiError = await response.json()
      const err = new Error(body.error.message) as Error & { code: string }
      err.code = body.error.code
      throw err
    }

    const body: ApiResponse<Folder> = await response.json()
    // Update in-place — all computed properties referencing folders[id] update reactively
    folders.value[folderId] = body.data
  }

  /**
   * Collects folderId and all known descendant IDs from the store's childrenMap via BFS.
   * Private helper — not exported.
   * Requirements: 2.3
   */
  function collectSubtreeIds(folderId: string): Set<string> {
    const result = new Set<string>()
    const queue = [folderId]
    while (queue.length > 0) {
      const id = queue.shift()!
      result.add(id)
      const children = childrenMap.value[id] ?? []
      queue.push(...children)
    }
    return result
  }

  /**
   * Deletes a folder and its entire subtree via DELETE /folders/:id.
   * On 204, removes all affected IDs from the store's normalized state.
   * Clears selectedFolderId and prunes navigationHistory if affected.
   * Requirements: 2.3, 2.4, 2.5
   */
  async function deleteFolder(folderId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const body: ApiError = await response.json()
      const err = new Error(body.error.message) as Error & { code: string }
      err.code = body.error.code
      throw err
    }

    // Collect all known descendants to remove from store
    const toRemove = collectSubtreeIds(folderId)

    for (const id of toRemove) {
      delete folders.value[id]
      delete childrenMap.value[id]
      delete fetchStatus.value[id]
    }

    // Remove folderId from its parent's childrenMap entry (Req 2.5)
    for (const [parentId, children] of Object.entries(childrenMap.value)) {
      if (children.includes(folderId)) {
        childrenMap.value[parentId] = children.filter((id) => id !== folderId)
        break
      }
    }

    // Remove from rootIds if applicable
    rootIds.value = rootIds.value.filter((id) => !toRemove.has(id))

    // Clear selection if deleted folder was selected (Req 2.4)
    if (selectedFolderId.value !== null && toRemove.has(selectedFolderId.value)) {
      selectedFolderId.value = null
      localStorage.removeItem(SELECTED_FOLDER_KEY)
    }

    // Prune navigation history of deleted IDs (Req 3.8)
    navigationHistory.value = navigationHistory.value.filter((id) => !toRemove.has(id))
  }

  /**
   * Initializes the store on app mount.
   * Fetches root folders, then attempts to restore the persisted selected folder from localStorage.
   * Verifies the persisted folder still exists via GET /folders/:id before restoring.
   * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6
   */
  async function initializeStore(): Promise<void> {
    await fetchRootFolders()

    const persistedId = localStorage.getItem(SELECTED_FOLDER_KEY)
    if (!persistedId) return // Req 4.6 — no persisted ID, start with no selection

    try {
      const response = await fetch(`${API_BASE_URL}/folders/${persistedId}`)
      if (!response.ok) {
        // Folder no longer exists — clear persisted value (Req 4.5)
        localStorage.removeItem(SELECTED_FOLDER_KEY)
        return
      }
      const body: ApiResponse<Folder> = await response.json()
      folders.value[body.data.id] = body.data
      // Initialise fetch status if not already tracked
      if (fetchStatus.value[body.data.id] === undefined) {
        fetchStatus.value[body.data.id] = 'idle'
      }

      // Set selection directly — bypasses history push since this is a restore, not navigation
      selectedFolderId.value = body.data.id
      await fetchChildren(body.data.id) // Req 4.4
    } catch {
      // Network error — clear persisted value and start with no selection
      localStorage.removeItem(SELECTED_FOLDER_KEY)
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
    navigationHistory,
    // Getters
    getChildren,
    getFetchStatus,
    selectedFolder,
    rootFolders,
    canGoBack,
    // Actions
    fetchRootFolders,
    fetchChildren,
    selectFolder,
    navigateBack,
    createFolder,
    renameFolder,
    deleteFolder,
    initializeStore,
  }
})
