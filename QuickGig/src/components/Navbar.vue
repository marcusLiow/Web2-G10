<template>
  <nav class="top-navbar" :class="{ 'helpers-page': isHelpersPage }">
    <div class="nav-container">
      <div class="nav-content">
        <div class="logo">
          <span class="logo-text" @click="navigateToHome">SideQuest</span>
        </div>
        <div class="nav-links">
          <router-link to="/jobs" class="nav-link" :class="{ active: currentRouteName === 'JobPage' }">Browse Jobs</router-link>
          <router-link to="/helpers" class="nav-link" :class="{ active: currentRouteName === 'HelpersPage' }">Browse Helpers</router-link>
          <router-link v-if="isLoggedIn" to="/dashboard" class="nav-link" :class="{ active: currentRouteName === 'Dashboard' }">Dashboard</router-link>

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
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'; // Import ref, watch, computed
import { supabase } from '../supabase/config';
import { useRouter, useRoute } from 'vue-router'; // Import useRouter, useRoute

export default {
  name: 'Navbar',
  setup() { // Use setup() for Composition API
    const router = useRouter(); // Initialize router
    const route = useRoute(); // Initialize route

    // Existing refs
    const isLoggedIn = ref(false);
    const username = ref('');
    const userEmail = ref('');
    const avatarUrl = ref('');
    const isDropdownOpen = ref(false);
    const isHelpersPage = ref(false);
    const unreadChatsCount = ref(0);
    let unreadCheckInterval = null; // Use let for interval ID

    // --- NEW Notification Refs ---
    const notifications = ref([]);
    const unreadNotificationsCount = ref(0);
    const isNotificationDropdownOpen = ref(false);
    let notificationChannel = null; // For Realtime subscription
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
        // Fetch counts after session check
        await fetchUnreadChatsCount();
        await fetchNotifications(); // Fetch notifications
        subscribeToNotifications(); // Subscribe to notifications
      } else {
        // Ensure user is logged out if no session
        logoutCleanup();
      }
    };

    const checkLoginStatus = () => {
      const loggedInStatus = localStorage.getItem('isLoggedIn') === 'true';
      if (loggedInStatus && !isLoggedIn.value) { // Only update if status changed to logged in
        isLoggedIn.value = true;
        loadUserData();
        fetchUnreadChatsCount();
        fetchNotifications(); // Fetch notifications on login
        subscribeToNotifications(); // Subscribe on login
      } else if (!loggedInStatus && isLoggedIn.value) { // Only update if status changed to logged out
        logoutCleanup();
      }
    };

    const loadUserData = () => { // Simplified, no need for async here unless fetching avatar later
      username.value = localStorage.getItem('username') || 'User';
      userEmail.value = localStorage.getItem('userEmail') || '';
      avatarUrl.value = localStorage.getItem('avatarUrl') || '';
      // Avatar fetching logic remains the same if needed
    };

    const fetchUnreadChatsCount = async () => { /* ... Keep your existing chat count logic ... */
      if (!isLoggedIn.value) return;
      try {
        const currentUserId = localStorage.getItem('userId');
        if (!currentUserId) return;
        // Fetch job chats
        const { count: jobUnreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .neq('sender_id', currentUserId)
          .eq('read', false)
          .in('chat_id', (await supabase.from('chats').select('id').or(`job_poster_id.eq.${currentUserId},job_seeker_id.eq.${currentUserId}`)).data.map(c => c.id));
        // Fetch helper chats
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

    // --- NEW: Fetch Notifications ---
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
          .limit(10); // Fetch latest 10 notifications

        if (error) throw error;

        notifications.value = data || [];
        // Count only unread notifications
        unreadNotificationsCount.value = notifications.value.filter(n => !n.read).length;

      } catch (error) {
        console.error('Error fetching notifications:', error);
        notifications.value = [];
        unreadNotificationsCount.value = 0;
      }
    };

    // --- NEW: Subscribe to Notifications ---
    const subscribeToNotifications = () => {
       if (notificationChannel) {
         supabase.removeChannel(notificationChannel); // Remove existing channel first
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
            // Add to start of array and update count
            notifications.value.unshift(payload.new);
            if (!payload.new.read) {
              unreadNotificationsCount.value++;
            }
            // Optional: Limit displayed notifications
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

    // --- NEW: Unsubscribe ---
    const unsubscribeFromNotifications = () => {
      if (notificationChannel) {
        supabase.removeChannel(notificationChannel)
          .then(() => console.log("Unsubscribed from notifications"))
          .catch(err => console.error("Error unsubscribing:", err));
        notificationChannel = null;
      }
    };

    // --- NEW: Toggle Notification Dropdown ---
    const toggleNotificationDropdown = async (event) => {
       event.stopPropagation();
      isNotificationDropdownOpen.value = !isNotificationDropdownOpen.value;
      // If opening and there are unread notifications, mark them as read
      if (isNotificationDropdownOpen.value && unreadNotificationsCount.value > 0) {
        await markNotificationsAsRead();
      }
    };

    const closeNotificationDropdown = () => {
      isNotificationDropdownOpen.value = false;
    };

    // --- NEW: Mark Notifications as Read ---
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

        // Update local state immediately
        notifications.value = notifications.value.map(n => ({ ...n, read: true }));
        unreadNotificationsCount.value = 0;

      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    };

    // --- NEW: Format notification time ---
    const formatTimeAgo = (timestamp) => {
        // (Keep your existing formatTime logic from ChatsPage or use a library)
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


    const startUnreadCheck = () => { /* ... Keep chat check logic ... */
        stopUnreadCheck(); // Clear existing interval if any
        unreadCheckInterval = setInterval(fetchUnreadChatsCount, 30000);
    };

    const stopUnreadCheck = () => { /* ... Keep chat check logic ... */
      if (unreadCheckInterval) {
        clearInterval(unreadCheckInterval);
        unreadCheckInterval = null;
      }
    };

    const handleProfileClick = (event) => { /* ... Keep existing logic ... */
      event.stopPropagation();
      isDropdownOpen.value = !isDropdownOpen.value;
      closeNotificationDropdown(); // Close other dropdown
    };

    const closeDropdown = () => { /* ... Keep existing logic ... */
      isDropdownOpen.value = false;
    };

    const handleDocumentClick = (event) => { /* ... Keep existing logic ... */
      const profileDropdown = document.querySelector('.profile-dropdown');
      if (profileDropdown && !profileDropdown.contains(event.target)) {
        isDropdownOpen.value = false;
      }
      // NEW: Close notification dropdown on outside click
      const notificationDropdown = document.querySelector('.notification-dropdown');
      if (notificationDropdown && !notificationDropdown.contains(event.target)) {
          isNotificationDropdownOpen.value = false;
      }
    };

    const handleLogout = async () => { /* ... Keep existing logic ... */
      if (!confirm('Are you sure you want to log out?')) return;
      try {
        await supabase.auth.signOut();
        logoutCleanup(); // Call cleanup function
        window.dispatchEvent(new Event('user-logged-out'));
        router.push('/');
      } catch (error) {
        console.error('Error logging out:', error);
        alert('Error logging out. Please try again.');
      }
    };

    // --- NEW: Centralized Logout Cleanup ---
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
        notifications.value = []; // Clear notifications
        unreadNotificationsCount.value = 0; // Clear count
        stopUnreadCheck(); // Stop chat polling
        unsubscribeFromNotifications(); // Unsubscribe from notifications
        closeDropdown();
        closeNotificationDropdown();
    };

    // Lifecycle Hooks
    onMounted(() => {
      checkCurrentRoute();
      checkSupabaseSession(); // Checks session and fetches data if logged in
      window.addEventListener('user-logged-in', checkLoginStatus);
      window.addEventListener('user-logged-out', checkLoginStatus);
      window.addEventListener('chat-read', fetchUnreadChatsCount); // Keep listening for chat reads
      document.addEventListener('click', handleDocumentClick);

      // Start chat polling only if logged in initially
      if (isLoggedIn.value) {
        startUnreadCheck();
      }
    });

    onUnmounted(() => {
      window.removeEventListener('user-logged-in', checkLoginStatus);
      window.removeEventListener('user-logged-out', checkLoginStatus);
      window.removeEventListener('chat-read', fetchUnreadChatsCount);
      document.removeEventListener('click', handleDocumentClick);
      stopUnreadCheck(); // Stop polling
      unsubscribeFromNotifications(); // Unsubscribe
    });

    // Watchers
    watch(route, (to) => { // Watch route changes
      isHelpersPage.value = to.path === '/helpers';
      closeDropdown(); // Close dropdowns on route change
      closeNotificationDropdown();
    });

    watch(isLoggedIn, (newVal) => { // Watch login status changes
      if (newVal) {
        fetchUnreadChatsCount();
        fetchNotifications();
        startUnreadCheck();
        subscribeToNotifications(); // Subscribe when logged in
      } else {
        // logoutCleanup handles resetting counts and unsubscribing
      }
    });

    // Return refs and methods to be used in the template
    return {
      isLoggedIn,
      username,
      avatarUrl,
      isDropdownOpen,
      isHelpersPage,
      unreadChatsCount,
      notifications, // NEW
      unreadNotificationsCount, // NEW
      isNotificationDropdownOpen, // NEW
      currentRouteName, // NEW
      navigateToHome,
      handleProfileClick,
      closeDropdown,
      handleLogout,
      toggleNotificationDropdown, // NEW
      closeNotificationDropdown, // NEW
      formatTimeAgo, // NEW
    };
  }
};
</script>

