<template>
  <!-- Toast Notifications Container -->
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

  <!-- Confirmation Dialog Modal -->
  <div v-if="confirmDialog.show" class="confirm-overlay" @click="handleConfirmCancel">
    <div class="confirm-dialog" @click.stop>
      <div class="confirm-header">
        <div class="confirm-icon">
          <span v-if="confirmDialog.type === 'danger'" style="color: #ef4444; font-size: 24px;">⚠</span>
          <span v-else-if="confirmDialog.type === 'warning'" style="color: #f59e0b; font-size: 24px;">⚠</span>
          <span v-else style="color: #3b82f6; font-size: 24px;">❓</span>
        </div>
        <h3 class="confirm-title">{{ confirmDialog.title }}</h3>
      </div>
      
      <div class="confirm-body">
        <p class="confirm-message">{{ confirmDialog.message }}</p>
      </div>
      
      <div class="confirm-footer">
        <button 
          class="confirm-button confirm-button-cancel" 
          @click="handleConfirmCancel"
        >
          {{ confirmDialog.cancelText }}
        </button>
        <button 
          :class="['confirm-button', 'confirm-button-confirm', `confirm-button-${confirmDialog.type}`]"
          @click="handleConfirmAccept"
        >
          {{ confirmDialog.confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { setToastInstance } from '../composables/useToast';

const toasts = ref([]);
let toastId = 0;

// Confirmation dialog state
const confirmDialog = ref({
  show: false,
  title: 'Confirm Action',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  type: 'info', // 'info', 'warning', 'danger'
  onConfirm: null,
  onCancel: null
});

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

/**
 * Show a confirmation dialog
 * @param {Object} options - Confirmation options
 * @param {string} options.message - The confirmation message (required)
 * @param {string} options.title - Dialog title (default: 'Confirm Action')
 * @param {string} options.confirmText - Text for confirm button (default: 'Confirm')
 * @param {string} options.cancelText - Text for cancel button (default: 'Cancel')
 * @param {string} options.type - Dialog type: 'info', 'warning', 'danger' (default: 'warning')
 * @returns {Promise<boolean>} - Promise that resolves to true if confirmed, false if canceled
 */
function confirm({ message, title = 'Confirm Action', confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) {
  return new Promise((resolve) => {
    confirmDialog.value = {
      show: true,
      title,
      message,
      confirmText,
      cancelText,
      type,
      onConfirm: () => {
        confirmDialog.value.show = false;
        resolve(true);
      },
      onCancel: () => {
        confirmDialog.value.show = false;
        resolve(false);
      }
    };
  });
}

function handleConfirmAccept() {
  if (confirmDialog.value.onConfirm) {
    confirmDialog.value.onConfirm();
  }
}

function handleConfirmCancel() {
  if (confirmDialog.value.onCancel) {
    confirmDialog.value.onCancel();
  }
}

// Create the API object
const toastApi = {
  addToast,
  removeToast,
  clearAll,
  confirm,
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

/* Confirmation Dialog Styles */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  backdrop-filter: blur(2px);
  animation: fadeIn 0.2s ease;
}

.confirm-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: auto;
  animation: slideUp 0.3s ease;
}

.confirm-header {
  padding: 24px 24px 16px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.confirm-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
}

.confirm-title {
  flex: 1;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  padding-top: 8px;
}

.confirm-body {
  padding: 0 24px 24px;
  padding-left: 88px;
}

.confirm-message {
  margin: 0;
  font-size: 15px;
  color: #4b5563;
  line-height: 1.6;
}

.confirm-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.confirm-button {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
}

.confirm-button-cancel {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.confirm-button-cancel:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.confirm-button-confirm {
  color: white;
}

.confirm-button-info {
  background: #3b82f6;
}

.confirm-button-info:hover {
  background: #2563eb;
}

.confirm-button-warning {
  background: #f59e0b;
}

.confirm-button-warning:hover {
  background: #d97706;
}

.confirm-button-danger {
  background: #ef4444;
}

.confirm-button-danger:hover {
  background: #dc2626;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

  .confirm-dialog {
    width: 95%;
    margin: 10px;
  }

  .confirm-header {
    padding: 20px 16px 12px;
    gap: 12px;
  }

  .confirm-icon {
    width: 40px;
    height: 40px;
  }

  .confirm-title {
    font-size: 18px;
  }

  .confirm-body {
    padding: 0 16px 20px;
    padding-left: 68px;
  }

  .confirm-footer {
    padding: 12px 16px;
    flex-direction: column-reverse;
  }

  .confirm-button {
    width: 100%;
  }
}
</style>
