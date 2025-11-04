<template>
  <div class="chats-page">
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">Messages</h1>
        <p class="page-subtitle">Your conversations</p>
      </div>

      <!-- Empty State -->
      <div v-if="!isLoading && allChats.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <h2>No messages yet</h2>
        <p>Start a conversation by chatting with job posters or adventurers</p>
        <div class="empty-actions">
          <router-link to="/jobs" class="browse-btn">Browse Jobs</router-link>
          <router-link to="/helpers" class="browse-btn">Browse Adventurers</router-link>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading chats...</p>
      </div>

      <!-- Chat List -->
      <div v-if="!isLoading && allChats.length > 0" class="chats-container">
        <div class="chats-grid">
          <div 
            v-for="chat in allChats" 
            :key="chat.id + chat.type" 
            class="chat-card"
            :class="{ 'has-unread': chat.unreadCount > 0 }"
            @click="openChat(chat)"
          >
            <!-- User Avatar -->
            <div class="chat-avatar">
              <img v-if="chat.avatarUrl" :src="chat.avatarUrl" :alt="chat.otherUserName" class="avatar-img" />
              <span v-else class="avatar-letter">{{ chat.otherUserName.charAt(0).toUpperCase() }}</span>
              <span v-if="chat.unreadCount > 0" class="avatar-badge"></span>
            </div>

            <!-- Chat Info -->
            <div class="chat-info">
              <div class="chat-header">
                <h3 class="chat-name">{{ chat.otherUserName }}</h3>
                <span class="chat-time">{{ chat.lastMessageTime }}</span>
              </div>
              
              <div class="chat-details">
                <p class="job-title">
                  <span v-if="chat.type === 'helper'" class="chat-type-badge">Adventurer</span>
                  {{ chat.jobTitle }}
                </p>
                <p class="last-message" :class="{ unread: chat.unreadCount > 0 }">
                  {{ chat.lastMessage }}
                </p>
              </div>
            </div>

            <!-- Unread Badge -->
            <div v-if="chat.unreadCount > 0" class="unread-badge">
              {{ chat.unreadCount > 99 ? '99+' : chat.unreadCount }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../supabase/config';

const router = useRouter();
const jobChats = ref([]);
const helperChats = ref([]);
const isLoading = ref(true);
let refreshInterval = null;

// Combine and sort all chats by last message time
const allChats = computed(() => {
  const combined = [...jobChats.value, ...helperChats.value];
  return combined.sort((a, b) => {
    const timeA = new Date(a.lastMessageTimeRaw || 0).getTime();
    const timeB = new Date(b.lastMessageTimeRaw || 0).getTime();
    return timeB - timeA;
  });
});

onMounted(async () => {
  // Check if user is logged in
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) {
    router.push('/login');
    return;
  }

  await fetchAllChats();
  
  // Refresh chats every 10 seconds
  refreshInterval = setInterval(() => {
    fetchAllChats();
  }, 10000);
});

