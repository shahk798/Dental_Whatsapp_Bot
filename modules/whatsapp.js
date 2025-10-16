const axios = require('axios');
require('dotenv').config();

const sendMessage = async (to, text) => {
    try {
        const token = process.env.WHATSAPP_API_KEY;
        const phone_number_id = process.env.WHATSAPP_PHONE_NUMBER_ID;

        await axios.post(`https://graph.facebook.com/v17.0/${phone_number_id}/messages`, {
            messaging_product: "whatsapp",
            to,
            text: { body: text }
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (err) {
        console.error("❌ WhatsApp send message error:", err.response?.data || err.message);
    }
};

module.exports = { sendMessage };
