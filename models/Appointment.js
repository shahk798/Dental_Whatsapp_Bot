const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    clinic_id: { type: Number, required: true },
    clinic_name: { type: String, required: true },
    patient_name: { type: String, required: true },
    service: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    appointment_date: { type: String, required: true },
    appointment_time: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