// Refresh chats when navigating back to this page
onActivated(async () => {
  await fetchAllChats();
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

const fetchAllChats = async () => {
  await Promise.all([
    fetchJobChats(),
    fetchHelperChats()
  ]);
  isLoading.value = false;
};

const fetchJobChats = async () => {
  try {
    const currentUserId = localStorage.getItem('userId');
    
    console.log('Fetching job chats for user:', currentUserId);
    
    // Fetch all job chats where user is either job poster or job seeker
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select(`
        id,
        job_id,
        job_poster_id,
        job_seeker_id,
        last_message,
        last_message_time,
        created_at
      `)
      .or(`job_poster_id.eq.${currentUserId},job_seeker_id.eq.${currentUserId}`)
      .order('last_message_time', { ascending: false });
    
    if (chatsError) throw chatsError;
    
    console.log('Job chats fetched:', chatsData?.length || 0);
    
    // For each chat, get the other user's info and job info
    const enrichedChats = await Promise.all((chatsData || []).map(async (chat) => {
      // Determine who the "other user" is
      const otherUserId = chat.job_poster_id === currentUserId 
        ? chat.job_seeker_id 
        : chat.job_poster_id;
      
      // Fetch other user's info (including avatar)
      const { data: userData } = await supabase
        .from('users')
        .select('username, avatar_url')
        .eq('id', otherUserId)
        .single();
      
      console.log(`User data for ${otherUserId}:`, userData);
      
      // Fetch job info
      const { data: jobData } = await supabase
        .from('User-Job-Request')
        .select('title')
        .eq('id', chat.job_id)
        .single();
      
      // Count unread messages for this chat
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('chat_id', chat.id)
        .neq('sender_id', currentUserId)
        .eq('read', false);
      
      return {
        id: chat.id,
        type: 'job',
        otherUserName: userData?.username || 'Unknown User',
        avatarUrl: userData?.avatar_url || null,
        jobTitle: jobData?.title || 'Deleted Job',
        lastMessage: chat.last_message || 'No messages yet',
        lastMessageTime: formatTime(chat.last_message_time),
        lastMessageTimeRaw: chat.last_message_time,
        unreadCount: unreadCount || 0
      };
    }));
    
    jobChats.value = enrichedChats;
    console.log('Enriched job chats:', jobChats.value.length);
    
  } catch (error) {
    console.error('Error fetching job chats:', error);
    jobChats.value = [];
  }
};

const fetchHelperChats = async () => {
  try {
    const currentUserId = localStorage.getItem('userId');
    
    console.log('Fetching adventurer chats for user:', currentUserId);
    
    // Fetch all helper chats where user is either helper or client
    const { data: chatsData, error: chatsError } = await supabase
      .from('helper_chats')
      .select(`
        id,
        helper_id,
        client_id,
        last_message,
        last_message_time,
        created_at
      `)
      .or(`helper_id.eq.${currentUserId},client_id.eq.${currentUserId}`)
      .order('last_message_time', { ascending: false });
    
    if (chatsError) {
      console.warn('Error fetching adventurer chats:', chatsError);
      helperChats.value = [];
      return;
    }
    
    console.log('Adventurer chats fetched:', chatsData?.length || 0);
    
    // For each chat, get the other user's info
    const enrichedChats = await Promise.all((chatsData || []).map(async (chat) => {
      // Determine who the "other user" is
      const otherUserId = chat.helper_id === currentUserId 
        ? chat.client_id 
        : chat.helper_id;
      
      const isHelper = chat.helper_id === currentUserId;
      
      // Fetch other user's info (including avatar)
      const { data: userData } = await supabase
        .from('users')
        .select('username, avatar_url')
        .eq('id', otherUserId)
        .single();
      
      // Count unread messages for this chat
      const { count: unreadCount } = await supabase
        .from('helper_messages')
        .select('id', { count: 'exact', head: true })
        .eq('helper_chat_id', chat.id)
        .neq('sender_id', currentUserId)
        .eq('read', false);
      
      return {
        id: chat.id,
        type: 'helper',
        otherUserName: userData?.username || 'Unknown User',
        avatarUrl: userData?.avatar_url || null,
        jobTitle: isHelper ? 'Client Request' : 'Adventurer Service',
        lastMessage: chat.last_message || 'No messages yet',
        lastMessageTime: formatTime(chat.last_message_time),
        lastMessageTimeRaw: chat.last_message_time,
        unreadCount: unreadCount || 0
      };
    }));
    
    helperChats.value = enrichedChats;
    console.log('Enriched adventurer chats:', helperChats.value.length);
    
  } catch (error) {
    console.error('Error fetching adventurer chats:', error);
    helperChats.value = [];
  }
};

const formatTime = (timestamp) => {
  if (!timestamp) return 'Just now';
  
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffMs = now - messageTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return messageTime.toLocaleDateString();
};

const openChat = (chat) => {
  // Dispatch event to update navbar unread count
  window.dispatchEvent(new Event('chat-read'));
  
  // Route to the appropriate chat page based on type
  if (chat.type === 'helper') {
    router.push(`/helper-chat/${chat.id}`);
  } else {
    router.push(`/chat/${chat.id}`);
  }
};
</script>

<style scoped>
@font-face {
  font-family: 'Jersey 25';
  src: url('@/assets/fonts/Jersey25-Regular.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

.chats-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 2rem 1rem;
  font-family: 'Jersey 25', sans-serif;
}

.container {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2.3rem;     /* 2rem * 1.15 */
  font-weight: 350;      /* 700 / 2 */
  color: #111827;
  margin: 0;
}

.page-subtitle {
  font-size: 1.15rem;    /* 1rem * 1.15 */
  color: #6b7280;
  margin: 0;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #6b7280;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 4.6rem;     /* 4rem * 1.15 */
  margin-bottom: 1rem;
}

.empty-state h2 {
  font-size: 1.725rem;   /* 1.5rem * 1.15 */
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: #6b7280;
  margin: 0 0 1.5rem 0;
}

.empty-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.browse-btn {
  padding: 0.875rem 1.5rem;
  background: #2563eb;
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  font-weight: 300;      /* 600 / 2 */
  transition: all 0.2s;
}

.browse-btn:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
}

/* Chats Container */
.chats-container {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.chats-grid {
  display: flex;
  flex-direction: column;
}

/* Chat Card */
.chat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.chat-card:last-child {
  border-bottom: none;
}

.chat-card:hover {
  background: #f9fafb;
}

.chat-card.has-unread {
  background: #eff6ff;
}

.chat-card.has-unread:hover {
  background: #dbeafe;
}

.chat-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.725rem;   /* 1.5rem * 1.15 */
  font-weight: 300;      /* 600 / 2 */
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-letter {
  font-size: 1.725rem;   /* 1.5rem * 1.15 */
  font-weight: 300;      /* 600 / 2 */
}

.avatar-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  background: #ef4444;
  border: 2px solid white;
  border-radius: 50%;
  animation: pulse-badge 2s ease-in-out infinite;
}

@keyframes pulse-badge {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.25rem;
}

.chat-name {
  font-size: 1.35rem;    /* 1.15rem * 1.17 (increased more for username) */
  font-weight: 300;      /* 600 / 2 */
  color: #111827;
  margin: 0;
}

.chat-time {
  font-size: 1.1rem;     /* 1.006rem * 1.09 */
  color: #6b7280;
  white-space: nowrap;
}

.chat-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.job-title {
  font-size: 1.1rem;     /* 1.006rem * 1.09 */
  color: #2563eb;
  font-weight: 250;      /* 500 / 2 */
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.chat-type-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: #10b981;
  color: white;
  font-size: 0.88rem;    /* 0.805rem * 1.09 */
  font-weight: 300;      /* 600 / 2 */
  border-radius: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.last-message {
  font-size: 1.1rem;     /* 1.006rem * 1.09 */
  color: #6b7280;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.last-message.unread {
  color: #111827;
  font-weight: 300;      /* 600 / 2 */
}

.unread-badge {
  background: #ef4444;
  color: white;
  min-width: 24px;
  height: 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.94rem;    /* 0.863rem * 1.09 */
  font-weight: 350;      /* 700 / 2 */
  flex-shrink: 0;
  padding: 0 0.5rem;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
  animation: pulse-badge 2s ease-in-out infinite;
}

@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }

  .page-header {
    margin-bottom: 1.5rem;
  }

  .page-title {
    font-size: 2.013rem; /* 1.75rem * 1.15 */
  }

  .chat-card {
    padding: 1rem;
  }

  .chat-avatar {
    width: 48px;
    height: 48px;
  }

  .avatar-letter {
    font-size: 1.438rem; /* 1.25rem * 1.15 */
  }

  .avatar-badge {
    width: 12px;
    height: 12px;
  }

  .chat-name {
    font-size: 1.28rem;  /* 1.093rem * 1.17 */
  }

  .chat-time {
    font-size: 0.94rem;  /* 0.863rem * 1.09 */
  }

  .job-title,
  .last-message {
    font-size: 1.0rem;   /* 0.92rem * 1.09 */
  }

  .unread-badge {
    min-width: 22px;
    height: 22px;
    font-size: 0.88rem;  /* 0.805rem * 1.09 */
  }
}

@media (max-width: 480px) {
  .chat-card {
    gap: 0.75rem;
    padding: 0.875rem;
  }

  .chat-avatar {
    width: 44px;
    height: 44px;
  }

  .avatar-letter {
    font-size: 1.265rem; /* 1.1rem * 1.15 */
  }

  .chat-time {
    font-size: 0.94rem;  /* 0.863rem * 1.09 */
  }

  .job-title,
  .last-message {
    font-size: 1.0rem;   /* 0.92rem * 1.09 */
  }
}
</style>