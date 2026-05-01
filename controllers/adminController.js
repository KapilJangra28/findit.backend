const User = require('../models/User');
const Item = require('../models/Item');
const Message = require('../models/Message');

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check against admin credentials from env
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Find or create admin user
    let admin = await User.findOne({ email });

    if (!admin) {
      admin = await User.create({
        firstName: 'Admin',
        lastName: 'Findit',
        email,
        studentId: 'ADMIN001',
        password: password,
        role: 'admin'
      });
    } else if (admin.role !== 'admin') {
      admin.role = 'admin';
      await admin.save();
    }

    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    res.json({
      success: true,
      token,
      user: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
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

// @desc    Get all items (admin view)
// @route   GET /api/admin/items
// @access  Admin
exports.getAllItemsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, category } = req.query;

    let query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (category) query.category = category;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const items = await Item.find(query)
      .populate('user', 'firstName lastName email studentId')
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

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting admin
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin user'
      });
    }

    // Delete user's items and messages
    await Item.deleteMany({ user: req.params.id });
    await Message.deleteMany({ 
      $or: [{ sender: req.params.id }, { receiver: req.params.id }] 
    });

    await user.deleteOne();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reject/delete item
// @route   DELETE /api/admin/items/:id
// @access  Admin
exports.rejectItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Soft delete - mark as rejected
    item.status = 'rejected';
    await item.save();

    res.json({
      success: true,
      message: 'Item rejected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark item as resolved (admin)
// @route   PUT /api/admin/items/:id/resolve
// @access  Admin
exports.resolveItemAdmin = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    item.status = 'resolved';
    item.resolvedAt = new Date();
    await item.save();

    res.json({
      success: true,
      message: 'Item marked as resolved',
      item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
exports.getStats = async (req, res) => {
  try {
    // User stats
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalStudents = totalUsers - totalAdmins;

    // Item stats
    const totalItems = await Item.countDocuments();
    const pendingItems = await Item.countDocuments({ status: 'pending' });
    const resolvedItems = await Item.countDocuments({ status: 'resolved' });
    const claimedItems = await Item.countDocuments({ status: 'claimed' });

    // Items by type
    const lostItems = await Item.countDocuments({ type: 'lost' });
    const foundItems = await Item.countDocuments({ type: 'found' });

    // Message stats
    const totalMessages = await Message.countDocuments();
    const unreadMessages = await Message.countDocuments({ isRead: false });

    // Recent activity
    const recentItems = await Item.find()
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentUsers = await User.find()
      .select('firstName lastName email createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          students: totalStudents,
          admins: totalAdmins
        },
        items: {
          total: totalItems,
          pending: pendingItems,
          resolved: resolvedItems,
          claimed: claimedItems,
          lost: lostItems,
          found: foundItems
        },
        messages: {
          total: totalMessages,
          unread: unreadMessages
        },
        recentItems,
        recentUsers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
