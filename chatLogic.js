const { sendMessage } = require('./modules/whatsapp');
const mongoose = require('mongoose');

const patientSessions = {};

// Services list
const servicesList = [
    { name: "Dental Cleaning", price: "₹500", emoji: "🦷" },
    { name: "Teeth Whitening", price: "₹1500", emoji: "✨" },
    { name: "Orthodontics", price: "₹5000", emoji: "😁" },
    { name: "Root Canal", price: "₹3000", emoji: "🪥" },
    { name: "Dental Implants", price: "₹8000", emoji: "🦷💎" },
    { name: "Pediatric Dentistry", price: "₹700", emoji: "👶🦷" },
    { name: "Gum Treatment", price: "₹2000", emoji: "🩸🦷" },
    { name: "Consultation", price: "₹400", emoji: "🩺" },
    { name: "Check-Up", price: "₹2000", emoji: "🦷" }
];

// FAQs list
const faqsList = [
    { question: "What services do you offer?", answer: "We offer Dental Cleaning 🦷, Teeth Whitening ✨, Orthodontics 😁, Root Canal 🪥, Dental Implants 🦷💎, Pediatric Dentistry 👶🦷, and Gum Treatment 🩸🦷." },
    { question: "Do you accept insurance?", answer: "✅ Yes, we accept major insurance providers. Please contact the clinic staff for details." },
    { question: "How can I cancel an appointment?", answer: "📞 You can cancel your appointment by calling our staff at the clinic contact." },
    { question: "What are your working hours?", answer: "⏰ Mon-Sat: 9:00 AM - 6:00 PM\nSun: Closed" },
    { question: "Where is the clinic located?", answer: "📍 123 Smile Street, Dental City, India" }
];

// Dynamic MongoDB model per clinic
const getAppointmentModel = (clinicName) => {
    const collectionName = `appointments_${clinicName.replace(/\s+/g, '_').toLowerCase()}`;
    if (mongoose.models[collectionName]) return mongoose.models[collectionName];

    const schema = new mongoose.Schema({
        clinic_id: { type: Number, required: true },
        clinic_name: { type: String, required: true },
        patient_name: { type: String, required: true },
        service: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String },
        appointment_date: { type: String, required: true },
        appointment_time: { type: String, required: true }
    }, { timestamps: true });

    return mongoose.model(collectionName, schema, collectionName);
};

