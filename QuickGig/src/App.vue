<template>
  <div id="app">
    <nav>
      <RouterLink to="/">Home</RouterLink> | 
      <RouterLink to="/about">About</RouterLink>
    </nav>
    <RouterView />
  </div>
</template>

<script setup>
</script>

<style>
#app {
  font-family: Arial, sans-serif;
}

nav {
  padding: 20px;
  text-align: center;
  background: #f0f0f0;
}

nav a {
  padding: 10px 20px;
  text-decoration: none;
  color: #42b983;
  font-weight: bold;
}

nav a:hover {
  text-decoration: underline;
}
</style>