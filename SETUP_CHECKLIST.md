# ✅ Uni-Hub Complete Setup Checklist

This checklist will walk you through setting up Uni-Hub from scratch to fully functional.

---

## Prerequisites (Do These First!)

- [ ] **Node.js installed** (v18 or higher)
  ```bash
  node --version  # Should be v18+
  npm --version   # Should be v9+
  ```

- [ ] **Git repository initialized** (if starting fresh)
  ```bash
  git status  # Should see your repo
  ```

---

## Phase 1: Database Setup

SQLite requires no separate server — it runs as an embedded database in the Node.js process. The database file is created automatically on first run.

---

## Phase 2: Backend Setup

- [ ] **Navigate to backend folder**
  ```bash
  cd backend
  ```

- [ ] **Install backend dependencies**
  ```bash
  npm install
  ```

- [ ] **.env file is configured** (already done)
  - Check file exists: `backend/.env`
  - Contains: `SQLITE_PATH`, `JWT_SECRET`, `ADMIN_EMAIL`, etc.

- [ ] **Run database seed (optional, adds test data)**
  ```bash
npm run seed
# This populates SQLite with sample users, products, regions
  ```

- [ ] **Start backend server**
  ```bash
  npm run dev
# Should see:
# ✅ SQLite Connected
# 🎓 Uni-Hub Backend API
  # Server running on port 5000
  ```

- [ ] **Test backend health** (Open new terminal)
  ```bash
  curl http://localhost:5000/api/health
  # Should return: {"success": true, "message": "Uni-Hub API is running", ...}
  ```

- [ ] **Backend is running ✅**
  - Keep this terminal open!
  - Backend URL: `http://localhost:5000/api`

---

## Phase 3: Frontend Setup

- [ ] **Navigate to root folder** (new terminal)
  ```bash
  cd /path/to/Uni-Hub  # Root directory
  ```

- [ ] **Install frontend dependencies**
  ```bash
  npm install
  ```

- [ ] **Start frontend server**
  ```bash
  npm run start
  # Should see:
  # ➜  Local:   http://localhost:8000
  ```

- [ ] **Frontend is running ✅**
  - URL: `http://localhost:8000`

---

## Phase 4: Full Integration Test

### Open Browser

- [ ] **Navigate to** `http://localhost:8000`
  - You should see the Uni-Hub landing page
  - Navigation should work smoothly

### Test Signup Feature

- [ ] **Click "Sign Up" or "Register"**
  - Form fields: Email, Password, First Name, Last Name, University, Student ID
  
- [ ] **Fill in test account**
  ```
  Email: teststudent@gmail.com
  Password: Test123!@
  First Name: Test
  Last Name: Student
  University: University of Ghana
  Student ID: 12345
  ```

- [ ] **Submit signup**
  - Should see success message
  - Account created in SQLite

### Test Verification Feature

- [ ] **Check verification dashboard** (Admin only)
  - Login with: `admin@unihub.local` / `Admin123!`
  - Navigate to Admin Panel
  - Verify Students section
  - You should see pending verification for new account

### Test Products Feature

- [ ] **View products**
  - Click Products/Browse
  - See sample products (if seed data was run)

### Test Shopping

- [ ] **Add product to cart**
  - Click a product
  - Click "Add to Cart"
  - Cart updates

- [ ] **View cart**
  - Click cart icon
  - See added product

---

## Phase 5: Key Features Verification

### Authentication
- [ ] Can signup new account
- [ ] Can login with credentials
- [ ] Can view profile
- [ ] Can logout

### Products
- [ ] Can view all products
- [ ] Can create new product (logged in)
- [ ] Can edit own product
- [ ] Can delete own product

### Orders
- [ ] Can create order
- [ ] Can view my orders
- [ ] Can track order status

### Verification (Admin)
- [ ] Admin can view pending verifications
- [ ] Admin can approve student
- [ ] Admin can reject student

### Payments
- [ ] Payment form appears in checkout
- [ ] Stripe integration working (if configured)

### Delivery
- [ ] Can select delivery region
- [ ] Can calculate shipping cost
- [ ] Can track delivery

### Admin Dashboard
- [ ] Admin can login
- [ ] Can view user statistics
- [ ] Can view order statistics
- [ ] Can manage products
- [ ] Can manage users

---

## Phase 6: Troubleshooting

### Issue: Database Connection Error

**Symptoms:** Backend shows "Database Connection Error"

**Fix:**
SQLite runs as an embedded database — no separate server needed. Ensure the backend has write permissions to create the .db file in the configured `SQLITE_PATH`.

### Issue: Port Already in Use

**Symptoms:** "Port 5000 already in use" or "Port 8000 already in use"

**Fix:**
```bash
# Kill process using port
# macOS/Linux
lsof -ti:5000 | xargs kill -9  # For port 5000

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Issue: Frontend Shows Blank Page

**Fix:**
```bash
# Clear browser cache
Ctrl+Shift+Del  # or Cmd+Shift+Del on Mac

# Hard refresh
Ctrl+Shift+R  # or Cmd+Shift+R on Mac
```

### Issue: API Returning 404

**Symptoms:** Frontend can't reach backend

**Fix:**
- Check `.env` has `FRONTEND_URL=http://localhost:8000`
- Check backend CORS configuration in `server.js`
- Verify backend is running: `curl http://localhost:5000/api/health`

### Issue: Seed Data Not Working

**Symptoms:** No sample products/users in database

**Fix:**
```bash
cd backend
npm run seed

# Or manually check seeds file
cat utils/seedData.js  # Review what's being seeded
```

---

## Phase 7: Going Live

When ready to move to production:

### Backend Updates
- [ ] Change `JWT_SECRET` in `.env` to strong random key
- [ ] Change `ADMIN_PASSWORD` to strong password
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Set `SQLITE_PATH` to a persistent directory for the database file
- [ ] Set `FRONTEND_URL` to your production domain
- [ ] Add SSL certificate
- [ ] Configure email service (Gmail, SendGrid, etc.)

### Frontend Updates
- [ ] Update API_BASE_URL to production backend
- [ ] Change `FRONTEND_URL` in `.env` to production domain
- [ ] Build frontend: `npm run build`
- [ ] Deploy to hosting (Netlify, Vercel, AWS, etc.)

---

## Quick Reference Commands

```bash
# Backend
cd backend
npm install          # Install dependencies
npm run dev          # Start development server
npm run seed         # Seed database with test data
npm test             # Run tests

# Frontend
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm start            # Start with http-server
npm run build        # Build for production

# SQLite
# No separate server needed — embedded in Node.js process

# Testing APIs
curl http://localhost:5000/api/health  # Check backend
curl http://localhost:8000             # Check frontend
```

---

## Project Architecture

```
localhost:8000 (Frontend)
↓ (HTTP Requests)
localhost:5000 (Backend API)
↓ (Queries/Updates)
SQLite (Embedded Database)
```

---

## Support Features

All working in this complete setup:
✅ User authentication (signup/login/logout)
✅ Student verification
✅ Product management (create/edit/delete)
✅ Shopping cart & checkout
✅ Order tracking
✅ Payment processing (Stripe ready)
✅ Delivery management
✅ Admin dashboard
✅ Reports system
✅ Rate limiting
✅ CORS enabled
✅ JWT tokens
✅ Password hashing (bcrypt)

---

**Status: ✅ Complete Setup Ready**

Your Uni-Hub is now fully configured and ready for development and testing!
