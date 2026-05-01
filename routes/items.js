const express = require('express');
const router = express.Router();
const {
  createItem,
  getItems,
  getMyItems,
  getItem,
  updateItem,
  deleteItem,
  getNearbyItems,
  verifyOwnership,
  resolveItem,
  getItemStats
} = require('../controllers/itemController');
const { protect, adminOnly } = require('../middleware/auth');

// Public routes
router.get('/', getItems);
router.get('/nearby', getNearbyItems);
router.get('/:id', getItem);

// Protected routes
router.post('/', protect, createItem);
router.get('/my/items', protect, getMyItems);
router.put('/:id', protect, updateItem);
router.delete('/:id', protect, deleteItem);
router.post('/:id/verify', protect, verifyOwnership);
router.put('/:id/resolve', protect, resolveItem);

// Admin routes
router.get('/stats/admin', protect, adminOnly, getItemStats);

module.exports = router;
