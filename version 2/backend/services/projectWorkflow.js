const mongoose = require('mongoose');
const Task = require('../models/Task');
const Bid = require('../models/Bid');
const User = require('../models/User');
const SimulatedPayment = require('../models/SimulatedPayment');
const { Conversation, Message } = require('../models/Message');
const { simulationEnabled } = require('../paymentMode');
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
async function transaction(work) {
 const session = await mongoose.startSession();
 try { let result; await session.withTransaction(async () => { result = await work(session); }); return result; }
 finally { await session.endSession(); }
}
async function project(id, userId, session) {
 if (!mongoose.isValidObjectId(id)) fail(400, 'Invalid project ID.');
 const task = await Task.findById(id).session(session || null);
 if (!task) fail(404, 'Task not found.');
 if (![task.clientId, task.selectedFreelancerId].some(id => String(id) === String(userId))) fail(403, 'Only project participants can access this workflow.');
 return task;
}
async function agreedAmount(task, session) {
 const bid = await Bid.findOne({ _id: task.selectedBidId, taskId: task._id, status: 'accepted' }).session(session || null);
 if (!bid) fail(409, 'Accept a proposal before funding the project.');
 const amount = Math.round(bid.amount * 100);
 if (!Number.isSafeInteger(amount) || amount <= 0) fail(400, 'The agreed amount is invalid.');
 return amount;
}
async function systemMessage(task, senderId, text, session, type) {
 const conversation = await Conversation.findOne({ taskId: task._id, bidId: task.selectedBidId }).session(session);
 if (!conversation) return null;
 const receiverId = String(senderId) === String(task.clientId) ? task.selectedFreelancerId : task.clientId;
 const [message] = await Message.create([{ conversationId: conversation._id, senderId, receiverId, message: text, messageType: 'system', isSystemMessage: true, ...(type ? { systemMessageType: type } : {}) }], { session });
 conversation.lastMessage = message._id; conversation.lastMessageAt = message.createdAt; await conversation.save({ session });
 return message;
}
async function notify(req, task, message) {
 if (!message) return;
 try { await req.app.locals.realtime?.publish([task.clientId, task.selectedFreelancerId], { type: 'message:new', message }); }
 catch { console.error('Workflow event persisted; realtime notification unavailable.'); }
}
const handle = work => async (req, res) => {
 try { res.json(await work(req)); }
 catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not update the project. Please try again.' }); }
};
exports.readSimulation = handle(async req => {
 const task = await project(req.params.id, req.user._id);
 const amountMinor = await agreedAmount(task);
 const payment = await SimulatedPayment.findOne({ taskId: task._id });
 return { mode: 'simulation', payment: payment || { status: 'unfunded', amountMinor, currency: 'INR', events: [] } };
});
exports.fundSimulation = handle(async req => {
 const { operationId, outcome = 'success' } = req.body;
 if (!/^[a-zA-Z0-9-]{8,80}$/.test(operationId || '') || !['success', 'declined'].includes(outcome)) fail(400, 'Choose a test result and a valid operation ID.');
 const result = await transaction(async session => {
  const task = await project(req.params.id, req.user._id, session);
  if (String(task.clientId) !== String(req.user._id)) fail(403, 'Only the client can fund a simulated payment.');
  if (task.status !== 'in-progress') fail(409, 'Only an active project can be funded.');
  const amountMinor = await agreedAmount(task, session);
  // Serialize competing funding/completion requests on the project document.
  await Task.updateOne({ _id: task._id }, { $inc: { simulationVersion: 1 } }, { session });
  let payment = await SimulatedPayment.findOne({ taskId: task._id }).session(session);
  if (!payment) payment = new SimulatedPayment({ taskId: task._id, clientId: task.clientId, freelancerId: task.selectedFreelancerId, amountMinor });
  const expected = outcome === 'success' ? 'funded' : 'declined';
  const previous = payment.events.find(event => event.operationId === operationId);
  if (previous && previous.type !== expected) fail(409, 'This operation ID was used for another test result.');
  if (previous || payment.status !== 'unfunded') return { task, payment, message: null };
  if (payment.events.length >= 20) fail(409, 'This project has reached its test-attempt limit.');
  payment.events.push({ operationId, type: expected, actorId: req.user._id });
  let message;
  if (outcome === 'success') {
   payment.status = 'funded'; payment.fundedAt = new Date();
   message = await systemMessage(task, req.user._id, 'TEST ONLY: simulated payment funded. No real money was collected.', session);
  }
  await payment.save({ session });
  return { task, payment, message };
 });
 await notify(req, result.task, result.message);
 return { mode: 'simulation', payment: result.payment, declined: outcome === 'declined' && result.payment.status === 'unfunded' };
});
exports.deliver = handle(async req => {
 if (typeof req.body.message !== 'string' || !req.body.message.trim() || req.body.message.length > 2000) fail(400, 'Describe the delivery in 1–2000 characters.');
 const result = await transaction(async session => {
  const task = await project(req.params.id, req.user._id, session);
  if (String(task.selectedFreelancerId) !== String(req.user._id)) fail(403, 'Only the selected freelancer can submit delivery.');
  if (task.status !== 'in-progress') fail(409, 'This project is not in progress.');
  if (task.deliveredAt) return { task };
  if (simulationEnabled() && !await SimulatedPayment.exists({ taskId: task._id, status: 'funded' }).session(session)) fail(409, 'Wait for the client to fund the simulated payment.');
  task.deliveredAt = new Date(); task.deliveryNote = req.body.message.trim(); task.progress = 100;
  await task.save({ session });
  const message = await systemMessage(task, req.user._id, `Delivery submitted for review:\n${task.deliveryNote}`, session);
  return { task, message };
 });
 await notify(req, result.task, result.message);
 return { task: result.task, message: 'Delivery submitted for client review.' };
});
exports.complete = handle(async req => {
 const result = await transaction(async session => {
  const task = await project(req.params.id, req.user._id, session);
  if (String(task.clientId) !== String(req.user._id)) fail(403, 'Only the client can approve completion.');
  if (task.status === 'completed') return { task };
  if (task.status !== 'in-progress' || !task.deliveredAt) fail(409, 'The freelancer must submit delivery before approval.');
  const simulation = simulationEnabled();
  if (simulation) {
   const payment = await SimulatedPayment.findOne({ taskId: task._id, status: 'funded' }).session(session);
   if (!payment) fail(409, 'Fund the simulated payment before approving completion.');
   payment.status = 'released'; payment.releasedAt = new Date();
   payment.events.push({ operationId: `complete-${task._id}`, type: 'released', actorId: req.user._id });
   await payment.save({ session });
  }
  task.status = 'completed'; task.completedAt = new Date(); task.acceptedAt = new Date(); task.progress = 100; await task.save({ session });
  await User.updateOne({ _id: task.selectedFreelancerId }, { $inc: { tasksCompleted: 1 } }, { session });
  const message = await systemMessage(task, req.user._id, simulation ? 'TEST ONLY: delivery approved and simulated payment released. No real money was transferred.' : 'Delivery approved. Project completed. No payment was transferred.', session, 'task_completed');
  return { task, message };
 });
 await notify(req, result.task, result.message);
 return { task: result.task, message: 'Delivery approved and project completed.' };
});
