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
  
  const { jobId, chatId, amount, payment_intent, redirect_status, isHelperJob, jobTitle } = route.query;

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
    const numericAmount = Number(amount);
    const decodedJobTitle = decodeURIComponent(jobTitle || 'your job');

    console.log('Processing payment for:', isHelper ? 'Helper Job' : 'Regular Job');

    if (isHelper) {
      // Handle helper job payment
      await handleHelperJobPayment(chatId, numericAmount, decodedJobTitle);
    } else {
      // Handle regular job payment
      await handleRegularJobPayment(jobId, chatId, numericAmount, decodedJobTitle);
    }

    console.log('✅ Payment processing complete');
    
    setTimeout(() => {
      // Adjust redirect based on chat type
      const redirectPath = isHelper ? `/helper-chat/${chatId}` : `/chat/${chatId}`;
      router.push(redirectPath);
    }, 2000);

  } catch (err) {
    console.error("❌ Error processing payment:", err);
    error.value = `Payment succeeded, but failed to update job status: ${err.message}. Please contact support.`;
  } finally {
    isLoading.value = false;
  }
});

const handleRegularJobPayment = async (jobId, chatId, amount, jobTitle) => {
  console.log('Updating regular job:', jobId);
  
  // Get job details to check for multi-helper
  const { data: jobData, error: jobFetchError } = await supabase
    .from('User-Job-Request')
    .select('multiple_positions, positions_available, user_id')
    .eq('id', jobId)
    .single();
  
  if (jobFetchError) throw jobFetchError;
  
  let newStatus = 'in-progress';
  if (jobData.multiple_positions) {
    // Count accepted offers to see if job is now full
    const { count, error: countError } = await supabase
      .from('chats')
      .select('id', { count: 'exact' })
      .eq('job_id', jobId)
      .eq('offer_accepted', true);
    
    if (countError) {
      console.error('CRITICAL: Could not count accepted offers. Defaulting to 0.', countError);
    }
    
    const uniqueHelpers = count || 0;
    const requiredHelpers = jobData.positions_available || 1;
    
    console.log(`Helpers filled: ${uniqueHelpers} of ${requiredHelpers}`);
    
    if (uniqueHelpers < requiredHelpers) {
      newStatus = 'open';
      console.log('Not all positions filled - keeping as open');
    } else {
      console.log('All positions filled - marking as in-progress');
    }
  }
  
  // 1. Get the current chat data to find the helper
  const { data: currentChatData, error: currentChatError } = await supabase
    .from('chats')
    .select('job_seeker_id, job_poster_id')
    .eq('id', chatId)
    .single();
  
  if (currentChatError) throw currentChatError;
  
  // 2. Create helper_jobs record for this paid job (so it shows in helper's job history)
  const { error: helperJobError } = await supabase
    .from('helper_jobs')
    .insert({
      helper_id: currentChatData.job_seeker_id,
      client_id: currentChatData.job_poster_id,
      job_title: jobTitle || 'Job',
      agreed_amount: Number(amount),
      status: 'in-progress',
      payment_status: 'paid'
    });
  
  if (helperJobError) {
    console.error('Error creating helper_jobs record:', helperJobError);
  } else {
    console.log('✅ Helper job record created for job history');
  }
  
 
  // 3. Create Earnings record for the helper (status: 'paid' - will be 'completed' when job poster marks job complete)
const platformFee = Number(amount) * 0.10; // 10% platform fee
const netAmount = Number(amount) - platformFee;

const { error: earningsError } = await supabase
  .from('Earnings')
  .insert({
    user_id: currentChatData.job_seeker_id,
    gross_amount: Number(amount),
    platform_fee: platformFee,
    net_amount: netAmount,
    job_title: jobTitle || 'Job',
    job_id: jobId,
    status: 'paid'  // Changed from 'completed' - will be updated when job poster marks job complete
    // Removed payment_date - it doesn't exist in the table
  });

if (earningsError) {
  console.error('Error creating Earnings record:', earningsError);
} else {
  console.log('✅ Earnings record created for helper with status: paid');
}
  
  // 4. Update chat payment status
  const { error: chatPaymentError } = await supabase
    .from('chats')
    .update({ 
      payment_status: 'paid',
      payment_amount: Number(amount)
    })
    .eq('id', chatId);
  if (chatPaymentError) throw chatPaymentError;
  console.log('✅ Chat payment status updated to paid');

  // 5. Update job status
  const { error: updateError } = await supabase
    .from('User-Job-Request')
    .update({ status: newStatus })
    .eq('id', jobId);
  if (updateError) throw updateError;
  console.log('✅ Job status updated to:', newStatus);

  // 6. Send payment confirmation message *to the chat*
  const currentUserId = localStorage.getItem('userId');
  await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: currentUserId,
      message: `Payment of $${amount.toFixed(2)} confirmed. Job is now in progress.`,
      message_type: 'system',
      read: false
    });

  // 7. Update chat last message
  await supabase
    .from('chats')
    .update({ 
      last_message: 'Payment confirmed.',
      last_message_time: new Date().toISOString()
    })
    .eq('id', chatId);

  // 8. Send Navbar Notification to Helper(s)
  const { data: chatData, error: chatError } = await supabase
    .from('chats')
    .select('job_seeker_id')
    .eq('job_id', jobId)
    .eq('offer_accepted', true);

  if (chatError) {
    console.error('Error finding helpers for notification:', chatError);
  } else if (chatData && chatData.length > 0) {
    const helperIds = [...new Set(chatData.map(chat => chat.job_seeker_id))];
    const notifications = helperIds.map(helperId => ({
      user_id: helperId,
      message: `Payment of $${amount.toFixed(2)} has been secured for the job: '${jobTitle}'.`,
      link: `/chats?chatId=${chatId}`
    }));

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);
    
    if (notificationError) {
      console.error('Error sending payment notification:', notificationError);
    } else {
      console.log('Payment notifications sent to helpers:', helperIds);
    }
  }
};

