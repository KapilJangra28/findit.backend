const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to database
const connectDB = require('./config/db');
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'https://findit-frontend-e141.vercel.app/'
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5500", // for local testing
    "https://findit-frontend-e141.vercel.app/" // 🔥 replace with your real frontend URL
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Findit API is running' });
});

// Socket.io handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user's personal room
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  // Handle sending message via socket
  socket.on('sendMessage', async (data) => {
    const { receiverId, senderId, content, itemId } = data;
    
    // Emit to receiver
    io.to(receiverId).emit('newMessage', {
      sender: senderId,
      content,
      item: itemId,
      createdAt: new Date()
    });
    
    // Confirm to sender
    io.to(senderId).emit('messageSent', {
      success: true,
      receiver: receiverId
    });
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    io.to(data.receiverId).emit('userTyping', {
      userId: data.senderId,
      isTyping: data.isTyping
    });
  });

  // Handle read receipts
  socket.on('markRead', (data) => {
    io.to(data.senderId).emit('messageRead', {
      messageId: data.messageId
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible in routes
app.set('io', io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };
