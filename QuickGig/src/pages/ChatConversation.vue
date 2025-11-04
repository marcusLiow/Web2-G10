<template>
  <div class="chat-page">
    <div class="chat-header">
      <button @click="goBack" class="back-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>

      <div class="header-info" @click="navigateToProfile" :class="{ 'clickable': true }">
        <div class="user-avatar">
          <img 
            v-if="otherUser?.avatar_url" 
            :src="otherUser.avatar_url" 
            :alt="otherUser.username"
            class="avatar-image"
          />
          <span v-else>{{ otherUser?.username?.charAt(0).toUpperCase() || '?' }}</span>
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
                 'offer-countered': message.offer_status === 'countered',
                 'offer-cancelled': message.offer_status === 'cancelled'
               }">
            <div class="offer-content">
              <div class="offer-type">{{ message.message_type === 'counter_offer' ? 'Counter Offer' : 'Offer' }}</div>
              <!-- Show job title for helper chats -->
              <div v-if="isHelperChat && message.job_title" class="offer-job-title">{{ message.job_title }}</div>
              <div class="offer-amount">${{ message.offer_amount }}</div>
              <div v-if="message.offer_status === 'accepted'" class="offer-status">✓ Accepted</div>
              <div v-else-if="message.offer_status === 'countered'" class="offer-status">Countered</div>
              <div v-else-if="message.offer_status === 'cancelled'" class="offer-status">❌ Cancelled</div>
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

            <!-- Show "Cancel Acceptance" button for both parties if offer still accepted and not yet paid -->
            <div v-if="canCancelOffer && !isPaymentCompleted && offerAcceptedInThisChat" class="cancel-action">
              <button @click="confirmCancelOffer(message)" class="cancel-offer-btn" :disabled="isProcessing">
                {{ isPayer ? '🚫 Cancel Acceptance' : '🚫 Withdraw from Job' }}
              </button>
            </div>

            <!-- Show "Proceed to Payment" button ONLY if offer is still accepted, not cancelled, and not paid -->
            <div v-if="shouldShowPaymentButton && message.offer_amount && !isPaymentCompleted && offerAcceptedInThisChat"
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

            <!-- Show "Leave a Review" button - always available to report problematic users -->
            <div class="review-action">
              <button @click="openReviewModal" class="review-btn">
                {{ hasReviewedOtherUser ? '✏️ Edit Your Review' : '⭐ Leave a Review' }}
              </button>
            </div>

            <span class="message-time">{{ formatTime(message.created_at) }}</span>
          </div>

          <div v-else-if="message.message_type === 'offer_cancelled'" class="message-bubble cancelled-bubble">
            <div class="cancelled-icon">🚫</div>
            <p class="cancelled-text">{{ message.message }}</p>
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
          {{ isHelperChat ? 'Offer Job' : 'Make Offer' }}
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
  </div>

  <!-- ✅ ALL MODALS MOVED OUTSIDE chat-page -->
  
  <!-- Make Offer Modal -->
  <div v-if="showMakeOfferModal" class="modal-overlay" @click="closeMakeOfferModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">Make an Offer</h2>
        <button @click="closeMakeOfferModal" class="close-btn">×</button>
      </div>

      <div class="modal-body">
        <!-- Current Asking Price Display - Only for non-helper chats -->
        <div v-if="!isHelperChat" class="current-price-section">
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
            <p class="info-label">{{ isHelperChat ? 'Adventurer Service' : 'Job Title' }}</p>
          </div>
          <p class="info-value">{{ isHelperChat ? otherUser?.username : jobInfo?.title }}</p>
        </div>

        <!-- Adventurer Chat Job Title Input -->
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
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '../supabase/config';
import { useToast } from '../composables/useToast';

const route = useRoute();
const router = useRouter();
const toast = useToast();

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
const offerAcceptedInThisChat = ref(false); // ✅ New state to track accepted offer in this chat
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
    return isHelper.value ? 'Client' : 'Adventurer';
  }
  return jobInfo.value?.title || 'Loading...';
});

// Permissions
const canMakeOffer = computed(() => {
  // Hide "Make Offer" button if the job is globally in-progress/completed OR if an offer has been accepted in this specific chat.
  return !jobCompletedExists.value && !offerAcceptedInThisChat.value;
});

