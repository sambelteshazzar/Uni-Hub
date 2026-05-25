# 🎓 Uni-Hub Complete Setup Guide

## Prerequisites Check
Before starting, ensure you have:
- ✅ Node.js v18+ installed
- ✅ npm or yarn package manager

---

## Step 1: Install All Dependencies

### Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### Frontend Dependencies
```bash
npm install
```

---

## Step 2: Database Setup

SQLite requires no separate server — it runs as an embedded database in the Node.js process. No installation or startup is needed beyond the `better-sqlite3` npm package (installed automatically with `npm install`).

---

## Step 3: Seed Initial Data (Optional but Recommended)

```bash
cd backend
npm run seed
cd ..
```

This will populate SQLite with:
- Sample students/users
- Sample products
- Sample categories
- Sample regions (for delivery)

---

## Step 4: Start Backend Server

```bash
cd backend
npm run dev
```

Expected output:
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎓 Uni-Hub Backend API                                  ║
║                                                           ║
║   Server running on port 5000                             ║
║   Environment: development                                ║
║   API: http://localhost:5000/api                          ║
║   Health: http://localhost:5000/api/health                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

✅ Backend is ready!

---

## Step 5: Start Frontend Server (New Terminal)

```bash
npm run dev
# or for production-like environment
npm start
```

Expected output will show:
```
  ➜  Local:   http://localhost:8000
```

✅ Frontend is ready!

---

## Access Uni-Hub

🌐 **Open your browser and go to:**
```
http://localhost:8000
```

---

## Available Endpoints & Features

### 🔐 Authentication
- **Signup:** POST `/api/auth/register`
  - Required: email, password, firstName, lastName, university, studentId
  - Creates new student account
  
- **Login:** POST `/api/auth/login`
  - Required: email, password
  - Returns JWT token

- **Get Profile:** GET `/api/auth/me` (Protected)
  - Returns current user profile

### ✅ Verification (Student)
- **Submit Verification:** POST `/api/verification`
  - Required: studentId, university, matricNumber
  - Allows admin to verify student status
  
- **Check Status:** GET `/api/verification/status/:studentId/:university`
  - Verify if account is approved by admin

### 🛒 Products
- **Get All:** GET `/api/products`
- **Create:** POST `/api/products` (Protected)
  - Add products to sell
  
- **Update:** PUT `/api/products/:id` (Protected)
- **Delete:** DELETE `/api/products/:id` (Protected)

### 🛍️ Orders
- **Create Order:** POST `/api/orders` (Protected)
- **Get My Orders:** GET `/api/orders` (Protected)
- **Track Order:** GET `/api/orders/:id` (Protected)

### 💳 Payment
- **Process Payment:** POST `/api/payment/process` (Protected)
- **Payment Status:** GET `/api/payment/status/:orderId` (Protected)

### 🚚 Delivery
- **Calculate Shipping:** POST `/api/delivery/calculate`
- **Track Delivery:** GET `/api/delivery/track/:deliveryId`

### 📊 Reports
- **Submit Report:** POST `/api/reports` (Protected)
  - Report suspicious products or behavior

### 👨‍💼 Admin Panel
- **Get Dashboard:** GET `/api/admin/dashboard` (Admin Only)
- **Manage Users:** GET/PUT `/api/admin/users` (Admin Only)
- **Manage Products:** GET/PUT `/api/admin/products` (Admin Only)
- **Verify Students:** GET/PUT `/api/admin/verification` (Admin Only)

---

## Test Credentials

After running seed data:

**Admin Account:**
```
Email: admin@unihub.local
Password: Admin123!
```

**Test Student:**
```
Email: john@example.com
Password: Password123!
University: University of Ghana
```

---

## Quick Test: Is Everything Working?

### Test Backend Health
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Uni-Hub API is running",
  "environment": "development"
}
```

### Test Frontend
Visit: `http://localhost:8000`
- You should see the landing page
- Try navigating to different sections
- Test signup/login functionality

---

## Troubleshooting

### ❌ "Database Connection Error"
**Solution:** SQLite requires no separate server — it runs as an embedded database in the Node.js process. Check that the `SQLITE_PATH` in `.env` points to a valid file path.

### ❌ "Port 5000 already in use"
**Solution:** Change PORT in `.env` to another value (e.g., 5001)

### ❌ "Cannot find module 'dotenv'"
**Solution:** Reinstall backend dependencies
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### ❌ "Frontend shows blank/errors"
**Solution:** Clear browser cache and hard reload
```
Ctrl+Shift+Del (or Cmd+Shift+Del on Mac)
```

---

## Production Considerations

When deploying to production:

1. **Change JWT_SECRET** to a strong random key
2. **Change ADMIN_PASSWORD** to a strong password
3. **Set NODE_ENV=production**
4. **Use a managed SQLite host or migrate to PostgreSQL** instead of local SQLite for multi-process production
5. **Configure proper CORS origins**
6. **Set up SSL certificates**
7. **Use environment variables** (not hardcoded values)

---

## Architecture Overview

```
Uni-Hub (Complete Student Marketplace)
│
├─ Frontend (Port 8000)
│  ├─ Landing Page
│  ├─ User Dashboard
│  ├─ Product Listings
│  ├─ Shopping Cart
│  ├─ Checkout
│  ├─ Order Tracking
│  ├─ Admin Panel
│  └─ Settings
│
├─ Backend API (Port 5000)
│  ├─ Authentication (JWT)
│  ├─ Student Verification
│  ├─ Products Management
│  ├─ Orders Processing
│  ├─ Payment Gateway
│  ├─ Delivery Tracking
│  ├─ Admin Dashboard
│  └─ Reports System
│
└─ Database (SQLite)
   └─ Tables: Users, Products, Orders, Payments, etc.
```

---

## Next Steps

1. ✅ Database ready (SQLite — no separate server needed)
2. ✅ Start Backend Server
3. ✅ Start Frontend Server
4. ✅ Visit http://localhost:8000
5. ✅ Create a test account
6. ✅ Test features

**Your Uni-Hub is now fully functional!** 🚀

---

**Questions?** Check the backend docs in `backend/README.md`
