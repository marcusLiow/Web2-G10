<template>
  <div class="handler-page">
    <div v-if="isLoading">
      <p>Verifying payment...</p>
      </div>
    <div v-else-if="error">
      <p class="error-message">Error: {{ error }}</p>
      <button @click="goToChat">Return to Chat</button>
    </div>
    <div v-else>
      <p class="success-message">Payment Confirmed!</p>
      <p>Updating job status...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '../supabase/config'; // Adjust path

const route = useRoute();
const router = useRouter();
const isLoading = ref(true);
const error = ref('');

onMounted(async () => {
  const { jobId, chatId, amount, payment_intent, payment_intent_client_secret, redirect_status } = route.query;

  // Basic check if Stripe returned success
  if (redirect_status !== 'succeeded') {
    error.value = 'Payment failed or was cancelled.';
    isLoading.value = false;
    return;
  }

  // **IMPORTANT:** In a real application, you would ideally have another
  // Supabase Edge Function here to securely verify the payment_intent status
  // with Stripe using the client_secret or payment_intent ID before updating
  // your database. Directly trusting the redirect_status is less secure.

  // For this example, we'll assume success and update the job
  try {
    const { error: updateError } = await supabase
      .from('User-Job-Request')
      .update({
        status: 'in_progress', // Or whatever status indicates paid/started
        paid: true,           // Assuming you added a 'paid' column
        payment_amount: Number(amount) // Store the paid amount
       })
      .eq('id', jobId);

    if (updateError) throw updateError;

    // Optionally send a system message to the chat confirming payment
    await supabase
        .from('messages')
        .insert({
            chat_id: chatId,
            sender_id: 'system', // Or fetch current user ID if needed
            message: `Payment of $${Number(amount).toFixed(2)} confirmed. Job is now in progress.`,
            message_type: 'system'
        });

    // Update chat last message
     await supabase
        .from('chats')
        .update({ last_message: 'Payment Confirmed. Job in progress.' })
        .eq('id', chatId);


    // Redirect back to chat after a short delay
    setTimeout(() => {
      router.push(`/chat/${chatId}`);
    }, 2000); // 2-second delay

  } catch (err) {
    console.error("Error updating job status:", err);
    error.value = 'Payment succeeded, but failed to update job status. Please contact support.';
  } finally {
    isLoading.value = false;
  }
});

 // Function to manually go back if something goes wrong
 const goToChat = () => {
     const chatId = route.query.chatId;
     if (chatId) {
        router.push(`/chat/${chatId}`);
     } else {
        router.push('/chats'); // Fallback
     }
 };
</script>

<style scoped>
.handler-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  text-align: center;
  font-family: sans-serif;
}
.error-message { color: red; margin-bottom: 1rem; }
.success-message { color: green; }
button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
}
/* Add styles for a spinner */
</style>