const canAcceptOffer = computed(() => {
  // Anyone who receives an offer can accept it
  return true;
});

const shouldShowPaymentButton = computed(() => isPayer.value);

const canCancelOffer = computed(() => {
  // Either party can cancel (job poster OR helper/job seeker)
  const isParticipant = currentUserId.value && chatInfo.value && (
    (!isHelperChat.value && (
      currentUserId.value === chatInfo.value.job_poster_id || 
      currentUserId.value === chatInfo.value.job_seeker_id
    )) ||
    (isHelperChat.value && (
      currentUserId.value === chatInfo.value.client_id || 
      currentUserId.value === chatInfo.value.helper_id
    ))
  );
  
  // Must have an accepted offer
  const hasAcceptedOffer = offerAcceptedInThisChat.value === true;
  
  // Cannot cancel after payment
  const notPaid = !isPaymentCompleted.value;
  
  return isParticipant && hasAcceptedOffer && notPaid;
});

const canSubmitOffer = computed(() => {
  if (!offerAmount.value || offerAmount.value <= 0) return false;
  if (isHelperChat.value && !selectedJobId.value) return false; // Updated: check if a job is selected
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
  // New: load job listings for adventurer chats
  if (isHelperChat.value) {
    await loadUserJobListings();
  }
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
    offerAcceptedInThisChat.value = chat.offer_accepted === true; // ✅ Initialize based on chat data
    
    // --- MODIFICATION START ---
    // Set payment status based on the individual chat record
    isPaymentCompleted.value = chat.payment_status === 'paid';
    // --- MODIFICATION END ---
    
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
    // --- MODIFICATION START ---
    // This function now only checks the JOB status for UI logic like 'canMakeOffer'
    // Payment status is now handled in loadChatData from the chat record itself.
    if (isHelperChat.value) {
      const { data, error } = await supabase
        .from('helper_jobs')
        .select('id, status')
        .eq('helper_chat_id', route.params.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') console.error('Error checking helper job status:', error);
      jobCompletedExists.value = !!data && (data.status === 'completed' || data.status === 'in-progress');
    } else {
      if (!chatInfo.value?.job_id) return;
      const { data, error } = await supabase
        .from('User-Job-Request')
        .select('status')
        .eq('id', chatInfo.value.job_id)
        .single();

      if (error) console.error('Error checking job status:', error);
      jobCompletedExists.value = data?.status === 'in-progress' || data?.status === 'completed';
    }
    // --- MODIFICATION END ---
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
const userJobListings = ref([]); // New: store user's job listings
const selectedJobId = ref(null); // New: track selected job

// New: Load user's job listings for adventurer chats
const loadUserJobListings = async () => {
  try {
    const { data, error } = await supabase
      .from('User-Job-Request')
      .select('id, title, payment, status')
      .eq('user_id', currentUserId.value)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) throw error;
    userJobListings.value = data || [];
  } catch (error) {
    console.error('Error loading job listings:', error);
    userJobListings.value = [];
  }
};

const openMakeOfferModal = () => {
  offerAmount.value = '';
  offerMessage.value = '';
  offerJobTitle.value = '';
  selectedJobId.value = null; // New: reset selected job
  showMakeOfferModal.value = true;
};

const closeMakeOfferModal = () => {
  showMakeOfferModal.value = false;
  offerAmount.value = '';
  offerMessage.value = '';
  offerJobTitle.value = '';
};

// New: Handle job selection
const onJobSelect = () => {
  const selectedJob = userJobListings.value.find(job => job.id === selectedJobId.value);
  if (selectedJob) {
    offerJobTitle.value = selectedJob.title;
    offerAmount.value = selectedJob.payment;
  } else {
    offerJobTitle.value = '';
    offerAmount.value = '';
  }
};

// New: Handle job selection from cards
const selectJob = (jobId) => {
  selectedJobId.value = jobId;
  onJobSelect();
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

    // Add job_title for helper chats
    if (isHelperChat.value && offerJobTitle.value) {
      offerData.job_title = offerJobTitle.value;
    }

    const { data: offerMsg, error: offerError } = await supabase
      .from(messagesTable.value)
      .insert([offerData])
      .select()
      .single();

    if (offerError) throw offerError;

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

    toast.success('Offer sent successfully!', '', 8000);

  } catch (error) {
    console.error('Error sending offer:', error);
    toast.error('Failed to send offer. Please try again.', '', 8000);
  } finally {
    isProcessing.value = false;
  }
};

// Accept Offer Function - UPDATED to handle multiple helpers
const acceptOffer = async (offerMessage) => {
  if (isProcessing.value) return;

  const confirmed = await toast.confirm({
    message: `Accept offer of $${offerMessage.offer_amount}?`,
    title: 'Confirm Offer',
    confirmText: 'Accept',
    cancelText: 'Cancel',
    type: 'info'
  });

  if (!confirmed) {
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

    // --- MODIFICATION START ---
    // ✅ 2. Mark chat as accepted and store the final payment amount
    const { error: chatUpdateError } = await supabase
      .from('chats')
      .update({ 
        offer_accepted: true,
        accepted_at: new Date().toISOString(),
        payment_amount: offerMessage.offer_amount // Store the accepted amount
      })
      .eq('id', chatId);
    if (chatUpdateError) throw chatUpdateError;
    // --- MODIFICATION END ---


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
    
    offerAcceptedInThisChat.value = true; // ✅ Set state to hide "Make Offer" button
    chatInfo.value.payment_amount = offerMessage.offer_amount; // Update local chat info

    await nextTick();
    scrollToBottom();
    await checkJobCompleted();
    await checkIfReviewed();

  } finally {
    isProcessing.value = false;
  }
};

// Cancel Offer Functions
const confirmCancelOffer = async (acceptanceMessage) => {
  const isJobPoster = !isHelperChat.value && currentUserId.value === chatInfo.value?.job_poster_id;
  const confirmMessage = isJobPoster 
    ? 'Are you sure you want to cancel this accepted offer?\nThe adventurer will be notified and this position will become available again.'
    : 'Are you sure you want to withdraw from this job?\nThe job poster will be notified and this position will become available again.';
  
  const confirmed = await toast.confirm({
    message: confirmMessage,
    title: isJobPoster ? 'Cancel Offer' : 'Withdraw from Job',
    confirmText: isJobPoster ? 'Cancel Offer' : 'Withdraw',
    cancelText: 'Go Back',
    type: 'danger'
  });

  if (!confirmed) {
    return;
  }

  cancelOffer(acceptanceMessage);
};

const cancelOffer = async (acceptanceMessage) => {
  if (isProcessing.value) return;
  
  try {
    isProcessing.value = true;
    const chatId = route.params.id;
    
    console.log('=== CANCELLING ACCEPTED OFFER ===');
    console.log('Acceptance message:', acceptanceMessage);

    // 1. Find the original offer message that was accepted
    const originalOfferMessage = messages.value.find(m =>
      (m.message_type === 'offer' || m.message_type === 'counter_offer') &&
      m.offer_status === 'accepted' &&
      m.offer_amount === acceptanceMessage.offer_amount
    );

    if (originalOfferMessage) {
      // 2. Update offer message status to 'cancelled'
      const { error: updateError } = await supabase
        .from(messagesTable.value)
        .update({ offer_status: 'cancelled' })
        .eq('id', originalOfferMessage.id);
      
      if (updateError) throw updateError;
      console.log('Offer message marked as cancelled');
    }

    // 3. Reset chat status - FIXED: Use proper table name without .value for non-computed
    const tableName = isHelperChat.value ? 'helper_chats' : 'chats';
    const { error: chatUpdateError } = await supabase
      .from(tableName)
      .update({ 
        offer_accepted: false,
        accepted_at: null,
        payment_amount: null
        // Note: cancelled_at column doesn't exist in database, tracked via message instead
      })
      .eq('id', chatId);
    
    if (chatUpdateError) {
      console.error('Chat update error:', chatUpdateError);
      throw chatUpdateError;
    }
    console.log('Chat status reset');

    // 4. Get job details to update positions (only for non-helper chats)
    if (!isHelperChat.value && chatInfo.value?.job_id) {
      const { data: jobData, error: jobFetchError } = await supabase
        .from('User-Job-Request')
        .select('multiple_positions, positions_available, positions_filled, status')
        .eq('id', chatInfo.value.job_id)
        .single();
      
      if (jobFetchError) throw jobFetchError;

      // 5. Update job status and positions
      const requiresMultipleHelpers = jobData?.multiple_positions || false;
      const positionsFilled = jobData?.positions_filled || 0;

      if (requiresMultipleHelpers && positionsFilled > 0) {
        // Decrement positions_filled
        const newPositionsFilled = Math.max(0, positionsFilled - 1);
        
        console.log(`Updating positions: ${positionsFilled} -> ${newPositionsFilled}`);
        
        const { error: jobUpdateError } = await supabase
          .from('User-Job-Request')
          .update({ 
            status: 'open',
            positions_filled: newPositionsFilled
          })
          .eq('id', chatInfo.value.job_id);
        
        if (jobUpdateError) throw jobUpdateError;
      } else {
        // Single helper job - just revert status
        const { error: jobUpdateError } = await supabase
          .from('User-Job-Request')
          .update({ status: 'open' })
          .eq('id', chatInfo.value.job_id);
        
        if (jobUpdateError) throw jobUpdateError;
      }
      
      console.log('Job status reverted to open');
    }

    // 6. Send cancellation message
    const isJobPoster = !isHelperChat.value && currentUserId.value === chatInfo.value?.job_poster_id;
    const cancellationText = isJobPoster
      ? `Offer acceptance has been cancelled by job poster.\nThis position is now available again.`
      : `Adventurer has withdrawn from this job.\nThis position is now available again.`;
    
    const { data: cancelMsg, error: msgError } = await supabase
      .from(messagesTable.value)
      .insert([{
        [chatIdColumn.value]: chatId,
        sender_id: currentUserId.value,
        message: cancellationText,
        message_type: 'offer_cancelled',
        read: false
      }])
      .select()
      .single();
    
    if (msgError) {
      console.error('Message insert error:', msgError);
      throw msgError;
    }

    // 7. Update chat's last message - FIXED: Use proper table name
    await supabase
      .from(tableName)
      .update({
        last_message: cancellationText,
        last_message_time: new Date().toISOString()
      })
      .eq('id', chatId);

    // 8. Update local state
    if (originalOfferMessage) {
      const msgIndex = messages.value.findIndex(m => m.id === originalOfferMessage.id);
      if (msgIndex !== -1) {
        messages.value[msgIndex].offer_status = 'cancelled';
      }
    }
    
    if (cancelMsg) {
      messages.value.push(cancelMsg);
    }
    
    offerAcceptedInThisChat.value = false;
    if (chatInfo.value) {
      chatInfo.value.payment_amount = null;
    }

    await nextTick();
    scrollToBottom();
    await checkJobCompleted();

    const isJobPosterSuccess = !isHelperChat.value && currentUserId.value === chatInfo.value?.job_poster_id;
    const successMessage = isJobPosterSuccess
      ? 'Offer acceptance cancelled successfully. The position is now available again.'
      : 'You have successfully withdrawn from this job. The position is now available again.';
    
    toast.success(successMessage, 'Offer Cancelled', 5000);

  } catch (error) {
    console.error('Error cancelling offer:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    const errorMessage = error.message || 'Failed to cancel offer. Please try again.';
    toast.error(`Failed to cancel: ${errorMessage}`, 'Error', 5000);
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
      ? offerMessages[offerMessages.length - 1].message.split(' for ')[1] || 'Adventurer Service'
      : 'Adventurer Service';
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

    toast.success('Counter offer sent successfully!', '', 8000);

  } catch (error) {
    console.error('Error sending counter offer:', error);
    toast.error('Failed to send counter offer. Please try again.', '', 8000);
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
        
        // Reload chat data if a system message about payment comes in,
        // or if an offer is accepted, to get the latest payment_status.
        if (payload.new.message_type === 'system' && payload.new.message.includes('Payment')) {
          await loadChatData();
        }
        if (payload.new.message_type === 'offer_accepted') {
          await loadChatData();
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
      toast.error('Unable to determine who to review.', '', 8000);
      isProcessing.value = false;
      return;
    }

const { data, error } = await supabase
      .from('reviews')
      .update({
        rating: reviewRating.value,
        comment: reviewComment.value.trim(),
        job_title: isHelperChat.value ? 'Adventurer Service' : jobInfo.value?.title,
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
          job_title: isHelperChat.value ? 'Adventurer Service' : jobInfo.value?.title
        }])
        .select();
      
      if (insertError) throw insertError;
    }

    if (error) {
      console.error('Error submitting review:', error);
      toast.error(error.message || 'Failed to submit review. Please try again.', 'Review Error', 8000);
      return;
    }

    closeReviewModal();
    hasReviewedOtherUser.value = true;
    toast.success('Review submitted successfully!', 'Thank You!', 8000);

  } catch (error) {
    console.error('Error in submitReview:', error);
    toast.error(error.message || 'Failed to submit review. Please try again.', 'Review Error', 8000);
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

// New function to handle navigation for both job details and helper profiles
const navigateToProfile = () => {
  if (isHelperChat.value && otherUserId.value) {
    // For helper chats, navigate to the helper's profile
    router.push(`/helper/${otherUserId.value}`);
  } else if (!isHelperChat.value && chatInfo.value?.job_id) {
    // For job chats, navigate to job details
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
  padding-top: 92px; /* Navbar height: logo (60px) + padding (1rem top + 1rem bottom = 32px) = 92px */
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
  top: 92px; /* Position it right below the main navbar (92px) */
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
  font-size: 1.5rem;
  font-weight: 400;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.header-text {
  flex: 1;
  min-width: 0;
}

.user-name {
  margin: 0;
  font-size: 1.4625rem; /* 1.95rem * 0.75 */
  font-weight: 400;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.job-title {
  margin: 0;
  font-size: 0.8625rem; /* 1.15rem * 0.75 */
  font-weight: 300;
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
  padding-right: 2rem;
  font-size: 1.5rem;     /* 1.3rem * 1.15 - increased */
  font-weight: 150;      /* 200 / 1.33 - decreased */
}

.message-time {
  font-size: 0.85rem;    /* 0.75rem * 1.13 - increased */
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

.offer-bubble.offer-cancelled {
  background: #fef2f2;
  border-color: #fca5a5;
  opacity: 0.7;
  position: relative;
}

.own-message .offer-bubble.offer-cancelled {
  background: #dc2626;
  border-color: #b91c1c;
  color: white;
  opacity: 0.7;
}

.offer-bubble.offer-cancelled::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 10%;
  right: 10%;
  height: 2px;
  background: #dc2626;
  transform: translateY(-50%);
}

.own-message .offer-bubble.offer-cancelled::after {
  background: white;
}

.offer-content {
  margin-bottom: 0.5rem;
}

.offer-type {
  font-size: 0.9375rem; /* 1.25rem * 0.75 */
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.1rem;
  color: #6b7280;
}

.own-message .offer-type {
  color: rgba(255, 255, 255, 0.8);
}

.offer-job-title {
  font-size: 0.975rem; /* 1.3rem * 0.75 */
  font-weight: 400;
  color: #1e40af;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.own-message .offer-job-title {
  color: white;
}

.offer-amount {
  font-size: 1.6875rem; /* 2.25rem * 0.75 */
  font-weight: 400;
  color: #1e40af;
  margin-bottom: 0.75rem;
}

.own-message .offer-amount {
  color: white;
}

.offer-status {
  font-size: 0.7125rem; /* 0.95rem * 0.75 */
  font-weight: 400;
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
  font-size: 0.7875rem; /* 1.05rem * 0.75 */
  font-weight: 400;
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
  font-weight: 400;
  font-size: 0.825rem; /* 1.1rem * 0.75 */
  color: #5b21b6;
  padding-right: 3rem;
}

.own-message .completion-text {
  color: white;
}

.cancelled-bubble {
  background: #fef2f2;
  border: 2px solid #fca5a5;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.own-message .cancelled-bubble {
  background: #dc2626;
  border-color: #b91c1c;
  color: white;
}

.cancelled-icon {
  font-size: 1.875rem; /* 2.5rem * 0.75 */
  margin-bottom: 0.5rem;
}

.cancelled-text {
  margin: 0 0 0.5rem 0;
  font-weight: 400;
  font-size: 0.825rem; /* 1.1rem * 0.75 */
  color: #991b1b;
  line-height: 1.5;
  white-space: pre-line;
}

.own-message .cancelled-text {
  color: white;
}

.cancel-action {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #10b981;
}

.own-message .cancel-action {
  border-top-color: rgba(255, 255, 255, 0.3);
}

.cancel-offer-btn {
  width: 100%;
  padding: 0.75rem 1.25rem;
  background: white;
  color: #dc2626;
  border: 2px solid #fecaca;
  border-radius: 0.5rem;
  font-size: 0.7875rem; /* 1.05rem * 0.75 */
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-offer-btn:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #fca5a5;
  transform: translateY(-1px);
}

.cancel-offer-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  font-size: 0.7875rem; /* 1.05rem * 0.75 */
  font-weight: 400;
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
  padding: 0.875rem 0.85rem;
  border: 2px solid #e5e7eb;
  border-radius: 1.5rem;
  font-size: 0.9rem; /* 1.2rem * 0.75 */
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
  border-radius: 1.25rem;
  background: #10b981;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 0.975rem; /* 1.3rem * 0.75 */
  font-weight: 300;
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
  max-height: 68vh;
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
  font-size: 1.125rem; /* 1.5rem * 0.75 */
  font-weight: 700;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem; /* 2rem * 0.75 */
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
  font-size: 0.65625rem; /* 0.875rem * 0.75 */
  color: #6b7280;
  margin: 0 0 0.25rem 0;
  font-weight: 500;
}

.info-value {
  font-size: 0.9375rem; /* 1.25rem * 0.75 */
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  font-size: 0.65625rem; /* 0.875rem * 0.75 */
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.offer-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.75rem; /* 1rem * 0.75 */
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
  font-size: 0.65625rem; /* 0.875rem * 0.75 */
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
  font-size: 0.75rem; /* 1rem * 0.75 */
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
  box-shadow:  0 4px 6px rgba(37, 99, 235, 0.2);
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
  font-size: 0.9375rem; /* 1.25rem * 0.75 */
  font-weight: bold;
  flex-shrink: 0;
}

.confirmed-text {
  margin: 0;
  font-weight: 600;
  color: #065f46;
  font-size: 0.675rem; /* 0.9rem * 0.75 */
}

.own-message .confirmed-text {
  color: white;
}

@media (max-width: 768px) {
  .message-bubble {
    max-width: 85%;
  }
  .modal-content {
    margin: 1rem;
    max-height: 55vh !important; /* I limited the height so it doesnt get blocked by navbar on small screen*/
}


  .offer-bubble {
    max-width: 90%;
  }

  .offer-btn {
    padding: 0.625rem 1rem;
    font-size: 0.6375rem; /* 0.85rem * 0.75 */
  }

  .offer-amount {
    font-size: 1.125rem; /* 1.5rem * 0.75 */
  }

  /* Adjust chat positioning for mobile navbar height */
  .chat-page {
    padding-top: 180px !important; /* Increased to account for actual mobile navbar height */
  }

  .chat-header {
    top: 180px !important; /* Position chat header right below mobile navbar */
  }
}

@media (max-width: 480px) {
  /* Very small screens where navbar wraps */
  .chat-page {
    padding-top: 200px !important; /* Account for wrapped navbar content on very small screens */
  }

  .chat-header {
    top: 200px !important; /* Position chat header below wrapped navbar */
  }
}

/* Job Cards Styling */
.job-cards-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
  padding: 0.25rem;
}

.job-card {
  position: relative;
  padding: 1rem;
  padding-left: 3rem; /* Add left padding to make room for the checkmark */
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.job-card:hover {
  border-color: #2563eb;
  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.1);
  transform: translateY(-2px);
}

.job-card.selected {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

.job-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.job-card-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  flex: 1;
  line-height: 1.4;
}

.job-card.selected .job-card-title {
  color: #1e40af;
}

.job-card-price {
  font-size: 1.125rem;
  font-weight: 700;
  color: #2563eb;
  white-space: nowrap;
}

.job-card-check {
  position: absolute;
  top: 50%;
  left: 0.75rem; /* Position on the left side */
  transform: translateY(-50%); /* Center vertically */
  width: 24px;
  height: 24px;
  background: #2563eb;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: bold;
}

.no-jobs-message {
  text-align: center;
  padding: 2rem 1rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  border: 2px dashed #e5e7eb;
}

.no-jobs-text {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.create-job-link {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.2s;
}

.create-job-link:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}
</style>