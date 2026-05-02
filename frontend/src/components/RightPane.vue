<script setup lang="ts">
import { useFolderStore } from '../stores/folderStore'
import FolderChildTable from './FolderChildTable.vue'
import type { FolderChild } from '../stores/folderStore'

const store = useFolderStore()
</script>

<template>
  <div class="right-pane">
    <div v-if="store.selectedFolder === null" class="empty-state" role="status" aria-live="polite">
      <p>Select a folder to view its contents</p>
    </div>

    <div v-else class="folder-contents">
      <h2>{{ store.selectedFolder.name }}</h2>
      <FolderChildTable
        :children="(store.getChildren(store.selectedFolderId!) as FolderChild[])"
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

.folder-contents h2 {
  margin-bottom: 1rem;
}
</style>
