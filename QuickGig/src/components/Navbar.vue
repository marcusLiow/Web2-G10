<template>
  <nav class="top-navbar" :class="{ 'helpers-page': isHelpersPage }">
    <div class="nav-container">
      <div class="nav-content">
        <div class="logo">
          <span class="logo-text" @click="navigateToHome">SideQuest</span>
        </div>
        <div class="nav-links">
          <router-link to="/job-map" class="nav-link" :class="{ active: currentRouteName === 'JobMap' }">Job Map</router-link>
          <router-link to="/jobs" class="nav-link" :class="{ active: currentRouteName === 'JobPage' }">Browse Jobs</router-link>
          <router-link to="/helpers" class="nav-link" :class="{ active: currentRouteName === 'HelpersPage' }">Browse Helpers</router-link>

          <div v-if="isLoggedIn" class="notification-dropdown">
            <button class="icon-button notification-trigger" @click.prevent="toggleNotificationDropdown" title="Notifications">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span v-if="unreadNotificationsCount > 0" class="notification-badge">
                {{ unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount }}
              </span>
            </button>

            <div class="dropdown-menu notification-menu" :style="{ display: isNotificationDropdownOpen ? 'block' : 'none' }">
              <div class="notification-header">
                Notifications
              </div>
              <div v-if="notifications.length === 0" class="notification-item empty">
                No new notifications
              </div>
              <div v-else class="notification-list">
                <div
                  v-for="notification in notifications"
                  :key="notification.id"
                  class="notification-item"
                  :class="{ 'unread': !notification.read }"
                >
                  <div class="notification-content">
                    <p class="notification-message">{{ notification.message }}</p>
                    <span class="notification-time">{{ formatTimeAgo(notification.created_at) }}</span>
                  </div>
                </div>
              </div>
              </div>
          </div>
          <router-link v-if="isLoggedIn" to="/chats" class="icon-button chat-button-wrapper" title="Chats" :class="{ active: currentRouteName === 'Chats' }">
            <div class="chat-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span v-if="unreadChatsCount > 0" class="notification-badge chat-badge">
                {{ unreadChatsCount > 99 ? '99+' : unreadChatsCount }}
              </span>
            </div>
          </router-link>

          <router-link v-if="!isLoggedIn" to="/login" class="nav-button">Log In</router-link>
          <div v-else class="profile-dropdown">
            <button class="profile-trigger" @click.prevent="handleProfileClick">
              <div class="profile-avatar">
                <img v-if="avatarUrl" :src="avatarUrl" :alt="username" />
                <span v-else class="avatar-placeholder">{{ username ? username.charAt(0).toUpperCase() : '?' }}</span>
              </div>
              <span class="profile-username">{{ username }}</span>
              <svg class="dropdown-arrow" :class="{ 'arrow-open': isDropdownOpen }" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            <div class="dropdown-menu profile-menu" :style="{ display: isDropdownOpen ? 'block' : 'none' }">
              <router-link to="/profile" class="dropdown-item" @click="closeDropdown">Profile</router-link>
              <router-link to="/wallet" class="dropdown-item" @click="closeDropdown">Wallet</router-link>
              <router-link to="/dashboard" class="dropdown-item" @click="closeDropdown">Dashboard</router-link>
              <div class="dropdown-divider"></div>
              <button @click="handleLogout" class="dropdown-item logout-item">Log Out</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { supabase } from '../supabase/config';
import { useRouter, useRoute } from 'vue-router';

