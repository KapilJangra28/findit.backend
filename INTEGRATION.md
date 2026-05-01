# Findit Frontend Integration Guide

This guide explains how to connect your existing Findit.html frontend to the backend API without changing any UI.

---

## Base URL

```javascript
const API_URL = 'http://localhost:5000/api';
```

---

## 1. Authentication

### Store Token

When user logs in, store the token:

```javascript
localStorage.setItem('token', data.token);
localStorage.setItem('user', JSON.stringify(data.user));
```

### Get Token

```javascript
const token = localStorage.getItem('token');
```

### Include Token in Requests

```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
}
```

---

## 2. Signup API

### Request

```javascript
// POST /api/auth/signup
fetch(`${API_URL}/auth/signup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: document.getElementById('su-fname').value,
    lastName: document.getElementById('su-lname').value,
    email: document.getElementById('su-email').value,
    studentId: document.getElementById('su-id').value,
    password: document.getElementById('su-pass').value
  })
})
```

### Response

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": "...",
    "firstName": "Kapil",
    "lastName": "Jangra",
    "email": "kapil@campus.edu",
    "studentId": "2021CSE1234",
    "role": "student"
  }
}
```

### Frontend Integration

Update `handleSignup()` in Findit.html:

```javascript
function handleSignup() {
  const fname = document.getElementById('su-fname').value;
  const lname = document.getElementById('su-lname').value;
  const email = document.getElementById('su-email').value;
  const studentId = document.getElementById('su-id').value;
  const password = document.getElementById('su-pass').value;

  if (!fname || !email || !studentId || !password) {
    showToast('Please fill in all details.', '⚠️', 'error');
    return;
  }

  fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName: fname, lastName: lname, email, studentId, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      closeModal('signup');
      showToast(`Welcome, ${data.user.firstName}!`, '🎉', 'success');
    } else {
      showToast(data.message, '⚠️', 'error');
    }
  })
  .catch(err => showToast('Connection error', '⚠️', 'error'));
}
```

---

## 3. Login API

### Request

```javascript
// POST /api/auth/login
fetch(`${API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: document.getElementById('login-email').value,
    password: document.getElementById('login-pass').value
  })
})
```

### Response

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1...",
  "user": { ... }
}
```

### Frontend Integration

Update `handleLogin()` in Findit.html:

```javascript
function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-pass').value;

  if (!email || !password) {
    showToast('Please enter your credentials.', '⚠️', 'error');
    return;
  }

  fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      closeModal('login');
      showToast('Welcome back!', '🎉', 'success');
    } else {
      showToast(data.message, '⚠️', 'error');
    }
  })
  .catch(err => showToast('Connection error', '⚠️', 'error'));
}
```

---

## 4. Get All Items

### Request

```javascript
// GET /api/items
// Optional query params: ?type=lost&category=electronics&search=wallet&status=pending
fetch(`${API_URL}/items`)
```

```javascript
// With filters
fetch(`${API_URL}/items?type=found&category=electronics`)
```

### Response

```json
{
  "success": true,
  "items": [
    {
      "_id": "...",
      "title": "iPhone 14 Pro",
      "description": "Found near library",
      "type": "found",
      "category": "electronics",
      "image": "https://cloudinary.com/...",
      "location": { "address": "Library", "coordinates": { "type": "Point", "coordinates": [76.8, 30.5] } },
      "user": { "firstName": "John", "lastName": "Doe" },
      "status": "pending",
      "createdAt": "2025-04-30T..."
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 50, "pages": 3 }
}
```

### Frontend Integration

Update `ITEMS` array and `renderItems()` in Findit.html:

```javascript
let ITEMS = [];

// Fetch items on load
fetch(`${API_URL}/items`)
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      ITEMS = data.items.map(item => ({
        id: item._id,
        name: item.title,
        cat: item.category,
        type: item.type,
        emoji: getEmoji(item.category),
        loc: item.location.address || 'Unknown',
        date: new Date(item.createdAt).toLocaleDateString('en-GB'),
        color: item.type === 'found' ? '#4CAF50' : '#ef4444',
        image: item.image,
        description: item.description
      }));
      renderItems(ITEMS);
    }
  });

function getEmoji(cat) {
  const emojis = {
    electronics: '📱',
    accessories: '🎒',
    documents: '🪪',
    clothing: '👕',
    books: '📚',
    keys: '🔑',
    other: '📦'
  };
  return emojis[cat] || '📦';
}
```

---

## 5. Create Item (Found)

### Request

```javascript
// POST /api/items
// Requires: Authorization header
fetch(`${API_URL}/items`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Blue Backpack',
    description: 'Found near hostel C',
    type: 'found',
    category: 'accessories',
    location: {
      address: 'Hostel C Gate',
      placeName: 'CGC Jhanjeri'
    },
    verificationQuestion: 'What sticker is on the bag?',
    verificationAnswer: 'Spider-man'
  })
})
```

### Response

```json
{
  "success": true,
  "item": { "_id": "...", "title": "Blue Backpack", ... }
}
```

### Frontend Integration

Update `submitFoundForm()` in Findit.html:

