const { Message, Conversation } = require('../models/Message');
const User = require('../models/User');
const Task = require('../models/Task');
const Bid = require('../models/Bid');

// Create or get conversation
exports.createOrGetConversation = async (req, res) => {
  try {
    const { participantId, taskId, bidId } = req.body;
    const userId = req.user._id;

    console.log('Creating conversation with:', { participantId, taskId, bidId, userId });

    if (!participantId) {
      return res.status(400).json({ message: 'Participant ID is required' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, participantId] },
      ...(taskId && { taskId }),
      ...(bidId && { bidId })
    });

    if (!conversation) {
      console.log('Creating new conversation');
      // Create new conversation
      conversation = new Conversation({
        participants: [userId, participantId],
        ...(taskId && { taskId }),
        ...(bidId && { bidId })
      });

      // Set conversation title
      if (taskId) {
        const task = await Task.findById(taskId);
        if (task) {
          conversation.title = `Discussion about: ${task.title}`;
        }
      } else {
        const participant = await User.findById(participantId);
        if (participant) {
          conversation.title = `Chat with ${participant.firstName} ${participant.lastName}`;
        }
      }

      await conversation.save();
      console.log('Conversation saved:', conversation._id);
    } else {
      console.log('Found existing conversation:', conversation._id);
    }

    // Populate conversation with participants
    await conversation.populate('participants', 'firstName lastName profilePicture');

    res.json(conversation);

  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    res.status(500).json({ message: 'Failed to create/get conversation' });
  }
};

// Get user's conversations
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    const conversations = await Conversation.find({
      participants: { $in: [userId] },
      isActive: true,
      'deletedBy.userId': { $ne: userId } // Exclude conversations deleted by this user
    })
    .populate('participants', 'firstName lastName profilePicture')
    .populate('lastMessage')
    .populate('taskId', 'title')
    .sort({ lastMessageAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conversation._id,
          receiverId: userId,
          isRead: false
        });

        return {
          ...conversation.toObject(),
          unreadCount
        };
      })
    );

    const total = await Conversation.countDocuments({
      participants: { $in: [userId] },
      isActive: true
    });

    res.json({
      conversations: conversationsWithUnread,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

// Get conversation messages
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const { page = 1, limit = 50 } = req.query;

    // Check if user is participant in conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.some(id => id.toString() === userId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({
      conversationId,
      $or: [
        { isDeleted: false },
        { isDeleted: true, deletedBy: { $ne: userId } } // Show messages not deleted by this user
      ]
    })
    .populate('senderId', 'firstName lastName profilePicture')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    const total = await Message.countDocuments({
      conversationId,
      isDeleted: false
    });

    res.json({
      messages: messages.reverse(), // Reverse to show oldest first
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { message, messageType = 'text', replyTo } = req.body;
    const conversationId = req.params.conversationId;
    const senderId = req.user._id;

    if (!conversationId || !message) {
      return res.status(400).json({ message: 'Conversation ID and message are required' });
    }

    // Check if user is participant in conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.some(id => id.toString() === senderId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get receiver ID
    const receiverId = conversation.participants.find(id => id.toString() !== senderId.toString());

    // Create message
    const newMessage = new Message({
      conversationId,
      senderId,
      receiverId,
      message,
      messageType,
      ...(replyTo && { replyTo, isReply: true })
    });

    await newMessage.save();

    // Update conversation
    conversation.lastMessage = newMessage._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Populate message with sender info
    await newMessage.populate('senderId', 'firstName lastName profilePicture');

    res.status(201).json({
      message: 'Message sent successfully',
      newMessage
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

// Edit message
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;
    const userId = req.user._id;

    if (!message) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const existingMessage = await Message.findById(messageId);
    if (!existingMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender
    if (existingMessage.senderId.toString() !== userId) {
      return res.status(403).json({ message: 'Only sender can edit message' });
    }

    // Check if message is not too old (e.g., 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (existingMessage.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({ message: 'Message is too old to edit' });
    }

    // Save original message to edit history
    if (!existingMessage.isEdited) {
      existingMessage.editHistory = [{
        originalMessage: existingMessage.message,
        editedAt: new Date()
      }];
    } else {
      existingMessage.editHistory.push({
        originalMessage: existingMessage.message,
        editedAt: new Date()
      });
    }

    // Update message
    existingMessage.message = message;
    existingMessage.isEdited = true;
    existingMessage.editedAt = new Date();

    await existingMessage.save();

    res.json({ 
      message: 'Message edited successfully',
      editedMessage: existingMessage
    });

  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ message: 'Failed to edit message' });
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is either sender or receiver
    const isSender = message.senderId.toString() === userId.toString();
    const isReceiver = message.receiverId.toString() === userId.toString();
    
    if (!isSender && !isReceiver) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Soft delete for this user
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = userId;

    await message.save();

    res.json({ message: 'Message deleted successfully' });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({ message: 'Messages marked as read' });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
};

// Get unread message count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Message.countDocuments({
      receiverId: userId,
      isRead: false
    });

    res.json({ unreadCount });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
};

