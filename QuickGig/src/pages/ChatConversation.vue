<template>
  <div class="chat-page">
    <div class="chat-header">
      <button @click="goBack" class="back-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>

      <div class="header-info" @click="navigateToJobDetails" :class="{ 'clickable': !isHelperChat }">
        <div class="user-avatar">
          <span>{{ otherUser?.username?.charAt(0).toUpperCase() || '?' }}</span>
        </div>
        <div class="header-text">
          <h2 class="user-name">{{ otherUser?.username || 'Loading...' }}</h2>
          <p class="job-title">
            {{ chatSubtitle }}
            <svg v-if="!isHelperChat" class="chevron-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </p>
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

            <div v-if="message.offer_status === 'pending' && message.sender_id !== currentUserId"
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

            <!-- Show "Proceed to Payment" button for payer if not yet paid -->
            <div v-if="shouldShowPaymentButton && message.offer_amount && !isPaymentCompleted"
                 class="payment-action">
              <button @click="proceedToPayment(message)" class="payment-btn">
                Proceed to Payment
              </button>
            </div>

            <!-- Show "Payment Confirmed" message if payment is completed -->
            <div v-else-if="shouldShowPaymentButton && isPaymentCompleted"
                 class="payment-confirmed">
              <div class="confirmed-icon">✓</div>
              <p class="confirmed-text">Payment Confirmed</p>
            </div>

            <!-- Show "Leave a Review" or "Edit Review" button -->
            <div v-if="!hasReviewedOtherUser" class="review-action">
              <button @click="openReviewModal" class="review-btn">
                ⭐ Leave a Review
              </button>
            </div>
            <!-- Always show review button -->
            <div class="review-action">
              <button @click="openReviewModal" class="review-btn">
                {{ hasReviewedOtherUser ? '✏️ Edit Your Review' : '⭐ Leave a Review' }}
              </button>
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
      <form @submit.prevent="sendMessage" class="message-form row g-2 align-items-center">

        <input
          v-model="newMessage"
          type="text"
          placeholder="Type a message..."
          class="message-input"
          :disabled="isSending"
        />
        <div v-if="canMakeOffer" class="col-auto">
        <button
          v-if="canMakeOffer"
          type="button"
          class="offer-btn"
          @click="openMakeOfferModal"
          :disabled="isSending"
        >
          Make Offer
        </button>
        </div>

        <div class="col-auto">
        <button
          type="submit"
          class="send-btn"
          :disabled="!newMessage.trim() || isSending"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button></div>
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
          <!-- Current Asking Price Display -->
          <div class="current-price-section">
            <div class="price-label-row">
              <span class="price-label-text">Current Asking Price</span>
            </div>
            <div class="current-price-display">
              ${{ jobInfo?.payment || '0.00' }}
            </div>
            <p class="price-subtext">Posted by {{ otherUser?.username }}</p>
          </div>

          <!-- Job Info -->
          <div class="job-info-box">
            <div class="job-info-header">
              <p class="info-label">{{ isHelperChat ? 'Helper Service' : 'Job Title' }}</p>
            </div>
            <p class="info-value">{{ isHelperChat ? otherUser?.username : jobInfo?.title }}</p>
          </div>

          <!-- Helper Chat Job Title Input -->
          <div v-if="isHelperChat" class="form-group">
            <label class="form-label">Job Title *</label>
            <input
              v-model="offerJobTitle"
              type="text"
              placeholder="e.g., Dog Walking, House Cleaning"
              class="offer-input"
            />
          </div>

          <!-- Your Offer Amount -->
          <div class="form-group">
            <label class="form-label">Your Offer Amount ($) *</label>
            <div class="offer-amount-input-wrapper">
              <span class="currency-prefix">$</span>
              <input
                v-model="offerAmount"
                type="number"
                placeholder="Enter your offer"
                class="offer-input offer-amount-input"
                min="1"
                step="0.01"
              />
            </div>
            <div v-if="offerAmount && jobInfo?.payment" class="price-difference">
              <span v-if="parseFloat(offerAmount) < parseFloat(jobInfo.payment)" class="difference-lower">
                ${{ (parseFloat(jobInfo.payment) - parseFloat(offerAmount)).toFixed(2) }} lower than asking price
              </span>
              <span v-else-if="parseFloat(offerAmount) > parseFloat(jobInfo.payment)" class="difference-higher">
                ${{ (parseFloat(offerAmount) - parseFloat(jobInfo.payment)).toFixed(2) }} higher than asking price
              </span>
              <span v-else class="difference-equal">
                Matches asking price
              </span>
            </div>
          </div>

          <!-- Optional Message -->
          <div class="form-group">
            <label class="form-label">Message (Optional)</label>
            <textarea
              v-model="offerMessage"
              placeholder="Add a message to explain your offer or ask questions..."
              class="offer-textarea"
              rows="3"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button @click="closeMakeOfferModal" class="cancel-btn">Cancel</button>
            <button @click="submitOffer" class="submit-btn" :disabled="!canSubmitOffer || isProcessing">
              {{ isProcessing ? 'Sending...' : 'Send Offer' }}
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
              placeholder="Share your experience..."
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
const isPaymentCompleted = ref(false);
let messageChannel = null;

