const { sendMessage } = require('./modules/whatsapp');
const mongoose = require('mongoose');

const patientSessions = {};

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
    { question: "Do you accept insurance?", answer: "✅ Yes, we accept major insurance providers. Please contact the clinic staff for details." },
    { question: "How can I cancel an appointment?", answer: "📞 You can cancel your appointment by calling our staff at the clinic contact." },
    { question: "What are your working hours?", answer: "⏰ Mon-Sat: 9:00 AM - 6:00 PM\nSun: Closed" },
    { question: "Where is the clinic located?", answer: "📍 123 Smile Street, Dental City, India" }
];

// Get dynamic collection per clinic
const getAppointmentModel = (clinicName) => {
    const collectionName = `appointments_${clinicName.replace(/\s+/g, '_').toLowerCase()}`;
    if(mongoose.models[collectionName]){
        return mongoose.models[collectionName];
    }
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

const handleMessage = async (clinicConfig, fromNumber, incomingMsg) => {
    const msg = incomingMsg.trim();
    if(!patientSessions[fromNumber]){
        patientSessions[fromNumber] = { step: 0, data: {}, faqMode: false };
    }
    const session = patientSessions[fromNumber];
    const clinicContact = clinicConfig.contact;

    const sendMainMenu = async (name) => {
        let menu = `👋 Hey ${name}! Welcome to *${clinicConfig.clinic_name}*.\nI am here to assist you. 😊\n\n📋 *Main Menu*:\n`;
        menu += `1️⃣ Services & Prices\n2️⃣ Book Appointment\n3️⃣ Working Hours ⏰\n4️⃣ Clinic Address 📍\n5️⃣ FAQs ❓\n\nPlease reply with the option number or name.`;
        await sendMessage(fromNumber, menu);
    }

    // Step 0: Greeting
    if(session.step === 0){
        if(msg.toLowerCase().includes('hi') || msg.toLowerCase().includes('hello')){
            await sendMessage(fromNumber, `👋 Hey! Welcome to *${clinicConfig.clinic_name}*, I am here to assist you. What's your name? 😊`);
            session.step = 1;
        } else {
            await sendMessage(fromNumber, "Please type 'Hi' to start. 😊");
        }
        return;
    }

    // Step 1: Get patient name
    if(session.step === 1){
        session.data.patient_name = msg;
        await sendMainMenu(session.data.patient_name);
        session.step = 2;
        return;
    }

    // Step 2: Menu handling
    if(session.step === 2){
        const input = msg.toLowerCase();

        if(input.includes('1') || input.includes('services')){
            let serviceText = "🦷 *Services & Prices*\n";
            servicesList.forEach((s,i)=>{
                serviceText += `${s.emoji} ${i+1}. ${s.name} - ${s.price}\n`;
            });
            await sendMessage(fromNumber, serviceText);
            await sendMainMenu(session.data.patient_name);
        } else if(input.includes('2') || input.includes('book')){
            await sendMessage(fromNumber, "📅 Great! Let's book your appointment.\nPlease provide your phone number:");
            session.step = 3;
        } else if(input.includes('3') || input.includes('hours')){
            await sendMessage(fromNumber, "⏰ *Working Hours*\nMon-Sat: 9:00 AM - 6:00 PM\nSun: Closed");
            await sendMainMenu(session.data.patient_name);
        } else if(input.includes('4') || input.includes('address')){
            await sendMessage(fromNumber, "📍 *Clinic Address*\n123 Smile Street, Dental City, India");
            await sendMainMenu(session.data.patient_name);
        } else if(input.includes('5') || input.includes('faq')){
            let faqText = "❓ *FAQs*\n";
            faqsList.forEach((f,i)=>{
                const numberEmoji = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'][i];
                faqText += `${numberEmoji} ${f.question}\n`;
            });
            await sendMessage(fromNumber, faqText);
            await sendMessage(fromNumber, "Please reply with the FAQ number or type your question.");
            session.faqMode = true;
        } else {
            await sendMessage(fromNumber, `❌ Sorry, I didn’t understand. Please contact our staff at 📞 ${clinicContact} for assistance.`);
        }
        return;
    }

    // FAQ mode
    if(session.faqMode){
        const index = parseInt(msg) - 1;
        if(index >=0 && index < faqsList.length){
            await sendMessage(fromNumber, `💡 ${faqsList[index].answer}`);
        } else {
            const matchedFaq = faqsList.find(f=> msg.toLowerCase().includes(f.question.toLowerCase()));
            if(matchedFaq){
                await sendMessage(fromNumber, `💡 ${matchedFaq.answer}`);
            } else {
                await sendMessage(fromNumber, `❌ Sorry, I didn’t understand. Please contact our staff at 📞 ${clinicContact}.`);
            }
        }
        await sendMainMenu(session.data.patient_name);
        session.faqMode = false;
        return;
    }

    // Booking steps
    if(session.step === 3){
        session.data.phone = msg;
        await sendMessage(fromNumber, "📧 Do you want to provide your email? (Yes/No)");
        session.step = 4;
        return;
    }

    if(session.step === 4){
        if(msg.toLowerCase() === 'yes'){
            await sendMessage(fromNumber, "✉️ Please enter your email:");
            session.step = 5;
        } else {
            session.data.email = "";
            let serviceText = "🦷 Please select a service:\n";
            servicesList.forEach((s,i)=>{
                serviceText += `${s.emoji} ${i+1}. ${s.name} - ${s.price}\n`;
            });
            await sendMessage(fromNumber, serviceText);
            session.step = 6;
        }
        return;
    }

    if(session.step === 5){
        session.data.email = msg;
        let serviceText = "🦷 Please select a service:\n";
        servicesList.forEach((s,i)=>{
            serviceText += `${s.emoji} ${i+1}. ${s.name} - ${s.price}\n`;
        });
        await sendMessage(fromNumber, serviceText);
        session.step = 6;
        return;
    }

    if(session.step === 6){
        const choice = parseInt(msg);
        if(choice >=1 && choice <= servicesList.length){
            session.data.service = servicesList[choice-1].name;
        } else {
            session.data.service = msg;
        }
        await sendMessage(fromNumber, "📅 Please provide preferred appointment date (YYYY-MM-DD):");
        session.step = 7;
        return;
    }

    if(session.step === 7){
        session.data.appointment_date = msg;
        await sendMessage(fromNumber, "⏰ Please provide preferred appointment time (HH:MM AM/PM):");
        session.step = 8;
        return;
    }

    if(session.step === 8){
        session.data.appointment_time = msg;

        const Appointment = getAppointmentModel(clinicConfig.clinic_name);

        const existing = await Appointment.findOne({
            clinic_id: clinicConfig.clinic_id,
            appointment_date: session.data.appointment_date,
            appointment_time: session.data.appointment_time
        });

        if(existing){
            await sendMessage(fromNumber, `⚠️ Sorry! This slot is already booked. Please provide another time:`);
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

        const summary = `✅ Appointment Confirmed!\n\n🏥 Clinic: ${clinicConfig.clinic_name}\n🆔 Clinic ID: ${clinicConfig.clinic_id}\n👤 Name: ${session.data.patient_name}\n📞 Phone: ${session.data.phone}\n✉️ Email: ${session.data.email || "N/A"}\n🦷 Service: ${session.data.service}\n📅 Date: ${session.data.appointment_date}\n⏰ Time: ${session.data.appointment_time}\n\nThank you for booking with ${clinicConfig.clinic_name}! 🎉`;
        await sendMessage(fromNumber, summary);

        delete patientSessions[fromNumber];
        return;
    }
};

module.exports = { handleMessage };
