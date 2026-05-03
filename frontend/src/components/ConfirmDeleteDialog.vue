<script setup lang="ts">
import { ref } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import type { Folder } from '../shared/types'

const props = defineProps<{
  folder: Folder
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const visible = ref(true)

function handleConfirm() {
  emit('confirm')
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
    header="Delete Folder"
    :closable="true"
    :draggable="false"
    :style="{ width: '400px' }"
    @hide="handleDialogHide"
  >
    <div class="confirm-delete-dialog__body">
      <p class="confirm-delete-dialog__message">
        This will permanently delete <strong>{{ folder.name }}</strong> and all its sub-folders.
      </p>
    </div>

    <template #footer>
      <div class="confirm-delete-dialog__footer">
        <Button
          label="Cancel"
          severity="secondary"
          @click="handleCancel"
        />
        <Button
          label="Delete"
          severity="danger"
          @click="handleConfirm"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.confirm-delete-dialog__body {
  padding: 8px 0 4px;
}

.confirm-delete-dialog__message {
  margin: 0;
  line-height: 1.5;
  color: var(--p-text-color);
}

.confirm-delete-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