// Review-related refs
const showReviewModal = ref(false);
const reviewRating = ref(5);
const reviewComment = ref('');
const hasReviewedOtherUser = ref(false);

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

// Permissions - ✅ CHANGED: Both users can make offers now
const canMakeOffer = computed(() => {
  // Both the job poster and job seeker can make offers
  return true;
});

const canAcceptOffer = computed(() => {
  // Anyone who receives an offer can accept it
  return true;
});

const shouldShowPaymentButton = computed(() => isPayer.value);

const canSubmitOffer = computed(() => {
  if (!offerAmount.value || offerAmount.value <= 0) return false;
  if (isHelperChat.value && !offerJobTitle.value) return false;
  return true;
});

// computed other user id based on chat type
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

// compute helper id for reviews: the entity that should be stored in reviews.helper_id
const reviewHelperId = computed(() => {
  // If the helper is the current user (i.e., current user is helper), helper id is currentUserId
  // Otherwise helper is the otherUserId
  if (isHelper.value) return currentUserId.value;
  return otherUserId.value;
});

// Check if the current user already reviewed the helper
// Check if the current user already reviewed the other user
// Check if the current user already reviewed the other user
// Check if the current user already reviewed the other user
// Check if the current user already reviewed the other user
const checkIfReviewed = async () => {
  try {
    if (!currentUserId.value || !otherUserId.value) {
      hasReviewedOtherUser.value = false;
      return;
    }
    
    // Check if current user already reviewed the other user
    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('helper_id', otherUserId.value)
      .eq('reviewer_id', currentUserId.value)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking review:', error);
      hasReviewedOtherUser.value = false;
      return;
    }
    
    console.log('Check if reviewed - data:', data, 'currentUser:', currentUserId.value, 'otherUser:', otherUserId.value, 'isHelper:', isHelper.value);
    
    // Only set to true if a review actually exists
    hasReviewedOtherUser.value = !!data;
  } catch (err) {
    console.error('Error in checkIfReviewed:', err);
    hasReviewedOtherUser.value = false;
  }
};

// lifecycle
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
    messageChannel = null;
  }
});

// Load chat meta, other user, job info
const loadChatData = async () => {
  try {
    const chatId = route.params.id;

    const { data: chat, error: chatError } = await supabase
      .from(chatTable.value)
      .select('*')
      .eq('id', chatId)
      .single();

    if (chatError) {
      console.error('Error loading chat:', chatError);
      throw chatError;
    }

    chatInfo.value = chat;
    
    console.log('Chat data loaded:', chat); // Debug log to see what job_id is stored

    const otherId = isHelperChat.value
      ? (chat.helper_id === currentUserId.value ? chat.client_id : chat.helper_id)
      : (chat.job_poster_id === currentUserId.value ? chat.job_seeker_id : chat.job_poster_id);

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('username, avatar_url')
      .eq('id', otherId)
      .single();

    if (!userError) {
      otherUser.value = user;
    }

    // Load job info only for job chats
    if (!isHelperChat.value && chat.job_id) {
      const { data: job, error: jobError } = await supabase
        .from('User-Job-Request')
        .select('id, title, payment')
        .eq('id', chat.job_id)
        .single();

      if (!jobError && job) {
        jobInfo.value = job;
        console.log('Job info loaded:', job); // Debug log
      } else {
        console.error('Error loading job:', jobError);
      }
    }

  } catch (error) {
    console.error('Error loading chat data:', error);
    router.push('/chats');
  }
};

