const express = require('express');
const router = express.Router();
const {
  adminLogin,
  getAllUsers,
  getAllItemsAdmin,
  deleteUser,
  rejectItem,
  resolveItemAdmin,
  getStats
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

// Public route
router.post('/login', adminLogin);

// All other admin routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.get('/items', getAllItemsAdmin);
router.delete('/items/:id', rejectItem);
router.put('/items/:id/resolve', resolveItemAdmin);

module.exports = router;
