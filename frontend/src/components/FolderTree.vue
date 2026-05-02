<script setup lang="ts">
import FolderNode from './FolderNode.vue'
import type { Folder } from '../stores/folderStore'

interface FolderTreeProps {
  rootFolders: Folder[]
}

defineProps<FolderTreeProps>()
</script>

<template>
  <ul class="folder-tree" role="tree" aria-label="Folder tree">
    <FolderNode
      v-for="folder in rootFolders"
      :key="folder.id"
      :folder="folder"
      :depth="0"
    />
  </ul>
</template>

<style scoped>
.folder-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