export default {
  name: 'Navbar',
  setup() {
    const router = useRouter();
    const route = useRoute();

    // Existing refs
    const isLoggedIn = ref(false);
    const username = ref('');
    const userEmail = ref('');
    const avatarUrl = ref('');
    const isDropdownOpen = ref(false);
    const isHelpersPage = ref(false);
    const unreadChatsCount = ref(0);
    let unreadCheckInterval = null;

    // --- NEW Notification Refs ---
    const notifications = ref([]);
    const unreadNotificationsCount = ref(0);
    const isNotificationDropdownOpen = ref(false);
    let notificationChannel = null;
    // --- END NEW ---

    // --- Computed Property for Active Route ---
    const currentRouteName = computed(() => route.name);

    // --- Methods ---
    const navigateToHome = () => {
      router.push('/');
    };

    const checkCurrentRoute = () => {
      isHelpersPage.value = route.path === '/helpers';
    };

    const checkSupabaseSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        isLoggedIn.value = true;
        localStorage.setItem('isLoggedIn', 'true');
        await loadUserData();
        await fetchUnreadChatsCount();
        await fetchNotifications();
        subscribeToNotifications();
      } else {
        logoutCleanup();
      }
    };

    const checkLoginStatus = () => {
      const loggedInStatus = localStorage.getItem('isLoggedIn') === 'true';
      if (loggedInStatus && !isLoggedIn.value) {
        isLoggedIn.value = true;
        loadUserData();
        fetchUnreadChatsCount();
        fetchNotifications();
        subscribeToNotifications();
      } else if (!loggedInStatus && isLoggedIn.value) {
        logoutCleanup();
      }
    };

    const loadUserData = () => {
      username.value = localStorage.getItem('username') || 'User';
      userEmail.value = localStorage.getItem('userEmail') || '';
      avatarUrl.value = localStorage.getItem('avatarUrl') || '';
    };

    const fetchUnreadChatsCount = async () => {
      if (!isLoggedIn.value) return;
      try {
        const currentUserId = localStorage.getItem('userId');
        if (!currentUserId) return;
        const { count: jobUnreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .neq('sender_id', currentUserId)
          .eq('read', false)
          .in('chat_id', (await supabase.from('chats').select('id').or(`job_poster_id.eq.${currentUserId},job_seeker_id.eq.${currentUserId}`)).data.map(c => c.id));
        const { count: helperUnreadCount } = await supabase
          .from('helper_messages')
          .select('id', { count: 'exact', head: true })
          .neq('sender_id', currentUserId)
          .eq('read', false)
          .in('helper_chat_id', (await supabase.from('helper_chats').select('id').or(`helper_id.eq.${currentUserId},client_id.eq.${currentUserId}`)).data.map(c => c.id));

        unreadChatsCount.value = (jobUnreadCount || 0) + (helperUnreadCount || 0);

      } catch (error) {
        console.error('Error fetching unread chats count:', error);
      }
    };

    const fetchNotifications = async () => {
      if (!isLoggedIn.value) return;
      try {
        const currentUserId = localStorage.getItem('userId');
        if (!currentUserId) return;

        const { data, error, count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact' })
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        notifications.value = data || [];
        unreadNotificationsCount.value = notifications.value.filter(n => !n.read).length;

      } catch (error) {
        console.error('Error fetching notifications:', error);
        notifications.value = [];
        unreadNotificationsCount.value = 0;
      }
    };

    const subscribeToNotifications = () => {
       if (notificationChannel) {
         supabase.removeChannel(notificationChannel);
       }
      const currentUserId = localStorage.getItem('userId');
      if (!currentUserId || !isLoggedIn.value) return;

      notificationChannel = supabase
        .channel(`notifications-${currentUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUserId}`
          },
          (payload) => {
            console.log('New notification received:', payload.new);
            notifications.value.unshift(payload.new);
            if (!payload.new.read) {
              unreadNotificationsCount.value++;
            }
            if (notifications.value.length > 10) {
                notifications.value.pop();
            }
          }
        )
        .subscribe((status, err) => {
             if (err) {
               console.error("Notification subscription error:", err);
             } else {
               console.log("Notification subscription status:", status);
             }
         });
    };

    const unsubscribeFromNotifications = () => {
      if (notificationChannel) {
        supabase.removeChannel(notificationChannel)
          .then(() => console.log("Unsubscribed from notifications"))
          .catch(err => console.error("Error unsubscribing:", err));
        notificationChannel = null;
      }
    };

    const toggleNotificationDropdown = async (event) => {
       event.stopPropagation();
      isNotificationDropdownOpen.value = !isNotificationDropdownOpen.value;
      if (isNotificationDropdownOpen.value && unreadNotificationsCount.value > 0) {
        await markNotificationsAsRead();
      }
    };

    const closeNotificationDropdown = () => {
      isNotificationDropdownOpen.value = false;
    };

    const markNotificationsAsRead = async () => {
      if (unreadNotificationsCount.value === 0) return;

      const currentUserId = localStorage.getItem('userId');
      const unreadIds = notifications.value.filter(n => !n.read).map(n => n.id);

      if (unreadIds.length === 0) return;

      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', currentUserId)
          .in('id', unreadIds);

        if (error) throw error;

        notifications.value = notifications.value.map(n => ({ ...n, read: true }));
        unreadNotificationsCount.value = 0;

      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    };

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return '';
        const now = new Date();
        const past = new Date(timestamp);
        const diffInSeconds = Math.floor((now - past) / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return past.toLocaleDateString();
    };


    const startUnreadCheck = () => {
        stopUnreadCheck();
        unreadCheckInterval = setInterval(fetchUnreadChatsCount, 30000);
    };

    const stopUnreadCheck = () => {
      if (unreadCheckInterval) {
        clearInterval(unreadCheckInterval);
        unreadCheckInterval = null;
      }
    };

    const handleProfileClick = (event) => {
      event.stopPropagation();
      isDropdownOpen.value = !isDropdownOpen.value;
      closeNotificationDropdown();
    };

    const closeDropdown = () => {
      isDropdownOpen.value = false;
    };

    const handleDocumentClick = (event) => {
      const profileDropdown = document.querySelector('.profile-dropdown');
      if (profileDropdown && !profileDropdown.contains(event.target)) {
        isDropdownOpen.value = false;
      }
      const notificationDropdown = document.querySelector('.notification-dropdown');
      if (notificationDropdown && !notificationDropdown.contains(event.target)) {
          isNotificationDropdownOpen.value = false;
      }
    };

    const handleLogout = async () => {
      if (!confirm('Are you sure you want to log out?')) return;
      try {
        await supabase.auth.signOut();
        logoutCleanup();
        window.dispatchEvent(new Event('user-logged-out'));
        router.push('/');
      } catch (error) {
        console.error('Error logging out:', error);
        alert('Error logging out. Please try again.');
      }
    };

    const logoutCleanup = () => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('username');
        localStorage.removeItem('avatarUrl');
        localStorage.removeItem('userRole');
        isLoggedIn.value = false;
        username.value = '';
        avatarUrl.value = '';
        unreadChatsCount.value = 0;
        notifications.value = [];
        unreadNotificationsCount.value = 0;
        stopUnreadCheck();
        unsubscribeFromNotifications();
        closeDropdown();
        closeNotificationDropdown();
    };

    onMounted(() => {
      checkCurrentRoute();
      checkSupabaseSession();
      window.addEventListener('user-logged-in', checkLoginStatus);
      window.addEventListener('user-logged-out', checkLoginStatus);
      window.addEventListener('chat-read', fetchUnreadChatsCount);
      document.addEventListener('click', handleDocumentClick);

      if (isLoggedIn.value) {
        startUnreadCheck();
      }
    });

    onUnmounted(() => {
      window.removeEventListener('user-logged-in', checkLoginStatus);
      window.removeEventListener('user-logged-out', checkLoginStatus);
      window.removeEventListener('chat-read', fetchUnreadChatsCount);
      document.removeEventListener('click', handleDocumentClick);
      stopUnreadCheck();
      unsubscribeFromNotifications();
    });

    watch(route, (to) => {
      isHelpersPage.value = to.path === '/helpers';
      closeDropdown();
      closeNotificationDropdown();
    });

    watch(isLoggedIn, (newVal) => {
      if (newVal) {
        fetchUnreadChatsCount();
        fetchNotifications();
        startUnreadCheck();
        subscribeToNotifications();
      }
    });

    return {
      isLoggedIn,
      username,
      avatarUrl,
      isDropdownOpen,
      isHelpersPage,
      unreadChatsCount,
      notifications,
      unreadNotificationsCount,
      isNotificationDropdownOpen,
      currentRouteName,
      navigateToHome,
      handleProfileClick,
      closeDropdown,
      handleLogout,
      toggleNotificationDropdown,
      closeNotificationDropdown,
      formatTimeAgo,
    };
  }
};
</script>

