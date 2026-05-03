<script setup lang="ts">
import { ref } from 'vue'
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
  rename: [folderId: string]
  delete: [folderId: string]
}>()

// Track which card's menu is open (by folder id), or null if none
const openMenuId = ref<string | null>(null)

function handleDblClick(folderId: string) {
  emit('select', folderId)
}

function handleCreateConfirm(name: string) {
  emit('createConfirm', name)
}

function handleCreateCancel() {
  emit('createCancel')
}

function toggleMenu(folderId: string) {
  openMenuId.value = openMenuId.value === folderId ? null : folderId
}

function closeMenu() {
  openMenuId.value = null
}

function handleRename(folderId: string) {
  openMenuId.value = null
  emit('rename', folderId)
}

function handleDelete(folderId: string) {
  openMenuId.value = null
  emit('delete', folderId)
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

        <!-- Context menu trigger -->
        <div class="folder-card-menu-wrapper">
          <button
            class="folder-card-menu-btn"
            :aria-label="`Actions for ${child.name}`"
            aria-haspopup="true"
            :aria-expanded="openMenuId === child.id"
            @click.stop="toggleMenu(child.id)"
          >
            ⋮
          </button>

          <!-- Dropdown menu -->
          <ul
            v-if="openMenuId === child.id"
            class="folder-card-menu"
            role="menu"
          >
            <li role="none">
              <button
                class="folder-card-menu__item"
                role="menuitem"
                @click.stop="handleRename(child.id)"
              >
                Rename
              </button>
            </li>
            <li role="none">
              <button
                class="folder-card-menu__item folder-card-menu__item--danger"
                role="menuitem"
                @click.stop="handleDelete(child.id)"
              >
                Delete
              </button>
            </li>
          </ul>
        </div>
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

    <!-- Click-outside overlay to close any open menu -->
    <div
      v-if="openMenuId !== null"
      class="folder-card-menu-overlay"
      aria-hidden="true"
      @click="closeMenu"
    />
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
  position: relative;
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
  grid-column: span 2;
  min-width: 220px;
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

/* Context menu */
.folder-card-menu-wrapper {
  position: absolute;
  top: 4px;
  right: 4px;
}

.folder-card-menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: #555;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.1s, background-color 0.1s;
}

/* Show the ⋮ button when hovering the card or when the menu is open */
.folder-icon-grid__card:hover .folder-card-menu-btn,
.folder-card-menu-btn[aria-expanded="true"] {
  opacity: 1;
}

.folder-card-menu-btn:hover {
  background-color: #e0e0e0;
  color: #111;
}

.folder-card-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  min-width: 120px;
  margin: 2px 0 0;
  padding: 4px 0;
  list-style: none;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.folder-card-menu__item {
  display: block;
  width: 100%;
  padding: 6px 14px;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  white-space: nowrap;
}

.folder-card-menu__item:hover {
  background-color: #f5f5f5;
}

.folder-card-menu__item--danger {
  color: #c62828;
}

.folder-card-menu__item--danger:hover {
  background-color: #ffebee;
}

/* Invisible full-screen overlay to catch outside clicks */
.folder-card-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 99;
}
</style>
