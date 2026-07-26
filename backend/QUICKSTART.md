# 🚀 JERTS CART Backend Quick Start Guide

## Step 1: Database Setup

SQLite requires no separate server — it runs as an embedded database in the Node.js process. No installation or startup is needed beyond the `better-sqlite3` npm package (installed automatically with `npm install`).

## Step 2: Install Node.js Dependencies

```bash
cd /home/belteshazzarkijin/danny/JERTS CART/backend
npm install
```

## Step 3: Configure Environment

The `.env` file is already created with development defaults. You can modify if needed:

```bash
# Default settings (already in .env):
PORT=5000
SQLITE_PATH=./data/uni-hub.db
JWT_SECRET=uni-hub-dev-secret-key-change-in-production-2026
```

## Step 4: Seed the Database

```bash
npm run seed
```

This will create:
- 1 admin user
- 4 sample users
- 8 sample products

## Step 5: Start the Backend Server

```bash
# Development mode (auto-reload on changes)
npm run dev

# Or production mode
npm start
```

You should see:
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎓 JERTS CART Backend API                                  ║
║                                                           ║
║   Server running on port 5000                             ║
║   Environment: development                                ║
║   API: http://localhost:5000/api                          ║
║   Health: http://localhost:5000/api/health                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

## Step 6: Test the API

### Test Health Endpoint
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "JERTS CART API is running",
  "timestamp": "2026-03-28T...",
  "environment": "development"
}
```

### Test Login (Admin)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@unihub.local","password":"Admin123!"}'
```

### Test Get Products
```bash
curl http://localhost:5000/api/products
```

## Step 7: Connect Frontend

The frontend is already configured to connect to `http://localhost:5000/api`.

Start the frontend:
```bash
cd /home/belteshazzarkijin/danny/JERTS CART
npm run dev
```

Then open `http://localhost:8000` in your browser.

## 📝 Default Login Credentials

### Admin Account
- **Email:** `admin@unihub.local`
- **Password:** `Admin123!`

### Sample User Accounts
- **Email:** `kwame.mensah@ug.edu.gh`
- **Password:** `password123`

## 🔧 Troubleshooting

### Database Connection Error
```
Error: Cannot open database at SQLITE_PATH
```
**Solution:** Ensure the directory for the SQLite file exists and `SQLITE_PATH` in `.env` is set to a valid path.

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:** Change port in `.env`
```
PORT=5001
```

### Module Not Found
```
Error: Cannot find module 'express'
```
**Solution:** Install dependencies
```bash
npm install
```

## 📚 API Documentation

Full API documentation are in the backend README.md file.

## Next Steps

1. ✅ Backend is running
2. ✅ Frontend is connected
3. 🔄 Test all features (register, login, browse, cart, checkout)
4. 🔄 Add your own products
5. 🔄 Test student verification

---

**Need Help?** Check the full README.md or the API documentation.
