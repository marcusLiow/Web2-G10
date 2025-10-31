<template>
  <div id="app">
    <Navbar />
    <RouterView />
    <ToastNotification />
  </div>
</template>

<script setup>
import Navbar from './components/Navbar.vue'
import ToastNotification from './components/ToastNotification.vue'
</script>

<style>
@font-face {
  font-family: 'Jersey25';
  src: url('./assets/fonts/Jersey25-Regular.ttf') format('truetype');
  font-weight: 200;
  font-style: normal;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: 'Jersey25', Arial, sans-serif;
}

/* Keep input elements with system fonts for better readability */
input,
textarea,
select,
button[type="submit"],
.search-input,
.search-select {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>