// check job status/completion (for showing review button / payment)
const checkJobCompleted = async () => {
  try {
    const chatId = route.params.id;
    const completedTable = isHelperChat.value ? 'helper_jobs' : 'User-Job-Request';

    if (isHelperChat.value) {
      const { data, error } = await supabase
        .from(completedTable)
        .select('id, status, payment_status')
        .eq('helper_chat_id', chatId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking job completion:', error);
      }

      jobCompletedExists.value = !!data && (data.status === 'completed' || data.status === 'in-progress' || !!data.id);
      isPaymentCompleted.value = data?.payment_status === 'paid';
    } else {
      const { data, error } = await supabase
        .from(completedTable)
        .select('status, paid')
        .eq('id', chatInfo.value?.job_id)
        .single();

      if (error) {
        console.error('Error checking job status:', error);
      }
      jobCompletedExists.value = data?.status === 'in-progress' || data?.status === 'completed';
      isPaymentCompleted.value = data?.paid === true;
    }
  } catch (error) {
    console.error('Error in checkJobCompleted:', error);
  }
};

// load messages
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
  } catch (error) {
    console.error('Error loading messages:', error);
  } finally {
    isLoading.value = false;
  }
};

// mark messages as read
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
      window.dispatchEvent(new Event('chat-read'));
    }
  } catch (error) {
    console.error('Error in markMessagesAsRead:', error);
  }
};

