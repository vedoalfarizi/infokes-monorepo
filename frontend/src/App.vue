<template>
  <div id="app">
    <FileExplorer />
    <Toast />
  </div>
</template>

<script setup lang="ts">
import FileExplorer from './components/FileExplorer.vue'
import Toast from 'primevue/toast'
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body,
#app {
  height: 100%;
  font-family: sans-serif;
}
</style>
