<template>
  <div id="app">
    <FileExplorer />
  </div>
</template>

<script setup lang="ts">
import FileExplorer from './components/FileExplorer.vue'
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
