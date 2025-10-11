<template>
  <nav class="navbar">
    <div class="container">
      <div class="nav-content">
        <div class="logo">
          <span class="logo-text">QuickGig</span>
        </div>
        <div class="nav-links">
          <a href="#" class="nav-link">Browse Jobs</a>
          <a href="#" class="nav-link">Browse Helpers</a>
          <a href="#" class="nav-button">Log In</a>
        </div>
      </div>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'Navbar'
};
</script>

<style scoped>
.navbar {
  background: #2563EB;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 1rem 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: bold;
  color: #FFF;
}

.logo-text {
  font-size: 1.5rem;
}

.nav-links {
  display: flex;
  gap: 1.25rem;
  align-items: center;
}

/* Plain text links for Browse Jobs and Browse Helpers */
.nav-link {
  text-decoration: none;
  color: white;
  font-weight: bold;
  transition: all 0.3s;
  white-space: nowrap;
  font-size: 1.1em;
}

.nav-link:hover {
  opacity: 0.8;
}

.nav-button {
  background: white;
  color: #2563EB;
  padding: 0.75rem 1.75rem;
  border-radius: 25px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s;
  white-space: nowrap;
}

.nav-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }

  .nav-links {
    gap: 0.75rem;
  }

  .nav-link {
    font-size: 0.9rem;
  }

  .nav-button {
    padding: 0.6rem 1.25rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .nav-content {
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
  }

  .logo {
    width: 100%;
    justify-content: center;
  }

  .nav-links {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .nav-link {
    font-size: 0.85rem;
  }

  .nav-button {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }
}
</style>