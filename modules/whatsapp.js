const axios = require('axios');

const sendMessage = async (to, message) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("❌ Missing WhatsApp credentials in .env");
    console.error("WHATSAPP_TOKEN:", token ? "✅" : "❌ missing");
    console.error("PHONE_NUMBER_ID:", phoneNumberId ? "✅" : "❌ missing");
    return;
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log("✅ Message sent:", response.data);
  } catch (error) {
    console.error("❌ Error sending message:", error.response?.data || error.message);
  }
};

module.exports = { sendMessage };
