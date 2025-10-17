const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { handleMessage } = require('./chatLogic');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Webhook verification endpoint
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
            console.log('🔹 Webhook verified!');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// Webhook to receive messages
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        body.entry.forEach(async (entry) => {
            entry.changes.forEach(async (change) => {
                const value = change.value;
                const messages = value.messages;

                if (messages) {
                    messages.forEach(async (message) => {
                        const from = message.from; // WhatsApp user number
                        const msgBody = message.text?.body || '';
                        const phoneNumberId = value.metadata.phone_number_id;

                        // Clinic config from environment variables
                        const clinicConfig = {
                            clinic_name: process.env.CLINIC_NAME,
                            clinic_id: parseInt(process.env.CLINIC_ID),
                            contact: process.env.CLINIC_CONTACT,
                            phone_number_id: process.env.PHONE_NUMBER_ID
                        };

                        // Only handle messages for this clinic's phone number
                        if (phoneNumberId === clinicConfig.phone_number_id) {
                            await handleMessage(clinicConfig, from, msgBody);
                        }
                    });
                }
            });
        });

        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
