const express = require('express');
const dotenv = require('dotenv');
const stripe = require('stripe');
const bodyParser = require('body-parser');
const cors = require('cors');

dotenv.config();

const app = express();
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY); // Use test secret key

app.use(cors());

// Use body-parser for JSON, but not for the webhook endpoint
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/webhook')) {
      req.rawBody = buf.toString();
    }
  }
}));

// Endpoint to create a PaymentIntent
app.post('/create-payment-intent', async (req, res) => {
  const { amount } = req.body;
  try {
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount,
      currency: 'inr',
      payment_method_types: ['card'],
    });
    res.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating PaymentIntent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to create a customer and subscription
app.post('/create-subscription', async (req, res) => {
  const { email, paymentMethodId, planId } = req.body;
  try {
    console.log(`Creating subscription for email: ${email}, paymentMethodId: ${paymentMethodId}, planId: ${planId}`);

    // Create a new customer
    const customer = await stripeClient.customers.create({
      email,
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    console.log(`Customer created: ${customer.id}`);

    // Create a subscription
    const subscription = await stripeClient.subscriptions.create({
      customer: customer.id,
      items: [{ price: planId }], // Use the planId here
      expand: ['latest_invoice.payment_intent'],
    });

    console.log('Subscription created successfully:', subscription.id);
    res.json(subscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    console.error('Stripe Error:', error.raw ? error.raw.message : error.message); // Log Stripe error details
    res.status(500).json({ error: error.raw ? error.raw.message : error.message });
  }
});

// Endpoint to retrieve PaymentMethodId from PaymentIntent
app.post('/retrieve-payment-method-id', async (req, res) => {
  const { paymentIntentId } = req.body;
  try {
    const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
    const paymentMethodId = paymentIntent.payment_method;
    res.json({ paymentMethodId });
  } catch (error) {
    console.error('Error retrieving PaymentMethodId:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint to handle Stripe events
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    // Construct the event using the raw body and the Stripe signature
    event = stripeClient.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET_TEST);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      // Handle successful payment here
      console.log(`Invoice payment succeeded: ${invoice.id}`);
      break;
    case 'invoice.payment_failed':
      const invoiceFailed = event.data.object;
      // Handle failed payment here
      console.log(`Invoice payment failed: ${invoiceFailed.id}`);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).end();
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
