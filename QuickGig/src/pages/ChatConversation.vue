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
          <p class="job-title">{{ chatSubtitle }}</p>
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
            <div class="offer-content">
              <div class="offer-type">{{ message.message_type === 'counter_offer' ? 'Counter Offer' : 'Offer' }}</div>
              <div class="offer-amount">${{ message.offer_amount }}</div>
              <div v-if="message.offer_status === 'accepted'" class="offer-status">Accepted</div>
              <div v-else-if="message.offer_status === 'countered'" class="offer-status">Countered</div>
            </div>

            <div v-if="message.offer_status === 'pending' && message.sender_id !== currentUserId && canAcceptOffer"
                 class="offer-actions">
              <button @click="acceptOffer(message)" class="offer-action-btn accept-btn" :disabled="isProcessing">
                Accept
              </button>
              <button @click="openCounterOfferModal(message)" class="offer-action-btn counter-btn" :disabled="isProcessing">
                Counter
              </button>
            </div>

            <span class="message-time">{{ formatTime(message.created_at) }}</span>
          </div>

          <div v-else-if="message.message_type === 'offer_accepted'" class="message-bubble accepted-bubble">
            <p class="acceptance-text">{{ message.message }}</p>
            
            <!-- Show "Proceed to Payment" button for payer -->
            <div v-if="shouldShowPaymentButton && message.offer_amount && !jobCompletedExists"
                 class="payment-action">
              <button @click="proceedToPayment(message)" class="payment-btn">
                Proceed to Payment
              </button>
            </div>

            <div v-else-if="message.message_type === 'offer_accepted'" class="message-bubble accepted-bubble">
  <p class="acceptance-text">{{ message.message }}</p>
  
  <!-- Show "Proceed to Payment" button for payer -->
  <div v-if="shouldShowPaymentButton && message.offer_amount && !jobCompletedExists"
       class="payment-action">
    <button @click="proceedToPayment(message)" class="payment-btn">
      Proceed to Payment
    </button>
  </div>

  <!-- ✅ NEW: Show "Leave a Review" button after job is completed -->
  <div v-if="jobCompletedExists && !hasReviewedOtherUser"
       class="review-action">
    <button @click="openReviewModal" class="review-btn">
      ⭐ Leave a Review
    </button>
  </div>

  <span class="message-time">{{ formatTime(message.created_at) }}</span>
</div>

            <span class="message-time">{{ formatTime(message.created_at) }}</span>
          </div>

          <div v-else-if="message.message_type === 'job_completed'" class="message-bubble completed-bubble">
            <p class="completion-text">{{ message.message }}</p>
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
          v-if="canMakeOffer"
          type="button"
          class="offer-btn"
          @click="openMakeOfferModal"
          :disabled="isSending"
        >
          Make Offer
        </button>
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

    <!-- Make Offer Modal -->
    <div v-if="showMakeOfferModal" class="modal-overlay" @click="closeMakeOfferModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">Make an Offer</h2>
          <button @click="closeMakeOfferModal" class="close-btn">×</button>
        </div>

        <div class="modal-body">
          <div class="job-info-box">
            <p class="info-label">{{ isHelperChat ? 'Helper' : 'Job' }}</p>
            <p class="info-value">{{ isHelperChat ? otherUser?.username : jobInfo?.title }}</p>
          </div>

          <div v-if="isHelperChat" class="form-group">
            <label class="form-label">Job Title *</label>
            <input
              v-model="offerJobTitle"
              type="text"
              placeholder="e.g., Dog Walking, House Cleaning"
              class="offer-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Offer Amount ($) *</label>
            <input
              v-model="offerAmount"
              type="number"
              placeholder="Enter your offer amount"
              class="offer-input"
              min="1"
              step="0.01"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Message (Optional)</label>
            <textarea
              v-model="offerMessage"
              placeholder="Add a message with your offer..."
              class="offer-textarea"
              rows="3"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button @click="closeMakeOfferModal" class="cancel-btn">Cancel</button>
            <button @click="submitOffer" class="submit-btn" :disabled="!canSubmitOffer || isProcessing">
              Send Offer
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Counter Offer Modal -->
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

    <!-- Review Modal -->
