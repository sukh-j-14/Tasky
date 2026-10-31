const mongoose = require('mongoose');
const { Message, Conversation } = require('../models/Message');

async function sendMessage(userId, { conversationId, message, clientMessageId }) {
  if (!mongoose.isValidObjectId(conversationId) || typeof message !== 'string' || !message.trim() || message.trim().length > 2000) {
    throw Object.assign(new Error('Choose a conversation and enter a message of 1–2000 characters.'), { status: 400 });
  }
  if (clientMessageId !== undefined && (typeof clientMessageId !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(clientMessageId))) {
    throw Object.assign(new Error('Invalid message identifier.'), { status: 400 });
  }
  const conversation = await Conversation.findOne({ _id: conversationId, participants: userId, isActive: true, 'deletedBy.userId': { $ne: userId } });
  if (!conversation) throw Object.assign(new Error('Conversation unavailable.'), { status: 403 });
  const receiverId = conversation.participants.find(id => String(id) !== String(userId));
  let saved = clientMessageId ? await Message.findOne({ senderId: userId, clientMessageId }) : null;
  if (saved && String(saved.conversationId) !== String(conversationId)) throw Object.assign(new Error('Message identifier already used.'), { status: 409 });
  if (!saved) {
    try {
      saved = await Message.create({ conversationId, senderId: userId, receiverId, message: message.trim(), messageType: 'text', clientMessageId });
    } catch (error) {
      if (error.code !== 11000 || !clientMessageId) throw error;
      saved = await Message.findOne({ senderId: userId, clientMessageId });
      if (!saved || String(saved.conversationId) !== String(conversationId)) throw error;
    }
    await Conversation.updateOne({ _id: conversationId }, { $set: { lastMessage: saved._id, lastMessageAt: saved.createdAt } });
  }
  await saved.populate('senderId', 'firstName lastName profilePicture');
  return { message: saved, participants: conversation.participants.map(String) };
}
module.exports = { sendMessage };
