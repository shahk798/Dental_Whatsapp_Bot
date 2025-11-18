require('dotenv').config();
const { sendMessage } = require('./modules/whatsapp');
const mongoose = require('mongoose');

// Patient sessions (per phone number)
const patientSessions = {};

// Services & FAQs
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

const faqsList = [
    { question: "What services do you offer?", answer: "We offer Dental Cleaning 🦷, Teeth Whitening ✨, Orthodontics 😁, Root Canal 🪥, Dental Implants 🦷💎, Pediatric Dentistry 👶🦷, and Gum Treatment 🩸🦷." },
    { question: "Do you accept insurance?", answer: "✅ Yes, we accept major insurance providers. Contact clinic staff for details." },
    { question: "How can I cancel an appointment?", answer: "📞 You can cancel your appointment by calling our staff at the clinic contact." },
    { question: "What are your working hours?", answer: "⏰ Mon-Sat: 9:00 AM - 6:00 PM\nSun: Closed" },
    { question: "Where is the clinic located?", answer: "📍 123 Smile Street, Dental City, India" }
];

// Import dynamic appointment model
const getAppointmentModel = require('./models/Appointment');

// Main handler
const handleMessage = async (clinicConfig, fromNumber, msg) => {
    if (!patientSessions[fromNumber]) patientSessions[fromNumber] = { step: 0, data: {}, faqMode: false };
    const session = patientSessions[fromNumber];
    const input = msg.trim().toLowerCase();

    const sendMainMenu = async (name) => {
        const menu = `👋 Hey ${name}! Welcome to *${clinicConfig.clinic_name}*.\nI am here to assist you. 😊\n\n📋 *Main Menu*:\n1️⃣ Services & Prices\n2️⃣ Book Appointment\n3️⃣ Working Hours ⏰\n4️⃣ Clinic Address 📍\n5️⃣ FAQs ❓\n\nPlease reply with the option number or name.`;
        await sendMessage(fromNumber, menu);
    };

    // FAQs
    if (session.faqMode || input.includes('faq')) {
        if (!session.faqMode) {
            session.faqMode = true;
            await sendMessage(fromNumber, "❓ *FAQs*\n" + faqsList.map((f,i)=>`${i+1}️⃣ ${f.question}`).join("\n"));
            await sendMessage(fromNumber, "Please reply with FAQ number or question. Reply 'no' to exit FAQ.");
            return;
        } else {
            if(input === 'no'){
                session.faqMode = false;
                await sendMessage(fromNumber, `🙏 Thanks for visiting *${clinicConfig.clinic_name}*! 😊`);
                return;
            }
            const index = parseInt(input)-1;
            if(index>=0 && index<faqsList.length){
                await sendMessage(fromNumber, `💡 ${faqsList[index].answer}`);
            } else {
                const matched = faqsList.find(f=> input.includes(f.question.toLowerCase()));
                if(matched) await sendMessage(fromNumber, `💡 ${matched.answer}`);
                else await sendMessage(fromNumber, `❌ Sorry, I didn’t understand. Contact staff at 📞 ${clinicConfig.contact}.`);
            }
            await sendMessage(fromNumber, "Do you want to ask another FAQ? (yes/no)");
            return;
        }
    }

    // Booking & Menu
    switch(session.step){
        case 0:
            await sendMessage(fromNumber, `👋 Hey! Welcome to *${clinicConfig.clinic_name}*, I’m here to assist you. What’s your name? 😊`);
            session.step = 1;
            return;
        case 1:
            session.data.patient_name = msg.trim();
            await sendMainMenu(session.data.patient_name);
            session.step = 2;
            return;
        case 2:
            if(input.includes('1') || input.includes('services')){
                await sendMessage(fromNumber, "🦷 *Services & Prices*\n"+servicesList.map((s,i)=>`${s.emoji} ${i+1}. ${s.name} - ${s.price}`).join("\n"));
            } else if(input.includes('2') || input.includes('book')){
                await sendMessage(fromNumber, "📅 Let's book your appointment.\nPlease provide your phone number:");
                session.step = 3;
            } else if(input.includes('3') || input.includes('hours')){
                await sendMessage(fromNumber, "⏰ *Working Hours*\nMon-Sat: 9:00 AM - 6:00 PM\nSun: Closed");
            } else if(input.includes('4') || input.includes('address')){
                await sendMessage(fromNumber, `📍 *Clinic Address*\n123 Smile Street, Dental City, India\n📞 Contact: ${clinicConfig.contact}`);
            } else {
                await sendMessage(fromNumber, `❌ Sorry, I didn’t understand. Contact staff at 📞 ${clinicConfig.contact}.`);
            }
            return;
    }

    if(session.step >= 3) await handleBookingSteps(clinicConfig, session, fromNumber, msg);
};

// Booking steps
const handleBookingSteps = async (clinicConfig, session, fromNumber, msg) => {
    const input = msg.trim();

    switch(session.step){
        case 3:
            session.data.phone = input;
            await sendMessage(fromNumber, "📧 Do you want to provide your email? (Yes/No)");
            session.step = 4;
            break;
        case 4:
            if(input.toLowerCase() === 'yes'){
                await sendMessage(fromNumber, "✉️ Please enter your email:");
                session.step = 5;
            } else {
                session.data.email = "";
                await sendMessage(fromNumber, "🦷 Please select a service:\n"+servicesList.map((s,i)=>`${s.emoji} ${i+1}. ${s.name} - ${s.price}`).join("\n"));
                session.step = 6;
            }
            break;
        case 5:
            session.data.email = input;
            await sendMessage(fromNumber, "🦷 Please select a service:\n"+servicesList.map((s,i)=>`${s.emoji} ${i+1}. ${s.name} - ${s.price}`).join("\n"));
            session.step = 6;
            break;
        case 6:
            const choice = parseInt(input);
            if (choice >= 1 && choice <= servicesList.length) {
                session.data.service = servicesList[choice-1].name;
                session.data.price = servicesList[choice-1].price;
            } else {
                session.data.service = input;
                session.data.price = "₹0"; // Default price if not selected from list
            }
            await sendMessage(fromNumber, "📅 Please provide preferred appointment date (YYYY-MM-DD):");
            session.step = 7;
            break;
        case 7:
            session.data.appointment_date = input;
            await sendMessage(fromNumber, "⏰ Please provide preferred appointment time (HH:MM AM/PM):");
            session.step = 8;
            break;
        case 8:
            session.data.appointment_time = input;

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
                price: session.data.price || "₹0",
                status: "pending",
                appointment_date: session.data.appointment_date,
                appointment_time: session.data.appointment_time
            });

            await appointment.save();

            await sendMessage(fromNumber, `✅ Appointment Confirmed!\n\n🏥 Clinic: ${clinicConfig.clinic_name}\n👤 Name: ${session.data.patient_name}\n📞 Phone: ${session.data.phone}\n✉️ Email: ${session.data.email || "N/A"}\n🦷 Service: ${session.data.service}\n📅 Date: ${session.data.appointment_date}\n⏰ Time: ${session.data.appointment_time}\n\nThank you for booking with *${clinicConfig.clinic_name}*! 🎉`);

            session.step = 2; // back to main menu
            break;
    }
};

module.exports = { handleMessage };