```javascript
function submitFoundForm() {
  const token = localStorage.getItem('token');
  if (!token) {
    showToast('Please sign in first.', '⚠️', 'error');
    openModal('login');
    return;
  }

  const name = document.getElementById('f-name').value;
  const category = document.getElementById('f-cat').value;
  const loc = document.getElementById('f-loc').value;
  const desc = document.getElementById('f-desc').value;
  const verif = document.getElementById('f-verif').value;

  if (!name || !loc || !desc) {
    showToast('Please fill in all required fields.', '⚠️', 'error');
    return;
  }

  fetch(`${API_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: name,
      type: 'found',
      category: category || 'other',
      description: desc,
      location: { address: loc },
      verificationQuestion: verif,
      verificationAnswer: verif.split(' ')[0] // Simple: first word as answer
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast(`Found item "${name}" reported!`, '✅', 'success');
      filterItems(); // Refresh list
      // Clear form
      ['f-name','f-loc','f-desc','f-email','f-verif'].forEach(id => 
        document.getElementById(id).value=''
      );
    } else {
      showToast(data.message, '⚠️', 'error');
    }
  })
  .catch(err => showToast('Connection error', '⚠️', 'error'));
}
```

---

## 6. Create Item (Lost)

### Request

```javascript
// POST /api/items
fetch(`${API_URL}/items`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'iPhone 14 Pro',
    description: 'Lost in library',
    type: 'lost',
    category: 'electronics',
    location: { address: 'Main Library' },
    reward: '₹500'
  })
})
```

### Frontend Integration

Update `submitLostForm()` in Findit.html:

```javascript
function submitLostForm() {
  const token = localStorage.getItem('token');
  if (!token) {
    showToast('Please sign in first.', '⚠️', 'error');
    openModal('login');
    return;
  }

  const name = document.getElementById('l-name').value;
  const category = document.getElementById('l-cat').value;
  const loc = document.getElementById('l-loc').value;
  const desc = document.getElementById('l-desc').value;
  const reward = document.getElementById('l-reward').value;

  if (!name || !loc || !desc) {
    showToast('Please fill in all required fields.', '⚠️', 'error');
    return;
  }

  fetch(`${API_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: name,
      type: 'lost',
      category: category || 'other',
      description: desc,
      location: { address: loc },
      reward: reward
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast(`Lost item "${name}" posted!`, '🔍', 'success');
      filterItems();
      ['l-name','l-loc','l-desc','l-email','l-reward'].forEach(id => 
        document.getElementById(id).value=''
      );
    } else {
      showToast(data.message, '⚠️', 'error');
    }
  })
  .catch(err => showToast('Connection error', '⚠️', 'error'));
}
```

---

## 7. Image Upload

### Request

```javascript
// POST /api/upload (multipart/form-data)
const formData = new FormData();
formData.append('image', fileInput.files[0]);

fetch(`${API_URL}/upload`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
})
```

### Response

```json
{
  "success": true,
  "url": "https://cloudinary.com/..."
}
```

### Use with Item Creation

```javascript
// First upload image, get URL, then create item
```

---

## 8. Verify Ownership

### Request

```javascript
// POST /api/items/:id/verify
fetch(`${API_URL}/items/${itemId}/verify`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    answer: document.getElementById('vq1').value
  })
})
```

### Frontend Integration

Update `submitClaim()` in Findit.html:

```javascript
function submitClaim() {
  const token = localStorage.getItem('token');
  if (!token) {
    showToast('Please sign in first.', '⚠️', 'error');
    openModal('login');
    return;
  }

  // Get current item ID from click
  const itemId = localStorage.getItem('currentItemId');
  const answer = document.getElementById('vq1').value;

  fetch(`${API_URL}/items/${itemId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ answer })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      closeModal('claim');
      showToast('Verification passed!', '✅', 'success');
      // You can now message the finder
    } else {
      showToast(data.message, '⚠️', 'error');
    }
  })
  .catch(err => showToast('Connection error', '⚠️', 'error'));
}
```

---

## 9. Real-time Chat (Socket.io)

### Client Setup

Add to Findit.html `<head>`:

```html
<script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
```

### Connect

```javascript
const socket = io('http://localhost:5000');

// Join your room
const user = JSON.parse(localStorage.getItem('user'));
if (user) {
  socket.emit('join', user.id);
}

// Receive message
socket.on('newMessage', (message) => {
  showToast('New message received!', '💬', 'success');
  // Update chat UI
});

// Send message
function sendChatMessage(content, receiverId) {
  socket.emit('sendMessage', {
    senderId: user.id,
    receiverId: receiverId,
    content: content
  });
}
```

---

## 10. Check Auth Status

```javascript
function isLoggedIn() {
  return !!localStorage.getItem('token');
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('user'));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showToast('Logged out successfully', '👋', 'success');
}
```

---

## Complete API Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|---------|------------|-------|
| POST | /api/auth/signup | Register new user | No |
| POST | /api/auth/login | User login | No |
| GET | /api/auth/me | Get current user | Yes |
| GET | /api/items | Get all items | No |
| GET | /api/items/:id | Get single item | No |
| POST | /api/items | Create item | Yes |
| PUT | /api/items/:id | Update item | Yes |
| DELETE | /api/items/:id | Delete item | Yes |
| POST | /api/items/:id/verify | Verify ownership | Yes |
| GET | /api/items/nearby | Get nearby items | No |
| POST | /api/messages | Send message | Yes |
| GET | /api/messages/conversation/:userId | Get conversation | Yes |
| POST | /api/admin/login | Admin login | No |
| GET | /api/admin/stats | Dashboard stats | Admin |
| GET | /api/admin/users | All users | Admin |
| DELETE | /api/admin/users/:id | Delete user | Admin |