<div v-if="showReviewModal" class="modal-overlay" @click="closeReviewModal">
  <div class="modal-content" @click.stop>
    <div class="modal-header">
      <h2 class="modal-title">Leave a Review for {{ otherUser?.username }}</h2>
      <button @click="closeReviewModal" class="close-btn">×</button>
    </div>

    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Rating *</label>
        <div class="rating-input">
          <button
            v-for="star in 5"
            :key="star"
            @click="reviewRating = star"
            :class="['star-btn', { active: star <= reviewRating }]"
            type="button"
          >
            ⭐
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Your Review *</label>
        <textarea
          v-model="reviewComment"
          placeholder="Share your experience working with {{ otherUser?.username }}..."
          class="offer-textarea"
          rows="4"
        ></textarea>
      </div>

      <div class="modal-actions">
        <button @click="closeReviewModal" class="cancel-btn">Cancel</button>
        <button @click="submitReview" class="submit-btn" :disabled="!reviewRating || !reviewComment.trim() || isProcessing">
          Submit Review
        </button>
      </div>
    </div>
  </div>
</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
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
const isProcessing = ref(false);
const messagesContainer = ref(null);
const jobCompletedExists = ref(false);
let messageChannel = null;

// Add these refs
const showReviewModal = ref(false);
const reviewRating = ref(5);
const reviewComment = ref('');
const hasReviewedOtherUser = ref(false);

// Add this computed property
const otherUserId = computed(() => {
  if (!chatInfo.value || !currentUserId.value) return null;
  
  if (isHelperChat.value) {
    return chatInfo.value.helper_id === currentUserId.value 
      ? chatInfo.value.client_id 
      : chatInfo.value.helper_id;
  } else {
    return chatInfo.value.job_poster_id === currentUserId.value
      ? chatInfo.value.job_seeker_id
      : chatInfo.value.job_poster_id;
  }
});

// Add this function to check if user has already reviewed
const checkIfReviewed = async () => {
  try {
    if (!otherUserId.value || !currentUserId.value) return;
    
    const reviewType = isHelper.value ? 'helper_to_client' : 'client_to_helper';
    
    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('helper_id', otherUserId.value)
      .eq('reviewer_id', currentUserId.value)
      .eq('review_type', reviewType)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking review:', error);
    }
    
    hasReviewedOtherUser.value = !!data;
  } catch (error) {
    console.error('Error in checkIfReviewed:', error);
  }
};

// Add review modal functions
const openReviewModal = () => {
  reviewRating.value = 5;
  reviewComment.value = '';
  showReviewModal.value = true;
};

const closeReviewModal = () => {
  showReviewModal.value = false;
};

const submitReview = async () => {
  if (!reviewRating.value || !reviewComment.value.trim() || isProcessing.value) return;
  
  try {
    isProcessing.value = true;
    
    const reviewType = isHelper.value ? 'helper_to_client' : 'client_to_helper';
    
    const { error } = await supabase
      .from('reviews')
      .insert([{
        helper_id: otherUserId.value,
        reviewer_id: currentUserId.value,
        rating: reviewRating.value,
        comment: reviewComment.value.trim(),
        review_type: reviewType,
        job_title: isHelperChat.value ? 'Helper Service' : jobInfo.value?.title
      }]);
    
    if (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
      return;
    }
    
    closeReviewModal();
    hasReviewedOtherUser.value = true;
    alert('Review submitted successfully!');
    
  } catch (error) {
    console.error('Error in submitReview:', error);
    alert('Failed to submit review. Please try again.');
  } finally {
    isProcessing.value = false;
  }
};

// Counter offer modal
const showCounterModal = ref(false);
const selectedOffer = ref(null);
const counterAmount = ref('');
const counterMessage = ref('');

// Make offer modal
const showMakeOfferModal = ref(false);
const offerAmount = ref('');
const offerMessage = ref('');
const offerJobTitle = ref('');

// Determine chat type from route
const isHelperChat = computed(() => route.path.includes('/helper-chat/'));

// Chat tables and columns based on type
const chatTable = computed(() => isHelperChat.value ? 'helper_chats' : 'chats');
const messagesTable = computed(() => isHelperChat.value ? 'helper_messages' : 'messages');
const chatIdColumn = computed(() => isHelperChat.value ? 'helper_chat_id' : 'chat_id');

// User role computations
const isHelper = computed(() => {
  if (!currentUserId.value || !chatInfo.value) return false;
  return isHelperChat.value 
    ? currentUserId.value === chatInfo.value.helper_id
    : currentUserId.value === chatInfo.value.job_seeker_id;
});

const isPayer = computed(() => {
  if (!currentUserId.value || !chatInfo.value) return false;
  return isHelperChat.value
    ? currentUserId.value === chatInfo.value.client_id
    : currentUserId.value === chatInfo.value.job_poster_id;
});

