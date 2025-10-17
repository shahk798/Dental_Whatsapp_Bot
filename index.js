const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { handleMessage } = require('./chatLogic');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// ----------- MongoDB connection -----------
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ----------- Clinics config (phone_number_id => clinic info) -----------
const clinics = {
    [process.env.PHONE_NUMBER_ID]: {
        clinic_name: "Shai Dental Studio",
        clinic_id: 1,
        contact: "+911234567890",
        phone_number_id: process.env.PHONE_NUMBER_ID
    }
};

// ----------- Webhook verification endpoint -----------
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

// ----------- Webhook to receive messages -----------
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        body.entry.forEach(async (entry) => {
            entry.changes.forEach(async (change) => {
                const value = change.value;
                const messages = value.messages;

                if (messages) {
                    for (const message of messages) {
                        const from = message.from; // WhatsApp user number
                        const msgBody = message.text?.body || '';
                        const phoneNumberId = value.metadata.phone_number_id;

                        const clinicConfig = clinics[phoneNumberId];
                        if (!clinicConfig) return; // Ignore messages from unknown clinics

                        // Pass message to chatLogic
                        await handleMessage(clinicConfig, from, msgBody);
                    }
                }
            });
        });

        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// ----------- Start server -----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
