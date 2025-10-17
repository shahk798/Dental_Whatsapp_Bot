const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { handleMessage } = require('./chatLogic');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Load clinics from environment variables
// Example ENV format: 
// CLINIC_1_PHONE_NUMBER_ID=123456
// CLINIC_1_NAME="Shai Dental Studio"
// CLINIC_1_ID=1
// CLINIC_1_CONTACT="+911234567890"
// CLINIC_2_PHONE_NUMBER_ID=654321
// CLINIC_2_NAME="Smile Care"
// ...
const clinics = {};
Object.keys(process.env).forEach(key => {
    const match = key.match(/^CLINIC_(\d+)_PHONE_NUMBER_ID$/);
    if (match) {
        const idx = match[1];
        clinics[process.env[key]] = {
            clinic_name: process.env[`CLINIC_${idx}_NAME`],
            clinic_id: parseInt(process.env[`CLINIC_${idx}_ID`], 10),
            contact: process.env[`CLINIC_${idx}_CONTACT`],
            phone_number_id: process.env[key]
        };
    }
});

// Webhook verification
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
                        const from = message.from; // user number
                        const msgBody = message.text?.body || '';
                        const phoneNumberId = value.metadata.phone_number_id;

                        const clinicConfig = clinics[phoneNumberId];
                        if (!clinicConfig) return;

                        await handleMessage(clinicConfig, from, msgBody);
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
