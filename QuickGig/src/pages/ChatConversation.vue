<template>
  <div class="chat-page">
    <!-- Chat Header -->
    <div class="chat-header">
      <button @click="goBack" class="back-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      
      <div class="header-info">
        <div class="user-avatar">
          <span>{{ otherUser?.username?.charAt(0).toUpperCase() || '?' }}</span>
        </div>
        <div class="header-text">
          <h2 class="user-name">{{ otherUser?.username || 'Loading...' }}</h2>
          <p class="job-title">{{ jobInfo?.title || 'Loading...' }}</p>
        </div>
      </div>
    </div>

    <!-- Messages Container -->
    <div ref="messagesContainer" class="messages-container">
      <div v-if="isLoading" class="loading-messages">
        <div class="spinner"></div>
      </div>
      
      <div v-else-if="messages.length === 0" class="empty-messages">
        <p>No messages yet. Start the conversation!</p>
      </div>
      
      <div v-else class="messages-list">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message-wrapper"
          :class="{ 'own-message': message.sender_id === currentUserId }"
        >
          <div class="message-bubble">
            <p class="message-text">{{ message.message }}</p>
            <span class="message-time">{{ formatTime(message.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Message Input -->
    <div class="message-input-container">
      <form @submit.prevent="sendMessage" class="message-form">
        <input
          v-model="newMessage"
          type="text"
          placeholder="Type a message..."
          class="message-input"
          :disabled="isSending"
        />
        <button
          type="submit"
          class="send-btn"
          :disabled="!newMessage.trim() || isSending"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '../supabase/config';

const route = useRoute();
const router = useRouter();

const messages = ref([]);
const newMessage = ref('');
const chatInfo = ref(null);
const otherUser = ref(null);
const jobInfo = ref(null);
const currentUserId = ref(null);
const isLoading = ref(true);
const isSending = ref(false);
const messagesContainer = ref(null);

onMounted(async () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) {
    router.push('/login');
    return;
  }

  currentUserId.value = localStorage.getItem('userId');
  await loadChatData();
  await loadMessages();
  scrollToBottom();
  
  // Subscribe to new messages
  subscribeToMessages();
});

const loadChatData = async () => {
  try {
    const chatId = route.params.id;
    
    console.log('Loading chat data for chat ID:', chatId);
    
    // Get chat info
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single();
    
    if (chatError) {
      console.error('Error loading chat:', chatError);
      throw chatError;
    }
    
    console.log('Chat loaded:', chat);
    chatInfo.value = chat;
    
    // Determine other user
    const otherUserId = chat.job_poster_id === currentUserId.value 
      ? chat.job_seeker_id 
      : chat.job_poster_id;
    
    console.log('Other user ID:', otherUserId);
    
    // Get other user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('username, avatar_url')
      .eq('id', otherUserId)
      .single();
    
    if (!userError) {
      otherUser.value = user;
      console.log('Other user:', user);
    }
    
    // Get job info
    const { data: job, error: jobError } = await supabase
      .from('User-Job-Request')
      .select('title, payment')
      .eq('id', chat.job_id)
      .single();
    
    if (!jobError) {
      jobInfo.value = job;
      console.log('Job info:', job);
    }
    
  } catch (error) {
    console.error('Error loading chat data:', error);
    router.push('/chats');
  }
};

const loadMessages = async () => {
  try {
    isLoading.value = true;
    const chatId = route.params.id;
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    messages.value = data || [];
    console.log('Messages loaded:', messages.value.length);
    
  } catch (error) {
    console.error('Error loading messages:', error);
  } finally {
    isLoading.value = false;
  }
};

const sendMessage = async () => {
  if (!newMessage.value.trim() || isSending.value) return;
  
  try {
    isSending.value = true;
    const chatId = route.params.id;
    const messageText = newMessage.value.trim();
    
    console.log('Sending message:', messageText);
    
    // Insert message
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        chat_id: chatId,
        sender_id: currentUserId.value,
        message: messageText
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('Message sent:', data);
    
    // Update chat's last message
    await supabase
      .from('chats')
      .update({
        last_message: messageText,
        last_message_time: new Date().toISOString()
      })
      .eq('id', chatId);
    
    // Add message to local array
    messages.value.push(data);
    
    // Clear input
    newMessage.value = '';
    
    // Scroll to bottom
    await nextTick();
    scrollToBottom();
    
  } catch (error) {
    console.error('Error sending message:', error);
  } finally {
    isSending.value = false;
  }
};

const subscribeToMessages = () => {
  const chatId = route.params.id;
  
  const channel = supabase
    .channel(`chat-${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      },
      (payload) => {
        console.log('New message received:', payload.new);
        // Only add if not from current user (to avoid duplicates)
        if (payload.new.sender_id !== currentUserId.value) {
          messages.value.push(payload.new);
          nextTick(() => scrollToBottom());
        }
      }
    )
    .subscribe();
};

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const goBack = () => {
  router.push('/chats');
};
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Chat Header */
.chat-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.back-btn {
  background: none;
  border: none;
  color: #374151;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #f3f4f6;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 600;
  overflow: hidden;
}

.header-text {
  flex: 1;
}

.user-name {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.job-title {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

/* Messages Container */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background: #f9fafb;
}

.loading-messages {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 3px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-messages {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #6b7280;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.message-wrapper {
  display: flex;
  justify-content: flex-start;
}

.message-wrapper.own-message {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.own-message .message-bubble {
  background: #2563eb;
  color: white;
}

.message-text {
  margin: 0 0 0.25rem 0;
  word-wrap: break-word;
  line-height: 1.5;
}

.message-time {
  font-size: 0.75rem;
  opacity: 0.7;
}

/* Message Input */
.message-input-container {
  padding: 1rem 1.5rem;
  background: white;
  border-top: 1px solid #e5e7eb;
}

.message-form {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.message-input {
  flex: 1;
  padding: 0.875rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 1.5rem;
  font-size: 1rem;
  transition: all 0.2s;
}

.message-input:focus {
  outline: none;
  border-color: #2563eb;
}

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: #1d4ed8;
  transform: scale(1.05);
}

.send-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .chat-header {
    padding: 1rem;
  }
  
  .user-avatar {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
  
  .user-name {
    font-size: 1rem;
  }
  
  .messages-container {
    padding: 1rem;
  }
  
  .message-input-container {
    padding: 0.75rem 1rem;
  }
}
</style>