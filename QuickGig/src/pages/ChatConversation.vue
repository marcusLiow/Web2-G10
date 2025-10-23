<template>
  <div class="chat-page">
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
          <div v-if="!message.message_type || message.message_type === 'regular'" class="message-bubble">
            <p class="message-text">{{ message.message }}</p>
            <span class="message-time">{{ formatTime(message.created_at) }}</span>
          </div>

          <div v-else-if="message.message_type === 'offer' || message.message_type === 'counter_offer'"
               class="message-bubble offer-bubble"
               :class="{
                 'offer-accepted': message.offer_status === 'accepted',
                 'offer-countered': message.offer_status === 'countered'
               }">
            <div class="offer-amount-text">
              {{ message.message_type === 'counter_offer' ? 'Counter Offered' : 'Offered' }} ${{ message.offer_amount }}
            </div>

            <span class="message-time">{{ formatTime(message.created_at) }}</span>

            <div v-if="message.offer_status === 'accepted'" class="offer-status-badge accepted">
              ✓ Offer Accepted
            </div>
            <div v-else-if="message.offer_status === 'countered'" class="offer-status-badge countered">
              Countered
            </div>

            <div v-if="message.offer_status === 'pending' && message.sender_id !== currentUserId"
                 class="offer-actions">
              <button @click="acceptOffer(message)" class="accept-btn" :disabled="isProcessing">
                ✓ Accept Offer
              </button>
              <button @click="openCounterOfferModal(message)" class="counter-btn" :disabled="isProcessing">
                ❌ Counter Offer
              </button>
            </div>
          </div>

          <div v-else-if="message.message_type === 'offer_accepted'" class="message-bubble accepted-bubble">
            <p class="acceptance-text">{{ message.message }}</p>
            <span class="message-time">{{ formatTime(message.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

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

    <div v-if="showCounterModal" class="modal-overlay" @click="closeCounterModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">Counter Offer</h2>
          <button @click="closeCounterModal" class="close-btn">×</button>
        </div>

        <div class="modal-body">
          <div class="current-offer-info">
            <p class="info-label">Current Offer</p>
            <p class="info-value">${{ selectedOffer?.offer_amount }}</p>
          </div>

          <div class="form-group">
            <label class="form-label">Your Counter Offer Amount *</label>
            <input
              v-model="counterAmount"
              type="number"
              placeholder="Enter your counter offer"
              class="offer-input"
              min="1"
              step="0.01"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Message (Optional)</label>
            <textarea
              v-model="counterMessage"
              placeholder="Add a message to explain your counter offer..."
              class="offer-textarea"
              rows="3"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button @click="closeCounterModal" class="cancel-btn">Cancel</button>
            <button @click="submitCounterOffer" class="submit-btn" :disabled="!counterAmount || isProcessing">
              Send Counter Offer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router'; // *** Single import here ***
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
const isProcessing = ref(false);
const messagesContainer = ref(null);
let messageChannel = null;

// Counter offer modal
const showCounterModal = ref(false);
const selectedOffer = ref(null);
const counterAmount = ref('');
const counterMessage = ref('');

onMounted(async () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) {
    router.push('/login');
    return;
  }

  currentUserId.value = localStorage.getItem('userId');
  await loadChatData();
  await loadMessages();
  await markMessagesAsRead();
  scrollToBottom();

  subscribeToMessages();
});

onUnmounted(() => {
  if (messageChannel) {
    supabase.removeChannel(messageChannel);
  }
});

const loadChatData = async () => {
  try {
    const chatId = route.params.id;

    console.log('Loading chat data for chat ID:', chatId);

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

    const otherUserId = chat.job_poster_id === currentUserId.value
      ? chat.job_seeker_id
      : chat.job_poster_id;

    console.log('Other user ID:', otherUserId);

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('username, avatar_url')
      .eq('id', otherUserId)
      .single();

    if (!userError) {
      otherUser.value = user;
      console.log('Other user:', user);
    }

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

const markMessagesAsRead = async () => {
  try {
    const chatId = route.params.id;

    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', currentUserId.value)
      .eq('read', false);

    if (error) {
      console.error('Error marking messages as read:', error);
    } else {
      console.log('Messages marked as read');
      window.dispatchEvent(new Event('chat-read'));
    }
  } catch (error) {
    console.error('Error in markMessagesAsRead:', error);
  }
};

const sendMessage = async () => {
  if (!newMessage.value.trim() || isSending.value) return;

  try {
    isSending.value = true;
    const chatId = route.params.id;
    const messageText = newMessage.value.trim();

    console.log('Sending message:', messageText);

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        chat_id: chatId,
        sender_id: currentUserId.value,
        message: messageText,
        message_type: 'regular',
        read: false
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('Message sent:', data);

    await supabase
      .from('chats')
      .update({
        last_message: messageText,
        last_message_time: new Date().toISOString()
      })
      .eq('id', chatId);

    messages.value.push(data);
    newMessage.value = '';

    await nextTick();
    scrollToBottom();

  } catch (error) {
    console.error('Error sending message:', error);
  } finally {
    isSending.value = false;
  }
};

// *** Accept Offer Function (Modified for Payment Page Navigation) ***
const acceptOffer = async (offerMessage) => {
  if (isProcessing.value) return;

  if (!confirm(`Accept offer of $${offerMessage.offer_amount}? Proceed to payment?`)) {
    return;
  }

  try {
    isProcessing.value = true;
    const chatId = route.params.id;

    console.log('Accepting offer and proceeding to payment:', offerMessage.id);

    // Step 1: Update the offer message status (Optional: do this after payment success)
    const { error: updateError } = await supabase
      .from('messages')
      .update({ offer_status: 'accepted' }) // Mark as accepted in DB
      .eq('id', offerMessage.id);
    if (updateError) throw updateError; // Handle error if update fails

    // Step 2: Send acceptance message (Optional: do this after payment success)
    const acceptanceText = `✓ Accepted offer of $${offerMessage.offer_amount}. Proceeding to payment.`;
    const { data: acceptanceMsg, error: msgError } = await supabase
      .from('messages')
      .insert([{ // *** Define your acceptance message object structure here ***
            chat_id: chatId,
            sender_id: currentUserId.value, // Or appropriate sender
            message: acceptanceText,
            message_type: 'offer_accepted', // Use a specific type
            read: false
      }])
      .select().single();
    if (msgError) throw msgError;

    // Step 3: Update chat's last message (Optional: do this after payment success)
     await supabase
       .from('chats')
       .update({
         last_message: acceptanceText,
         last_message_time: new Date().toISOString()
       })
       .eq('id', chatId);

    // Update local state immediately for responsiveness
    const msgIndex = messages.value.findIndex(m => m.id === offerMessage.id);
    if (msgIndex !== -1) {
      messages.value[msgIndex].offer_status = 'accepted';
    }
    if (acceptanceMsg) { // Only push if message was successfully inserted
        messages.value.push(acceptanceMsg);
    }
    await nextTick();
    scrollToBottom();

    // --- NAVIGATE TO PAYMENT PAGE ---
    console.log('Navigating to Payment Page...');
    router.push({
      name: 'PaymentPage',                       // Route name from router/index.js
      params: { jobId: chatInfo.value?.job_id }, // Pass Job ID in URL path
      query: {                                   // Pass other details as query params
        amount: offerMessage.offer_amount,
        jobTitle: jobInfo.value?.title,         // Use optional chaining
        chatId: chatId                          // Pass chatId to return later
      }
    });
    // --- END NAVIGATION ---

  } catch (error) {
    console.error('Error accepting offer / initiating payment:', error);
    alert('Failed to accept offer or proceed to payment. Please try again.');
    isProcessing.value = false; // Reset processing state only on error
  }
};

// Counter Offer Functions
const openCounterOfferModal = (offerMessage) => {
  selectedOffer.value = offerMessage;
  counterAmount.value = '';
  counterMessage.value = '';
  showCounterModal.value = true;
};

const closeCounterModal = () => {
  showCounterModal.value = false;
  selectedOffer.value = null;
  counterAmount.value = '';
  counterMessage.value = '';
};

const submitCounterOffer = async () => {
  if (!counterAmount.value || counterAmount.value <= 0 || isProcessing.value) return;

  try {
    isProcessing.value = true;
    const chatId = route.params.id;

    console.log('Submitting counter offer:', counterAmount.value);

    // Step 1: Update original offer status to 'countered'
    const { error: updateError } = await supabase
      .from('messages')
      .update({ offer_status: 'countered' })
      .eq('id', selectedOffer.value.id);

    if (updateError) throw updateError;

    // Step 2: Send counter offer message
    const counterOfferText = `Counter Offer: $${counterAmount.value}`;

    const { data: counterMsg, error: counterError } = await supabase
      .from('messages')
      .insert([{
        chat_id: chatId,
        sender_id: currentUserId.value,
        message: counterOfferText,
        message_type: 'counter_offer',
        offer_amount: counterAmount.value,
        offer_status: 'pending',
        read: false
      }])
      .select()
      .single();

    if (counterError) throw counterError;

    console.log('Counter offer sent:', counterMsg);

    // Step 3: Send additional message if provided
    let lastMessage = counterOfferText;

    if (counterMessage.value.trim()) {
      const { data: additionalMsg, error: additionalError } = await supabase
        .from('messages')
        .insert([{
          chat_id: chatId,
          sender_id: currentUserId.value,
          message: counterMessage.value.trim(),
          message_type: 'regular',
          read: false
        }])
        .select()
        .single();

      if (additionalError) throw additionalError;

      messages.value.push(additionalMsg);
      lastMessage = counterMessage.value.trim();
    }

    // Step 4: Update chat's last message
    await supabase
      .from('chats')
      .update({
        last_message: lastMessage,
        last_message_time: new Date().toISOString()
      })
      .eq('id', chatId);

    // Update local state
    const msgIndex = messages.value.findIndex(m => m.id === selectedOffer.value.id);
    if (msgIndex !== -1) {
      messages.value[msgIndex].offer_status = 'countered';
    }
    messages.value.push(counterMsg);

    closeCounterModal();

    await nextTick();
    scrollToBottom();

    alert('Counter offer sent successfully!');

  } catch (error) {
    console.error('Error sending counter offer:', error);
    alert('Failed to send counter offer. Please try again.');
  } finally {
    isProcessing.value = false;
  }
};

const subscribeToMessages = () => {
  const chatId = route.params.id;

  messageChannel = supabase
    .channel(`chat-${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      },
      async (payload) => {
        console.log('New message received:', payload.new);
        if (payload.new.sender_id !== currentUserId.value) {
          messages.value.push(payload.new);
          await nextTick();
          scrollToBottom();

          // Mark received message as read immediately
          await supabase
            .from('messages')
            .update({ read: true })
            .eq('id', payload.new.id);

          window.dispatchEvent(new Event('chat-read')); // Update global unread count
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      },
      (payload) => {
        console.log('Message updated:', payload.new);
        const index = messages.value.findIndex(m => m.id === payload.new.id);
        if (index !== -1) {
          // Replace the whole message object to ensure reactivity
          messages.value.splice(index, 1, payload.new);
        }
      }
    )
    .subscribe((status, err) => {
      if (err) {
        console.error("Subscription error:", err);
      } else {
        console.log("Subscription status:", status);
      }
    });
};


const scrollToBottom = () => {
  if (messagesContainer.value) {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }, 0);
  }
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
  position: sticky; /* Make header sticky */
  top: 0;
  z-index: 10;
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
  flex-shrink: 0; /* Prevent avatar from shrinking */
}

.header-text {
  flex: 1;
  min-width: 0; /* Prevent text overflow issues */
}

.user-name {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.job-title {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  text-align: center;
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
  position: relative; /* Needed for absolute positioning of time */
  padding-bottom: 1.5rem; /* Space for time */
}

.own-message .message-bubble {
  background: #2563eb;
  color: white;
}

.message-text {
  margin: 0;
  word-wrap: break-word;
  line-height: 1.5;
}

.message-time {
  font-size: 0.7rem; /* Smaller time */
  opacity: 0.6;
  position: absolute;
  bottom: 0.3rem;
  right: 0.75rem;
}

.own-message .message-time {
  /* color: rgba(255, 255, 255, 0.7); Ensure time is visible on blue */
   opacity: 0.7; /* Keep consistent opacity */
}


/* Offer Bubble Styling */
.offer-bubble {
  max-width: 85%;
  padding: 1rem;
  background: white; /* White background for received offers */
  border: 1px solid #e5e7eb; /* Subtle border */
}

.own-message .offer-bubble {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); /* Blue background for sent offers */
  color: white;
  border: none;
}

.offer-bubble.offer-accepted {
  background: #ecfdf5; /* Light green for accepted */
  border-color: #a7f3d0;
  color: #065f46; /* Dark green text for accepted */
}
.own-message .offer-bubble.offer-accepted {
   background: linear-gradient(135deg, #10b981 0%, #059669 100%); /* Green gradient when sent and accepted */
   color: white;
}


.offer-bubble.offer-countered {
   background: #fffbeb; /* Light yellow for countered */
   border-color: #fde68a;
   color: #92400e; /* Dark yellow/brown text */
}
.own-message .offer-bubble.offer-countered {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); /* Orange gradient when sent and countered */
    color: white;
}


.offer-amount-text {
  font-size: 1.1rem;
  font-weight: 600;
  /* color: #dc2626;  Removed - color depends on state now */
  margin-bottom: 0.75rem;
}

.own-message .offer-amount-text {
  color: white; /* Keep white for sent offers */
}
.offer-bubble.offer-accepted .offer-amount-text {
   color: #065f46; /* Dark green for accepted amount */
}
.own-message .offer-bubble.offer-accepted .offer-amount-text {
    color: white; /* Still white on green gradient */
}
.offer-bubble.offer-countered .offer-amount-text {
    color: #92400e; /* Dark yellow/brown for countered amount */
}
.own-message .offer-bubble.offer-countered .offer-amount-text {
    color: white; /* Still white on orange gradient */
}

/* Time position for offer bubble */
.offer-bubble .message-time {
  bottom: 0.5rem;
  right: 1rem;
}
.own-message .offer-bubble .message-time {
    opacity: 0.8; /* Slightly more visible on colored bg */
}


.offer-status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.7rem; /* Smaller badge */
  font-weight: 600;
  margin-top: 0.5rem; /* Space between amount and badge */
  position: absolute; /* Position relative to bubble */
  bottom: 0.5rem;
  left: 1rem;
}

.offer-status-badge.accepted {
  background: #065f46;
  color: white;
}

.offer-status-badge.countered {
  background: #92400e;
  color: white;
}

/* Offer Action Buttons */
.offer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 1rem; /* More space */
  padding-top: 0.75rem; /* Space above buttons */
  border-top: 1px dashed #e5e7eb; /* Separator */
}

.accept-btn, .counter-btn {
  padding: 0.6rem 0.8rem; /* Slightly smaller buttons */
  border: none;
  border-radius: 0.5rem;
  font-size: 0.8rem; /* Smaller text */
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.accept-btn {
  background: #10b981;
  color: white;
}

.accept-btn:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.counter-btn {
  background: #f59e0b;
  color: white;
}

.counter-btn:hover:not(:disabled) {
  background: #d97706;
  transform: translateY(-1px);
}

.accept-btn:disabled, .counter-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Accepted Message Bubble */
.accepted-bubble {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  padding-bottom: 1.5rem; /* Ensure space for time */
}
.own-message .accepted-bubble {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%); /* Green gradient */
    color: white;
}

.acceptance-text {
  margin: 0;
  font-weight: 600;
  color: #065f46;
}
.own-message .acceptance-text {
    color: white;
}

/* Message Input */
.message-input-container {
  padding: 1rem 1.5rem;
  background: white;
  border-top: 1px solid #e5e7eb;
  position: sticky; /* Make input sticky */
  bottom: 0;
  z-index: 10;
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
  background-color: #f9fafb; /* Light background for input */
}

.message-input:focus {
  outline: none;
  border-color: #2563eb;
  background-color: white;
}
.message-input:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
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
  flex-shrink: 0; /* Prevent button shrinking */
}

.send-btn:hover:not(:disabled) {
  background: #1d4ed8;
  transform: scale(1.05);
}

.send-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none; /* Disable hover effect */
}

/* Counter Offer Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6); /* Darker overlay */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(4px); /* Add blur effect */
}

.modal-content {
  background: white;
  border-radius: 1rem;
  max-width: 450px; /* Slightly narrower modal */
  width: 100%;
  max-height: 90vh;
  overflow: hidden; /* Prevent content overflow */
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  display: flex; /* Use flex for layout */
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem; /* Adjusted padding */
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0; /* Prevent header shrinking */
}

.modal-title {
  font-size: 1.25rem; /* Smaller title */
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-btn {
  background: #f3f4f6;
  border: none;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #6b7280;
  line-height: 1;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #111827;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto; /* Allow body to scroll if needed */
}

.current-offer-info {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.info-label {
  font-size: 0.8rem; /* Smaller label */
  color: #92400e;
  margin: 0 0 0.25rem 0;
  font-weight: 500;
  text-transform: uppercase; /* Uppercase label */
}

.info-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #92400e;
  margin: 0;
}

.form-group {
  margin-bottom: 1.25rem; /* Reduced margin */
}

.form-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem; /* Slightly smaller label */
}

.offer-input, .offer-textarea {
  width: 100%;
  padding: 0.75rem 1rem; /* Adjusted padding */
  border: 1px solid #d1d5db; /* Lighter border */
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s;
}

.offer-input:focus, .offer-textarea:focus {
  outline: none;
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
}

.offer-textarea {
  resize: vertical;
  font-family: inherit;
  min-height: 60px; /* Set min height */
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem; /* Adjusted padding */
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb; /* Light background for actions */
  flex-shrink: 0; /* Prevent footer shrinking */
}

.cancel-btn, .submit-btn {
  flex: 1;
  padding: 0.75rem; /* Adjusted padding */
  border-radius: 0.5rem;
  font-size: 0.9rem; /* Smaller text */
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.cancel-btn {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db; /* Add border */
}

.cancel-btn:hover {
  background: #f9fafb;
}

.submit-btn {
  background: #f59e0b;
  color: white;
}

.submit-btn:hover:not(:disabled) {
  background: #d97706;
  transform: translateY(-1px);
}

.submit-btn:disabled {
  background: #fdba74; /* Lighter orange when disabled */
  cursor: not-allowed;
  transform: none; /* Disable hover effect */
}


@media (max-width: 768px) {
  .chat-header {
    padding: 0.75rem 1rem; /* Reduced padding */
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

  .offer-bubble {
    max-width: 95%;
  }

  .offer-actions {
    grid-template-columns: 1fr; /* Stack buttons on smaller screens */
  }
}
</style>