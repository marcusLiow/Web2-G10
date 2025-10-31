import { ref } from 'vue';

// Global toast instance reference
const toastInstance = ref(null);

/**
 * Set the toast instance (called from the component)
 */
export function setToastInstance(instance) {
  toastInstance.value = instance;
}

/**
 * Composable for using toast notifications
 * @returns {Object} Toast methods
 */
export function useToast() {
  const showToast = (options) => {
    if (!toastInstance.value) {
      console.warn('Toast instance not initialized. Make sure ToastNotification component is mounted.');
      return null;
    }
    return toastInstance.value.addToast(options);
  };

  const success = (message, title = '', duration = 3000) => {
    return showToast({ message, type: 'success', title, duration });
  };

  const error = (message, title = '', duration = 4000) => {
    return showToast({ message, type: 'error', title, duration });
  };

  const warning = (message, title = '', duration = 3500) => {
    return showToast({ message, type: 'warning', title, duration });
  };

  const info = (message, title = '', duration = 3000) => {
    return showToast({ message, type: 'info', title, duration });
  };

  const clearAll = () => {
    if (toastInstance.value) {
      toastInstance.value.clearAll();
    }
  };

  return {
    showToast,
    success,
    error,
    warning,
    info,
    clearAll
  };
}
