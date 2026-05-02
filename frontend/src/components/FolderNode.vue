<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useFolderStore, type Folder } from '../stores/folderStore'

export default defineComponent({
  name: 'FolderNode',

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
    const isExpanded = ref(false)

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

    return {
      isExpanded,
      children,
      fetchStatus,
      isSelected,
      isLeaf,
      toggleExpand,
      selectFolder,
    }
  },
})
</script>

<template>
  <li
    v-memo="[isSelected, isExpanded, fetchStatus]"
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
    </div>

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
  padding-right: 8px;
  cursor: default;
  border-radius: 4px;
  user-select: none;
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

.folder-children {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
