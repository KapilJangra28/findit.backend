const Item = require('../models/Item');

// @desc    Create new item (lost or found)
// @route   POST /api/items
// @access  Private
exports.createItem = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      image,
      location,
      verificationQuestion,
      verificationAnswer,
      lastSeen,
      reward,
      dateLost
    } = req.body;

    const item = await Item.create({
      title,
      description,
      type,
      category,
      image,
      location,
      verificationQuestion,
      verificationAnswer,
      lastSeen,
      reward,
      dateLost,
      user: req.user.id
    });

    res.status(201).json({
      success: true,
      item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all items
// @route   GET /api/items
// @access  Public
exports.getItems = async (req, res) => {
  try {
    const { type, category, status, search, page = 1, limit = 20 } = req.query;

    // Build query
    let query = {};

    // Filter by type (lost/found)
    if (type) query.type = type;

    // Filter by category
    if (category) query.category = category;

    // Filter by status
    if (status) query.status = status;
    else query.status = { $ne: 'rejected' };

    // Search in title and description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const items = await Item.find(query)
      .populate('user', 'firstName lastName studentId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Item.countDocuments(query);

    res.json({
      success: true,
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's items
// @route   GET /api/items/myitems
// @access  Private
exports.getMyItems = async (req, res) => {
  try {
    const items = await Item.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Public
exports.getItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('user', 'firstName lastName studentId email');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Increment views
    item.views += 1;
    await item.save();

    res.json({
      success: true,
      item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private (owner only)
exports.updateItem = async (req, res) => {
  try {
    let item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check ownership
    if (item.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this item'
      });
    }

    const {
      title,
      description,
      category,
      image,
      location,
      verificationQuestion,
      verificationAnswer,
      lastSeen,
      reward
    } = req.body;

    item = await Item.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        category,
        image,
        location,
        verificationQuestion,
        verificationAnswer,
        lastSeen,
        reward
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private (owner or admin)
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check ownership or admin
    if (item.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this item'
      });
    }

    await item.deleteOne();

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get nearby items
// @route   GET /api/items/nearby
// @access  Public
exports.getNearbyItems = async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query; // radius in km

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }

    const items = await Item.find({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000 // Convert km to meters
        }
      },
      status: { $ne: 'rejected' }
    })
      .populate('user', 'firstName lastName')
      .limit(20);

    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify item ownership
// @route   POST /api/items/:id/verify
// @access  Private
exports.verifyOwnership = async (req, res) => {
  try {
    const { answer } = req.body;

    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check if answer matches (case-insensitive)
    const isCorrect = item.verificationAnswer.toLowerCase() === answer.toLowerCase();

    if (!isCorrect) {
      return res.status(400).json({
        success: false,
        message: 'Verification failed. Incorrect answer.'
      });
    }

    // Update item status
    item.status = 'claimed';
    item.claimedBy = req.user.id;
    await item.save();

    res.json({
      success: true,
      message: 'Verification successful! You can now contact the finder.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark item as resolved
// @route   PUT /api/items/:id/resolve
// @access  Private (item owner)
exports.resolveItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Only item owner can mark as resolved
    if (item.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    item.status = 'resolved';
    item.resolvedAt = new Date();
    await item.save();

    res.json({
      success: true,
      message: 'Item marked as resolved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get item statistics (admin)
// @route   GET /api/items/stats
// @access  Admin
exports.getItemStats = async (req, res) => {
  try {
    const stats = await Item.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryStats = await Item.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const typeStats = await Item.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        status: stats,
        category: categoryStats,
        type: typeStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
