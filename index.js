const express = require('express');
const dotenv = require('dotenv');
const stripe = require('stripe');
const bodyParser = require('body-parser');
const cors = require('cors');

dotenv.config();

const app = express();
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

app.use(bodyParser.json());
app.use(cors());

// Webhook endpoint to handle Stripe events
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || ''); // Initially empty
  } catch (err) {
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
