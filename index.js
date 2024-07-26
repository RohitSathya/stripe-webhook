const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Replace with your actual secret key
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

app.post('/create-payment-intent', async (req, res) => {
    const { amount } = req.body;

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'inr',
            payment_method_types: ['card'],
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id,
        });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

app.post('/retrieve-payment-method-id', async (req, res) => {
    const { paymentIntentId } = req.body;

    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        const paymentMethodId = paymentIntent.payment_method;

        res.send({
            paymentMethodId: paymentMethodId,
        });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

app.post('/create-subscription', async (req, res) => {
    const { email, paymentMethodId, planId } = req.body;

    try {
        const customer = await stripe.customers.create({
            email: email,
            payment_method: paymentMethodId,
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ plan: planId }],
            expand: ['latest_invoice.payment_intent'],
        });

        res.send(subscription);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
