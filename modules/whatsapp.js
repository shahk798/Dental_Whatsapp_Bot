// Example WhatsApp sendMessage module
const axios = require('axios');

const sendMessage = async (to, message) => {
    const token = process.env.WHATSAPP_TOKEN; // your WhatsApp API token
    const phoneNumberId = process.env.PHONE_NUMBER_ID;

    try {
        await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: {
                messaging_product: 'whatsapp',
                to,
                text: { body: message }
            }
        });
    } catch (error) {
        console.error('Error sending message:', error.response?.data || error.message);
    }
};

module.exports = { sendMessage };
