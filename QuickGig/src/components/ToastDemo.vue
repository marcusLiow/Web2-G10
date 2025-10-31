<template>
  <div class="toast-demo">
    <h2>Toast Notification Demo</h2>
    <p>Click the buttons below to test different toast types:</p>
    
    <div class="demo-buttons">
      <button @click="showSuccess" class="btn btn-success">
        Show Success Toast
      </button>
      
      <button @click="showError" class="btn btn-error">
        Show Error Toast
      </button>
      
      <button @click="showWarning" class="btn btn-warning">
        Show Warning Toast
      </button>
      
      <button @click="showInfo" class="btn btn-info">
        Show Info Toast
      </button>
      
      <button @click="showWithTitle" class="btn btn-primary">
        Show Toast with Title
      </button>
      
      <button @click="showLongDuration" class="btn btn-secondary">
        Show Long Duration Toast (8s)
      </button>
      
      <button @click="showMultiple" class="btn btn-multiple">
        Show Multiple Toasts
      </button>
      
      <button @click="clearAllToasts" class="btn btn-clear">
        Clear All Toasts
      </button>
    </div>
  </div>
</template>

<script setup>
import { useToast } from '../composables/useToast';

const toast = useToast();

function showSuccess() {
  toast.success('Operation completed successfully!');
}

function showError() {
  toast.error('Something went wrong. Please try again.');
}

function showWarning() {
  toast.warning('Please review your input before continuing.');
}

function showInfo() {
  toast.info('This is an informational message.');
}

function showWithTitle() {
  toast.success('Your profile has been updated with all the latest changes.', 'Profile Updated');
}

function showLongDuration() {
  toast.info('This toast will stay visible for 8 seconds.', 'Long Duration Toast', 8000);
}

function showMultiple() {
  toast.success('First notification');
  setTimeout(() => toast.warning('Second notification'), 500);
  setTimeout(() => toast.info('Third notification'), 1000);
  setTimeout(() => toast.error('Fourth notification'), 1500);
}

function clearAllToasts() {
  toast.clearAll();
}
</script>

<style scoped>
.toast-demo {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.toast-demo h2 {
  margin-bottom: 1rem;
  color: #111827;
}

.toast-demo p {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.demo-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn:active {
  transform: translateY(0);
}

.btn-success {
  background: #10b981;
}

.btn-success:hover {
  background: #059669;
}

.btn-error {
  background: #ef4444;
}

.btn-error:hover {
  background: #dc2626;
}

.btn-warning {
  background: #f59e0b;
}

.btn-warning:hover {
  background: #d97706;
}

.btn-info {
  background: #3b82f6;
}

.btn-info:hover {
  background: #2563eb;
}

.btn-primary {
  background: #6C5B7F;
}

.btn-primary:hover {
  background: #5a4a68;
}

.btn-secondary {
  background: #6b7280;
}

.btn-secondary:hover {
  background: #4b5563;
}

.btn-multiple {
  background: #8b5cf6;
}

.btn-multiple:hover {
  background: #7c3aed;
}

.btn-clear {
  background: #374151;
}

.btn-clear:hover {
  background: #1f2937;
}
</style>
