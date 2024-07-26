const express = require('express');
const dotenv = require('dotenv');
const stripe = require('stripe');
const bodyParser = require('body-parser');
const cors = require('cors');

dotenv.config();

const app = express();
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY); // Use test secret key

app.use(cors());
app.use(bodyParser.json());

// Endpoint to create a Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  const { email, planId } = req.body;
  try {
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [{
        price: planId,
        quantity: 1,
      }],
      success_url: 'https://your-website.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://your-website.com/cancel',
    });
    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating Checkout Session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint to handle Stripe events
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripeClient.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET_TEST);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Fulfill the purchase...
      console.log(`Checkout session completed: ${session.id}`);
      break;
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
