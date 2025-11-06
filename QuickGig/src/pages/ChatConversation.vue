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

          <!-- Job Info - Only for non-helper chats -->
          <div v-if="!isHelperChat" class="job-info-box">
            <div class="job-info-header">
              <p class="info-label">Job Title</p>
            </div>
            <p class="info-value">{{ jobInfo?.title }}</p>
          </div>

          <!-- NEW: Job Selection for Helper Chats -->
          <div v-if="isHelperChat" class="form-group">
            <label class="form-label">Select Job to Offer *</label>
            
            <!-- Show job cards if available -->
            <div v-if="userJobListings.length > 0" class="job-cards-container">
              <div
                v-for="job in userJobListings"
                :key="job.id"
                @click="selectJob(job.id)"
                :class="['job-card', { selected: selectedJobId === job.id }]"
              >
                <div v-if="selectedJobId === job.id" class="job-card-check">✓</div>
                <div class="job-card-header">
                  <h3 class="job-card-title">{{ job.title }}</h3>
                  <span class="job-card-price">${{ job.payment }}</span>
                </div>
              </div>
            </div>

            <!-- Show message if no jobs available -->
            <div v-else class="no-jobs-message">
              <p class="no-jobs-text">You don't have any open jobs to offer.</p>
              <router-link to="/request" class="create-job-link">Create a Job</router-link>            </div>
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
import { ref, onMounted, onUnmounted, nextTick, computed, onActivated } from 'vue';
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
const offerAcceptedInThisChat = ref(false);
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
  // For helper chats, only the CLIENT can offer jobs to the adventurer
  if (isHelperChat.value) {
    return isPayer.value; // Only client (payer) can offer jobs
  }
  
  // For regular job chats, hide "Make Offer" if job is completed or offer already accepted
  return !jobCompletedExists.value && !offerAcceptedInThisChat.value;
});

const canAcceptOffer = computed(() => {
  return true;
});

const shouldShowPaymentButton = computed(() => isPayer.value);

const canCancelOffer = computed(() => {
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
  
  const hasAcceptedOffer = offerAcceptedInThisChat.value === true;
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

// compute helper id for reviews
const reviewHelperId = computed(() => {
  if (isHelper.value) return currentUserId.value;
  return otherUserId.value;
});

// Check if the current user already reviewed the other user
const checkIfReviewed = async () => {
  try {
    if (!currentUserId.value || !otherUserId.value) {
      hasReviewedOtherUser.value = false;
      return;
    }
    
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
  // New: load job listings for helper chats
  if (isHelperChat.value) {
    await loadUserJobListings();
  }
  scrollToBottom();
  subscribeToMessages();
});

// Add this new function after the existing onMounted
onActivated(async () => {
  // Reload chat data when component becomes active again
  await loadChatData();
  await checkJobCompleted();
});

// Add this to detect when user returns from payment page
const handleVisibilityChange = async () => {
  if (!document.hidden) {
    // Page became visible again - reload chat data
    console.log('Page visible - reloading chat data');
    await loadChatData();
    await checkJobCompleted();
  }
};

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
    
    // For helper chats, check helper_jobs table instead of chat.offer_accepted
    if (isHelperChat.value) {
      // Get the MOST RECENT helper_job for this chat that's PENDING payment
      const { data: helperJobs, error: hjError } = await supabase
        .from('helper_jobs')
        .select('id, status, payment_status, created_at')
        .eq('helper_chat_id', chatId)
        .in('status', ['accepted', 'in-progress'])
        .eq('payment_status', 'pending') // ✅ ONLY look for pending payments
        .order('created_at', { ascending: false })
        .limit(1);
      
      console.log('📊 Pending helper jobs found:', helperJobs);
      
      if (!hjError && helperJobs && helperJobs.length > 0) {
        const latestJob = helperJobs[0];
        console.log('📌 Latest job payment_status:', latestJob.payment_status);
        offerAcceptedInThisChat.value = true;
        isPaymentCompleted.value = false; // It's pending, so not completed
      } else {
        // Check if there's a PAID job (for after payment)
        const { data: paidJobs, error: paidError } = await supabase
          .from('helper_jobs')
          .select('id, status, payment_status')
          .eq('helper_chat_id', chatId)
          .eq('payment_status', 'paid')
          .order('created_at', { ascending: false})
          .limit(1);
        
        if (!paidError && paidJobs && paidJobs.length > 0) {
          offerAcceptedInThisChat.value = true;
          isPaymentCompleted.value = true;
        } else {
          offerAcceptedInThisChat.value = false;
          isPaymentCompleted.value = false;
        }
      }
    } else {
      // For regular job chats, use the old logic
      offerAcceptedInThisChat.value = chat.offer_accepted === true;
      isPaymentCompleted.value = chat.payment_status === 'paid';
    }

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
      }
    }

  } catch (error) {
    console.error('Error loading chat data:', error);
    router.push('/chats');
  }
};

