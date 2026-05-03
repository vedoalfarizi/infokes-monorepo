<script setup lang="ts">
import InlineNameInput from './InlineNameInput.vue'
import type { FolderChild } from '../shared/types'

const props = defineProps<{
  children: FolderChild[]
  isCreating: boolean
  error?: string
}>()

const emit = defineEmits<{
  select: [folderId: string]
  createConfirm: [name: string]
  createCancel: []
  'update:error': [value: string]
}>()

function handleDblClick(folderId: string) {
  emit('select', folderId)
}

function handleCreateConfirm(name: string) {
  emit('createConfirm', name)
}

function handleCreateCancel() {
  emit('createCancel')
}
</script>

<template>
  <div class="folder-icon-grid">
    <!-- Empty state: no children and not in creation mode -->
    <p
      v-if="children.length === 0 && !isCreating"
      class="folder-icon-grid__empty"
      role="status"
      aria-live="polite"
    >
      This folder is empty
    </p>

    <!-- Icon grid -->
    <div
      v-else
      class="folder-icon-grid__grid"
      role="list"
      aria-label="Folder contents"
    >
      <!-- Existing folder cards -->
      <div
        v-for="child in children"
        :key="child.id"
        class="folder-icon-grid__card"
        role="listitem"
        :aria-label="child.name"
        tabindex="0"
        @dblclick="handleDblClick(child.id)"
        @keydown.enter="handleDblClick(child.id)"
      >
        <span class="folder-icon-grid__icon" aria-hidden="true">📁</span>
        <span class="folder-icon-grid__name">{{ child.name }}</span>
      </div>

      <!-- Inline creation card (appended at the end when isCreating) -->
      <div
        v-if="isCreating"
        class="folder-icon-grid__card folder-icon-grid__card--creating"
        role="listitem"
        aria-label="New folder"
      >
        <span class="folder-icon-grid__icon" aria-hidden="true">📁</span>
        <InlineNameInput
          placeholder="Folder name"
          :error="error"
          @confirm="handleCreateConfirm"
          @cancel="handleCreateCancel"
          @update:error="(val) => emit('update:error', val)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.folder-icon-grid {
  width: 100%;
}

.folder-icon-grid__empty {
  color: #6b7280;
  font-style: italic;
  padding: 0.5rem 0;
}

.folder-icon-grid__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  padding: 8px 0;
}

.folder-icon-grid__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s, border-color 0.15s;
  text-align: center;
  min-width: 0;
}

.folder-icon-grid__card:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
}

.folder-icon-grid__card:focus {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}

.folder-icon-grid__card--creating {
  cursor: default;
  align-items: stretch;
  padding: 8px;
}

.folder-icon-grid__card--creating:hover {
  background-color: #f9fafb;
  border-color: #d1d5db;
}

.folder-icon-grid__icon {
  font-size: 2rem;
  line-height: 1;
}

.folder-icon-grid__name {
  font-size: 13px;
  color: #111827;
  word-break: break-word;
  overflow-wrap: anywhere;
  max-width: 100%;
}
</style>
