# 🔌 JERTS CART Complete API Endpoints Reference

**Base URL:** `http://localhost:5000/api`

---

## 🔐 Authentication Routes (`/auth`)

### Register (Signup)
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "university": "University of Ghana",
  "studentId": "12345"
}

Response: 201
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "user_id",
    "email": "student@university.edu",
    "firstName": "John",
    "university": "University of Ghana",
    "role": "student"
  }
}
```

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "SecurePassword123!"
}

Response: 200
{
  "success": true,
  "token": "eyJhbGc...",
  "user": { ... }
}
```

### Get Current User Profile
```
GET /api/auth/me
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "student@university.edu",
    "firstName": "John",
    "lastName": "Doe",
    "university": "University of Ghana",
    "studentId": "12345",
    "role": "student",
    "isVerified": false,
    "createdAt": "2026-04-06T10:00:00Z"
  }
}
```

### Update Profile
```
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jonathan",
  "lastName": "Smith",
  "bio": "Computer Science student",
  "phone": "+233123456789"
}

Response: 200
{
  "success": true,
  "user": { ... }
}
```

### Change Password
```
PUT /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}

Response: 200
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## ✅ Verification Routes (`/verification`)

### Submit Verification Request
```
POST /api/verification
Content-Type: application/json

{
  "studentId": "12345",
  "university": "University of Ghana",
  "matricNumber": "CS123456"
}

Response: 201
{
  "success": true,
  "verification": {
    "id": "verification_id",
    "studentId": "12345",
    "university": "University of Ghana",
    "status": "pending",
    "submittedAt": "2026-04-06T10:00:00Z"
  }
}
```

### Check Verification Status
```
GET /api/verification/status/:studentId/:university

Response: 200
{
  "success": true,
  "status": "approving",  // pending | approved | rejected
  "message": "Your verification is being reviewed"
}
```

### Get Pending Verifications (Admin Only)
```
GET /api/verification/pending
Authorization: Bearer <admin_token>

Response: 200
{
  "success": true,
  "verifications": [
    {
      "id": "verification_id",
      "studentId": "12345",
      "university": "University of Ghana",
      "matricNumber": "CS123456",
      "status": "pending",
      "submittedAt": "2026-04-06T10:00:00Z"
    }
  ]
}
```

### Approve Verification (Admin Only)
```
PUT /api/verification/:id/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "notes": "Valid student ID provided"
}

Response: 200
{
  "success": true,
  "message": "Verification approved",
  "verification": { ... }
}
```

### Reject Verification (Admin Only)
```
PUT /api/verification/:id/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Invalid matric number"
}

Response: 200
{
  "success": true,
  "message": "Verification rejected"
}
```

---

## 🛒 Products Routes (`/products`)

### Get All Products
```
GET /api/products?page=1&limit=10&category=electronics

Response: 200
{
  "success": true,
  "products": [
    {
      "id": "product_id",
      "title": "Laptop",
      "description": "Dell Inspiron 15",
      "price": 2500,
      "condition": "used",
      "category": "electronics",
      "images": ["url1", "url2"],
      "seller": {
        "id": "seller_id",
        "name": "John Doe"
      },
      "rating": 4.5,
      "reviews": 12,
      "createdAt": "2026-04-06T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 10
}
```

### Get Single Product
```
GET /api/products/:id

Response: 200
{
  "success": true,
  "product": { ... }
}
```

### Create Product (Protected)
```
POST /api/products
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "title": "iPhone 13",
  "description": "Like new condition, with box",
  "price": 1500,
  "condition": "like-new",  // new | like-new | good | used
  "category": "electronics",
  "location": "Legon",
  "negotiable": true,
  "images": [file1, file2]  // Upload max 5 images
}

Response: 201
{
  "success": true,
  "product": { ... }
}
```

### Update Product (Protected - Owner Only)
```
PUT /api/products/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "iPhone 13 Pro",
  "price": 1800,
  "description": "Updated description"
}

Response: 200
{
  "success": true,
  "product": { ... }
}
```

### Delete Product (Protected - Owner Only)
```
DELETE /api/products/:id
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "message": "Product deleted successfully"
}
```

### Search Products
```
GET /api/products/search?q=laptop&minPrice=1000&maxPrice=5000

Response: 200
{
  "success": true,
  "results": [ ... ]
}
```

---

## 🛍️ Orders Routes (`/orders`)

### Create Order (Protected)
```
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product_id",
  "quantity": 1,
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Accra",
    "region": "Greater Accra",
    "postalCode": "00233"
  },
  "shippingMethod": "pickup",  // pickup | delivery
  "deliveryRegion": "Greater Accra"
}

Response: 201
{
  "success": true,
  "order": {
    "id": "order_id",
    "productId": "product_id",
    "buyerId": "user_id",
    "sellerId": "seller_id",
    "quantity": 1,
    "totalPrice": 1500,
    "status": "pending",  // pending | confirmed | shipped | delivered | cancelled
    "createdAt": "2026-04-06T10:00:00Z"
  }
}
```

### Get My Orders (Protected)
```
GET /api/orders?status=pending&page=1&limit=10
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "orders": [ ... ],
  "total": 5
}
```

### Get Order Details (Protected)
```
GET /api/orders/:id
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "order": { ... }
}
```

### Update Order Status (Protected - Seller/Admin Only)
```
PUT /api/orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "shipped",
  "trackingNumber": "TRK123456"
}

Response: 200
{
  "success": true,
  "order": { ... }
}
```

### Cancel Order (Protected - Buyer/Seller Only)
```
DELETE /api/orders/:id
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "message": "Order cancelled"
}
```

---

## 💳 Payment Routes (`/payment`)

### Process Payment (Protected)
```
POST /api/payment/process
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_id",
  "amount": 1500,
  "paymentMethod": "card",  // card | momo | transfer
  "stripeToken": "tok_visa"  // For card payments
}

