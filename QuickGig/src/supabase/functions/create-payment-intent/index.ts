// supabase/functions/create-payment-intent/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@11.1.0' // Use a specific version

// **Important:** Get your Secret Key securely from environment variables
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2022-11-15', // Use a specific API version
  typescript: true,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Replace with your frontend URL in production!
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, description } = await req.json(); // Expect amount and description

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new Error('Invalid amount provided.');
    }

    // Create a Payment Intent on Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Amount in cents
      currency: 'sgd',                  // Change to your currency (e.g., 'usd')
      automatic_payment_methods: { enabled: true },
      description: description || 'Payment for service', // Optional description
    });

    // Return the client secret to the frontend
    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Stripe Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});