// Main message handler
const handleMessage = async (clinicConfig, fromNumber, msg) => {
    const message = msg.trim();
    
    // Initialize session if not exists
    if (!patientSessions[fromNumber]) {
        patientSessions[fromNumber] = { step: 0, data: {}, faqMode: false };
    }

    const session = patientSessions[fromNumber];

    // Helper functions
    const sendMainMenu = async (name) => {
        const menu = `👋 Hey ${name}! Welcome to *${clinicConfig.clinic_name}*.\nI am here to assist you. 😊\n\n📋 *Main Menu*:\n1️⃣ Services & Prices\n2️⃣ Book Appointment\n3️⃣ Working Hours ⏰\n4️⃣ Clinic Address 📍\n5️⃣ FAQs ❓\n\nPlease reply with the option number or name.`;
        await sendMessage(fromNumber, menu);
    };

    const sendServices = async () => {
        let text = "🦷 *Services & Prices*\n";
        servicesList.forEach((s,i)=> text += `${s.emoji} ${i+1}. ${s.name} - ${s.price}\n`);
        await sendMessage(fromNumber, text);
    };

    const sendFAQs = async () => {
        let text = "❓ *FAQs*\n";
        faqsList.forEach((f,i)=> text += `${i+1}️⃣ ${f.question}\n`);
        await sendMessage(fromNumber, text);
        await sendMessage(fromNumber, "Please reply with the FAQ number or type your question. Type 'no' to exit FAQs.");
        session.faqMode = true;
    };

    // Detect keywords globally (even after booking)
    const keyword = message.toLowerCase();
    if (keyword.includes('services') || keyword === '1') return sendServices();
    if (keyword.includes('book') || keyword === '2') { session.step = 3; return await sendMessage(fromNumber, "📅 Great! Let's book your appointment.\nPlease provide your phone number:"); }
    if (keyword.includes('hours') || keyword === '3') return await sendMessage(fromNumber, "⏰ *Working Hours*\nMon-Sat: 9:00 AM - 6:00 PM\nSun: Closed");
    if (keyword.includes('address') || keyword === '4') return await sendMessage(fromNumber, "📍 *Clinic Address*\n123 Smile Street, Dental City, India");
    if (keyword.includes('faq') || keyword === '5') return sendFAQs();

    // FAQ mode
    if (session.faqMode) {
        if (keyword === 'no') {
            session.faqMode = false;
            return await sendMainMenu(session.data.patient_name || "there");
        }
        const index = parseInt(message) - 1;
        if (index >= 0 && index < faqsList.length) await sendMessage(fromNumber, `💡 ${faqsList[index].answer}`);
        else {
            const matchedFaq = faqsList.find(f => message.toLowerCase().includes(f.question.toLowerCase()));
            if (matchedFaq) await sendMessage(fromNumber, `💡 ${matchedFaq.answer}`);
            else await sendMessage(fromNumber, `❌ Sorry, I didn’t understand. Contact staff at 📞 ${clinicConfig.contact}.`);
        }
        return; // Stay in FAQ mode until user exits
    }

    // Greeting and name collection
    if (session.step === 0) {
        await sendMessage(fromNumber, `👋 Hey! Welcome to *${clinicConfig.clinic_name}*, I am here to assist you. What's your name? 😊`);
        session.step = 1;
        return;
    }
    if (session.step === 1) {
        session.data.patient_name = message;
        await sendMainMenu(session.data.patient_name);
        session.step = 2;
        return;
    }

    // Booking steps
    switch(session.step){
        case 3:
            session.data.phone = message;
            await sendMessage(fromNumber, "📧 Do you want to provide your email? (Yes/No)");
            session.step = 4;
            break;
        case 4:
            if(message.toLowerCase() === 'yes'){
                await sendMessage(fromNumber, "✉️ Please enter your email:");
                session.step = 5;
            } else {
                session.data.email = "";
                await sendServices();
                session.step = 6;
            }
            break;
        case 5:
            session.data.email = message;
            await sendServices();
            session.step = 6;
            break;
        case 6:
            const choice = parseInt(message);
            if(choice >= 1 && choice <= servicesList.length) session.data.service = servicesList[choice-1].name;
            else session.data.service = message;
            await sendMessage(fromNumber, "📅 Please provide preferred appointment date (YYYY-MM-DD):");
            session.step = 7;
            break;
        case 7:
            session.data.appointment_date = message;
            await sendMessage(fromNumber, "⏰ Please provide preferred appointment time (HH:MM AM/PM):");
            session.step = 8;
            break;
        case 8:
            session.data.appointment_time = message;
            const Appointment = getAppointmentModel(clinicConfig.clinic_name);
            const existing = await Appointment.findOne({
                clinic_id: clinicConfig.clinic_id,
                appointment_date: session.data.appointment_date,
                appointment_time: session.data.appointment_time
            });
            if(existing){
                return await sendMessage(fromNumber, `⚠️ This slot is already booked. Please provide another time:`);
            }
            const appointment = new Appointment({
                clinic_id: clinicConfig.clinic_id,
                clinic_name: clinicConfig.clinic_name,
                patient_name: session.data.patient_name,
                service: session.data.service,
                phone: session.data.phone,
                email: session.data.email || "",
                appointment_date: session.data.appointment_date,
                appointment_time: session.data.appointment_time
            });
            await appointment.save();
            const summary = `✅ Appointment Confirmed!\n\n🏥 Clinic: ${clinicConfig.clinic_name}\n👤 Name: ${session.data.patient_name}\n📞 Phone: ${session.data.phone}\n✉️ Email: ${session.data.email || "N/A"}\n🦷 Service: ${session.data.service}\n📅 Date: ${session.data.appointment_date}\n⏰ Time: ${session.data.appointment_time}\n\nThank you for booking with *${clinicConfig.clinic_name}*! 🎉`;
            await sendMessage(fromNumber, summary);

            // Do not delete session; patient can continue asking
            session.step = 2; // back to menu detection
            break;
    }
};

module.exports = { handleMessage };