Response: 200
{
  "success": true,
  "payment": {
    "id": "payment_id",
    "orderId": "order_id",
    "amount": 1500,
    "status": "completed",  // pending | completed | failed
    "transactionId": "txn_123456",
    "createdAt": "2026-04-06T10:00:00Z"
  }
}
```

### Get Payment Status (Protected)
```
GET /api/payment/status/:orderId
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "payment": { ... }
}
```

### Refund Payment (Protected - Admin Only)
```
POST /api/payment/:paymentId/refund
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Product defective"
}

Response: 200
{
  "success": true,
  "message": "Refund processed"
}
```

---

## 🚚 Delivery Routes (`/delivery`)

### Calculate Shipping Cost
```
POST /api/delivery/calculate
Content-Type: application/json

{
  "fromRegion": "Greater Accra",
  "toRegion": "Ashanti",
  "weight": 2,  // kg
  "size": "medium"  // small | medium | large
}

Response: 200
{
  "success": true,
  "shippingCost": 25,
  "estimatedDays": 3,
  "region": "Ashanti"
}
```

### Track Delivery (Protected)
```
GET /api/delivery/track/:deliveryId
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "delivery": {
    "id": "delivery_id",
    "orderId": "order_id",
    "status": "in-transit",  // pending | in-transit | delivered | cancelled
    "trackingNumber": "TRK123456",
    "fromRegion": "Greater Accra",
    "toRegion": "Ashanti",
    "estimatedDelivery": "2026-04-09T10:00:00Z",
    "lastUpdate": "2026-04-06T15:30:00Z"
  }
}
```

### Get Available Regions
```
GET /api/delivery/regions

Response: 200
{
  "success": true,
  "regions": [
    { "id": 1, "name": "Greater Accra", "code": "GA" },
    { "id": 2, "name": "Ashanti", "code": "A" },
    { "id": 3, "name": "Central", "code": "C" },
    ...
  ]
}
```

---

## 📊 Reports Routes (`/reports`)

### Submit Report (Protected)
```
POST /api/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "product",  // product | seller | buyer
  "targetId": "product_id",
  "reason": "Suspected counterfeit",
  "description": "This product appears to be fake...",
  "evidence": ["image_url1", "image_url2"]
}

Response: 201
{
  "success": true,
  "report": {
    "id": "report_id",
    "type": "product",
    "status": "pending",  // pending | investigating | resolved | dismissed
    "createdAt": "2026-04-06T10:00:00Z"
  }
}
```

### Get My Reports (Protected)
```
GET /api/reports?status=pending
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "reports": [ ... ]
}
```

### Get Report Details (Protected - Reporter/Admin)
```
GET /api/reports/:id
Authorization: Bearer <token>

Response: 200
{
  "success": true,
  "report": { ... }
}
```

---

## 👨‍💼 Admin Routes (`/admin`)

### Get Dashboard (Admin Only)
```
GET /api/admin/dashboard
Authorization: Bearer <admin_token>

Response: 200
{
  "success": true,
  "dashboard": {
    "totalUsers": 150,
    "totalProducts": 450,
    "totalOrders": 320,
    "totalRevenue": 85000,
    "pendingVerifications": 12,
    "pendingReports": 5,
    "recentOrders": [ ... ]
  }
}
```

### Get All Users (Admin Only)
```
GET /api/admin/users?page=1&limit=20&role=student
Authorization: Bearer <admin_token>

Response: 200
{
  "success": true,
  "users": [ ... ],
  "total": 150
}
```

### Ban User (Admin Only)
```
PUT /api/admin/users/:userId/ban
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Fraudulent activity"
}

Response: 200
{
  "success": true,
  "message": "User banned"
}
```

### Get All Products (Admin Only)
```
GET /api/admin/products?page=1&limit=20&status=pending
Authorization: Bearer <admin_token>

Response: 200
{
  "success": true,
  "products": [ ... ]
}
```

### Approve/Reject Product (Admin Only)
```
PUT /api/admin/products/:productId/approve
Authorization: Bearer <admin_token>

Response: 200
{
  "success": true,
  "message": "Product approved"
}

PUT /api/admin/products/:productId/reject
{
  "reason": "Violates policy"
}
```

---

## 📋 Users Routes (`/users`)

### Get Public Profile
```
GET /api/users/:userId/profile

Response: 200
{
  "success": true,
  "user": {
    "id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "university": "University of Ghana",
    "rating": 4.5,
    "totalSales": 25,
    "totalBuys": 30,
    "joinedDate": "2026-01-15T10:00:00Z"
  }
}
```

### Get User Reviews
```
GET /api/users/:userId/reviews

Response: 200
{
  "success": true,
  "reviews": [ ... ]
}
```

---

## 🏥 Health Check

```
GET /api/health

Response: 200
{
  "success": true,
  "message": "JERTS CART API is running",
  "timestamp": "2026-04-06T10:00:00Z",
  "environment": "development"
}
```

---

## 📝 Common Response Format

```json
{
  "success": true/false,
  "message": "Optional message",
  "data": {},
  "error": "Error message if success=false",
  "timestamp": "2026-04-06T10:00:00Z"
}
```

## ⚠️ Common Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized (Invalid/Missing Token) |
| 403 | Forbidden (No Permission) |
| 404 | Not Found |
| 409 | Conflict (Duplicate) |
| 500 | Server Error |

---

**Ready to build!** All endpoints are fully functional. 🚀
