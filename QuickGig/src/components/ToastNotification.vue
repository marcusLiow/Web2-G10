<template>
  <div class="toast-container" style="position: fixed; top: 80px; right: 20px; z-index: 99999;">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="['toast', `toast-${toast.type}`]"
      @click="removeToast(toast.id)"
      style="display: flex; background: white; padding: 16px; margin-bottom: 12px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); min-width: 300px; cursor: pointer;"
    >
      <div class="toast-icon" style="margin-right: 12px;">
        <span v-if="toast.type === 'success'" style="color: #10b981; font-size: 20px;">✓</span>
        <span v-else-if="toast.type === 'error'" style="color: #ef4444; font-size: 20px;">✕</span>
        <span v-else-if="toast.type === 'warning'" style="color: #f59e0b; font-size: 20px;">⚠</span>
        <span v-else style="color: #3b82f6; font-size: 20px;">ℹ</span>
      </div>
      <div class="toast-content" style="flex: 1;">
        <div v-if="toast.title" class="toast-title" style="font-weight: 600; margin-bottom: 4px;">{{ toast.title }}</div>
        <div class="toast-message" style="font-size: 14px; color: #4b5563;">{{ toast.message }}</div>
      </div>
      <button class="toast-close" @click.stop="removeToast(toast.id)" aria-label="Close" style="background: none; border: none; font-size: 24px; color: #9ca3af; cursor: pointer; margin-left: 8px;">
        ×
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { setToastInstance } from '../composables/useToast';

const toasts = ref([]);
let toastId = 0;

/**
 * Add a new toast notification
 * @param {Object} options - Toast options
 * @param {string} options.message - The message to display (required)
 * @param {string} options.type - Type of toast: 'success', 'error', 'warning', 'info' (default: 'info')
 * @param {string} options.title - Optional title for the toast
 * @param {number} options.duration - Duration in ms before auto-dismiss (default: 3000, set to 0 for no auto-dismiss)
 */
function addToast({ message, type = 'info', title = '', duration = 3000 }) {
  const id = toastId++;
  const toast = { id, message, type, title };
  
  toasts.value.push(toast);

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

function removeToast(id) {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.value.splice(index, 1);
  }
}

function clearAll() {
  toasts.value = [];
}

// Create the API object
const toastApi = {
  addToast,
  removeToast,
  clearAll,
  // Convenience methods
  success: (message, title = '', duration = 3000) => addToast({ message, type: 'success', title, duration }),
  error: (message, title = '', duration = 4000) => addToast({ message, type: 'error', title, duration }),
  warning: (message, title = '', duration = 3500) => addToast({ message, type: 'warning', title, duration }),
  info: (message, title = '', duration = 3000) => addToast({ message, type: 'info', title, duration })
};

// Register this instance with the composable
onMounted(() => {
  setToastInstance(toastApi);
});

onUnmounted(() => {
  setToastInstance(null);
});
</script>

<style>
/* Remove scoped to ensure styles apply */
.toast-container {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 300px;
  max-width: 500px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toast:hover {
  transform: translateX(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
}

.toast-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.toast-success {
  border-left: 4px solid #10b981;
}

.toast-success .toast-icon {
  background: #d1fae5;
  color: #059669;
}

.toast-error {
  border-left: 4px solid #ef4444;
}

.toast-error .toast-icon {
  background: #fee2e2;
  color: #dc2626;
}

.toast-warning {
  border-left: 4px solid #f59e0b;
}

.toast-warning .toast-icon {
  background: #fef3c7;
  color: #d97706;
}

.toast-info {
  border-left: 4px solid #3b82f6;
}

.toast-info .toast-icon {
  background: #dbeafe;
  color: #2563eb;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  font-size: 14px;
  color: #111827;
  margin-bottom: 4px;
}

.toast-message {
  font-size: 14px;
  color: #4b5563;
  word-wrap: break-word;
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.toast-close:hover {
  color: #4b5563;
}

/* Toast animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(50%);
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .toast-container {
    top: 10px;
    right: 10px;
    left: 10px;
  }

  .toast {
    min-width: auto;
    max-width: none;
  }
}
</style>
