<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  placeholder?: string
  error?: string
  initialValue?: string
}>(), {
  placeholder: 'Folder name',
  error: '',
  initialValue: '',
})

const emit = defineEmits<{
  confirm: [name: string]
  cancel: []
  'update:error': [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const inputValue = ref(props.initialValue)

// Clear the error when the user modifies the input
watch(inputValue, () => {
  if (props.error) {
    emit('update:error', '')
  }
})

onMounted(() => {
  inputRef.value?.focus()
})

function handleConfirm() {
  emit('confirm', inputValue.value)
}

function handleCancel() {
  emit('cancel')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    handleConfirm()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    handleCancel()
  }
}
</script>

<template>
  <div class="inline-name-input">
    <div class="inline-name-input__row">
      <input
        ref="inputRef"
        v-model="inputValue"
        type="text"
        class="inline-name-input__field"
        :class="{ 'inline-name-input__field--error': error }"
        :placeholder="placeholder"
        aria-label="Folder name"
        :aria-describedby="error ? 'inline-name-error' : undefined"
        :aria-invalid="error ? 'true' : undefined"
        @keydown="handleKeydown"
      />
      <button
        class="inline-name-input__btn inline-name-input__btn--confirm"
        type="button"
        aria-label="Confirm"
        @click="handleConfirm"
      >
        ✓
      </button>
      <button
        class="inline-name-input__btn inline-name-input__btn--cancel"
        type="button"
        aria-label="Cancel"
        @click="handleCancel"
      >
        ✗
      </button>
    </div>
    <p
      v-if="error"
      id="inline-name-error"
      class="inline-name-input__error"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.inline-name-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.inline-name-input__row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.inline-name-input__field {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  outline: none;
  color: #111827;
  background: #fff;
  transition: border-color 0.15s;
}

.inline-name-input__field:focus {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.inline-name-input__field--error {
  border-color: #c62828;
}

.inline-name-input__field--error:focus {
  border-color: #c62828;
  box-shadow: 0 0 0 2px rgba(198, 40, 40, 0.2);
}

.inline-name-input__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  flex-shrink: 0;
  transition: background-color 0.15s, border-color 0.15s;
}

.inline-name-input__btn--confirm {
  color: #2e7d32;
  border-color: #a5d6a7;
}

.inline-name-input__btn--confirm:hover {
  background-color: #e8f5e9;
  border-color: #2e7d32;
}

.inline-name-input__btn--cancel {
  color: #c62828;
  border-color: #ef9a9a;
}

.inline-name-input__btn--cancel:hover {
  background-color: #ffebee;
  border-color: #c62828;
}

.inline-name-input__error {
  margin: 0;
  font-size: 12px;
  color: #c62828;
  line-height: 1.4;
}
</style>
