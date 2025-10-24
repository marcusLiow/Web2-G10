<template>
  <div class="payment-page">
    <div class="container">
      <!-- Debug Info (remove in production) -->
      <div v-if="showDebug" class="debug-card">
        <h3>Debug Info</h3>
        <p>Job ID: {{ jobId }}</p>
        <p>Amount: ${{ amount }}</p>
        <p>Job Title: {{ jobTitle }}</p>
        <p>Chat ID: {{ chatId }}</p>
        <p>Stripe Key Loaded: {{ !!stripe }}</p>
        <p>Client Secret: {{ clientSecret ? 'Loaded' : 'Not loaded' }}</p>
      </div>

      <div class="summary-card">
        <h2>Order Summary</h2>
        <p>Job: {{ jobTitle || 'Loading...' }}</p>
        <p class="total-amount">Total: ${{ totalAmount.toFixed(2) }}</p>
      </div>

      <div class="payment-card">
        <div v-if="!clientSecret && !paymentError" class="loading-state">
          <div class="spinner"></div>
          <p>Loading payment form...</p>
        </div>

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

        <div v-if="paymentError && !clientSecret" class="error-message">
          {{ paymentError }}
          <button @click="retryPayment" class="retry-button">Retry</button>
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
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../supabase/config';

const route = useRoute();
const router = useRouter();

// --- State ---
const stripe = ref(null);
const elements = ref(null);
const clientSecret = ref('');
const paymentError = ref('');
const isProcessing = ref(false);
const paymentSuccessful = ref(false);
const showDebug = ref(true); // Set to false in production

// --- Data from Route ---
const jobId = ref(route.params.jobId);
const amount = ref(Number(route.query.amount) || 0);
const jobTitle = ref(route.query.jobTitle || 'Service Payment');
const chatId = ref(route.query.chatId);

// --- Calculated Values ---
const totalAmount = computed(() => amount.value);

// --- Lifecycle Hook ---
onMounted(async () => {
  await initializePayment();
});

const initializePayment = async () => {
  try {
    console.log('🔄 Initializing payment...');
    console.log('Amount:', totalAmount.value);
    console.log('Job ID:', jobId.value);

    // 1. Validate amount
    if (!totalAmount.value || totalAmount.value <= 0) {
      throw new Error('Invalid payment amount');
    }

    // 2. Load Stripe.js
    const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    console.log('Stripe key exists:', !!stripePublicKey);
    
    if (!stripePublicKey) {
      throw new Error("Stripe publishable key is not configured. Please add VITE_STRIPE_PUBLISHABLE_KEY to your .env file");
    }

    stripe.value = await loadStripe(stripePublicKey);
    console.log('✅ Stripe loaded');

    // 3. Create Payment Intent
    console.log('🔄 Creating payment intent...');
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        amount: totalAmount.value,
        description: `Payment for Job ID: ${jobId.value} - ${jobTitle.value}`,
      },
    });

    console.log('Payment Intent Response:', { data, error });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message || 'Failed to create payment intent');
    }

    if (!data?.clientSecret) {
      console.error('No client secret in response:', data);
      throw new Error('No client secret received from server');
    }

    clientSecret.value = data.clientSecret;
    console.log('✅ Client secret received');

    // 4. Create and mount Payment Element
    await mountPaymentElement();

  } catch (err) {
    console.error("❌ Payment initialization error:", err);
    paymentError.value = err.message || "Could not initialize payment. Please try again.";
  }
};

const mountPaymentElement = async () => {
  try {
    if (!stripe.value || !clientSecret.value) {
      throw new Error('Stripe or client secret not ready');
    }

    console.log('🔄 Mounting payment element...');
    
    elements.value = stripe.value.elements({ 
      clientSecret: clientSecret.value,
      appearance: {
        theme: 'stripe',
      }
    });
    
    const paymentElement = elements.value.create('payment');
    
    // Wait for the element to be ready
    paymentElement.on('ready', () => {
      console.log('✅ Payment element ready');
    });

    paymentElement.on('change', (event) => {
      if (event.error) {
        console.error('Payment element error:', event.error);
      }
    });

    // Wait for Vue to update the DOM
    await nextTick();
    
    // Extra safety: check if element exists
    const mountPoint = document.getElementById('payment-element');
    if (!mountPoint) {
      throw new Error('Payment element container not found in DOM');
    }

    paymentElement.mount('#payment-element');
    console.log('✅ Payment element mounted');
    
  } catch (err) {
    console.error("❌ Error mounting payment element:", err);
    paymentError.value = "Could not load payment form. Please refresh the page.";
  }
};

const handleSubmit = async () => {
  if (!stripe.value || !elements.value || isProcessing.value) {
    console.warn('Submit blocked - not ready');
    return;
  }

  console.log('🔄 Processing payment...');
  isProcessing.value = true;
  paymentError.value = '';

  try {
    const { error, paymentIntent } = await stripe.value.confirmPayment({
      elements: elements.value,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?jobId=${jobId.value}&chatId=${chatId.value}&amount=${totalAmount.value}`,
      },
      redirect: 'if_required',
    });

    if (error) {
      console.error('❌ Payment error:', error);
      paymentError.value = error.message;
      isProcessing.value = false;
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      console.log('✅ Payment succeeded!');
      paymentSuccessful.value = true;
      
      // Redirect after short delay with proper status
      setTimeout(() => {
        router.push({
          path: '/payment-success',
          query: {
            jobId: jobId.value,
            chatId: chatId.value,
            amount: totalAmount.value,
            payment_intent: paymentIntent.id,
            redirect_status: 'succeeded', // Add this!
          }
        });
      }, 1500);
    } else {
      console.log('Payment intent status:', paymentIntent?.status);
      isProcessing.value = false;
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    paymentError.value = 'An unexpected error occurred. Please try again.';
    isProcessing.value = false;
  }
};

const retryPayment = () => {
  paymentError.value = '';
  clientSecret.value = '';
  initializePayment();
};
</script>

<style scoped>
.payment-page {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 2rem 1rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.container {
  max-width: 500px;
  width: 100%;
}

.debug-card {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.debug-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.debug-card p {
  margin: 0.25rem 0;
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
  color: #2563eb;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  text-align: center;
  color: #6b7280;
}

.stripe-element {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
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

.retry-button {
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.retry-button:hover {
  background: #1d4ed8;
}

.success-card {
  text-align: center;
  color: #059669;
}

.success-card h2 {
  color: #059669;
}
</style>