<script setup lang="ts">
import { ref } from 'vue'
import Dialog from 'primevue/dialog'
import InlineNameInput from './InlineNameInput.vue'
import type { Folder } from '../shared/types'

const props = defineProps<{
  folder: Folder
}>()

const emit = defineEmits<{
  confirm: [newName: string]
  cancel: []
}>()

const validationError = ref('')
const visible = ref(true)

function handleConfirm(name: string) {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    validationError.value = 'Folder name must not be empty or whitespace-only.'
    return
  }
  validationError.value = ''
  emit('confirm', trimmed)
}

function handleCancel() {
  emit('cancel')
}

function handleDialogHide() {
  // Fired when the dialog is closed via the X button or Escape key
  emit('cancel')
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Rename Folder"
    :closable="true"
    :draggable="false"
    :style="{ width: '360px' }"
    @hide="handleDialogHide"
  >
    <div class="rename-dialog__body">
      <InlineNameInput
        v-model:error="validationError"
        :placeholder="folder.name"
        :initial-value="folder.name"
        @confirm="handleConfirm"
        @cancel="handleCancel"
      />
    </div>
  </Dialog>
</template>

<style scoped>
.rename-dialog__body {
  padding: 8px 0 4px;
}
</style>
