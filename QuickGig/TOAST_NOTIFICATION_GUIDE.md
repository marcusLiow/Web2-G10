# Toast Notification Component Usage Guide

## Overview
A modern, non-blocking toast notification system to replace browser `alert()` calls with beautiful, user-friendly notifications.

## Installation

### 1. Add ToastNotification to your App.vue or main layout

```vue
<template>
  <div id="app">
    <!-- Your app content -->
    <router-view />
    
    <!-- Add toast notification component -->
    <ToastNotification />
  </div>
</template>

<script setup>
import ToastNotification from './components/ToastNotification.vue';
</script>
```

### 2. Use in any component

```vue
<script setup>
import { useToast } from '../composables/useToast';

const toast = useToast();

// Success notification
function saveProfile() {
  // ... save logic
  toast.success('Profile updated successfully!');
}

// Error notification
function handleError(error) {
  toast.error(error.message, 'Error');
}

// Warning notification
function validateInput() {
  if (!username) {
    toast.warning('Username is required');
  }
}

// Info notification
function showInfo() {
  toast.info('Processing your request...');
}

// Custom notification with options
function customNotification() {
  toast.showToast({
    message: 'Custom message',
    type: 'success',  // 'success', 'error', 'warning', 'info'
    title: 'Optional Title',
    duration: 5000  // milliseconds, 0 for no auto-dismiss
  });
}
</script>
```

## ProfilePage.vue Integration Example

Here's how to replace the existing `alert()` calls in ProfilePage.vue:

### Before:
```javascript
alert('Profile updated successfully!');
```

### After:
```javascript
toast.success('Profile updated successfully!');
```

### Full example for ProfilePage.vue:

```vue
<script setup>
import { useToast } from '../composables/useToast';

const toast = useToast();

async function saveProfile() {
  try {
    if (!currentUserId.value) {
      toast.error('You must be signed in to save your profile', 'Authentication Required');
      return;
    }

    if (!editForm.username.trim()) {
      toast.warning('Username is required');
      return;
    }

    // ... save logic ...

    toast.success('Profile updated successfully!');
    closeEditModal();
  } catch (err) {
    console.error('saveProfile error', err);
    toast.error(err.message || 'Failed to save profile', 'Save Failed');
  }
}

async function deleteListing(jobId) {
  if (!jobId) {
    toast.error('Invalid job ID');
    return;
  }

  if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
    return;
  }

  try {
    // ... delete logic ...
    toast.success('Job deleted successfully!');
    await loadUserListings(currentUserId.value);
  } catch (error) {
    console.error('deleteListing error:', error);
    toast.error(error.message || 'An unexpected error occurred', 'Delete Failed');
  }
}

async function markAsCompleted(jobId) {
  if (!jobId) {
    toast.error('Invalid job ID');
    return;
  }

  if (!confirm('Are you sure you want to mark this job as completed?')) {
    return;
  }

  try {
    // ... completion logic ...
    toast.success('Job marked as completed successfully! Helper(s) notified.', 'Job Completed');
    await loadUserListings(currentUserId.value);
    await loadCompletedJobs(currentUserId.value);
  } catch (error) {
    console.error('markAsCompleted error:', error);
    toast.error('An unexpected error occurred. Please try again.', 'Error');
  }
}
</script>
```

## API Reference

### Methods

#### `toast.success(message, title?, duration?)`
- **message**: String - The message to display (required)
- **title**: String - Optional title (default: '')
- **duration**: Number - Auto-dismiss duration in ms (default: 3000)

#### `toast.error(message, title?, duration?)`
- **message**: String - The message to display (required)
- **title**: String - Optional title (default: '')
- **duration**: Number - Auto-dismiss duration in ms (default: 4000)

#### `toast.warning(message, title?, duration?)`
- **message**: String - The message to display (required)
- **title**: String - Optional title (default: '')
- **duration**: Number - Auto-dismiss duration in ms (default: 3500)

#### `toast.info(message, title?, duration?)`
- **message**: String - The message to display (required)
- **title**: String - Optional title (default: '')
- **duration**: Number - Auto-dismiss duration in ms (default: 3000)

#### `toast.showToast(options)`
- **options**: Object
  - **message**: String (required)
  - **type**: 'success' | 'error' | 'warning' | 'info' (default: 'info')
  - **title**: String (default: '')
  - **duration**: Number in ms (default: 3000, set to 0 for no auto-dismiss)

#### `toast.clearAll()`
Removes all active toasts immediately.

## Features

✅ **4 Toast Types**: Success, Error, Warning, Info
✅ **Auto-dismiss**: Configurable duration or persistent
✅ **Click to dismiss**: Click anywhere on the toast
✅ **Smooth animations**: Slide in/out effects
✅ **Responsive**: Mobile-friendly
✅ **Stacking**: Multiple toasts stack nicely
✅ **Non-blocking**: Doesn't interrupt user workflow
✅ **Accessible**: Proper ARIA labels

## Styling

The component uses scoped styles that match your existing design system. Colors are based on:
- Success: Green (#10b981)
- Error: Red (#ef4444)
- Warning: Amber (#f59e0b)
- Info: Blue (#3b82f6)

## Browser Support

Works in all modern browsers that support Vue 3 and CSS transitions.