// check job status/completion
const checkJobCompleted = async () => {
  try {
    if (isHelperChat.value) {
      const { data, error } = await supabase
        .from('helper_jobs')
        .select('id, status')
        .eq('helper_chat_id', route.params.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') console.error('Error checking helper job status:', error);
      // Only mark as completed if status is actually 'completed', not 'accepted'
      jobCompletedExists.value = !!data && data.status === 'completed';
    } else {
      if (!chatInfo.value?.job_id) return;
      const { data, error } = await supabase
        .from('User-Job-Request')
        .select('status')
        .eq('id', chatInfo.value.job_id)
        .single();

      if (error) console.error('Error checking job status:', error);
      // Keep 'in-progress' here as it means offer is accepted and work has started
      jobCompletedExists.value = data?.status === 'completed';
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
const userJobListings = ref([]); // New: store user's job listings
const selectedJobId = ref(null); // New: track selected job

// New: Load user's job listings for helper chats
const loadUserJobListings = async () => {
  try {
    const chatId = route.params.id;
    
    // First, get all the user's open jobs
    const { data: allJobs, error: jobsError } = await supabase
      .from('User-Job-Request')
      .select('id, title, payment, status, multiple_positions, positions_available, positions_filled')
      .eq('user_id', currentUserId.value)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (jobsError) throw jobsError;

    if (!allJobs || allJobs.length === 0) {
      userJobListings.value = [];
      return;
    }

    // Get all job IDs to check for accepted offers
    const jobIds = allJobs.map(job => job.id);

    // ✅ NEW: Check if this specific helper has already accepted a job in THIS chat
    const { data: thisHelperJobs, error: thisHelperError } = await supabase
      .from('helper_jobs')
      .select('job_id')
      .eq('helper_chat_id', chatId)
      .in('status', ['accepted', 'in-progress', 'completed']);

    if (thisHelperError) throw thisHelperError;

    // Create a Set of job IDs already accepted by THIS helper in THIS chat
    const jobsAcceptedInThisChat = new Set(
      (thisHelperJobs || []).map(job => job.job_id)
    );

    console.log('🔍 Jobs already accepted in this chat:', Array.from(jobsAcceptedInThisChat));

    // Check BOTH regular chats AND helper chats for accepted offers (for multi-position jobs)
    const [regularChatsResult, helperJobsResult] = await Promise.all([
      // Check regular chats
      supabase
        .from('chats')
        .select('job_id')
        .in('job_id', jobIds)
        .eq('offer_accepted', true),
      
      // Check ALL helper_jobs (for multi-position tracking)
      supabase
        .from('helper_jobs')
        .select('job_id')
        .in('job_id', jobIds)
        .in('status', ['accepted', 'in-progress', 'completed'])
    ]);

    if (regularChatsResult.error) throw regularChatsResult.error;
    if (helperJobsResult.error) throw helperJobsResult.error;

    // Combine both sources of accepted job IDs
    const jobsWithAcceptedOffers = new Set([
      ...(regularChatsResult.data || []).map(chat => chat.job_id),
      ...(helperJobsResult.data || []).map(job => job.job_id)
    ]);

    // Filter out jobs based on their type and accepted offer status
    const availableJobs = allJobs.filter(job => {
      // ✅ CRITICAL: Always exclude jobs already accepted in THIS chat
      if (jobsAcceptedInThisChat.has(job.id)) {
        console.log(`❌ Excluding job "${job.title}" - already accepted by this helper in this chat`);
        return false;
      }

      // If job already has an accepted offer (from other helpers/chats)
      if (jobsWithAcceptedOffers.has(job.id)) {
        // For single-helper jobs, exclude them completely
        if (!job.multiple_positions) {
          console.log(`❌ Excluding single-position job "${job.title}" - already accepted elsewhere`);
          return false;
        }
        
        // For multi-helper jobs, check if all positions are filled
        const positionsFilled = job.positions_filled || 0;
        const positionsAvailable = job.positions_available || 1;
        
        // Exclude if all positions are filled
        if (positionsFilled >= positionsAvailable) {
          console.log(`❌ Excluding multi-position job "${job.title}" - all positions filled (${positionsFilled}/${positionsAvailable})`);
          return false;
        }
        
        console.log(`✅ Including multi-position job "${job.title}" - positions available (${positionsFilled}/${positionsAvailable})`);
      }
      
      // Include the job if it passes all filters
      console.log(`✅ Including job "${job.title}" - available`);
      return true;
    });

    console.log(`📊 Found ${availableJobs.length} available jobs out of ${allJobs.length} total jobs`);
    userJobListings.value = availableJobs;
    
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

    // Check if there's a pending offer from the other user
    const pendingOfferFromOther = messages.value.find(
      m => m.message_type === 'offer' && 
           m.offer_status === 'pending' && 
           m.sender_id !== currentUserId.value
    );

    // If there's a pending offer, mark it as countered
    if (pendingOfferFromOther) {
      const { error: updateError } = await supabase
        .from(messagesTable.value)
        .update({ offer_status: 'countered' })
        .eq('id', pendingOfferFromOther.id);

      if (updateError) throw updateError;

      const msgIndex = messages.value.findIndex(m => m.id === pendingOfferFromOther.id);
      if (msgIndex !== -1) {
        messages.value[msgIndex].offer_status = 'countered';
      }
    }

    const offerText = isHelperChat.value
      ? `Offer: $${offerAmount.value} for ${offerJobTitle.value}`
      : `Offer: $${offerAmount.value}`;

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

// Accept Offer Function
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

    // 1. Update the offer message status
    const { error: updateError } = await supabase
      .from(messagesTable.value)
      .update({ offer_status: 'accepted' })
      .eq('id', offerMessage.id);
    if (updateError) throw updateError;

    // 2. Mark chat as accepted and handle job updates

    if (isHelperChat.value) {
      // ✅ Cancel ALL old helper_jobs for this chat FIRST
      const { error: cancelOldJobsError } = await supabase
        .from('helper_jobs')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('helper_chat_id', chatId)
        .neq('payment_status', 'paid');

      if (cancelOldJobsError) {
        console.error('❌ Error cancelling old helper jobs:', cancelOldJobsError);
      } else {
        console.log('✅ Cancelled all old helper jobs before creating new one');
      }

      // ✅ FIX: Get job_title from offer message OR find it from ANY previous offer
      let jobTitle = offerMessage.job_title;
      
      if (!jobTitle) {
        console.log('⚠️ Counter offer has no job_title, searching all messages...');
        // Find ANY offer or counter_offer that has job_title (search backwards from newest)
        const offersWithTitle = messages.value
          .filter(m => 
            (m.message_type === 'offer' || m.message_type === 'counter_offer') && 
            m.job_title
          )
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        if (offersWithTitle.length > 0) {
          jobTitle = offersWithTitle[0].job_title;
          console.log('✅ Found job_title from previous offer:', jobTitle);
        }
      }
      
      if (jobTitle) {
        // Find the job ID
        const { data: jobData, error: jobFetchError } = await supabase
          .from('User-Job-Request')
          .select('id, multiple_positions, positions_available, positions_filled')
          .eq('user_id', chatInfo.value.client_id)
          .eq('title', jobTitle)
          .in('status', ['open', 'in-progress'])
          .single();
        
        if (jobFetchError || !jobData) {
          console.error('❌ Could not find job:', jobFetchError);
          throw new Error(`Could not find job with title "${jobTitle}"`);
        }

        console.log('📌 Creating helper_jobs record for chat:', chatId, 'job:', jobData.id);

        // Create NEW helper_jobs entry
        const { data: newHelperJob, error: helperJobError } = await supabase
          .from('helper_jobs')
          .insert([{
            helper_chat_id: chatId,
            job_id: jobData.id,
            helper_id: chatInfo.value.helper_id,
            client_id: chatInfo.value.client_id,
            status: 'accepted',
            payment_amount: offerMessage.offer_amount,
            agreed_amount: offerMessage.offer_amount,
            job_title: jobTitle,
            payment_status: 'pending',
            accepted_at: new Date().toISOString()
          }])
          .select();
        
        if (helperJobError) {
          console.error('❌ Failed to create helper_jobs:', helperJobError);
          throw helperJobError;
        }
        
        if (!newHelperJob || newHelperJob.length === 0) {
          console.error('❌ Helper job was not created - no data returned');
          throw new Error('Failed to create helper job record');
        }
        
        console.log('✅ Successfully created helper_jobs:', newHelperJob[0]);

        // Update job status
        const requiresMultipleHelpers = jobData.multiple_positions || false;
        const positionsAvailable = jobData.positions_available || 1;
        const positionsFilled = jobData.positions_filled || 0;

        if (requiresMultipleHelpers) {
          const newPositionsFilled = positionsFilled + 1;

          if (newPositionsFilled >= positionsAvailable) {
            await supabase
              .from('User-Job-Request')
              .update({ 
                status: 'in-progress',
                positions_filled: newPositionsFilled
              })
              .eq('id', jobData.id);
          } else {
            await supabase
              .from('User-Job-Request')
              .update({ 
                positions_filled: newPositionsFilled
              })
              .eq('id', jobData.id);
          }
        } else {
          await supabase
            .from('User-Job-Request')
            .update({ 
              status: 'in-progress',
              positions_filled: 1
            })
            .eq('id', jobData.id);
        }
      } else {
        console.error('❌ No job_title found - cannot create helper_jobs');
        throw new Error('Cannot find job title for this offer');
      }
    } else {
      // Regular job chat logic (unchanged)
      const { error } = await supabase
        .from('chats')
        .update({ 
          offer_accepted: true,
          accepted_at: new Date().toISOString(),
          payment_amount: parseFloat(offerMessage.offer_amount)
        })
        .eq('id', chatId);
      if (error) throw error;

      // Handle job status updates for regular job chats
      if (chatInfo.value?.job_id) {
        const { data: jobData, error: jobFetchError } = await supabase
          .from('User-Job-Request')
          .select('multiple_positions, positions_available, positions_filled')
          .eq('id', chatInfo.value.job_id)
          .single();
        
        if (jobFetchError) throw jobFetchError;

        const requiresMultipleHelpers = jobData?.multiple_positions || false;
        const positionsAvailable = jobData?.positions_available || 1;
        const positionsFilled = jobData?.positions_filled || 0;

        if (requiresMultipleHelpers) {
          const newPositionsFilled = positionsFilled + 1;

          if (newPositionsFilled >= positionsAvailable) {
            const { error: jobUpdateError } = await supabase
              .from('User-Job-Request')
              .update({ 
                status: 'in-progress',
                positions_filled: newPositionsFilled
              })
              .eq('id', chatInfo.value.job_id);
            if (jobUpdateError) throw jobUpdateError;
          } else {
            const { error: jobUpdateError } = await supabase
              .from('User-Job-Request')
              .update({ 
                positions_filled: newPositionsFilled
              })
              .eq('id', chatInfo.value.job_id);
            if (jobUpdateError) throw jobUpdateError;
          }
        } else {
          const { error: jobUpdateError } = await supabase
            .from('User-Job-Request')
            .update({ status: 'in-progress' })
            .eq('id', chatInfo.value.job_id);
          if (jobUpdateError) throw jobUpdateError;
        }
      }
    }

    // 3. Send acceptance message
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

    // 4. Update chat's last message
    await supabase
      .from(chatTable.value)
      .update({
        last_message: acceptanceText,
        last_message_time: new Date().toISOString()
      })
      .eq('id', chatId);

    // 5. Update local state
    const msgIndex = messages.value.findIndex(m => m.id === offerMessage.id);
    if (msgIndex !== -1) {
      messages.value[msgIndex].offer_status = 'accepted';
    }
    if (acceptanceMsg) {
      messages.value.push(acceptanceMsg);
    }
    
    // Reload chat data to refresh acceptance status
    await loadChatData();

    await nextTick();
    scrollToBottom();
    await checkJobCompleted();
    await checkIfReviewed();

    toast.success('Offer accepted successfully!', '', 5000);

  } catch (error) {
    console.error('Error accepting offer:', error);
    toast.error('Failed to accept offer. Please try again.', '', 5000);
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

    // 1. Find the original offer message
    const originalOfferMessage = messages.value.find(m =>
      (m.message_type === 'offer' || m.message_type === 'counter_offer') &&
      m.offer_status === 'accepted' &&
      m.offer_amount === acceptanceMessage.offer_amount
    );

    if (originalOfferMessage) {
      const { error: updateError } = await supabase
        .from(messagesTable.value)
        .update({ offer_status: 'cancelled' })
        .eq('id', originalOfferMessage.id);
      
      if (updateError) throw updateError;
    }

    // Reset chat status
        
    // ...existing code...
    if (isHelperChat.value) {
      // For helper chats, update helper_jobs entry
      const { error: helperJobError } = await supabase
        .from('helper_jobs')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('helper_chat_id', chatId)
        .eq('status', 'accepted');

      if (helperJobError) throw helperJobError;

      // ✅ FIX: Get the job_id from the ACCEPTED helper_job ONLY
      const { data: helperJobData, error: helperJobFetchError } = await supabase
        .from('helper_jobs')
        .select('job_id')
        .eq('helper_chat_id', chatId)
        .eq('status', 'cancelled') // ← We JUST set it to 'cancelled' above
        .order('cancelled_at', { ascending: false }) // ← Get the most recently cancelled one
        .limit(1)
        .single(); // ← Now safe to use .single() because we're limiting to 1

      if (helperJobFetchError) {
        console.error('Error fetching helper job:', helperJobFetchError);
        throw helperJobFetchError;
      }

      if (!helperJobData || !helperJobData.job_id) {
        console.error('No helper job data found for chat:', chatId);
        throw new Error('Could not find job associated with this chat');
      }

      console.log('📌 Found job_id:', helperJobData.job_id);


      const { data: jobData, error: jobFetchError } = await supabase
        .from('User-Job-Request')
        .select('multiple_positions, positions_filled, status')
        .eq('id', helperJobData.job_id)
        .single();
      
      if (jobFetchError) {
        console.error('Error fetching job data:', jobFetchError);
        throw jobFetchError;
      }

      if (!jobData) {
        console.error('No job data found for job_id:', helperJobData.job_id);
        throw new Error('Could not find job details');
      }

      console.log('📌 Current job status:', jobData.status, 'positions_filled:', jobData.positions_filled); // Debug log

      const positionsFilled = jobData.positions_filled || 0;
      const newPositionsFilled = Math.max(0, positionsFilled - 1);
      
      console.log('📌 Updating job to status: open, positions_filled:', newPositionsFilled); // Debug log

      const { error: jobUpdateError } = await supabase
        .from('User-Job-Request')
        .update({ 
          status: 'open',
          positions_filled: newPositionsFilled
        })
        .eq('id', helperJobData.job_id);
      
      if (jobUpdateError) {
        console.error('Error updating job:', jobUpdateError);
        throw jobUpdateError;
      }

      console.log('✅ Job updated successfully'); // Debug log
    }

    // 3. Send cancellation message
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
    
    if (msgError) throw msgError;

    // 4. Update chat's last message
    await supabase
      .from(chatTable.value)
      .update({
        last_message: cancellationText,
        last_message_time: new Date().toISOString()
      })
      .eq('id', chatId);

    // 5. Update local state
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

    const successMessage = isJobPoster
      ? 'Offer acceptance cancelled successfully. The position is now available again.'
      : 'You have successfully withdrawn from this job. The position is now available again.';
    
    toast.success(successMessage, 'Offer Cancelled', 5000);

  } catch (error) {
    console.error('Error cancelling offer:', error);
    toast.error('Failed to cancel offer. Please try again.', 'Error', 5000);
  } finally {
    isProcessing.value = false;
  }
};

// Proceed to Payment Function
const proceedToPayment = (acceptanceMessage) => {
  let jobTitle = '';
  if (isHelperChat.value) {
    const offerMessages = messages.value.filter(m =>
      (m.message_type === 'offer' || m.message_type === 'counter_offer') &&
      m.job_title
    );
    jobTitle = offerMessages.length > 0 
      ? offerMessages[offerMessages.length - 1].job_title 
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

    // 1. Update original offer status
    const { error: updateError } = await supabase
      .from(messagesTable.value)
      .update({ offer_status: 'countered' })
      .eq('id', selectedOffer.value.id);

    if (updateError) throw updateError;

    // 2. ✅ Cancel any existing helper_jobs records when countering
    if (isHelperChat.value) {
      const { error: cancelJobError } = await supabase
        .from('helper_jobs')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('helper_chat_id', chatId)
        .in('status', ['accepted', 'in-progress'])
        .neq('payment_status', 'paid'); // Don't cancel if already paid

      if (cancelJobError) {
        console.error('Error cancelling old helper job:', cancelJobError);
      } else {
        console.log('✅ Old helper job cancelled due to counter offer');
      }
    }

    // 3. ✅ FIX: Preserve job_title from original offer if this is a helper chat
    let jobTitle = null;
    if (isHelperChat.value) {
      // Find the job_title from the original offer or any previous offer
      const originalOffer = messages.value
        .filter(m => 
          (m.message_type === 'offer' || m.message_type === 'counter_offer') && 
          m.job_title
        )
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      
      if (originalOffer) {
        jobTitle = originalOffer.job_title;
        console.log('✅ Preserving job_title in counter offer:', jobTitle);
      }
    }

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

    // ✅ Add job_title to counter offer if found
    if (jobTitle) {
      counterData.job_title = jobTitle;
    }

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

// Subscribe to realtime messages
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
    .subscribe();
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

// Review modal functions
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
      toast.error(error.message || 'Failed to submit review.', 'Review Error', 8000);
      return;
    }

    closeReviewModal();
    hasReviewedOtherUser.value = true;
    toast.success('Review submitted successfully!', 'Thank You!', 8000);

  } catch (error) {
    console.error('Error in submitReview:', error);
    toast.error(error.message || 'Failed to submit review.', 'Review Error', 8000);
  } finally {
    isProcessing.value = false;
  }
};

const navigateToProfile = () => {
  if (isHelperChat.value && otherUserId.value) {
    router.push(`/helper/${otherUserId.value}`);
  } else if (!isHelperChat.value && chatInfo.value?.job_id) {
    router.push(`/job/${chatInfo.value.job_id}`);
  }
};


</script>

  <style scoped>
  .chat-page {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    max-height: 100dvh;
    padding-top: 92px; /* Navbar height for desktop: 60px logo + 32px padding */
    box-sizing: border-box;
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
    flex-shrink: 0;
    position: fixed;
    top: 92px; /* Position it right below the navbar for desktop */
    left: 0;
    width: 100%;
    z-index: 20;
    box-sizing: border-box;
  }

    /* Match navbar breakpoint at 1240px */
  @media (max-width: 1240px) {
    .chat-page {
      padding-top: 82px; /* Navbar: 50px logo + 32px padding = 82px */
    }

    .chat-header {
      top: 82px; /* Match the reduced navbar height */
    }
  }

  @media (max-width: 768px) {
    .message-bubble {
      max-width: 85%;
    }
    .modal-content {
      margin: 1rem;
      max-height: 75vh !important;
    }

    .offer-bubble {
      max-width: 90%;
    }

    .offer-btn {
      padding: 0.625rem 1rem;
      font-size: 0.6375rem;
    }

    .offer-amount {
      font-size: 1.125rem;
    }

    /* Adjust chat positioning for mobile navbar height */
    .chat-page {
      padding-top: 67px; /* Mobile navbar: 35px logo + 32px padding = 67px */
    }

    .chat-header {
      top: 67px; /* Match the mobile navbar height exactly */
    }

    .messages-container {
      padding-top: calc(1.5rem + 80px);
    }
  }

  @media (max-width: 480px) {
    .chat-page {
      padding-top: 67px; /* Same as 768px breakpoint */
    }

    .chat-header {
      top: 67px; /* Same as 768px breakpoint */
    }

    .messages-container {
      padding-top: calc(1.5rem + 80px);
    }
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    background: #f9fafb;
    min-height: 0;
    padding: 1.5rem;
    padding-top: calc(1.5rem + 80px);
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
    font-weight: 300;
    color: #065f46;
    padding-right: 3rem;
    font-size: 1.05rem;
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
    padding: 0.75rem  1.25rem;
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
    border-radius:  1.25rem;
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
    max-height: 85vh; /* Increased from 68vh */
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

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding:  1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-title {
    margin: 0;
    font-size: 1.5rem; /* Increased from 1.125rem */
    font-weight: 400; /* Decreased from 700 */
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

  .current-price-section {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    border: 1px solid #e5e7eb;
  }

  .price-label-row {
    margin-bottom: 0.5rem;
  }

  .price-label-text {
    font-size: 1rem; /* Increased */
    font-weight: 300; /* Decreased */
    color: #6b7280;
  }

  .current-price-display {
    font-size: 2rem; /* Increased */
    font-weight: 400; /* Decreased */
    color: #111827;
    margin-bottom: 0.5rem;
  }

  .price-subtext {
    font-size: 0.875rem; /* Increased */
    font-weight: 300; /* Decreased */
    color: #6b7280;
    margin: 0;
  }

  .current-offer-info,
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

  .info-label {
    font-size: 1rem; /* Increased from 0.65625rem */
    color: #6b7280;
    margin: 0 0 0.25rem 0;
    font-weight: 300; /* Decreased from 500 */
  }

  .info-value {
    font-size: 1.5rem; /* Increased from 0.9375rem */
    font-weight: 400; /* Decreased from 700 */
    color: #111827;
    margin: 0;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-label {
    display: block;
    font-size: 1rem; /* Increased from 0.65625rem */
    font-weight: 400; /* Decreased from 600 */
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
    font-size: 1.25rem; /* Increased */
    font-weight: 300; /* Decreased */
    color: #6b7280;
    pointer-events: none;
  }

  .offer-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 1.125rem; /* Increased from 0.75rem */
    font-weight: 300; /* Added */
    transition: all 0.2s;
    box-sizing: border-box;
  }

  .offer-amount-input {
    padding-left: 2rem;
  }

  .offer-textarea {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 1rem; /* Increased from 0.65625rem */
    font-weight: 300; /* Added */
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

  .price-difference {
    margin-top: 0.5rem;
    font-size: 0.9375rem; /* Increased */
    font-weight: 300; /* Added */
  }

  .difference-lower {
    color: #dc2626;
  }

  .difference-higher {
    color: #059669;
  }

  .difference-equal {
    color: #6b7280;
  }

  .cancel-btn,
  .submit-btn {
    flex: 1;
    padding: 0.875rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 1.125rem; /* Increased from 0.75rem */
    font-weight: 400; /* Decreased from 600 */
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

  .review-action {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #8b5cf6;
  }

  .own-message .review-action {
    border-top-color: rgba(255, 255, 255, 0.3);
  }

  .review-btn {
    width: 100%;
    padding: 0.5rem 1rem;
    background: #8b5cf6;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 300;
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
    font-size: 1.5rem; /* 2rem * 0.75 */
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

  @media (max-width: 768px) {
    .message-bubble {
      max-width: 85%;
    }
    .modal-content {
      margin: 1rem;
      max-height: 75vh !important;
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
      padding-top: 67px; /* Mobile navbar: 35px logo + 32px padding = 67px */
    }

    .chat-header {
      top: 67px; /* Match the mobile navbar height exactly */
    }

    .messages-container {
      padding-top: calc(1.5rem + 80px);
    }
  }

  @media (max-width: 480px) {
    .chat-page {
      padding-top: 67px; /* Same as 768px breakpoint */
    }

    .chat-header {
      top: 67px; /* Same as 768px breakpoint */
    }

    .messages-container {
      padding-top: calc(1.5rem + 80px);
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
  padding-left: 3rem;
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
  font-size: 1.125rem; /* Increased from 0.875rem */
  font-weight: 400; /* Decreased from 600 */
  color: #111827;
  flex: 1;
  line-height: 1.4;
}

.job-card.selected .job-card-title {
  color: #1e40af;
}

.job-card-price {
  font-size: 1.5rem; /* Increased from 1.125rem */
  font-weight: 500; /* Decreased from 700 */
  color: #2563eb;
  white-space: nowrap;
}

.job-card-check {
  position: absolute;
  top: 50%;
  left: 0.75rem;
  transform: translateY(-50%);
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
  font-size: 1rem; /* Increased from 0.875rem */
  font-weight: 300; /* Added */
  color: #6b7280;
}

.create-job-link {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  font-size: 1rem; /* Increased from 0.875rem */
  font-weight: 400; /* Decreased from 600 */
  transition: all 0.2s;
}

.create-job-link:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}
</style>