const handleHelperJobPayment = async (chatId, amount, jobTitle) => {
  console.log('Creating helper job record for chat:', chatId);
  
  // 1. Get chat info
  const { data: chatData, error: chatError } = await supabase
    .from('helper_chats')
    .select('helper_id, client_id')
    .eq('id', chatId)
    .single();
  if (chatError) throw chatError;

  // 2. Create helper_jobs record
  const { data: helperJobData, error: jobError } = await supabase
    .from('helper_jobs')
    .insert([{
      helper_chat_id: chatId,
      helper_id: chatData.helper_id,
      client_id: chatData.client_id,
      job_title: jobTitle || 'Helper Service',
      agreed_amount: amount,
      status: 'in-progress',
      payment_status: 'paid'
    }])
    .select('id')
    .single();
  if (jobError) throw jobError;

 
  // 3. Create Earnings record for the helper (status: 'paid' - will be 'completed' when client marks job complete)
const platformFee = Number(amount) * 0.10; // 10% platform fee
const netAmount = Number(amount) - platformFee;

const { error: earningsError } = await supabase
  .from('Earnings')
  .insert({
    user_id: chatData.helper_id,
    gross_amount: Number(amount),
    platform_fee: platformFee,
    net_amount: netAmount,
    job_title: jobTitle || 'Helper Service',
    job_id: helperJobData?.id,  // Reference to helper_jobs record
    status: 'paid'  // Changed from 'completed' - will be updated when client marks job complete
    // Removed payment_date - it doesn't exist in the table
  });

if (earningsError) {
  console.error('Error creating Earnings record:', earningsError);
} else {
  console.log('✅ Earnings record created for helper with status: paid');
}

  // 4. Send payment confirmation message *to the chat*
  const currentUserId = localStorage.getItem('userId');
  await supabase
    .from('helper_messages')
    .insert([{
      helper_chat_id: chatId,
      sender_id: currentUserId,
      message: `Payment of $${amount.toFixed(2)} confirmed. Job is now in progress.`,
      message_type: 'system',
      read: false
    }]);

  // 5. Update helper chat last message
  await supabase
    .from('helper_chats')
    .update({ 
      last_message: 'Payment confirmed. Job in progress.',
      last_message_time: new Date().toISOString()
    })
    .eq('id', chatId);

  // 6. Send Navbar Notification to Helper
  const { error: notificationError } = await supabase
    .from('notifications')
    .insert({
      user_id: chatData.helper_id,
      message: `Payment of $${amount.toFixed(2)} has been secured for: '${jobTitle}'.`,
      link: `/helper-chat/${chatId}`
    });
  
  if (notificationError) {
    console.error('Error sending helper payment notification:', notificationError);
  } else {
    console.log('Payment notification sent to helper:', chatData.helper_id);
  }
};

const goToChat = () => {
  const chatId = route.query.chatId;
  const isHelperJob = route.query.isHelperJob === 'true';
  if (chatId) {
    const path = isHelperJob ? `/helper-chat/${chatId}` : `/chat/${chatId}`;
    router.push(path);
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