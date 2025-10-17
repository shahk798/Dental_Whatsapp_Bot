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

// Helper function: send main menu
const sendMainMenu = async (fromNumber, patientName, clinicConfig) => {
    const menu = `👋 Hey ${patientName}! Welcome to *${clinicConfig.clinic_name}*.\nI am here to assist you. 😊\n\n📋 *Main Menu*:\n1️⃣ Services & Prices\n2️⃣ Book Appointment\n3️⃣ Working Hours ⏰\n4️⃣ Clinic Address 📍\n5️⃣ FAQs ❓\n\nPlease reply with the option number or name.`;
    await sendMessage(fromNumber, menu);
};

const handleMessage = async (clinicConfig, fromNumber, incomingMsg) => {
    const msg = incomingMsg.trim();

    // Initialize session if not exists
    if (!patientSessions[fromNumber]) {
        patientSessions[fromNumber] = {
            step: 0,
            data: {},
            faqMode: false
        };
    }

    const session = patientSessions[fromNumber];

    // ----------- Keyword-based detection for general info ----------- //
    const lowerMsg = msg.toLowerCase();
    const isFAQRequest = lowerMsg.includes('faq') || session.faqMode;
    const isWorkingHours = lowerMsg.includes('hours') || lowerMsg.includes('time');
    const isAddress = lowerMsg.includes('address') || lowerMsg.includes('location');
    const isServices = lowerMsg.includes('service') || lowerMsg.includes('price');

    // FAQ handling
    if (isFAQRequest) {
        if (!session.faqMode) {
            // Start FAQ mode
            let faqText = "❓ *FAQs*\n";
            faqsList.forEach((f, i) => faqText += `${i+1}️⃣ ${f.question}\n`);
            await sendMessage(fromNumber, faqText);
            await sendMessage(fromNumber, "Please reply with the FAQ number or type your question. Type 'exit' to leave FAQ.");
            session.faqMode = true;
            return;
        } else {
            if (lowerMsg === 'exit' || lowerMsg === 'no') {
                session.faqMode = false;
                await sendMessage(fromNumber, `🙏 Thanks for visiting *${clinicConfig.clinic_name}*!`);
                return;
            }
            const index = parseInt(msg) - 1;
            if (index >= 0 && index < faqsList.length) {
                await sendMessage(fromNumber, `💡 ${faqsList[index].answer}`);
            } else {
                const matchedFaq = faqsList.find(f => msg.toLowerCase().includes(f.question.toLowerCase()));
                if (matchedFaq) await sendMessage(fromNumber, `💡 ${matchedFaq.answer}`);
                else await sendMessage(fromNumber, `❌ Sorry, I didn’t understand. Contact staff at 📞 ${clinicConfig.contact}.`);
            }
            await sendMessage(fromNumber, "Do you want to ask another FAQ? (Yes/No)");
            return;
        }
    }

    // Services info
    if (isServices) {
        let text = "🦷 *Services & Prices*\n";
        servicesList.forEach((s, i) => text += `${s.emoji} ${i+1}. ${s.name} - ${s.price}\n`);
        await sendMessage(fromNumber, text);
        return;
    }

    // Working hours
    if (isWorkingHours) {
        await sendMessage(fromNumber, "⏰ *Working Hours*\nMon-Sat: 9:00 AM - 6:00 PM\nSun: Closed");
        return;
    }

    // Address
    if (isAddress) {
        await sendMessage(fromNumber, "📍 *Clinic Address*\n123 Smile Street, Dental City, India");
        return;
    }

    // ----------- Appointment booking flow ----------- //
    switch(session.step) {
        case 0:
            await sendMessage(fromNumber, `👋 Hey! Welcome to *${clinicConfig.clinic_name}*. What’s your name? 😊`);
            session.step = 1;
            break;

        case 1:
            session.data.patient_name = msg;
            await sendMainMenu(fromNumber, session.data.patient_name, clinicConfig);
            session.step = 2;
            break;

        case 2:
            if (lowerMsg.includes('book') || lowerMsg.includes('2')) {
                await sendMessage(fromNumber, "📅 Great! Let's book your appointment.\nPlease provide your phone number:");
                session.step = 3;
            } else {
                await sendMainMenu(fromNumber, session.data.patient_name, clinicConfig);
            }
            break;

        case 3:
            session.data.phone = msg;
            await sendMessage(fromNumber, "📧 Do you want to provide your email? (Yes/No)");
            session.step = 4;
            break;

        case 4:
            if (lowerMsg === 'yes') {
                await sendMessage(fromNumber, "✉️ Please enter your email:");
                session.step = 5;
            } else {
                session.data.email = "";
                let serviceText = "🦷 Please select a service:\n";
                servicesList.forEach((s,i)=> serviceText += `${s.emoji} ${i+1}. ${s.name} - ${s.price}\n`);
                await sendMessage(fromNumber, serviceText);
                session.step = 6;
            }
            break;

        case 5:
            session.data.email = msg;
            let serviceText2 = "🦷 Please select a service:\n";
            servicesList.forEach((s,i)=> serviceText2 += `${s.emoji} ${i+1}. ${s.name} - ${s.price}\n`);
            await sendMessage(fromNumber, serviceText2);
            session.step = 6;
            break;

        case 6:
            const choice = parseInt(msg);
            if(choice >= 1 && choice <= servicesList.length) session.data.service = servicesList[choice-1].name;
            else session.data.service = msg;
            await sendMessage(fromNumber, "📅 Please provide preferred appointment date (YYYY-MM-DD):");
            session.step = 7;
            break;

        case 7:
            session.data.appointment_date = msg;
            await sendMessage(fromNumber, "⏰ Please provide preferred appointment time (HH:MM AM/PM):");
            session.step = 8;
            break;

        case 8:
            session.data.appointment_time = msg;

            const Appointment = getAppointmentModel(clinicConfig.clinic_name);

            const existing = await Appointment.findOne({
                clinic_id: clinicConfig.clinic_id,
                appointment_date: session.data.appointment_date,
                appointment_time: session.data.appointment_time
            });

            if(existing){
                await sendMessage(fromNumber, `⚠️ This slot is already booked. Please provide another time:`);
                return;
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

            session.step = 2; // Allow patient to ask more info after booking
            break;
    }
};

module.exports = { handleMessage };
