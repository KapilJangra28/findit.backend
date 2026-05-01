const Message = require('../models/Message');
const Item = require('../models/Item');

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, itemId, content, verificationPassed } = req.body;

    // Verify item exists
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Verify receiver is the item owner
    if (item.user.toString() !== receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid receiver'
      });
    }

    const message = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      item: itemId,
      content,
      verificationPassed: verificationPassed || false
    });

    // Populate sender info
    await message.populate('sender', 'firstName lastName');
    await message.populate('receiver', 'firstName lastName');

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get conversation between two users
// @route   GET /api/messages/conversation/:userId
// @access  Private
exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { itemId } = req.query;

    let query = {
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId, receiver: req.user.id }
      ]
    };

    // Filter by item if provided
    if (itemId) {
      query.item = itemId;
    }

    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName')
      .populate('receiver', 'firstName lastName')
      .populate('item', 'title')
      .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      { receiver: req.user.id, sender: userId, isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all conversations for user
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    // Get unique conversations
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: req.user._id }, { receiver: req.user._id }]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ['$sender', req.user._id] },
              then: '$receiver',
              else: '$sender'
            }
          },
          lastMessage: { $first: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          '_id': 1,
          'lastMessage.content': 1,
          'lastMessage.createdAt': 1,
          'lastMessage.isRead': 1,
          'user.firstName': 1,
          'user.lastName': 1,
          'user.avatar': 1
        }
      }
    ]);

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get unread message count
// @route   GET /api/messages/unread
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user.id,
      isRead: false
    });

    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark message as read
// @route   PUT /api/messages/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only receiver can mark as read
    if (message.receiver.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    message.isRead = true;
    await message.save();

    res.json({
      success: true,
      message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Socket.io handler function
exports.handleNewMessage = (io, socket, message) => {
  // Emit to receiver
  io.to(message.receiver.toString()).emit('newMessage', message);
  
  // Emit to sender
  io.to(message.sender.toString()).emit('messageSent', message);
};
