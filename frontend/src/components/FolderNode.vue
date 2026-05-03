<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useFolderStore, type Folder } from '../stores/folderStore'
import RenameDialog from './RenameDialog.vue'
import ConfirmDeleteDialog from './ConfirmDeleteDialog.vue'

export default defineComponent({
  name: 'FolderNode',

  components: {
    RenameDialog,
    ConfirmDeleteDialog,
  },

  props: {
    folder: {
      type: Object as () => Folder,
      required: true,
    },
    depth: {
      type: Number,
      required: true,
    },
  },

  setup(props) {
    const store = useFolderStore()
    const toast = useToast()
    const isExpanded = ref(false)

    // Context menu state
    const menuOpen = ref(false)

    // Dialog state
    const isRenaming = ref(false)
    const isDeleting = ref(false)
    const renameApiError = ref('')

    const children = computed(() => store.getChildren(props.folder.id))
    const fetchStatus = computed(() => store.getFetchStatus(props.folder.id))
    const isSelected = computed(() => store.selectedFolderId === props.folder.id)
    const isLeaf = computed(
      () => fetchStatus.value === 'loaded' && children.value.length === 0
    )

    async function toggleExpand() {
      if (fetchStatus.value !== 'loaded') {
        await store.fetchChildren(props.folder.id)
      }
      isExpanded.value = !isExpanded.value
    }

    function selectFolder() {
      store.selectFolder(props.folder.id)
    }

    function openMenu() {
      menuOpen.value = !menuOpen.value
    }

    function closeMenu() {
      menuOpen.value = false
    }

    function startRename() {
      renameApiError.value = ''
      isRenaming.value = true
      menuOpen.value = false
    }

    function startDelete() {
      isDeleting.value = true
      menuOpen.value = false
    }

    async function handleRenameConfirm(newName: string) {
      try {
        await store.renameFolder(props.folder.id, newName)
        isRenaming.value = false
        renameApiError.value = ''
      } catch (err: unknown) {
        const apiErr = err as Error & { code?: string }
        if (apiErr.code === 'DUPLICATE_NAME' || apiErr.code === 'NOT_FOUND') {
          // Pass the error message back into the dialog so it stays open
          renameApiError.value = apiErr.message
        } else {
          // Unexpected error — close dialog and show toast
          isRenaming.value = false
          toast.add({
            severity: 'error',
            summary: 'Rename failed',
            detail: apiErr.message ?? 'An unexpected error occurred.',
            life: 4000,
          })
        }
      }
    }

    function handleRenameCancel() {
      isRenaming.value = false
      renameApiError.value = ''
    }

    async function handleDeleteConfirm() {
      try {
        await store.deleteFolder(props.folder.id)
        // isDeleting will become irrelevant as the node is removed from the tree,
        // but reset it defensively in case the component is kept alive.
        isDeleting.value = false
      } catch (err: unknown) {
        const apiErr = err as Error & { code?: string }
        isDeleting.value = false
        toast.add({
          severity: 'error',
          summary: 'Delete failed',
          detail: apiErr.message ?? 'An unexpected error occurred.',
          life: 4000,
        })
      }
    }

    function handleDeleteCancel() {
      isDeleting.value = false
    }

    return {
      store,
      isExpanded,
      menuOpen,
      isRenaming,
      isDeleting,
      renameApiError,
      children,
      fetchStatus,
      isSelected,
      isLeaf,
      toggleExpand,
      selectFolder,
      openMenu,
      closeMenu,
      startRename,
      startDelete,
      handleRenameConfirm,
      handleRenameCancel,
      handleDeleteConfirm,
      handleDeleteCancel,
    }
  },
})
</script>

