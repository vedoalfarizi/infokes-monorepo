<script setup lang="ts">
import { onMounted } from 'vue'
import { useFolderStore } from '../stores/folderStore'
import LeftPane from './LeftPane.vue'
import RightPane from './RightPane.vue'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'

const store = useFolderStore()

onMounted(() => {
  store.fetchRootFolders()
})
</script>

<template>
  <Splitter class="file-explorer">
    <SplitterPanel :size="30" :minSize="15">
      <LeftPane />
    </SplitterPanel>
    <SplitterPanel :size="70" :minSize="30">
      <RightPane />
    </SplitterPanel>
  </Splitter>
</template>

<style scoped>
.file-explorer {
  height: 100%;
  width: 100%;
}
</style>
