# Admin Panel Access Guide

## How to Access Admin Panel

### Method 1: Via Navbar (Recommended)
1. Open `http://localhost:8000`
2. Click the **⚙️ Admin** button in the navbar
3. Login with admin credentials

### Method 2: Direct URL
1. Navigate to: `http://localhost:8000/js/pages/pages.js`
2. In browser console, type: `Pages.renderAdminLogin()`
3. Or directly go to the admin route

### Method 3: Browser Console
1. Open `http://localhost:8000`
2. Open browser console (F12)
3. Type: `router.navigate('/admin/login')`
4. Press Enter

---

## Admin Credentials

**Email:** `admin@unihub.local`  
**Password:** `Admin123!`

---

## Admin Features

### Dashboard (`/admin`)
- Overview statistics
- Total users, products, orders
- Total revenue
- Quick access to all admin sections

### User Management (`/admin/users`)
- View all users
- Search and filter users
- Verify/suspend users
- Update user roles
- Delete users

### Product Management (`/admin/products`)
- View all products
- Flag inappropriate products
- Delete products
- Update product details
- Bulk operations

### Order Management (`/admin/orders`)
- View all orders
- Filter by status
- Update order status
- Cancel orders
- Process refunds

### Reports (`/admin/reports`)
- Sales reports
- User analytics
- Product statistics
- Export data

---

## Troubleshooting

### Admin Panel Not Loading?

**Solution 1: Clear Browser Cache**
```
Ctrl + Shift + Delete → Clear cache → Reload
```

**Solution 2: Check Console for Errors**
```
F12 → Console → Look for errors
```

**Solution 3: Use Direct Method**
```javascript
// In browser console
Pages.renderAdminLogin()
```

**Solution 4: Check Server**
```bash
curl http://localhost:8000/
# Should return HTML
```

---

## Quick Commands

```javascript
// Navigate to admin
router.navigate('/admin/login')

// Navigate to dashboard (after login)
router.navigate('/admin')

// Navigate to users
router.navigate('/admin/users')

// Navigate to products
router.navigate('/admin/products')

// Navigate to orders
router.navigate('/admin/orders')

// Navigate to reports
router.navigate('/admin/reports')
```

---

## Admin Activity Log

All admin actions are logged:
- Login/logout
- User management actions
- Product moderation
- Order updates
- Report exports

View activity log in browser console or storage:
```javascript
adminAuthManager.getActivityLog()
```

---

## Security Notes

⚠️ **For Development Only**
- Current authentication is mock-based
- Passwords are not hashed
- Session expires after 24 hours
- No rate limiting

For production:
- Implement real backend authentication
- Hash passwords with bcrypt
- Add JWT tokens
- Implement rate limiting
- Add 2FA for admin accounts

---

**Last Updated:** March 26, 2026
