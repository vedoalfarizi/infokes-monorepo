<script setup lang="ts">
import { ref } from 'vue'
import { useFolderStore } from '../stores/folderStore'
import FolderIconGrid from './FolderIconGrid.vue'
import type { FolderChild } from '../shared/types'

const store = useFolderStore()

// Local creation state
const isCreating = ref(false)
const duplicateError = ref('')

function startCreating() {
  isCreating.value = true
  duplicateError.value = ''
}

async function handleCreateConfirm(name: string) {
  // Local whitespace validation — do not call the API for blank names (Req 2.7)
  if (name.trim().length === 0) {
    duplicateError.value = 'Folder name cannot be empty.'
    return
  }

  try {
    await store.createFolder(name, store.selectedFolderId)
    isCreating.value = false
    duplicateError.value = ''
  } catch (err: unknown) {
    const error = err as Error & { code?: string }
    if (error.code === 'DUPLICATE_NAME') {
      // Keep input open and show the duplicate name message (Req 4.1, 4.2)
      duplicateError.value = error.message || 'A folder with that name already exists.'
    } else {
      // Generic error — keep input open with a fallback message
      duplicateError.value = 'Something went wrong. Please try again.'
    }
  }
}

function handleCreateCancel() {
  isCreating.value = false
  duplicateError.value = ''
}

function handleSelect(folderId: string) {
  store.selectFolder(folderId)
}
</script>

<template>
  <div class="right-pane">
    <div v-if="store.selectedFolder === null" class="empty-state" role="status" aria-live="polite">
      <p>Select a folder to view its contents</p>
    </div>

    <div v-else class="folder-contents">
      <div class="folder-contents__header">
        <h2>{{ store.selectedFolder.name }}</h2>
        <!-- New Folder button — only shown when a folder is selected (Req 2.1, 2.8) -->
        <button
          class="new-folder-btn"
          type="button"
          @click="startCreating"
        >
          + New Folder
        </button>
      </div>

      <FolderIconGrid
        :children="(store.getChildren(store.selectedFolderId!) as FolderChild[])"
        :is-creating="isCreating"
        :error="duplicateError"
        @select="handleSelect"
        @create-confirm="handleCreateConfirm"
        @create-cancel="handleCreateCancel"
        @update:error="(val) => (duplicateError = val)"
      />
    </div>
  </div>
</template>

<style scoped>
.right-pane {
  padding: 1rem;
}

.empty-state {
  color: #6b7280;
  font-style: italic;
}

.folder-contents__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 0.5rem;
}

.folder-contents__header h2 {
  margin: 0;
}

.new-folder-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #1976d2;
  background: transparent;
  border: 1px solid #1976d2;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s, color 0.15s;
}

.new-folder-btn:hover {
  background-color: #e3f2fd;
}

.new-folder-btn:focus {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}
</style>
