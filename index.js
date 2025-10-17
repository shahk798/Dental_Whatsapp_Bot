const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { handleMessage } = require('./chatLogic');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Map of clinics (phone_number_id => clinic info)
const clinics = {
    [process.env.PHONE_NUMBER_ID]: {
        clinic_name: "Shai Dental Studio",
        clinic_id: 1,
        contact: "+911234567890",
        phone_number_id: process.env.PHONE_NUMBER_ID
    },
    // 👉 You can add more clinics like this:
    // [process.env.PHONE_NUMBER_ID_2]: {
    //     clinic_name: "Smile Care Dental",
    //     clinic_id: 2,
    //     contact: "+911112223334",
    //     phone_number_id: process.env.PHONE_NUMBER_ID_2
    // }
};

// ✅ Webhook verification
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

// ✅ Webhook to receive messages
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
            for (const change of entry.changes) {
                const value = change.value;
                const messages = value.messages;

                if (messages) {
                    for (const message of messages) {
                        const from = message.from; // user number
                        const msgBody = message.text?.body || '';
                        const phoneNumberId = value.metadata.phone_number_id;

                        const clinicConfig = clinics[phoneNumberId];
                        if (!clinicConfig) return;

                        await handleMessage(clinicConfig, from, msgBody);
                    }
                }
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
