const { sendMessage } = require('./modules/whatsapp');
const mongoose = require('mongoose');

const patientSessions = {};

// ✅ Services list
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

// ✅ FAQs list
const faqsList = [
    { question: "What services do you offer?", answer: "We offer Dental Cleaning 🦷, Teeth Whitening ✨, Orthodontics 😁, Root Canal 🪥, Dental Implants 🦷💎, Pediatric Dentistry 👶🦷, and Gum Treatment 🩸🦷." },
    { question: "Do you accept insurance?", answer: "✅ Yes, we accept major insurance providers. Please contact the clinic staff for details." },
    { question: "How can I cancel an appointment?", answer: "📞 You can cancel your appointment by calling our staff at the clinic contact." },
    { question: "What are your working hours?", answer: "⏰ Mon-Sat: 9:00 AM - 6:00 PM\nSun: Closed" },
    { question: "Where is the clinic located?", answer: "📍 123 Smile Street, Dental City, India" }
];

// ✅ Dynamic MongoDB model per clinic
const getAppointmentModel = (clinicName) => {
    const collectionName = `appointments_${clinicName.replace(/\s+/g, '_').toLowerCase()}`;
    if (mongoose.models[collectionName]) return mongoose.models[collectionName];

    const schema = new mongoose.Schema({
        clinic_id: Number,
        clinic_name: String,
        patient_name: String,
        service: String,
        phone: String,
        email: String,
        appointment_date: String,
        appointment_time: String
    }, { timestamps: true });

    return mongoose.model(collectionName, schema, collectionName);
};

const handleMessage = async (clinicConfig, fromNumber, msg) => {
    if (!patientSessions[fromNumber]) {
        patientSessions[fromNumber] = { step: 0, data: {}, faqMode: false, booked: false };
    }
    const session = patientSessions[fromNumber];
    const input = msg.toLowerCase();

    // ✅ Detect keywords anytime (post-booking too)
    if (input.includes('hour') || input.includes('time') || input.includes('timing')) {
        await sendMessage(fromNumber, "⏰ *Working Hours*\nMon-Sat: 9:00 AM - 6:00 PM\nSun: Closed");
        return;
    }
    if (input.includes('address') || input.includes('location')) {
        await sendMessage(fromNumber, "📍 *Clinic Address*\n123 Smile Street, Dental City, India");
        return;
    }
    if (input.includes('service')) {
        let text = "🦷 *Services & Prices*\n";
        servicesList.forEach((s, i) => text += `${s.emoji} ${i + 1}. ${s.name} - ${s.price}\n`);
        await sendMessage(fromNumber, text);
        return;
    }
    if (input.includes('faq')) {
        let faqText = "❓ *FAQs*\n";
        faqsList.forEach((f, i) => faqText += `${i + 1}️⃣ ${f.question}\n`);
        await sendMessage(fromNumber, faqText);
        session.faqMode = true;
        return;
    }

    // ✅ FAQ Mode
    if (session.faqMode) {
        const index = parseInt(msg) - 1;
        if (index >= 0 && index < faqsList.length) {
            await sendMessage(fromNumber, `💡 ${faqsList[index].answer}`);
        } else {
            await sendMessage(fromNumber, "❌ Please reply with a valid FAQ number.");
        }
        session.faqMode = false;
        return;
    }

    // ✅ Step 0: Greeting
    if (session.step === 0) {
        await sendMessage(fromNumber, `👋 Hey! Welcome to *${clinicConfig.clinic_name}*, I am here to assist you. What's your name? 😊`);
        session.step = 1;
        return;
    }

    // ✅ Step 1: Get name
    if (session.step === 1) {
        session.data.patient_name = msg;
        const menu = `👋 Hi ${session.data.patient_name}! Welcome to *${clinicConfig.clinic_name}* 😄\n\n📋 *Main Menu:*\n1️⃣ Services & Prices\n2️⃣ Book Appointment\n3️⃣ Working Hours\n4️⃣ Clinic Address\n5️⃣ FAQs\n\nPlease reply with the option number or name.`;
        await sendMessage(fromNumber, menu);
        session.step = 2;
        return;
    }

    // ✅ Step 2: Handle menu
    if (session.step === 2) {
        if (input.includes('1') || input.includes('services') || input.includes('service')) {
            let text = "🦷 *Services & Prices*\n";
            servicesList.forEach((s, i) => text += `${s.emoji} ${i + 1}. ${s.name} - ${s.price}\n`);
            await sendMessage(fromNumber, text);
        } else if (input.includes('2') || input.includes('book') || input.includes('appoinment')) {
            await sendMessage(fromNumber, "📅 Great! Let's book your appointment.\nPlease provide your phone number:");
            session.step = 3;
        } else if (input.includes('3') || input.includes('hours')) {
            await sendMessage(fromNumber, "⏰ *Working Hours*\nMon-Sat: 9:00 AM - 6:00 PM\nSun: Closed");
        } else if (input.includes('4') || input.includes('address')) {
            await sendMessage(fromNumber, "📍 *Clinic Address*\n123 Smile Street, Dental City, India");
        } else if (input.includes('5') || input.includes('faq')) {
            let faqText = "❓ *FAQs*\n";
            faqsList.forEach((f, i) => faqText += `${i + 1}️⃣ ${f.question}\n`);
            await sendMessage(fromNumber, faqText);
            session.faqMode = true;
        } else {
            await sendMessage(fromNumber, "❌ Invalid option. Please reply with 1–5 or type the menu item name.");
        }
        return;
    }

    // ✅ Booking steps
    switch (session.step) {
        case 3:
            session.data.phone = msg;
            await sendMessage(fromNumber, "📧 Would you like to provide your email? (Yes/No)");
            session.step = 4;
            break;
        case 4:
            if (input === 'yes') {
                await sendMessage(fromNumber, "✉️ Please enter your email:");
                session.step = 5;
            } else {
                session.data.email = "";
                await sendMessage(fromNumber, "🦷 Please select a service:\n" + servicesList.map((s, i) => `${s.emoji} ${i + 1}. ${s.name} - ${s.price}`).join("\n"));
                session.step = 6;
            }
            break;
        case 5:
            session.data.email = msg;
            await sendMessage(fromNumber, "🦷 Please select a service:\n" + servicesList.map((s, i) => `${s.emoji} ${i + 1}. ${s.name} - ${s.price}`).join("\n"));
            session.step = 6;
            break;
        case 6:
            const choice = parseInt(msg);
            session.data.service = (choice >= 1 && choice <= servicesList.length)
                ? servicesList[choice - 1].name : msg;
            await sendMessage(fromNumber, "📅 Please provide your preferred appointment date (YYYY-MM-DD):");
            session.step = 7;
            break;
        case 7:
            session.data.appointment_date = msg;
            await sendMessage(fromNumber, "⏰ Please provide your preferred appointment time (HH:MM AM/PM):");
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

            if (existing) {
                await sendMessage(fromNumber, `⚠️ This slot is already booked. Please choose another time.`);
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

            // ✅ Don't reset session — let them ask other questions
            session.booked = true;
            session.step = 2;
            break;
    }
};

module.exports = { handleMessage };
