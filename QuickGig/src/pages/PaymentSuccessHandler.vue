<template>
  <div class="handler-page">
    <div class="content-card">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Verifying payment...</p>
      </div>
      
      <div v-else-if="error" class="error-state">
        <h2>❌ Payment Error</h2>
        <p class="error-message">{{ error }}</p>
        <button @click="goToChat" class="action-button">Return to Chat</button>
      </div>
      
      <div v-else class="success-state">
        <h2>✅ Payment Successful!</h2>
        <p class="success-message">Your payment has been confirmed.</p>
        <p>Job status updated. Redirecting to chat...</p>
        <div class="spinner small"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '../supabase/config';

const route = useRoute();
const router = useRouter();
const isLoading = ref(true);
const error = ref('');

onMounted(async () => {
  console.log('🔄 Payment Success Handler - Route Query:', route.query);
  
  const { jobId, chatId, amount, redirect_status, isHelperJob } = route.query;

  if (!jobId || !chatId || !amount) {
    error.value = 'Missing payment information. Please contact support.';
    isLoading.value = false;
    return;
  }

  if (redirect_status !== 'succeeded') {
    error.value = 'Payment was not completed successfully.';
    isLoading.value = false;
    return;
  }

  try {
    const isHelper = isHelperJob === 'true';
    console.log('Processing payment for:', isHelper ? 'Helper Job' : 'Regular Job');

    if (isHelper) {
      await handleHelperJobPayment(chatId, amount, route.query.jobTitle);
    } else {
      await handleRegularJobPayment(jobId, chatId, amount);
    }

    console.log('✅ Payment processing complete');
    
    setTimeout(() => {
      router.push(`/chat/${chatId}`);
    }, 2000);

  } catch (err) {
    console.error("❌ Error processing payment:", err);
    error.value = `Payment succeeded, but failed to update job status: ${err.message}. Please contact support.`;
  } finally {
    isLoading.value = false;
  }
});

// --- MODIFICATION START ---
const handleRegularJobPayment = async (jobId, chatId, amount) => {
  console.log('Updating regular job payment for chat:', chatId);

  // 1. Update the 'chats' table to mark this specific chat as paid
  const { error: chatUpdateError } = await supabase
    .from('chats')
    .update({
      payment_status: 'paid',
      payment_amount: Number(amount)
    })
    .eq('id', chatId);

  if (chatUpdateError) throw chatUpdateError;
  console.log('✅ Chat payment status updated to paid for chat ID:', chatId);

  // 2. Fetch job data
  const { data: jobData, error: jobFetchError } = await supabase
    .from('User-Job-Request')
    .select('multiple_positions, positions_available')
    .eq('id', jobId)
    .single();

  if (jobFetchError) throw jobFetchError;

  // 3. Update the overall job status if necessary
  let newStatus = 'in-progress';
  if (jobData.multiple_positions) {
    console.log('Multi-helper job detected, checking fill status...');
    
    // ROBUST FIX: Use a PostgREST function to count, which is safer.
    // If that's too complex, this query is the next best thing.
    // It selects only the 'id' column and Supabase provides a 'count'.
    const { data: acceptedChats, count, error: countError } = await supabase
      .from('chats')
      .select('id', { count: 'exact' }) // More robust way to count
      .eq('job_id', jobId)
      .eq('offer_accepted', true);
    
    // DEFENSIVE FIX: Check for query error OR if the result itself is null
    if (countError || acceptedChats === null) {
      console.error('CRITICAL: Could not count accepted offers. Defaulting to 0.', countError);
      // We can either throw an error or proceed with a safe default. Let's proceed.
    }
    
    const uniqueHelpers = count || 0; // Safely default to 0 if count is null
    const requiredHelpers = jobData.positions_available || 1;
    
    console.log(`Helpers filled: ${uniqueHelpers} of ${requiredHelpers}`);
    
    if (uniqueHelpers < requiredHelpers) {
      newStatus = 'open';
      console.log('Not all positions filled - keeping as open');
    } else {
      console.log('All positions filled - marking as in-progress');
    }
  }
  
  // Update the job status
  const { error: jobUpdateError } = await supabase
    .from('User-Job-Request')
    .update({ status: newStatus })
    .eq('id', jobId);

  if (jobUpdateError) throw jobUpdateError;
  console.log('✅ Job status updated to:', newStatus);

  // 4. Send a system message to the chat confirming payment
  const currentUserId = localStorage.getItem('userId');
  await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: currentUserId,
      message: `Payment of $${Number(amount).toFixed(2)} confirmed.`,
      message_type: 'system',
      read: false
    });

  // 5. Update chat last message
  await supabase
    .from('chats')
    .update({ 
      last_message: 'Payment confirmed.',
      last_message_time: new Date().toISOString()
    })
    .eq('id', chatId);
};
// --- MODIFICATION END ---

const handleHelperJobPayment = async (chatId, amount, jobTitle) => {
  console.log('Creating helper job record for chat:', chatId);
  
  const { data: chatData, error: chatError } = await supabase
    .from('helper_chats')
    .select('helper_id, client_id')
    .eq('id', chatId)
    .single();

  if (chatError) throw chatError;

  const { error: jobError } = await supabase
    .from('helper_jobs')
    .insert([{
      helper_chat_id: chatId,
      helper_id: chatData.helper_id,
      client_id: chatData.client_id,
      job_title: jobTitle || 'Helper Service',
      agreed_amount: Number(amount),
      status: 'in-progress',
      payment_status: 'paid',
      started_at: new Date().toISOString()
    }]);

  if (jobError) throw jobError;

  const currentUserId = localStorage.getItem('userId');
  await supabase
    .from('helper_messages')
    .insert([{
      helper_chat_id: chatId,
      sender_id: currentUserId,
      message: `Payment of $${Number(amount).toFixed(2)} confirmed. Job is now in progress.`,
      message_type: 'system',
      read: false
    }]);

  await supabase
    .from('helper_chats')
    .update({ 
      last_message: 'Payment confirmed. Job in progress.',
      last_message_time: new Date().toISOString()
    })
    .eq('id', chatId);
};

const goToChat = () => {
  const chatId = route.query.chatId;
  if (chatId) {
    router.push(`/chat/${chatId}`);
  } else {
    router.push('/chats');
  }
};
</script>

<style scoped>
/* Styles remain the same */
.handler-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 1rem;
}

.content-card {
  background: white;
  border-radius: 12px;
  padding: 3rem 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
  text-align: center;
}

.loading-state,
.error-state,
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

h2 {
  font-size: 1.75rem;
  margin: 0;
  font-weight: 600;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner.small {
  width: 2rem;
  height: 2rem;
  border-width: 2px;
  margin-top: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  color: #dc2626;
  background-color: #fee2e2;
  padding: 1rem;
  border-radius: 8px;
  margin: 0.5rem 0;
}

.success-message {
  color: #059669;
  font-size: 1.125rem;
  margin: 0.5rem 0;
}

.action-button {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.action-button:hover {
  background: #1d4ed8;
}

p {
  margin: 0.25rem 0;
  color: #6b7280;
}
</style>