require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { handleMessage } = require('./chatLogic');
const clinics = require('./clinics.json');

const app = express();
app.use(bodyParser.json());

// WhatsApp phone number ID from .env
const phoneNumberIdEnv = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.log('❌ MongoDB connection error:', err));

// Verify webhook
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ WEBHOOK VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// WhatsApp webhook endpoint
app.post('/webhook', async (req, res) => {
    try {
        const entry = req.body.entry;
        if (entry && entry.length > 0) {
            const changes = entry[0].changes;
            if (changes && changes.length > 0) {
                const value = changes[0].value;
                const messages = value.messages;
                if (messages && messages.length > 0) {
                    const from = messages[0].from;
                    const text = messages[0].text.body;
                    const phoneNumberIdIncoming = value.metadata.phone_number_id;

                    // Match incoming phone_number_id with .env
                    if (phoneNumberIdIncoming === phoneNumberIdEnv) {
                        const clinicConfig = clinics[0]; // only one clinic in JSON
                        await handleMessage(clinicConfig, from, text);
                    } else {
                        console.log(`⚠️ Unknown clinic for phone_number_id: ${phoneNumberIdIncoming}`);
                    }
                }
            }
        }
        res.sendStatus(200);
    } catch (err) {
        console.error("❌ Webhook error:", err);
        res.sendStatus(500);
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