// sending regular message
const sendMessage = async () => {
  if (!newMessage.value.trim() || isSending.value) return;

  try {
    isSending.value = true;
    const chatId = route.params.id;
    const messageText = newMessage.value.trim();

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

// Make Offer modal state
const showMakeOfferModal = ref(false);
const offerAmount = ref('');
const offerMessage = ref('');
const offerJobTitle = ref('');

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

    // ✅ Check if there's a pending offer from the other user
    const pendingOfferFromOther = messages.value.find(
      m => m.message_type === 'offer' && 
           m.offer_status === 'pending' && 
           m.sender_id !== currentUserId.value
    );

    // ✅ If there's a pending offer, mark it as countered
    if (pendingOfferFromOther) {
      const { error: updateError } = await supabase
        .from(messagesTable.value)
        .update({ offer_status: 'countered' })
        .eq('id', pendingOfferFromOther.id);

      if (updateError) throw updateError;

      // Update local state
      const msgIndex = messages.value.findIndex(m => m.id === pendingOfferFromOther.id);
      if (msgIndex !== -1) {
        messages.value[msgIndex].offer_status = 'countered';
      }
    }

    const offerText = isHelperChat.value
      ? `Offer: $${offerAmount.value} for ${offerJobTitle.value}`
      : `Offer: $${offerAmount.value}`;

    // ✅ Determine if this is a counter offer or initial offer
    const messageType = pendingOfferFromOther ? 'counter_offer' : 'offer';

    const offerData = {
      [chatIdColumn.value]: chatId,
      sender_id: currentUserId.value,
      message: offerText,
      message_type: messageType,
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

    // optional: store job title locally for UI use
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

// Accept Offer Function - UPDATED to handle multiple helpers
const acceptOffer = async (offerMessage) => {
  if (isProcessing.value) return;

  if (!confirm(`Accept offer of $${offerMessage.offer_amount}?`)) {
    return;
  }

  try {
    isProcessing.value = true;
    const chatId = route.params.id;

    console.log('Accepting offer:', offerMessage.id);

    // ✅ 1. Update the offer message status
    const { error: updateError } = await supabase
      .from(messagesTable.value)
      .update({ offer_status: 'accepted' })
      .eq('id', offerMessage.id);
    if (updateError) throw updateError;

    // ✅ 2. Mark this chat as having an accepted offer
    const { error: chatUpdateError } = await supabase
      .from('chats')
      .update({ 
        offer_accepted: true,
        accepted_at: new Date().toISOString()
      })
      .eq('id', chatId);
    if (chatUpdateError) throw chatUpdateError;

    // ✅ 3. Get job details to check if it requires multiple helpers
    const { data: jobData, error: jobFetchError } = await supabase
      .from('User-Job-Request')
      .select('multiple_positions, positions_available, positions_filled')
      .eq('id', chatInfo.value.job_id)
      .single();
    
    if (jobFetchError) throw jobFetchError;

    // Check if this job requires multiple helpers
    const requiresMultipleHelpers = jobData?.multiple_positions || false;
    const positionsAvailable = jobData?.positions_available || 1;
    const positionsFilled = jobData?.positions_filled || 0;

    console.log('Job data:', { requiresMultipleHelpers, positionsAvailable, positionsFilled });

    if (requiresMultipleHelpers) {
      // Increment positions_filled
      const newPositionsFilled = positionsFilled + 1;

      console.log(`Positions filled: ${newPositionsFilled}/${positionsAvailable}`);

      // Check if all positions are now filled
      if (newPositionsFilled >= positionsAvailable) {
        // All positions filled - mark as in-progress
        const { error: jobUpdateError } = await supabase
          .from('User-Job-Request')
          .update({ 
            status: 'in-progress',
            positions_filled: newPositionsFilled
          })
          .eq('id', chatInfo.value.job_id);
        if (jobUpdateError) throw jobUpdateError;
        
        console.log('All positions filled - job marked as in-progress');
      } else {
        // Still need more helpers - keep status as 'open' but increment counter
        const { error: jobUpdateError } = await supabase
          .from('User-Job-Request')
          .update({ 
            positions_filled: newPositionsFilled
          })
          .eq('id', chatInfo.value.job_id);
        if (jobUpdateError) throw jobUpdateError;
        
        console.log('Job still needs more helpers - keeping status as open');
      }
    } else {
      // Single helper job - mark as in-progress immediately
      const { error: jobUpdateError } = await supabase
        .from('User-Job-Request')
        .update({ status: 'in-progress' })
        .eq('id', chatInfo.value.job_id);
      if (jobUpdateError) throw jobUpdateError;
      
      console.log('Single helper job - marked as in-progress');
    }

    // ✅ 5. Send acceptance message WITH offer_amount stored
    const acceptanceText = `Offer of $${offerMessage.offer_amount} has been accepted!`;
    const { data: acceptanceMsg, error: msgError } = await supabase
      .from(messagesTable.value)
      .insert([{
        chat_id: chatId,
        sender_id: currentUserId.value,
        message: acceptanceText,
        message_type: 'offer_accepted',
        offer_amount: offerMessage.offer_amount,
        read: false
      }])
      .select()
      .single();
    if (msgError) throw msgError;

    // ✅ 6. Update chat's last message
    await supabase
      .from(chatTable.value)
      .update({
        last_message: acceptanceText,
        last_message_time: new Date().toISOString()
      })
      .eq('id', chatId);

    // ✅ 7. Update local state
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

  } finally {
    isProcessing.value = false;
  }
};

// Proceed to Payment Function
const proceedToPayment = (acceptanceMessage) => {
  let jobTitle = '';
  if (isHelperChat.value) {
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

// Counter offer handling
const showCounterModal = ref(false);
const selectedOffer = ref(null);
const counterAmount = ref('');
const counterMessage = ref('');

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

// Subscribe to realtime messages and updates
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
        
        // Check if it's a system message about payment
        if (payload.new.message_type === 'system' && payload.new.message.includes('Payment')) {
          await checkJobCompleted();
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
        const index = messages.value.findIndex(m => m.id === payload.new.id);
        if (index !== -1) {
          messages.value.splice(index, 1, payload.new);
        }
      }
    )
    .subscribe((status, err) => {
      if (err) {
        console.error("Subscription error:", err);
      }
    });
};

// scroll helper
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

// Review modal functions & submit
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

    const personToReview = otherUserId.value;
    
    if (!personToReview) {
      alert('Unable to determine who to review.');
      isProcessing.value = false;
      return;
    }

const { data, error } = await supabase
      .from('reviews')
      .update({
        rating: reviewRating.value,
        comment: reviewComment.value.trim(),
        job_title: isHelperChat.value ? 'Helper Service' : jobInfo.value?.title,
        updated_at: new Date().toISOString()
      })
      .eq('helper_id', personToReview)
      .eq('reviewer_id', currentUserId.value)
      .select();

    // If no rows updated, insert a new review
    if (!error && (!data || data.length === 0)) {
      const { data: insertData, error: insertError } = await supabase
        .from('reviews')
        .insert([{
          helper_id: personToReview,
          reviewer_id: currentUserId.value,
          rating: reviewRating.value,
          comment: reviewComment.value.trim(),
          job_title: isHelperChat.value ? 'Helper Service' : jobInfo.value?.title
        }])
        .select();
      
      if (insertError) throw insertError;
    }

    if (error) {
      console.error('Error submitting review:', error);
      alert(`Failed to submit review: ${error.message || 'Please try again.'}`);
      return;
    }

    closeReviewModal();
    hasReviewedOtherUser.value = true;
    alert('Review submitted successfully!');

  } catch (error) {
    console.error('Error in submitReview:', error);
    alert(`Failed to submit review: ${error.message || 'Please try again.'}`);
  } finally {
    isProcessing.value = false;
  }
};

const navigateToJobDetails = () => {
  // Only navigate for regular job chats, not helper chats
  if (!isHelperChat.value && chatInfo.value?.job_id) {
    // Use the job_id from the chat
    router.push(`/job/${chatInfo.value.job_id}`);
  }
};
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  /* 
    This is the key change. We use a dynamic viewport height unit (dvh).
    100dvh represents 100% of the dynamic viewport height, which adjusts
    for mobile browser UI like the address bar appearing and disappearing.
    We then subtract the space taken by the sticky navbar.
    'var(--navbar-height)' would be ideal, but since we don't have that,
    we can use a reasonable estimate or set it in a parent component.
    For now, let's assume a navbar height. A more robust solution is
    to set this value via JavaScript if it's dynamic.
    
    A simpler approach that avoids calc() is to set the container that
    holds the navbar and router-view to height: 100vh and be a flex-column,
    but this change is self-contained to the component.

    Let's go back to the most robust, self-contained Flexbox solution.
  */
  height: 100dvh; /* Use dynamic viewport height */
  max-height: 100dvh;
  padding-top: 80px; /* Add padding to offset the navbar. Adjust this value to your navbar's height */
  box-sizing: border-box; /* Ensures padding is included in the height calculation */
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-shrink: 0; /* Prevents the header from shrinking */
  position: fixed; /* Fix the header to the top of the .chat-page container */
  top: 80px; /* Position it right below the main navbar */
  left: 0;
  width: 100%;
  z-index: 20; /* Ensure it's above the messages container */
  box-sizing: border-box;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  background: #f9fafb;
  min-height: 0;
  /* Add padding to the top to avoid content being hidden by the fixed chat-header */
  padding: 1.5rem;
  /* We need to calculate the top padding to be the header's height */
  padding-top: calc(1.5rem + 80px); /* Adjust 80px to your chat-header's actual height */
}

