<script setup lang="ts">
import { ref } from 'vue'
import { useFolderStore } from '../stores/folderStore'
import FolderTree from './FolderTree.vue'
import InlineNameInput from './InlineNameInput.vue'

const store = useFolderStore()

const isCreating = ref(false)
const duplicateError = ref('')

function startCreating() {
  isCreating.value = true
  duplicateError.value = ''
}

async function handleConfirm(name: string) {
  // Local whitespace validation — never call the API for blank names (Req 1.7)
  if (name.trim().length === 0) {
    duplicateError.value = 'Folder name cannot be empty.'
    return
  }

  try {
    await store.createFolder(name.trim(), null)
    isCreating.value = false
    duplicateError.value = ''
  } catch (err: unknown) {
    const apiErr = err as Error & { code?: string }
    if (apiErr.code === 'DUPLICATE_NAME') {
      // Keep input open and show inline duplicate error (Req 4.1, 4.2)
      duplicateError.value = `A folder named "${name.trim()}" already exists.`
    } else {
      // Generic fallback for network / server errors
      duplicateError.value = 'Something went wrong. Please try again.'
    }
  }
}

function handleCancel() {
  isCreating.value = false
  duplicateError.value = ''
}

function handleUpdateError(value: string) {
  duplicateError.value = value
}
</script>

<template>
  <div class="left-pane">
    <div class="left-pane__toolbar">
      <button
        class="left-pane__new-folder-btn"
        type="button"
        aria-label="New Folder"
        @click="startCreating"
      >
        + New Folder
      </button>
    </div>

    <FolderTree :rootFolders="store.rootFolders" />

    <!-- Inline name input rendered at the bottom of the root list (Req 1.2, 1.3) -->
    <div v-if="isCreating" class="left-pane__inline-input">
      <InlineNameInput
        placeholder="Folder name"
        :error="duplicateError"
        @confirm="handleConfirm"
        @cancel="handleCancel"
        @update:error="handleUpdateError"
      />
    </div>
  </div>
</template>

<style scoped>
.left-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.left-pane__toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.left-pane__new-folder-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 13px;
  font-weight: 500;
  color: #1976d2;
  background: transparent;
  border: 1px solid #1976d2;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.left-pane__new-folder-btn:hover {
  background-color: #e3f2fd;
}

.left-pane__inline-input {
  padding: 8px 12px;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}
</style>