<style scoped>
@font-face {
  font-family: 'Jersey10';
  src: url('../assets/fonts/Jersey10-Regular.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

.top-navbar {
  background: #4fb6e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  padding: 1rem 0;
  transition: background 0.3s ease;
  font-family: 'Jersey10', sans-serif;
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
  color: #000;
}

.logo-text {
  font-size: 2.5rem;
  cursor: pointer;
}

.nav-links {
  display: flex;
  gap: 1.25rem;
  align-items: center;
}

.nav-link {
  text-decoration: none;
  color: rgba(0, 0, 0, 0.85);
  font-weight: bold;
  transition: all 0.3s;
  white-space: nowrap;
  font-size: 1.8em;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
}

.nav-link:hover {
  color: #000;
  background: rgba(0, 0, 0, 0.1);
}

.nav-link.router-link-active,
.nav-link.active {
  color: #000;
  background: rgba(0, 0, 0, 0.15);
}

.nav-button {
  background: white;
  color: #000000;
  padding: 0.55rem 1.55rem;
  border-radius: 25px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s;
  white-space: nowrap;
  display: inline-block;
  font-size: 1.25rem;
}

.helpers-page .nav-button {
  color: #6C5B7F;
}

.nav-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.icon-button {
  position: relative;
  background: white;
  color: #4fb6e1;
  padding: 0.625rem;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  text-decoration: none;
}
.helpers-page .icon-button {
  color: #6C5B7F;
}
.icon-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.icon-button.active {
   background: rgba(255, 255, 255, 0.9);
   box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.notification-dropdown {
  position: relative;
}

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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.chat-badge {
}

.chat-button-wrapper {
}
.chat-button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.75rem);
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  min-width: 250px;
  z-index: 1000;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  display: none;
}

.notification-menu {
  min-width: 320px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.notification-header {
  padding: 0.75rem 1rem;
  font-weight: 600;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.notification-list {
  overflow-y: auto;
  flex-grow: 1;
}

.notification-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s;
}
.notification-item:last-child {
  border-bottom: none;
}
.notification-item:hover {
  background-color: #f9fafb;
}

.notification-item.unread {
  background-color: #eff6ff;
}
.notification-item.unread:hover {
  background-color: #dbeafe;
}

.notification-content {
  flex: 1;
}

.notification-message {
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.4;
}
.notification-item.unread .notification-message {
  font-weight: 500;
  color: #1f2937;
}

.notification-time {
  font-size: 0.75rem;
  color: #6b7280;
}

.notification-item.empty {
  padding: 1.5rem 1rem;
  text-align: center;
  color: #9ca3af;
  font-style: italic;
}

.notification-footer {
  padding: 0.5rem 1rem;
  text-align: center;
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
  flex-shrink: 0;
}
.notification-footer a {
  color: #4fb6e1;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.875rem;
}
.notification-footer a:hover {
  text-decoration: underline;
}

.profile-menu {
   min-width: 180px;
}
.dropdown-item {
  display: block;
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

.profile-dropdown {
  position: relative;
}

.profile-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  color: #000;
  font-family: inherit;
  font-size: inherit;
}

.profile-trigger:hover {
  background: rgba(0, 0, 0, 0.1);
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
  color: #4fb6e1;
}

.helpers-page .avatar-placeholder {
  color: #6C5B7F;
}

.profile-username {
  color: #000;
  font-weight: 600;
  font-size: 0.95rem;
}

.dropdown-arrow {
  color: #000;
  transition: transform 0.3s ease;
}

.dropdown-arrow.arrow-open {
  transform: rotate(180deg);
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
    padding: 0.4rem 0.6rem;
  }

  .nav-button {
    padding: 0.6rem 1.25rem;
    font-size: 0.9rem;
  }

  .icon-button {
    width: 36px;
    height: 36px;
    padding: 0.5rem;
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
  
  .notification-menu {
    min-width: 280px;
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