const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    clinic_id: Number,
    clinic_name: String,
    patient_name: String,
    phone: String,
    email: String,
    service: String,
    appointment_date: String,
    appointment_time: String
}, { timestamps: true });

// Function to get a model per clinic dynamically
function getAppointmentModel(clinicName) {
    const collectionName = `appointments_${clinicName.replace(/\s+/g, '_').toLowerCase()}`;
    return mongoose.models[collectionName] || mongoose.model(collectionName, appointmentSchema, collectionName);
}

module.exports = getAppointmentModel;
