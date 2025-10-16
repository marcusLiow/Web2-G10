<template>
  <nav class="top-navbar" :class="{ 'helpers-page': isHelpersPage }">
    <div class="nav-container">
      <div class="nav-content">
        <div class="logo">
          <span class="logo-text" @click="navigateToHome">QuickGig</span>
        </div>
        <div class="nav-links">
          <router-link to="/jobs" class="nav-link">Browse Jobs</router-link>
          <router-link to="/helpers" class="nav-link">Browse Helpers</router-link>
          
          <!-- Show Dashboard link only when logged in -->
          <router-link v-if="isLoggedIn" to="/dashboard" class="nav-link">Dashboard</router-link>
          
          <!-- Show different buttons based on login status -->
          <router-link v-if="!isLoggedIn" to="/login" class="nav-button">Log In</router-link>
          <router-link v-else to="/profile" class="nav-button">Profile</router-link>
        </div>
      </div>
    </div>
  </nav>
</template>

<script>
import { supabase } from '../supabase/config'

export default {
  name: 'Navbar',
  data() {
    return {
      isLoggedIn: false,
      username: '',
      userEmail: '',
      isHelpersPage: false
    };
  },
  mounted() {
    this.checkLoginStatus();
    this.checkCurrentRoute();
    window.addEventListener('user-logged-in', this.checkLoginStatus);
    window.addEventListener('user-logged-out', this.checkLoginStatus);
    this.checkSupabaseSession();
  },
  beforeUnmount() {
    window.removeEventListener('user-logged-in', this.checkLoginStatus);
    window.removeEventListener('user-logged-out', this.checkLoginStatus);
  },
  watch: {
    '$route'(to) {
      this.isHelpersPage = to.path === '/helpers';
    }
  },
  methods: {
    navigateToHome() {
      this.$router.push('/');
    },
    checkCurrentRoute() {
      this.isHelpersPage = this.$route.path === '/helpers';
    },
    async checkSupabaseSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        this.isLoggedIn = true;
        localStorage.setItem('isLoggedIn', 'true');
        this.loadUserData();
      }
    },
    checkLoginStatus() {
      this.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (this.isLoggedIn) {
        this.loadUserData();
      }
    },
    loadUserData() {
      this.username = localStorage.getItem('username') || 'User';
      this.userEmail = localStorage.getItem('userEmail') || '';
    }
  }
};
</script>

<style scoped>
.top-navbar {
  background: #2563EB;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 1rem 0;
  transition: background 0.3s ease;
}

.top-navbar.helpers-page {
  background: #6C5B7F;
}

.nav-container {
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
  cursor: pointer;
}

.nav-links {
  display: flex;
  gap: 1.25rem;
  align-items: center;
}

.nav-link {
  text-decoration: none;
  color: white;
  font-weight: bold;
  transition: all 0.3s;
  white-space: nowrap;
  font-size: 1.1em;
  padding-bottom: 0.25rem;
}

.nav-link:hover {
  opacity: 0.8;
}

.nav-link.router-link-active {
  border-bottom: 3px solid white;
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
  display: inline-block;
}

.helpers-page .nav-button {
  color: #6C5B7F;
}

.nav-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .nav-container {
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