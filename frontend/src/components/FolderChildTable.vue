<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { FolderChild } from '../stores/folderStore'

const props = defineProps<{
  children: FolderChild[]
}>()

const hasChildren = computed(() => props.children.length > 0)
</script>

<template>
  <div class="folder-child-table">
    <DataTable
      v-if="hasChildren"
      :value="children"
      aria-label="Folder children"
      role="grid"
    >
      <Column field="name" header="Name" />
      <Column field="childCount" header="Children" />
    </DataTable>

    <p v-else class="no-children" role="status" aria-live="polite">
      No children
    </p>
  </div>
</template>

<style scoped>
.no-children {
  color: #6b7280;
  font-style: italic;
  padding: 0.5rem 0;
}
</style>
