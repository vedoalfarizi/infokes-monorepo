<script setup lang="ts">
import { useFolderStore } from '../stores/folderStore'
import FolderTree from './FolderTree.vue'

const store = useFolderStore()
</script>

<template>
  <FolderTree :rootFolders="store.rootFolders" />
</template>