<style scoped>
.top-navbar {
  background: #2563EB;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000; /* Ensure navbar is on top */
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
  border-bottom: 3px solid transparent; /* Placeholder for active border */
}

.nav-link:hover {
  opacity: 0.8;
}

.nav-link.router-link-active,
.nav-link.active { /* Add .active class for manual active state */
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

/* General Icon Button Styling */
.icon-button {
  position: relative;
  background: white;
  color: #2563EB; /* Match theme */
  padding: 0.625rem; /* Slightly smaller padding */
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px; /* Consistent size */
  height: 40px;
  text-decoration: none; /* For router-link version */
}
.helpers-page .icon-button {
  color: #6C5B7F; /* Color for helpers page */
}
.icon-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.icon-button.active { /* Style for active route */
   background: rgba(255, 255, 255, 0.9);
   box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Notification Dropdown Specifics */
.notification-dropdown {
  position: relative; /* Needed for absolute positioning of menu */
}

/* Notification Badge (General) */
.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444; /* Red badge */
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
  /* Optional: Pulse animation */
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Chat Badge Specifics (if needed) */
.chat-badge {
  /* You can add chat-specific overrides here if desired */
}

/* Chat Button Wrapper Alignment (if using router-link) */
.chat-button-wrapper {
  /* Inherits .icon-button styles */
}
.chat-button {
  /* Styles for the inner div if needed, but likely handled by wrapper */
  display: flex; /* Ensure SVG centers */
  align-items: center;
  justify-content: center;
}

/* Dropdown Menu Base (reuse for profile and notifications) */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.75rem); /* Position below trigger */
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  min-width: 250px; /* Adjust as needed */
  z-index: 1000; /* Ensure it's above other content */
  border: 1px solid #e5e7eb;
  overflow: hidden; /* Ensures rounded corners apply */
  display: none; /* Hidden by default, controlled by JS */
}

/* Notification Menu Specifics */
.notification-menu {
  min-width: 320px; /* Wider for notifications */
  max-height: 400px; /* Limit height and allow scroll */
  display: flex; /* Use flex for layout */
  flex-direction: column;
}

.notification-header {
  padding: 0.75rem 1rem;
  font-weight: 600;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0; /* Prevent header shrinking */
}

.notification-list {
  overflow-y: auto; /* Allow scrolling */
  flex-grow: 1; /* Take remaining space */
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
  background-color: #eff6ff; /* Light blue for unread */
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
  font-weight: 500; /* Slightly bolder unread text */
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
  flex-shrink: 0; /* Prevent footer shrinking */
}
.notification-footer a {
  color: #2563EB;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.875rem;
}
.notification-footer a:hover {
  text-decoration: underline;
}

/* Profile Menu Specifics */
.profile-menu {
   min-width: 180px; /* Narrower for profile options */
}
.dropdown-item {
  display: block; /* Make links block */
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