// Archive conversation
exports.archiveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.some(id => id.toString() === userId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    conversation.isArchived = true;
    await conversation.save();

    res.json({ message: 'Conversation archived successfully' });

  } catch (error) {
    console.error('Error archiving conversation:', error);
    res.status(500).json({ message: 'Failed to archive conversation' });
  }
};

// Delete conversation for user (soft delete)
exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.some(id => id.toString() === userId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Add user to deletedBy array
    const existingDeletion = conversation.deletedBy.find(d => d.userId.toString() === userId.toString());
    if (!existingDeletion) {
      conversation.deletedBy.push({
        userId: userId,
        deletedAt: new Date()
      });
      await conversation.save();
    }

    res.json({ message: 'Conversation deleted successfully' });

  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ message: 'Failed to delete conversation' });
  }
};

// Search messages
exports.searchMessages = async (req, res) => {
  try {
    const { query, conversationId } = req.query;
    const userId = req.user._id;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchQuery = {
      message: { $regex: query, $options: 'i' },
      isDeleted: false
    };

    if (conversationId) {
      // Check if user is participant in conversation
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(userId)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      searchQuery.conversationId = conversationId;
    } else {
      // Search across all user's conversations
      const userConversations = await Conversation.find({
        participants: userId
      }).select('_id');
      
      searchQuery.conversationId = { $in: userConversations.map(c => c._id) };
    }

    const messages = await Message.find(searchQuery)
      .populate('senderId', 'firstName lastName profilePicture')
      .populate('conversationId', 'title')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ messages });

  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ message: 'Failed to search messages' });
  }
};

// Send update request
exports.sendUpdateRequest = async (req, res) => {
  try {
    const { taskId, message } = req.body;
    const userId = req.user._id;

    if (!taskId || !message) {
      return res.status(400).json({ message: 'Task ID and message are required' });
    }

    // Find the task and get the selected freelancer
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.clientId.toString() !== userId) {
      return res.status(403).json({ message: 'Only task owner can send update requests' });
    }

    if (!task.selectedFreelancerId) {
      return res.status(400).json({ message: 'No freelancer selected for this task' });
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      taskId: taskId,
      participants: { $all: [userId, task.selectedFreelancerId] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [userId, task.selectedFreelancerId],
        taskId: taskId,
        title: `Discussion about: ${task.title}`
      });
      await conversation.save();
    }

    // Create update request message
    const updateMessage = new Message({
      conversationId: conversation._id,
      senderId: userId,
      receiverId: task.selectedFreelancerId,
      content: `Update Request: ${message}`,
      messageType: 'update_request',
      isSystemMessage: false
    });

    await updateMessage.save();

    res.json({ 
      message: 'Update request sent successfully',
      conversationId: conversation._id
    });

  } catch (error) {
    console.error('Error sending update request:', error);
    res.status(500).json({ message: 'Failed to send update request' });
  }
};
