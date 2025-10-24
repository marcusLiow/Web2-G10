<template>
  <nav class="top-navbar" :class="{ 'helpers-page': isHelpersPage }">
    <div class="nav-container">
      <div class="nav-content">
        <div class="logo">
          <span class="logo-text" @click="navigateToHome">SideQuest</span>
        </div>
        <div class="nav-links">
          <router-link to="/jobs" class="nav-link">Browse Jobs</router-link>
          <router-link to="/helpers" class="nav-link">Browse Helpers</router-link>
          
          <!-- Show Dashboard link only when logged in -->
          <router-link v-if="isLoggedIn" to="/earnings" class="nav-link">Earnings</router-link>
          <router-link v-if="isLoggedIn" to="/spending" class="nav-link">Spendings</router-link>
          
          <!-- Chat Button (only when logged in) with notification badge -->
          <router-link v-if="isLoggedIn" to="/chats" class="chat-button-wrapper" title="Chats">
            <div class="chat-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <!-- Notification Badge -->
              <span v-if="unreadChatsCount > 0" class="notification-badge">
                {{ unreadChatsCount > 99 ? '99+' : unreadChatsCount }}
              </span>
            </div>
          </router-link>
          
          <!-- Show different buttons based on login status -->
          <router-link v-if="!isLoggedIn" to="/login" class="nav-button">Log In</router-link>
          
          <!-- Profile Dropdown -->
          <div v-else class="profile-dropdown">
            <button class="profile-trigger" @click.prevent="handleProfileClick">
              <div class="profile-avatar">
                <img v-if="avatarUrl" :src="avatarUrl" :alt="username" />
                <span v-else class="avatar-placeholder">{{ username.charAt(0).toUpperCase() }}</span>
              </div>
              <span class="profile-username">{{ username }}</span>
              <svg 
                class="dropdown-arrow" 
                :class="{ 'arrow-open': isDropdownOpen }"
                width="12" 
                height="12" 
                viewBox="0 0 12 12" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            
            <!-- Dropdown Menu -->
            <div class="dropdown-menu" :style="{ display: isDropdownOpen ? 'block' : 'none' }">
              <router-link to="/profile" class="dropdown-item" @click="closeDropdown">
                <span>Profile</span>
              </router-link>
              <div class="dropdown-divider"></div>
              <button @click="handleLogout" class="dropdown-item logout-item">
                <span>Log Out</span>
              </button>
            </div>
          </div>
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
      avatarUrl: '',
      isDropdownOpen: false,
      isHelpersPage: false,
      unreadChatsCount: 0,
      unreadCheckInterval: null
    };
  },
  mounted() {
    this.checkLoginStatus();
    this.checkCurrentRoute();
    window.addEventListener('user-logged-in', this.checkLoginStatus);
    window.addEventListener('user-logged-out', this.checkLoginStatus);
    window.addEventListener('chat-read', this.fetchUnreadChatsCount);
    this.checkSupabaseSession();
    
    // Add global click handler with a small delay
    setTimeout(() => {
      document.addEventListener('click', this.handleDocumentClick);
    }, 100);

    // Start checking for unread chats
    if (this.isLoggedIn) {
      this.fetchUnreadChatsCount();
      this.startUnreadCheck();
    }
  },
  beforeUnmount() {
    window.removeEventListener('user-logged-in', this.checkLoginStatus);
    window.removeEventListener('user-logged-out', this.checkLoginStatus);
    window.removeEventListener('chat-read', this.fetchUnreadChatsCount);
    document.removeEventListener('click', this.handleDocumentClick);
    this.stopUnreadCheck();
  },
  watch: {
    '$route'(to) {
      this.isHelpersPage = to.path === '/helpers';
    },
    isLoggedIn(newVal) {
      if (newVal) {
        this.fetchUnreadChatsCount();
        this.startUnreadCheck();
      } else {
        this.stopUnreadCheck();
        this.unreadChatsCount = 0;
      }
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
        await this.loadUserData();
        await this.fetchUnreadChatsCount();
      }
    },
    checkLoginStatus() {
      this.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (this.isLoggedIn) {
        this.loadUserData();
        this.fetchUnreadChatsCount();
      }
    },
    async loadUserData() {
      this.username = localStorage.getItem('username') || 'User';
      this.userEmail = localStorage.getItem('userEmail') || '';
      this.avatarUrl = localStorage.getItem('avatarUrl') || '';
      
      // If no avatar in localStorage, try to fetch from database
      if (!this.avatarUrl) {
        const userId = localStorage.getItem('userId');
        if (userId) {
          try {
            const { data, error } = await supabase
              .from('users')
              .select('avatar_url')
              .eq('id', userId)
              .single();
            
            if (!error && data?.avatar_url) {
              this.avatarUrl = data.avatar_url;
              localStorage.setItem('avatarUrl', data.avatar_url);
            }
          } catch (err) {
            console.error('Error fetching avatar:', err);
          }
        }
      }
      
      // Fetch unread count after loading user data
      await this.fetchUnreadChatsCount();
    },
    async fetchUnreadChatsCount() {
      if (!this.isLoggedIn) return;
      
      try {
        const currentUserId = localStorage.getItem('userId');
        if (!currentUserId) return;

        // Fetch all chats for this user
        const { data: chatsData, error: chatsError } = await supabase
          .from('chats')
          .select('id')
          .or(`job_poster_id.eq.${currentUserId},job_seeker_id.eq.${currentUserId}`);
        
        if (chatsError) throw chatsError;
        
        if (!chatsData || chatsData.length === 0) {
          this.unreadChatsCount = 0;
          return;
        }

        // For each chat, check if there are unread messages
        let totalUnreadChats = 0;
        
        for (const chat of chatsData) {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .neq('sender_id', currentUserId)
            .eq('read', false);
          
          if (count > 0) {
            totalUnreadChats++;
          }
        }
        
        this.unreadChatsCount = totalUnreadChats;
      } catch (error) {
        console.error('Error fetching unread chats count:', error);
      }
    },
    startUnreadCheck() {
      // Check for unread messages every 30 seconds
      this.unreadCheckInterval = setInterval(() => {
        this.fetchUnreadChatsCount();
      }, 30000);
    },
    stopUnreadCheck() {
      if (this.unreadCheckInterval) {
        clearInterval(this.unreadCheckInterval);
        this.unreadCheckInterval = null;
      }
    },
    handleProfileClick(event) {
      event.stopPropagation();
      this.isDropdownOpen = !this.isDropdownOpen;
    },
    closeDropdown() {
      this.isDropdownOpen = false;
    },
    handleDocumentClick(event) {
      // Check if the click is outside the dropdown
      const profileDropdown = document.querySelector('.profile-dropdown');
      if (profileDropdown && !profileDropdown.contains(event.target)) {
        this.isDropdownOpen = false;
      }
    },
    async handleLogout() {
      if (!confirm('Are you sure you want to log out?')) {
        return;
      }
      
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('username');
        localStorage.removeItem('avatarUrl');
        localStorage.removeItem('userRole');
        
        window.dispatchEvent(new Event('user-logged-out'));
        
        this.closeDropdown();
        this.$router.push('/');
      } catch (error) {
        console.error('Error logging out:', error);
        alert('Error logging out. Please try again.');
      }
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

