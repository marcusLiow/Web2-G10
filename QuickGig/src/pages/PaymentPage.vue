<template>
  <div class="payment-page">
    <div class="container">
      <div class="summary-card">
        <h2>Order Summary</h2>
        <p>Job: {{ jobTitle || 'Loading...' }}</p>
        <p class="total-amount">Total: ${{ totalAmount.toFixed(2) }}</p>
      </div>

      <div class="payment-card">
        <div v-if="clientSecret">
          <form @submit.prevent="handleSubmit">
            <div id="payment-element" class="stripe-element"></div>

            <button type="submit" :disabled="!stripe || isProcessing" class="pay-button">
              {{ isProcessing ? 'Processing...' : `Pay $${totalAmount.toFixed(2)}` }}
            </button>

            <div v-if="paymentError" class="error-message">
              {{ paymentError }}
            </div>
          </form>
        </div>
        </div>

      <div v-if="paymentSuccessful" class="success-card">
        <h2>✅ Payment Successful!</h2>
        <p>Your payment is confirmed. Redirecting...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../supabase/config'; // Adjust path if needed

const route = useRoute();
const router = useRouter();

// --- State ---
const stripe = ref(null);
const elements = ref(null);
const clientSecret = ref('');
const paymentError = ref('');
const isProcessing = ref(false);
const paymentSuccessful = ref(false);

// --- Data from Route (passed during navigation) ---
const jobId = ref(route.params.jobId); // Assuming you pass jobId in the route params
const amount = ref(Number(route.query.amount) || 0); // Amount from query param
const jobTitle = ref(route.query.jobTitle || 'Service Payment'); // Job title from query param
const chatId = ref(route.query.chatId); // Chat ID to return to

// --- Calculated Values ---
// You might add service fees here if needed
const totalAmount = computed(() => amount.value); // For now, just the base amount

// --- Lifecycle Hook ---
onMounted(async () => {
  // 1. Load Stripe.js with your publishable key
  const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!stripePublicKey) {
    paymentError.value = "Stripe key is not configured.";
    return;
  }
  stripe.value = await loadStripe(stripePublicKey);

  // 2. Call your backend (Supabase Function) to create a Payment Intent
  try {
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        amount: totalAmount.value,
        description: `Payment for Job ID: ${jobId.value} - ${jobTitle.value}`,
      },
    });

    if (error || !data?.clientSecret) {
      throw new Error(error?.message || 'Failed to get payment client secret.');
    }
    clientSecret.value = data.clientSecret;

    // 3. Create and mount the Stripe Payment Element
    elements.value = stripe.value.elements({ clientSecret: clientSecret.value });
    const paymentElement = elements.value.create('payment');
    paymentElement.mount('#payment-element'); // Mount to the div#payment-element

  } catch (err) {
    console.error("Error initializing payment:", err);
    paymentError.value = "Could not initialize payment form. Please try again.";
  }
});

// --- Methods ---
const handleSubmit = async () => { // Corrected this line
  if (!stripe.value || !elements.value || isProcessing.value) {
    return;
  }
  isProcessing.value = true;
  paymentError.value = '';

  // Use Stripe.js to confirm the payment on the client-side
  const { error } = await stripe.value.confirmPayment({
    elements: elements.value,
    confirmParams: {
      // URL where the customer will be redirected after payment.
      // You'll handle the success status on this page.
      return_url: `${window.location.origin}/payment-success?jobId=${jobId.value}&chatId=${chatId.value}&amount=${totalAmount.value}`,
    },
    // We handle success/failure via the return_url, so redirect immediately
     redirect: 'if_required',
  });

  if (error) {
    // Show error to your customer (e.g., insufficient funds, card declined)
    paymentError.value = error.message;
    isProcessing.value = false;
  } else {
    // This point is typically only reached if redirect: 'if_required' prevents an immediate redirect
    // (e.g., 3D Secure authentication is needed). Stripe handles the redirect in most cases.
    // If you reach here without an error, something might be misconfigured,
    // or you might implement a scenario where you don't redirect immediately.
     console.log("Payment submitted, awaiting redirect or further action...");
     // Potentially show a success message briefly before Stripe redirects.
     // paymentSuccessful.value = true; // Maybe handle success on the return_url page instead
  }
};
</script>

<style scoped>
.payment-page {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 2rem 1rem;
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Align top */
}
.container {
  max-width: 500px;
  width: 100%;
}
.summary-card, .payment-card, .success-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}
h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
}
.total-amount {
  font-size: 1.2rem;
  font-weight: bold;
  margin-top: 0.5rem;
}
.stripe-element {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.pay-button {
  width: 100%;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background-color: #2563eb;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.pay-button:hover:not(:disabled) {
  background-color: #1d4ed8;
}
.pay-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}
.error-message {
  color: #dc2626;
  background-color: #fee2e2;
  padding: 0.75rem;
  border-radius: 8px;
  margin-top: 1rem;
  text-align: center;
  font-size: 0.875rem;
}
.success-card {
  text-align: center;
  color: #059669;
}
.loading-state p {
    text-align: center;
    color: #6b7280;
}
</style>