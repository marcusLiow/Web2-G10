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
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: Arial, sans-serif;
}
</style>