<template>
  <li
    v-memo="[isSelected, isExpanded, fetchStatus, isRenaming, isDeleting, menuOpen]"
    class="folder-node"
    role="treeitem"
    :aria-expanded="isLeaf ? undefined : isExpanded"
    :aria-selected="isSelected"
  >
    <div
      class="folder-row"
      :class="{ 'folder-row--selected': isSelected }"
      :style="{ paddingLeft: `${depth * 16}px` }"
    >
      <!-- Expand toggle (hidden when leaf) -->
      <button
        v-if="!isLeaf"
        class="folder-toggle"
        :aria-label="isExpanded ? 'Collapse folder' : 'Expand folder'"
        @click.stop="toggleExpand"
      >
        {{ isExpanded ? '▼' : '▶' }}
      </button>
      <!-- Spacer to align leaf nodes with non-leaf nodes -->
      <span v-else class="folder-toggle-spacer" aria-hidden="true" />

      <!-- Folder name -->
      <span
        class="folder-name"
        role="button"
        tabindex="0"
        @click="selectFolder"
        @keydown.enter="selectFolder"
        @keydown.space.prevent="selectFolder"
      >
        {{ folder.name }}
      </span>

      <!-- Loading spinner -->
      <span
        v-if="fetchStatus === 'loading'"
        class="folder-spinner"
        aria-label="Loading"
        aria-live="polite"
      >
        ⏳
      </span>

      <!-- Error badge with retry -->
      <span
        v-if="fetchStatus === 'error'"
        class="folder-error"
        role="alert"
      >
        ⚠ Error
        <button
          class="folder-retry"
          @click.stop="store.fetchChildren(folder.id)"
        >
          Retry
        </button>
      </span>

      <!-- Context menu trigger -->
      <div class="folder-menu-wrapper">
        <button
          class="folder-menu-btn"
          :aria-label="`Actions for ${folder.name}`"
          aria-haspopup="true"
          :aria-expanded="menuOpen"
          @click.stop="openMenu"
        >
          ⋮
        </button>

        <!-- Dropdown menu -->
        <ul
          v-if="menuOpen"
          class="folder-menu"
          role="menu"
        >
          <li role="none">
            <button
              class="folder-menu__item"
              role="menuitem"
              @click.stop="startRename"
            >
              Rename
            </button>
          </li>
          <li role="none">
            <button
              class="folder-menu__item folder-menu__item--danger"
              role="menuitem"
              @click.stop="startDelete"
            >
              Delete
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- Click-outside overlay to close the menu -->
    <div
      v-if="menuOpen"
      class="folder-menu-overlay"
      aria-hidden="true"
      @click="closeMenu"
    />

    <!-- Rename dialog -->
    <RenameDialog
      v-if="isRenaming"
      :folder="folder"
      :api-error="renameApiError"
      @confirm="handleRenameConfirm"
      @cancel="handleRenameCancel"
    />

    <!-- Delete confirmation dialog -->
    <ConfirmDeleteDialog
      v-if="isDeleting"
      :folder="folder"
      @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    />

    <!-- Recursive children -->
    <ul
      v-if="isExpanded && children.length > 0"
      class="folder-children"
      role="group"
    >
      <FolderNode
        v-for="child in children"
        :key="child.id"
        :folder="child"
        :depth="depth + 1"
      />
    </ul>
  </li>
</template>

<style scoped>
.folder-node {
  list-style: none;
}

.folder-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-top: 2px;
  padding-bottom: 2px;
  padding-right: 4px;
  cursor: default;
  border-radius: 4px;
  user-select: none;
  position: relative;
}

.folder-row--selected {
  background-color: #e3f2fd;
}

.folder-row:hover {
  background-color: #f5f5f5;
}

.folder-row--selected:hover {
  background-color: #bbdefb;
}

.folder-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 10px;
  color: #555;
  flex-shrink: 0;
}

.folder-toggle:hover {
  color: #000;
}

.folder-toggle-spacer {
  display: inline-block;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.folder-name {
  flex: 1;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-name:focus {
  outline: 2px solid #1976d2;
  outline-offset: 1px;
  border-radius: 2px;
}

.folder-spinner {
  font-size: 12px;
  flex-shrink: 0;
}

.folder-error {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #c62828;
  flex-shrink: 0;
}

.folder-retry {
  padding: 1px 6px;
  font-size: 11px;
  border: 1px solid #c62828;
  border-radius: 3px;
  background: transparent;
  color: #c62828;
  cursor: pointer;
}

.folder-retry:hover {
  background-color: #ffebee;
}

/* Context menu */
.folder-menu-wrapper {
  position: relative;
  flex-shrink: 0;
}

.folder-menu-btn {
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

/* Show the ⋮ button when hovering the row or when the menu is open */
.folder-row:hover .folder-menu-btn,
.folder-menu-btn[aria-expanded="true"] {
  opacity: 1;
}

.folder-menu-btn:hover {
  background-color: #e0e0e0;
  color: #111;
}

.folder-menu {
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

.folder-menu__item {
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

.folder-menu__item:hover {
  background-color: #f5f5f5;
}

.folder-menu__item--danger {
  color: #c62828;
}

.folder-menu__item--danger:hover {
  background-color: #ffebee;
}

/* Invisible full-screen overlay to catch outside clicks */
.folder-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 99;
}

.folder-children {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
