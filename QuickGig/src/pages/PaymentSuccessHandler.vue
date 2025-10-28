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
  
  const { jobId, chatId, amount, payment_intent, redirect_status, isHelperJob } = route.query;

  // Validate required parameters
  if (!jobId || !chatId || !amount) {
    error.value = 'Missing payment information. Please contact support.';
    isLoading.value = false;
    console.error('Missing params:', { jobId, chatId, amount });
    return;
  }

  // Check if Stripe returned success
  if (redirect_status !== 'succeeded') {
    error.value = 'Payment was not completed successfully.';
    isLoading.value = false;
    console.error('Payment not succeeded. Status:', redirect_status);
    return;
  }

  try {
    const isHelper = isHelperJob === 'true';
    console.log('Processing payment for:', isHelper ? 'Helper Job' : 'Regular Job');

    if (isHelper) {
      // Handle helper job payment
      await handleHelperJobPayment(chatId, amount, route.query.jobTitle);
    } else {
      // Handle regular job payment
      await handleRegularJobPayment(jobId, chatId, amount);
    }

    console.log('✅ Payment processing complete');
    
    // Redirect back to chat after success
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

const handleRegularJobPayment = async (jobId, chatId, amount) => {
  console.log('Updating regular job:', jobId);
  
  // ✅ FIXED: Check if this is a multi-helper job before changing status
  const { data: jobData, error: jobFetchError } = await supabase
    .from('User-Job-Request')
    .select('multiple_positions, positions_available')
    .eq('id', jobId)
    .single();
  
  if (jobFetchError) {
    console.error('Error fetching job data:', jobFetchError);
    throw jobFetchError;
  }
  
  let newStatus = 'in-progress';  // Default for single-helper jobs
  
  // ✅ For multi-helper jobs, check if all positions are now filled
  if (jobData.multiple_positions) {
    console.log('Multi-helper job detected, checking fill status...');
    
    // Count how many unique helpers have accepted offers
    const { data: acceptedChats, error: countError } = await supabase
      .from('chats')
      .select('job_seeker_id')
      .eq('job_id', jobId)
      .eq('offer_accepted', true);
    
    if (countError) {
      console.error('Error counting accepted offers:', countError);
      throw countError;
    }
    
    const uniqueHelpers = new Set(acceptedChats?.map(c => c.job_seeker_id) || []).size;
    const requiredHelpers = jobData.positions_available || 1;
    
    console.log(`Helpers filled: ${uniqueHelpers} of ${requiredHelpers}`);
    
    // Only change to 'in-progress' if ALL positions are filled
    if (uniqueHelpers >= requiredHelpers) {
      newStatus = 'in-progress';
      console.log('All positions filled - marking as in-progress');
    } else {
      newStatus = 'open';  // ✅ Keep as 'open' if not all positions filled
      console.log('Not all positions filled - keeping as open');
    }
  }
  
  // Update job status
  const { error: updateError } = await supabase
    .from('User-Job-Request')
    .update({
      status: newStatus,  // ✅ Use calculated status
      paid: true,
      payment_amount: Number(amount)
    })
    .eq('id', jobId);

  if (updateError) throw updateError;

  // Send payment confirmation message
  const currentUserId = localStorage.getItem('userId');
  await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: currentUserId,
      message: `Payment of $${Number(amount).toFixed(2)} confirmed. Job is now in progress.`,
      message_type: 'system',
      read: false
    });

  // Update chat last message
  await supabase
    .from('chats')
    .update({ 
      last_message: 'Payment confirmed. Job in progress.',
      last_message_time: new Date().toISOString()
    })
    .eq('id', chatId);
};

const handleHelperJobPayment = async (chatId, amount, jobTitle) => {
  console.log('Creating helper job record for chat:', chatId);
  
  // Get chat info to extract helper and client IDs
  const { data: chatData, error: chatError } = await supabase
    .from('helper_chats')
    .select('helper_id, client_id')
    .eq('id', chatId)
    .single();

  if (chatError) throw chatError;

  // Create helper_jobs record
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

  // Send payment confirmation message
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

  // Update helper chat last message
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