// Subtitle under username
const chatSubtitle = computed(() => {
  if (isHelperChat.value) {
    return isHelper.value ? 'Client' : 'Helper';
  }
  return jobInfo.value?.title || 'Loading...';
});

// Permissions
const canMakeOffer = computed(() => isPayer.value);
const canAcceptOffer = computed(() => isHelper.value);
const shouldShowPaymentButton = computed(() => isPayer.value);

const canSubmitOffer = computed(() => {
  if (!offerAmount.value || offerAmount.value <= 0) return false;
  if (isHelperChat.value && !offerJobTitle.value) return false;
  return true;
});

onMounted(async () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) {
    router.push('/login');
    return;
  }

  currentUserId.value = localStorage.getItem('userId');
  await loadChatData();
  await loadMessages();
  await checkJobCompleted();
  await markMessagesAsRead();
  await checkIfReviewed();
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
    console.log(`Loading ${isHelperChat.value ? 'helper' : 'job'} chat data for chat ID:`, chatId);

    const { data: chat, error: chatError } = await supabase
      .from(chatTable.value)
      .select('*')
      .eq('id', chatId)
      .single();

    if (chatError) {
      console.error('Error loading chat:', chatError);
      throw chatError;
    }

    console.log('Chat loaded:', chat);
    chatInfo.value = chat;

    const otherUserId = isHelperChat.value
      ? (chat.helper_id === currentUserId.value ? chat.client_id : chat.helper_id)
      : (chat.job_poster_id === currentUserId.value ? chat.job_seeker_id : chat.job_poster_id);

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

    // Load job info only for job chats
    if (!isHelperChat.value) {
      const { data: job, error: jobError } = await supabase
        .from('User-Job-Request')
        .select('title, payment')
        .eq('id', chat.job_id)
        .single();

      if (!jobError) {
        jobInfo.value = job;
        console.log('Job info:', job);
      }
    }

  } catch (error) {
    console.error('Error loading chat data:', error);
    router.push('/chats');
  }
};

const checkJobCompleted = async () => {
  try {
    const chatId = route.params.id;
    const completedTable = isHelperChat.value ? 'helper_jobs' : 'User-Job-Request';
    
    if (isHelperChat.value) {
      const { data, error } = await supabase
        .from(completedTable)
        .select('id')
        .eq('helper_chat_id', chatId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking job completion:', error);
      }
      jobCompletedExists.value = !!data;
    } else {
      // For job chats, check if job status is 'in-progress' or 'completed'
      const { data, error } = await supabase
        .from(completedTable)
        .select('status')
        .eq('id', chatInfo.value?.job_id)
        .single();

      if (error) {
        console.error('Error checking job status:', error);
      }
      jobCompletedExists.value = data?.status === 'in-progress' || data?.status === 'completed';
    }
  } catch (error) {
    console.error('Error in checkJobCompleted:', error);
  }
};