/* Chat Button Wrapper */
.chat-button-wrapper {
  position: relative;
  text-decoration: none;
}

/* Chat Button */
.chat-button {
  background: white;
  color: #2563EB;
  padding: 0.75rem;
  border-radius: 50%;
  text-decoration: none;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  position: relative;
}

.helpers-page .chat-button {
  color: #6C5B7F;
}

.chat-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.chat-button-wrapper.router-link-active .chat-button {
  background: rgba(255, 255, 255, 0.9);
}

/* Notification Badge */
.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.35rem;
  border-radius: 10px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* Profile Dropdown Styles */
.profile-dropdown {
  position: relative;
}

.profile-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  color: white;
  font-family: inherit;
  font-size: inherit;
}

.profile-trigger:hover {
  background: rgba(255, 255, 255, 0.2);
}

.profile-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 1rem;
  font-weight: 700;
  color: #2563EB;
}

.helpers-page .avatar-placeholder {
  color: #6C5B7F;
}

.profile-username {
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
}

.dropdown-arrow {
  color: white;
  transition: transform 0.3s ease;
}

.dropdown-arrow.arrow-open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  z-index: 999999;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 0.875rem 1.25rem;
  color: #374151;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.2s ease;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  font-size: 0.95rem;
  font-family: inherit;
}

.dropdown-item:hover {
  background: #f3f4f6;
}

.dropdown-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 0;
}

.logout-item {
  color: #dc2626;
}

.logout-item:hover {
  background: #fee2e2;
}

/* Responsive styles */
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

  .chat-button {
    width: 40px;
    height: 40px;
    padding: 0.6rem;
  }

  .notification-badge {
    font-size: 0.6rem;
    min-width: 16px;
    height: 16px;
    top: -3px;
    right: -3px;
  }

  .profile-username {
    display: none;
  }

  .profile-trigger {
    padding: 0.5rem;
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

  .chat-button {
    width: 36px;
    height: 36px;
    padding: 0.5rem;
  }
}
</style>