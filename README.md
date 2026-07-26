# JERTS CART - Student Marketplace

A web-based student marketplace for buying and selling used items on university campuses in Ghana.

## Quick Start

### Prerequisites
- Node.js v18+
- SQLite (embedded, no separate install needed)

### Start the Application

```bash
# Make the startup script executable
chmod +x start-uni-hub.sh

# Start both frontend and backend
./start-uni-hub.sh
```

Then open: **http://localhost:8000**

### Test Credentials
```
Email: admin@unihub.local
Password: Admin123!
```

## Project Structure

```
JERTS CART/
├── backend/                 # Express.js API Server
│   ├── server.js           # Main entry point (port 5000)
│   ├── config/             # Database configuration
│   ├── controllers/        # Business logic
│   ├── models/ # Database schemas
│   ├── routes/             # API endpoints
│   ├── middleware/         # Authentication middleware
│   └── utils/              # Utilities and seed data
├── js/                     # Frontend JavaScript
│   ├── app.js              # Main app initializer
│   ├── router.js           # Hash-based SPA router
│   ├── modules/            # Feature modules (auth, cart, products, etc.)
│   ├── admin/              # Admin dashboard modules
│   ├── pages/              # Page renderers
│   ├── utils/              # Utilities (validation, storage, API, etc.)
│   └── setup/              # Global setup and configuration
├── css/                    # Styling
│   ├── components/         # Component styles
│   └── pages/              # Page-specific styles
├── components/             # HTML components (landing page sections)
├── data/                   # JSON data files
├── assets/                 # Images, fonts, videos
├── docs/                   # Documentation
├── index.html              # Main entry point
└── start-uni-hub.sh        # Startup script
```

## Features

### Implemented
- ✅ User registration and authentication (JWT)
- ✅ Student verification system
- ✅ Product marketplace (browse, search, filter)
- ✅ Shopping cart and checkout
- ✅ Order tracking and management
- ✅ Payment processing (MoMo, Telecel, Bank, Cash)
- ✅ Delivery tracking (Bolt, Yango, In-person)
- ✅ Admin dashboard
- ✅ Reporting system
- ✅ Ghana-specific payment methods and universities

### Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (SPA with hash-based routing)
- **Backend**: Node.js, Express.js, better-sqlite3 (SQLite)
- **Security**: JWT authentication, bcrypt password hashing, Helmet, CORS, rate limiting
- **Build**: Vite (optional), http-server for production

## Architecture

```
┌─────────────────┐
│  User's Browser │  (Port 8000)
│   Frontend SPA  │
└────────┬────────┘
         │ HTTP API (CORS)
┌────────▼────────┐
│ Backend API │ (Port 5000)
│ Express Server │
└────────┬────────┘
        │ SQLite Queries
┌────────▼────────┐
│ SQLite │ (Embedded)
│ Database │
└─────────────────┘
```

## API Endpoints

The backend provides 58+ API endpoints including:
- Authentication (register, login, profile)
- Products (CRUD, search, filter)
- Orders (create, track, manage)
- Payments (initialize, verify)
- Delivery (create, track, update status)
- Verification (submit, approve, reject)
- Admin (dashboard, users, products, reports)

See `API_ENDPOINTS.md` for complete documentation.

## Development

### Frontend
```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (port 3000)
npm start            # Serve with http-server (port 8000)
npm run lint         # Lint and fix JS files
npm run format       # Format code with Prettier
```

### Backend
```bash
cd backend
npm install          # Install dependencies
npm run dev          # Start with nodemon (auto-reload)
npm start            # Start production server
npm run seed         # Seed database with sample data
npm run lint         # Lint backend files
```

## Deployment

For production deployment:
1. Change `JWT_SECRET` in `backend/.env` to a strong random key
2. Change `ADMIN_PASSWORD` to a strong password
3. Set `NODE_ENV=production`
4. SQLite database file is created automatically — no external DB server needed
5. Configure proper CORS origins
6. Set up SSL certificates

## License

MIT

## Support

- Email: support@uni-hub.local
- Phone: +233 50 123 4567
# Agri-Flow-2.0
