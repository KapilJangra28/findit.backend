const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Item title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Item type is required'],
    enum: ['lost', 'found'],
    lowercase: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['electronics', 'accessories', 'documents', 'clothing', 'books', 'keys', 'other']
  },
  image: {
    type: String,
    default: ''
  },
  location: {
    address: {
      type: String,
      default: ''
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],  // [longitude, latitude]
        default: [0, 0]
      }
    },
    placeName: {
      type: String,
      default: ''
    }
  },
  verificationQuestion: {
    type: String,
    default: ''
  },
  verificationAnswer: {
    type: String,
    default: ''
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'claimed', 'resolved', 'rejected'],
    default: 'pending'
  },
  lastSeen: {
    type: String,
    default: ''
  },
  reward: {
    type: String,
    default: ''
  },
  dateLost: {
    type: Date
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolvedAt: {
    type: Date
  },
  views: {
    type: Number,
    default: 0
  },
  boost: {
    type: Boolean,
    default: false
  },
  boostExpiry: {
    type: Date
  }
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
itemSchema.index({ 'location.coordinates': '2dsphere' });

// Index for filtering
itemSchema.index({ type: 1, category: 1, status: 1 });
itemSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Item', itemSchema);