.message-input-container {
  padding: 1rem 1.5rem;
  background: white;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0; /* Prevents the input area from shrinking */
}
/* --- END OF FIX --- */


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
  min-width: 0;
}

.header-info.clickable {
  cursor: pointer;
  border-radius: 0.5rem;
  padding: 0.5rem;
  margin: -0.5rem;
  transition: background-color 0.2s;
}

.header-info.clickable:hover {
  background-color: #f9fafb;
}

.header-info.clickable:active {
  background-color: #f3f4f6;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #2563eb;
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
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.chevron-icon {
  flex-shrink: 0;
  opacity: 0.6;
}

.clickable .job-title {
  color: #2563eb;
}

.clickable:hover .job-title {
  color: #1d4ed8;
}

.clickable:hover .chevron-icon {
  opacity: 1;
  transform: translateX(2px);
  transition: all 0.2s;
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
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  padding-right: 6px;
}
.modal-content::-webkit-scrollbar {
  width: 6px; /* Width of the scrollbar */
  height: 6px;
}
.modal-content::-webkit-scrollbar {
  width: 6px; /* Width of the scrollbar */
  height: 6px;
}
.modal-content::-webkit-scrollbar-track {
  background: transparent; /* Make the track invisible */
  border-radius: 1rem; /* Match modal's border-radius if possible */
}

.modal-content::-webkit-scrollbar-thumb {
  background-color: #adb5bd; /* Color of the scrollbar thumb (the bar) */
  border-radius: 3px; /* Rounded corners for the thumb */
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background-color: #6c757d; /* Darker color on hover */
}

/* Explicitly hide the scrollbar arrow buttons */
.modal-content::-webkit-scrollbar-button {
  display: none;
  height: 0;
  width: 0;
}

.modal-content::-webkit-scrollbar-track {
  background: transparent; /* Make the track invisible */
  border-radius: 1rem; /* Match modal's border-radius if possible */
}

.modal-content::-webkit-scrollbar-thumb {
  background-color: #adb5bd; /* Color of the scrollbar thumb (the bar) */
  border-radius: 3px; /* Rounded corners for the thumb */
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background-color: #6c757d; /* Darker color on hover */
}

/* Explicitly hide the scrollbar arrow buttons */
.modal-content::-webkit-scrollbar-button {
  display: none;
  height: 0;
  width: 0;
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

.payment-confirmed {
  margin-top: 1rem;
  padding: 1rem;
  background: #f0fdf4;
  border: 2px solid #10b981;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.own-message .payment-confirmed {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

.confirmed-icon {
  width: 32px;
  height: 32px;
  background: #10b981;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: bold;
  flex-shrink: 0;
}

.confirmed-text {
  margin: 0;
  font-weight: 600;
  color: #065f46;
  font-size: 0.9rem;
}

.own-message .confirmed-text {
  color: white;
}

@media (max-width: 768px) {
  .message-bubble {
    max-width: 85%;
  }
  .modal-content {
  max-height: 60vh; /* I limited the height so it doesnt get blocked by navbar on small screen*/
}


  .offer-bubble {
    max-width: 90%;
  }

  .modal-content {
    margin: 1rem;
    max-height: 60vh; /* I limited the height so it doesnt get blocked by navbar on small screen*/
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

/* Simplified Make Offer Modal Styles */
.current-price-section {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
  border: 1px solid #e5e7eb;
}

.price-label-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.price-label-text {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6b7280;
}

.current-price-display {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #111827;
}

.price-subtext {
  font-size: 0.875rem;
  margin: 0;
  color: #6b7280;
}

.job-info-box {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid #e5e7eb;
}

.job-info-header {
  margin-bottom: 0.5rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.offer-amount-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.currency-prefix {
  position: absolute;
  left: 1rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: #6b7280;
  pointer-events: none;
}

.offer-amount-input {
  padding-left: 2.5rem !important;
  font-size: 1.25rem;
  font-weight: 600;
}

.price-difference {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  border: 1px solid;
}

.difference-lower {
  display: block;
  background: #f0fdf4;
  color: #166534;
  border-color: #86efac;
}

.difference-higher {
  display: block;
  background: #fef3c7;
  color: #92400e;
  border-color: #fcd34d;
}

.difference-equal {
  display: block;
  background: #eff6ff;
  color: #1e40af;
  border-color: #93c5fd;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Simplified modal header */
.modal-content {
  animation: modalSlideUp 0.3s ease;
}

/* Simplified modal header */
.modal-content {
  animation: modalSlideUp 0.3s ease;
}

@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  background: white;
  color: #111827;
  border-bottom: 2px solid #e5e7eb;
  border-radius: 1rem 1rem 0 0;
}

.modal-header .modal-title {
  color: #111827;
}

.modal-header .close-btn {
  color: #6b7280;
}

.modal-header .close-btn:hover {
  background: #f3f4f6;
}

@media (max-width: 768px) {
  .current-price-display {
    font-size: 2rem;
  }
  
  .current-price-section {
    padding: 1.25rem;
  }
}
</style>