const loadMessages = async () => {
  try {
    isLoading.value = true;
    const chatId = route.params.id;

    const { data, error } = await supabase
      .from(messagesTable.value)
      .select('*')
      .eq(chatIdColumn.value, chatId)
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
      .from(messagesTable.value)
      .update({ read: true })
      .eq(chatIdColumn.value, chatId)
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

    const messageData = {
      [chatIdColumn.value]: chatId,
      sender_id: currentUserId.value,
      message: messageText,
      message_type: 'regular',
      read: false
    };

    const { data, error } = await supabase
      .from(messagesTable.value)
      .insert([messageData])
      .select()
      .single();

    if (error) throw error;

    console.log('Message sent:', data);

    await supabase
      .from(chatTable.value)
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

// Make Offer Functions
const openMakeOfferModal = () => {
  offerAmount.value = '';
  offerMessage.value = '';
  offerJobTitle.value = '';
  showMakeOfferModal.value = true;
};

const closeMakeOfferModal = () => {
  showMakeOfferModal.value = false;
  offerAmount.value = '';
  offerMessage.value = '';
  offerJobTitle.value = '';
};

const submitOffer = async () => {
  if (!canSubmitOffer.value || isProcessing.value) return;

  try {
    isProcessing.value = true;
    const chatId = route.params.id;

    console.log('Submitting offer:', offerAmount.value);

    const offerText = isHelperChat.value
      ? `Offer: $${offerAmount.value} for ${offerJobTitle.value}`
      : `Offer: $${offerAmount.value}`;

    const offerData = {
      [chatIdColumn.value]: chatId,
      sender_id: currentUserId.value,
      message: offerText,
      message_type: 'offer',
      offer_amount: offerAmount.value,
      offer_status: 'pending',
      read: false
    };

    const { data: offerMsg, error: offerError } = await supabase
      .from(messagesTable.value)
      .insert([offerData])
      .select()
      .single();

    if (offerError) throw offerError;

    console.log('Offer sent:', offerMsg);

    // Store job title for helper chats
    if (isHelperChat.value) {
      offerMsg.jobTitle = offerJobTitle.value;
    }

    let lastMessage = offerText;

    if (offerMessage.value.trim()) {
      const additionalData = {
        [chatIdColumn.value]: chatId,
        sender_id: currentUserId.value,
        message: offerMessage.value.trim(),
        message_type: 'regular',
        read: false
      };

      const { data: additionalMsg, error: additionalError } = await supabase
        .from(messagesTable.value)
        .insert([additionalData])
        .select()
        .single();

      if (additionalError) throw additionalError;

      messages.value.push(additionalMsg);
      lastMessage = offerMessage.value.trim();
    }

    await supabase
      .from(chatTable.value)
      .update({
        last_message: lastMessage,
        last_message_time: new Date().toISOString()
      })
      .eq('id', chatId);

    messages.value.push(offerMsg);

    closeMakeOfferModal();

    await nextTick();
    scrollToBottom();

    alert('Offer sent successfully!');

  } catch (error) {
    console.error('Error sending offer:', error);
    alert('Failed to send offer. Please try again.');
  } finally {
    isProcessing.value = false;
  }
};

const acceptOffer = async (offerMessage) => {
  if (isProcessing.value) return;

  if (!confirm(`Accept offer of $${offerMessage.offer_amount}?`)) {
    return;
  }

  try {
    isProcessing.value = true;
    const chatId = route.params.id;

    // Update the offer message status
    const { error: updateError } = await supabase
      .from(messagesTable.value)
      .update({ offer_status: 'accepted' })
      .eq('id', offerMessage.id);
    if (updateError) throw updateError;

    // Update job status for job chats
    if (!isHelperChat.value) {
      const { error: jobUpdateError } = await supabase
        .from('User-Job-Request')
        .update({ status: 'in-progress' })
        .eq('id', chatInfo.value.job_id); 
      if (jobUpdateError) throw jobUpdateError;
    }

    // ✅ Create helper_jobs record for helper chats (enables reviews)
    if (isHelperChat.value) {
      const offerMessages = messages.value.filter(m => 
        m.message_type === 'offer' && 
        m.offer_amount === offerMessage.offer_amount
      );
      
      const jobTitle = offerMessages.length > 0 && offerMessages[offerMessages.length - 1].message
        ? offerMessages[offerMessages.length - 1].message.split(' for ')[1] || 'Helper Service'
        : 'Helper Service';

      const { error: helperJobError } = await supabase
        .from('helper_jobs')
        .upsert([{
          helper_chat_id: chatId,
          helper_id: chatInfo.value.helper_id,
          client_id: chatInfo.value.client_id,
          job_title: jobTitle,
          agreed_amount: offerMessage.offer_amount,
          status: 'completed',
          payment_status: 'pending',
          created_at: new Date().toISOString()
        }], { onConflict: 'helper_chat_id' });

      if (helperJobError) {
        console.error('Error creating helper job:', helperJobError);
      }
    }

    // Send acceptance message
    const acceptanceText = `Offer of $${offerMessage.offer_amount} has been accepted!`;
    const { data: acceptanceMsg, error: msgError } = await supabase
      .from(messagesTable.value)
      .insert([{
        [chatIdColumn.value]: chatId,
        sender_id: currentUserId.value,
        message: acceptanceText,
        message_type: 'offer_accepted',
        offer_amount: offerMessage.offer_amount,
        read: false
      }])
      .select()
      .single();
    
    if (msgError) throw msgError;

    // Update chat's last message
    await supabase
      .from(chatTable.value)
      .update({
        last_message: acceptanceText,
        last_message_time: new Date().toISOString()
      })
      .eq('id', chatId);

    // Update local state
    const msgIndex = messages.value.findIndex(m => m.id === offerMessage.id);
    if (msgIndex !== -1) {
      messages.value[msgIndex].offer_status = 'accepted';
    }
    if (acceptanceMsg) {
      messages.value.push(acceptanceMsg);
    }
    
    await nextTick();
    scrollToBottom();
    await checkJobCompleted();
    await checkIfReviewed();

    alert('Offer accepted successfully!');

  } catch (error) {
    console.error('Error accepting offer:', error);
    alert('Failed to accept offer. Please try again.');
  } finally {
    isProcessing.value = false;
  }
};

// Proceed to Payment Function
const proceedToPayment = (acceptanceMessage) => {
  console.log('Navigating to Payment Page...');
  
  let jobTitle = '';
  if (isHelperChat.value) {
    // Extract job title from offer messages
    const offerMessages = messages.value.filter(m => 
      m.message_type === 'offer' && 
      m.offer_amount === acceptanceMessage.offer_amount
    );
    jobTitle = offerMessages.length > 0 && offerMessages[offerMessages.length - 1].message
      ? offerMessages[offerMessages.length - 1].message.split(' for ')[1] || 'Helper Service'
      : 'Helper Service';
  } else {
    jobTitle = jobInfo.value?.title || 'Job Service';
  }

  router.push({
    name: 'PaymentPage',
    params: { jobId: isHelperChat.value ? route.params.id : chatInfo.value?.job_id },
    query: {
      amount: acceptanceMessage.offer_amount,
      jobTitle: jobTitle,
      chatId: route.params.id,
      isHelperJob: isHelperChat.value ? 'true' : 'false'
    }
  });
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

    const { error: updateError } = await supabase
      .from(messagesTable.value)
      .update({ offer_status: 'countered' })
      .eq('id', selectedOffer.value.id);

    if (updateError) throw updateError;

    const counterOfferText = `Counter Offer: $${counterAmount.value}`;

    const counterData = {
      [chatIdColumn.value]: chatId,
      sender_id: currentUserId.value,
      message: counterOfferText,
      message_type: 'counter_offer',
      offer_amount: counterAmount.value,
      offer_status: 'pending',
      read: false
    };

    const { data: counterMsg, error: counterError } = await supabase
      .from(messagesTable.value)
      .insert([counterData])
      .select()
      .single();

    if (counterError) throw counterError;

    console.log('Counter offer sent:', counterMsg);

    let lastMessage = counterOfferText;

    if (counterMessage.value.trim()) {
      const additionalData = {
        [chatIdColumn.value]: chatId,
        sender_id: currentUserId.value,
        message: counterMessage.value.trim(),
        message_type: 'regular',
        read: false
      };

      const { data: additionalMsg, error: additionalError } = await supabase
        .from(messagesTable.value)
        .insert([additionalData])
        .select()
        .single();

      if (additionalError) throw additionalError;

      messages.value.push(additionalMsg);
      lastMessage = counterMessage.value.trim();
    }

    await supabase
      .from(chatTable.value)
      .update({
        last_message: lastMessage,
        last_message_time: new Date().toISOString()
      })
      .eq('id', chatId);

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
  const channelName = `${isHelperChat.value ? 'helper-' : ''}chat-${chatId}`;

  messageChannel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: messagesTable.value,
        filter: `${chatIdColumn.value}=eq.${chatId}`
      },
      async (payload) => {
        console.log('New message received:', payload.new);
        if (payload.new.sender_id !== currentUserId.value) {
          messages.value.push(payload.new);
          await nextTick();
          scrollToBottom();

          await supabase
            .from(messagesTable.value)
            .update({ read: true })
            .eq('id', payload.new.id);

          window.dispatchEvent(new Event('chat-read'));
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: messagesTable.value,
        filter: `${chatIdColumn.value}=eq.${chatId}`
      },
      (payload) => {
        console.log('Message updated:', payload.new);
        const index = messages.value.findIndex(m => m.id === payload.new.id);
        if (index !== -1) {
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
/* Copy all the styles from your existing ChatConversation.vue */
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: sticky;
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
  flex-shrink: 0;
}

.header-text {
  flex: 1;
  min-width: 0;
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
  position: relative;
  word-wrap: break-word;
}

.own-message .message-bubble {
  background: #2563eb;
  color: white;
}

.message-text {
  margin: 0 0 0.25rem 0;
  word-wrap: break-word;
  line-height: 1.5;
  padding-right: 3rem;
}

.message-time {
  font-size: 0.7rem;
  opacity: 0.6;
  white-space: nowrap;
  margin-top: 0.25rem;
  display: block;
  text-align: right;
}

.offer-bubble {
  max-width: 75%;
  padding: 1rem;
  background: white;
  border: 2px solid #2563eb;
  border-radius: 0.75rem;
}

.own-message .offer-bubble {
  background: #2563eb;
  color: white;
  border-color: #1e40af;
}

.offer-bubble.offer-accepted {
  background: #f0fdf4;
  border-color: #10b981;
}

.own-message .offer-bubble.offer-accepted {
  background: #10b981;
  border-color: #059669;
  color: white;
}

.offer-bubble.offer-countered {
  background: #fffbeb;
  border-color: #f59e0b;
}

.own-message .offer-bubble.offer-countered {
  background: #f59e0b;
  border-color: #d97706;
  color: white;
}

.offer-content {
  margin-bottom: 0.5rem;
}

.offer-type {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
  color: #6b7280;
}

.own-message .offer-type {
  color: rgba(255, 255, 255, 0.8);
}

.offer-amount {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 0.25rem;
}

.own-message .offer-amount {
  color: white;
}

.offer-status {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #6b7280;
}

.offer-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.own-message .offer-actions {
  border-top-color: rgba(255, 255, 255, 0.3);
}

.offer-action-btn {
  flex: 1;
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.accept-btn {
  background: #10b981;
  color: white;
}

.accept-btn:hover:not(:disabled) {
  background: #059669;
}

.counter-btn {
  background: #f59e0b;
  color: white;
}

.counter-btn:hover:not(:disabled) {
  background: #d97706;
}

.offer-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.accepted-bubble {
  background: #f0fdf4;
  border: 2px solid #10b981;
  padding: 1rem;
}

.own-message .accepted-bubble {
  background: #10b981;
  border-color: #059669;
  color: white;
}

.acceptance-text {
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  color: #065f46;
  padding-right: 3rem;
}

.own-message .acceptance-text {
  color: white;
}

.completed-bubble {
  background: #ede9fe;
  border: 2px solid #8b5cf6;
  padding: 1rem;
}

.own-message .completed-bubble {
  background: #8b5cf6;
  border-color: #7c3aed;
  color: white;
}

.completion-text {
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  color: #5b21b6;
  padding-right: 3rem;
}

.own-message .completion-text {
  color: white;
}

.payment-action {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #10b981;
}

.own-message .payment-action {
  border-top-color: rgba(255, 255, 255, 0.3);
}

.payment-btn {
  width: 100%;
  padding: 0.75rem 1.25rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.payment-btn:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.message-input-container {
  padding: 1rem 1.5rem;
  background: white;
  border-top: 1px solid #e5e7eb;
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.message-form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.message-input {
  flex: 1;
  padding: 0.875rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 1.5rem;
  font-size: 1rem;
  transition: all 0.2s;
  background-color: #f9fafb;
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

.offer-btn {
  padding: 0.75rem 1.25rem;
  border-radius: 1.5rem;
  background: #10b981;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
  white-space: nowrap;
}

.offer-btn:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.offer-btn:disabled {
  background: #9ca3af;
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
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: #1d4ed8;
  transform: scale(1.05);
}

.send-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 1rem;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #6b7280;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.modal-body {
  padding: 1.5rem;
}

.current-offer-info,
.job-info-box {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid #e5e7eb;
}

.info-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 0.25rem 0;
  font-weight: 500;
}

.info-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.offer-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s;
  box-sizing: border-box;
}

.offer-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.offer-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s;
  box-sizing: border-box;
}

.offer-textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.cancel-btn,
.submit-btn {
  flex: 1;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: #f3f4f6;
  color: #374151;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.submit-btn {
  background: #2563eb;
  color: white;
}

.submit-btn:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
}

.submit-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .message-bubble {
    max-width: 85%;
  }

  .offer-bubble {
    max-width: 90%;
  }

  .modal-content {
    margin: 1rem;
  }

  .offer-btn {
    padding: 0.625rem 1rem;
    font-size: 0.85rem;
  }

  .offer-amount {
    font-size: 1.5rem;
  }
}

.review-action {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #8b5cf6;
}

.review-btn {
  width: 100%;
  padding: 0.75rem 1.25rem;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.review-btn:hover {
  background: #7c3aed;
  transform: translateY(-1px);
}

.rating-input {
  display: flex;
  gap: 0.5rem;
}

.star-btn {
  background: none;
  border: none;
  font-size: 2rem;
  opacity: 0.3;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
}

.star-btn.active,
.star-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}
</style>