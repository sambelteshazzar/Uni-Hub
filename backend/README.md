# Uni-Hub Backend API

Backend API for the Uni-Hub Student Marketplace platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- better-sqlite3 (installed via npm — no separate database server needed)

### Installation

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Configure environment:**
```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your settings
# At minimum, set:
# - SQLITE_PATH
# - JWT_SECRET (use a random string)
```

3. **Seed the database:**
```bash
npm run seed
```

4. **Start the server:**
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── config/
│ └── database.js # SQLite connection
├── controllers/
│   ├── auth.controller.js   # Authentication logic
│   ├── product.controller.js # Product CRUD
│   ├── order.controller.js  # Order management
│   └── verification.controller.js # Student verification
├── middleware/
│   └── auth.middleware.js   # JWT authentication
├── models/
│   ├── User.model.js        # User schema
│   ├── Product.model.js     # Product schema
│   ├── Order.model.js       # Order schema
│   └── StudentVerification.model.js # Verification schema
├── routes/
│   ├── auth.routes.js       # Auth endpoints
│   ├── product.routes.js    # Product endpoints
│   ├── order.routes.js      # Order endpoints
│   ├── user.routes.js       # User endpoints
│   ├── verification.routes.js # Verification endpoints
│   └── admin.routes.js      # Admin endpoints
├── utils/
│   ├── token.util.js        # JWT utilities
│   └── seedData.js          # Database seeder
├── .env                     # Environment variables
├── .env.example             # Environment template
├── package.json
└── server.js                # Entry point
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user (protected) |
| PUT | `/api/auth/profile` | Update profile (protected) |
| PUT | `/api/auth/change-password` | Change password (protected) |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products (with filters) |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create product (protected) |
| PUT | `/api/products/:id` | Update product (protected) |
| DELETE | `/api/products/:id` | Delete product (protected) |
| GET | `/api/products/seller/my-products` | Get seller's products (protected) |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create order (protected) |
| GET | `/api/orders/my-orders` | Get user's orders (protected) |
| GET | `/api/orders/:id` | Get single order (protected) |
| POST | `/api/orders/:id/payment` | Complete payment (protected) |
| PUT | `/api/orders/:id/cancel` | Cancel order (protected) |
| PUT | `/api/orders/:id/status` | Update status (admin only) |

### Verification
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verification` | Submit verification |
| GET | `/api/verification/status/:studentId/:university` | Check status |
| GET | `/api/verification/pending` | Get pending (admin only) |
| PUT | `/api/verification/:id/approve` | Approve (admin only) |
| PUT | `/api/verification/:id/reject` | Reject (admin only) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/products` | All products (admin) |
| GET | `/api/admin/orders` | All orders (admin) |

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication.

**To authenticate:**
1. Login via `/api/auth/login`
2. Receive a token in the response
3. Include the token in subsequent requests:
```
Authorization: Bearer <your-token>
```

## 📝 Request/Response Examples

### Register User
```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@ug.edu.gh",
  "phone": "+233501234567",
  "password": "SecurePass123!",
  "university": "ug",
  "level": "200"
}
```

### Create Product
```bash
POST http://localhost:5000/api/products
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "HP Laptop",
  "description": "Gently used HP laptop",
  "price": 1500,
  "category": "electronics",
  "condition": "good",
  "images": ["https://example.com/image.jpg"],
  "deliveryModes": ["bolt", "inperson"],
  "paymentModes": ["momo", "cash"]
}
```

### Create Order
```bash
POST http://localhost:5000/api/orders
Content-Type: application/json
Authorization: Bearer <token>

{
  "items": [
    {
      "productId": "65a1234567890abcdef12345",
      "title": "HP Laptop",
      "price": 1500,
      "quantity": 1,
      "seller": "65a1234567890abcdef67890"
    }
  ],
  "delivery": {
    "mode": "bolt",
    "address": "Commonwealth Hall, Room 101"
  },
  "payment": {
    "mode": "momo"
  }
}
```

## 🛠️ Development

### Run tests
```bash
npm test
```

### Lint code
```bash
npm run lint
```

## 📦 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
SQLITE_PATH=./data/uni-hub.db
JWT_SECRET=your-super-secret-key-min-32-chars
FRONTEND_URL=https://your-domain.com
```

### Recommended Hosting
- **Backend:** Heroku, Railway, Render, or DigitalOcean
- **Database:** SQLite (embedded, no separate server needed)
- **Images:** Cloudinary (free tier available)

## 📄 License

MIT License
