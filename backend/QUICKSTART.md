# 🚀 Uni-Hub Backend Quick Start Guide

## Step 1: Install MongoDB

### Option A: Local MongoDB (Recommended for Development)

**Windows:**
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run the installer and follow the prompts
3. MongoDB will run as a Windows service automatically

**macOS:**
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Option B: MongoDB Atlas (Cloud - Free Tier)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster (free tier M0)
4. Get your connection string
5. Update `.env` with your connection string

## Step 2: Install Node.js Dependencies

```bash
cd /home/belteshazzarkijin/danny/Uni-Hub/backend
npm install
```

## Step 3: Configure Environment

The `.env` file is already created with development defaults. You can modify if needed:

```bash
# Default settings (already in .env):
PORT=5000
MONGODB_URI=mongodb://localhost:27017/uni-hub
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
║   🎓 Uni-Hub Backend API                                  ║
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
  "message": "Uni-Hub API is running",
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
cd /home/belteshazzarkijin/danny/Uni-Hub
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

### MongoDB Connection Error
```
MongoServerError: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Start MongoDB service
```bash
# Windows: Check Services or run:
net start MongoDB

# macOS:
brew services start mongodb-community

# Linux:
sudo systemctl start mongod
```

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
