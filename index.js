// Initialize Sentry early via instrument.js (which exports initialized Sentry)
const Sentry = require("./instrument");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const { handleMessage } = require("./chatLogic");
require("dotenv").config();

const app = express();

// Your middlewares
app.use(bodyParser.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Clinics map
const clinics = {
  [process.env.PHONE_NUMBER_ID]: {
    clinic_name: "Shai Dental Studio",
    clinic_id: 1,
    contact: "+911234567890",
    phone_number_id: process.env.PHONE_NUMBER_ID,
  },
};

// Webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      console.log("🔹 Webhook verified!");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Webhook to receive messages
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        const value = change.value;
        const messages = value.messages;

        if (messages) {
          for (const message of messages) {
            const from = message.from;
            const msgBody = message.text?.body || "";
            const phoneNumberId = value.metadata.phone_number_id;

            const clinicConfig = clinics[phoneNumberId];
            if (!clinicConfig) {
              console.log("❌ No clinic config found for phone_number_id:", phoneNumberId);
              continue;
            }

            console.log(`📩 Message from ${from}: "${msgBody}"`);

            try {
              await handleMessage(clinicConfig, from, msgBody);
            } catch (error) {
              Sentry.withScope((scope) => {
                scope.setExtra("clinic_name", clinicConfig.clinic_name);
                scope.setExtra("clinic_contact", clinicConfig.contact);
                scope.setExtra("from_number", from);
                scope.setExtra("message_body", msgBody);
                Sentry.captureException(error);
              });
              console.error("❌ Error handling message:", error);
            }
          }
        }
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Use Sentry error handling middleware (v8+)
Sentry.setupExpressErrorHandler(app);

// Optional fallback error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).send("Internal Server Error");
});


// Health check endpoint for UptimeRobot
app.get('/health', (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "Bot is running! ✅",
        activePatientSessions: Object.keys(patientSessions).length
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
