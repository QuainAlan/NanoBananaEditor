import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Nano Banana Image Editor',
    version: '1.0.0',
  },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const { price_id, success_url, cancel_url, mode } = await req.json();

    // Validate required parameters
    if (!price_id || !success_url || !cancel_url || !mode) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate mode parameter
    if (!['payment', 'subscription'].includes(mode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid mode. Must be "payment" or "subscription"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create Supabase client with user's JWT token
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Get user from JWT token
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: userError?.message || 'User not found'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user has confirmed email
    if (!user.email_confirmed_at) {
      return new Response(
        JSON.stringify({ error: 'Email not confirmed' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Look for existing Stripe customer using admin client
    const { data: existingCustomer, error: customerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (customerError) {
      console.error('Database error fetching customer:', customerError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let customerId: string;

    if (existingCustomer?.customer_id) {
      // Use existing customer
      customerId = existingCustomer.customer_id;
      console.log(`Using existing Stripe customer ${customerId} for user ${user.id}`);
    } else {
      // Create new Stripe customer
      try {
        const newCustomer = await stripe.customers.create({
          email: user.email!,
          metadata: {
            userId: user.id,
          },
        });

        customerId = newCustomer.id;
        console.log(`Created new Stripe customer ${customerId} for user ${user.id}`);

        // Save customer mapping to database using admin client
        const { error: insertError } = await supabaseAdmin
          .from('stripe_customers')
          .insert({
            user_id: user.id,
            customer_id: customerId,
          });

        if (insertError) {
          console.error('Failed to save customer mapping:', insertError);
          // Clean up Stripe customer if database insert fails
          try {
            await stripe.customers.del(customerId);
          } catch (cleanupError) {
            console.error('Failed to cleanup Stripe customer:', cleanupError);
          }
          
          return new Response(
            JSON.stringify({ error: 'Failed to create customer record' }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Create subscription record if needed
        if (mode === 'subscription') {
          const { error: subscriptionError } = await supabaseAdmin
            .from('stripe_subscriptions')
            .insert({
              customer_id: customerId,
              status: 'not_started',
            });

          if (subscriptionError) {
            console.error('Failed to create subscription record:', subscriptionError);
            // Note: We don't fail here as the customer is already created
          }
        }
      } catch (stripeError: any) {
        console.error('Stripe customer creation error:', stripeError);
        return new Response(
          JSON.stringify({ error: 'Failed to create Stripe customer' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Create Stripe checkout session
    try {
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: price_id,
            quantity: 1,
          },
        ],
        mode: mode as 'payment' | 'subscription',
        allow_promotion_codes: true,
        success_url: success_url,
        cancel_url: cancel_url,
        metadata: {
          userId: user.id,
        },
      };

      const session = await stripe.checkout.sessions.create(sessionConfig);

      console.log(`Created checkout session ${session.id} for customer ${customerId}`);

      return new Response(
        JSON.stringify({ 
          sessionId: session.id, 
          url: session.url 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (stripeError: any) {
      console.error('Stripe session creation error:', stripeError);
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout session' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});