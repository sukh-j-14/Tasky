const mongoose = require('mongoose');
const schema = new mongoose.Schema({
 taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, unique: true },
 clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
 freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
 amountMinor: { type: Number, required: true, min: 1 },
 currency: { type: String, enum: ['INR'], default: 'INR' },
 mode: { type: String, enum: ['simulation'], default: 'simulation', immutable: true },
 status: { type: String, enum: ['unfunded', 'funded', 'released'], default: 'unfunded' },
 fundedAt: Date,
 releasedAt: Date,
 events: [{ operationId: String, type: { type: String, enum: ['declined', 'funded', 'released'] }, actorId: mongoose.Schema.Types.ObjectId, at: { type: Date, default: Date.now } }]
}, { timestamps: true });
module.exports = mongoose.model('SimulatedPayment', schema);
