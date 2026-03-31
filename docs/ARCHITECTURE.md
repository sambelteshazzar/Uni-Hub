# Uni-Hub Architecture

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    WEB BROWSER                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           HTML / CSS / JavaScript                    │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │  Pages Layer (pages.js)                         │ │  │
│  │  │  - renderLanding()                              │ │  │
│  │  │  - renderLogin()                                │ │  │
│  │  │  - renderBrowse()                               │ │  │
│  │  │  - renderProductDetail()                        │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │           ↓         ↓         ↓         ↓            │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │  Module Layer (Business Logic)                  │ │  │
│  │  │  ┌─────────────────────────────────────────────┐│ │  │
│  │  │  │ AuthManager      - Login, Register, Logout ││ │  │
│  │  │  │ ProductsManager  - Search, Filter, Browse  ││ │  │
│  │  │  │ Router           - Navigation               ││ │  │
│  │  │  └─────────────────────────────────────────────┘│ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  │           ↓                          ↓                │  │
│  │  ┌──────────────────┐  ┌──────────────────────────┐  │  │
│  │  │ Utilities Layer  │  │ Storage & API Layer      │  │  │
│  │  │                  │  │                          │  │  │
│  │  │ - Validator      │  │ - StorageManager         │  │  │
│  │  │ - Formatter      │  │ - API (fetch wrapper)    │  │  │
│  │  │ - Constants      │  │ - JSON File Loading      │  │  │
│  │  └──────────────────┘  └──────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
           ↓                ↓                    ↓
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ LocalStorage     │ │  JSON Files      │ │  (Future)        │
│                  │ │                  │ │ Backend API      │
│ - User Session   │ │ - products.json  │ │ Node.js/Express  │
│ - Cart           │ │ - config.json    │ │ MongoDB          │
│ - Wishlist       │ │                  │ │ Authentication   │
│ - Preferences    │ │ - regions.json   │ │ Payment Gateway  │
└──────────────────┘ └──────────────────┘ └──────────────────┘

```

## 📦 Module Breakdown

### 1. **Page Rendering Layer** (`js/pages/pages.js`)

Handles all UI rendering and user interactions.

**Responsibilities:**
- Render different pages (landing, auth, browse, detail)
- Handle form submissions
- DOM manipulation and updates
- User interaction handlers

**Key Methods:**
- `renderLanding()` - University selection & hero section
- `renderLogin()` - Login form
- `renderRegister()` - Registration form
- `renderBrowse(filters)` - Product listing with filters
- `renderProductDetail(productId)` - Product full details
- `handleLogin(event)` - Process login
- `handleRegister(event)` - Process registration
- `applyBrowseFilters()` - Apply filter selections
- `toggleWishlist(event, productId)` - Add/remove from wishlist

---

### 2. **Business Logic Layer** (`js/modules/`)

#### **AuthManager** (`auth.js`)
Manages user authentication and profile.

**Responsibilities:**
- User registration with validation
- User login and logout
- Session management via StorageManager
- User profile updates
- Role management (buyer/seller/admin)

**Key Methods:**
```javascript
register(userData)           // Register new user
login(email, password)       // Authenticate user
logout()                     // Clear session
getCurrentUser()             // Get current user object
isLoggedIn()                 // Check auth status
hasRole(role)                // Check user role
updateProfile(updates)       // Update user info
becomeSeller()               // Upgrade to seller
```

**Data Flow:**
```
Register Form
    ↓
validate() [Validator.validateForm()]
    ↓
create user object
    ↓
store in localStorage [StorageManager.set()]
    ↓
set authManager.currentUser
    ↓
return success/error
```

#### **ProductsManager** (`products.js`)
Manages product data, filtering, and searching.

**Responsibilities:**
- Load products from JSON
- Filter by multiple criteria
- Search across products
- Sort results
- Manage wishlist
- Pagination

**Key Methods:**
```javascript
init()                              // Load products from JSON
getAll()                            // Get all products
getById(productId)                  // Get single product
getByCategory(categoryId)           // Get products by category
getByUniversity(universityId)       // Get products by university
getBySeller(sellerId)               // Get seller's products
getPaginated(page, pageSize)        // Get paginated results
filter(filters)                     // Apply filters
search(query)                       // Search products
sort(products, sortBy)              // Sort products
resetFilters()                      // Clear all filters
addToWishlist(productId)            // Add to favorites
removeFromWishlist(productId)       // Remove from favorites
isInWishlist(productId)             // Check if in wishlist
getWishlist()                       // Get wishlist items
```

**Filter Structure:**
```javascript
{
  university: "ug",
  category: "electronics",
  condition: "good",
  priceRange: { min: 0, max: 5000 },
  searchQuery: "laptop",
  sortBy: "newest"
}
```

#### **Router** (`app.js`)
Handles page navigation and routing.

**Responsibilities:**
- Register routes
- Navigate between pages
- Handle route parameters
- Error handling (404)

---

### 3. **Utility Layer** (`js/utils/`)

#### **Constants** (`constants.js`)
Application-wide constants and configuration.

```javascript
// Storage keys
STORAGE_KEYS = {
  CURRENT_USER,
  SELECTED_UNIVERSITY,
  FAVORITES,
  CART,
  // ...
}

// Enums
PRODUCT_CONDITIONS = { FAIR, GOOD, EXCELLENT }
CATEGORIES = { APPLIANCES, HOSTEL_ITEMS, ... }
USER_ROLES = { BUYER, SELLER, ADMIN }
ORDER_STATUS = { PLACED, CONFIRMED, IN_TRANSIT, ... }
```

#### **StorageManager** (`storage.js`)
LocalStorage wrapper with JSON support.

```javascript
StorageManager.set(key, value)     // Save with JSON stringify
StorageManager.get(key, parse)     // Get with JSON parse
StorageManager.remove(key)         // Delete item
StorageManager.clear()             // Delete all app data
StorageManager.has(key)            // Check if key exists
```

#### **Validator** (`validation.js`)
Form validation and data validation.

**Validation Types:**
- Email format
- Phone number (Ghana format: +233 or 0)
- Password strength (min 8 chars, uppercase, lowercase, number, special)
- URL format
- Min/max length
- Field matching (password confirmation)

```javascript
Validator.isValidEmail(email)
Validator.isValidPhone(phone)
Validator.isValidPassword(password)
Validator.validateForm(fields, rules)  // Multi-field validation
```

#### **Formatter** (`formatters.js`)
Text and data formatting utilities.

```javascript
Formatter.formatPrice(amount, currency)         // GHS 1,200.00
Formatter.formatDate(date, format)              // Mar 20, 2026
Formatter.formatTimeAgo(date)                   // 2 days ago
Formatter.truncate(text, length)                // Long text...
Formatter.capitalize(text)                      // Capitalize first
Formatter.toTitleCase(text)                     // Title Case Text
Formatter.formatPhone(phone)                    // 050 123 4567
Formatter.formatRating(rating)                  // ★★★★☆
Formatter.getConditionBadge(condition)          // 🟢 Good
```

#### **API Client** (`api.js`)
HTTP request handler with timeout and error handling.

```javascript
// Currently supports loading local JSON
api.loadJSON(filePath)

// Future support for:
api.get(url, params)
api.post(url, data)
api.put(url, data)
api.delete(url)
```

**Features:**
- Timeout handling (10s default)
- Error catching and logging
- JSON parsing
- Request chaining

---

## 🗄️ Data Flow Examples

### Use Case 1: Browse Products with Filters

```
User Action: Select Category → Click Apply Filters
    ↓
Pages.applyBrowseFilters()
    ↓
Get filter values from DOM:
  - category: document.getElementById('category-filter').value
  - priceRange: document.getElementById('price-range').value
  - searchQuery: document.getElementById('search-input').value
    ↓
productsManager.filter({ category, priceRange, searchQuery })
    ↓
ProductsManager.applyFilters():
  1. Get all products
  2. Filter by university (already set)
  3. Filter by category (if set)
  4. Filter by condition (if checked)
  5. Filter by price range (if set)
  6. Search by query (if entered)
  7. Sort by selected option
    ↓
Get paginated results:
productsManager.getPaginated(1)
    ↓
Re-render products grid:
Pages.renderBrowseProducts()
    ↓
Display updated products to user
```

### Use Case 2: User Registration

```
User Action: Fill form → Click Register
    ↓
Pages.handleRegister(event)
    ↓
Extract form data:
  - fullName, email, phone, password, confirmPassword
    ↓
AuthManager.register(userData):
  1. Validate with Validator.validateForm()
  2. Create user object with timestamp
  3. Store in localStorage via StorageManager
  4. Set authManager.currentUser
  5. Return success
    ↓
Pages.renderBrowse() // Redirect to browse
    ↓
User sees products for selected university
```

### Use Case 3: Save Product to Wishlist

```
User Action: Click heart icon on product
    ↓
Pages.toggleWishlist(event, productId)
    ↓
Check if in wishlist:
  productsManager.isInWishlist(productId)
    ↓
If not in wishlist:
  - Get current wishlist: StorageManager.get(STORAGE_KEYS.FAVORITES)
  - Add productId to array
  - Save: StorageManager.set(STORAGE_KEYS.FAVORITES, updatedList)
    ↓
Re-render product card with updated heart icon
    ↓
Heart changes from 🤍 (empty) → ❤️ (filled)
```

---

## 🔄 State Management

Currently uses **localStorage** for persistence. Future phases will implement:

**Current:**
```
Browser LocalStorage
├── unihub_current_user
├── unihub_selected_university
├── unihub_favorites
├── unihub_cart
└── unihub_search_history
```

**Components maintain state in:**
- `authManager.currentUser` (auth state)
- `authManager.isAuthenticated` (login status)
- `productsManager.products` (all products)
- `productsManager.filteredProducts` (filtered results)
- `productsManager.currentFilters` (active filters)

---

## 🎨 UI Component Hierarchy

```
index.html
├── navbar
│   ├── brand
│   ├── search
│   └── user menu
├── main-content
│   ├── landing page
│   │   ├── hero section
│   │   ├── university selector
│   │   ├── features grid
│   │   └── categories
│   ├── auth pages
│   │   ├── login form
│   │   └── register form
│   └── browse page
│       ├── sidebar filters
│       │   ├── category select
│       │   ├── condition checkbox
│       │   └── price range
│       └── main products area
│           ├── product cards (grid)
│           └── pagination
│
└── footer
```

---

## 🔐 Security Considerations

### Current (Phase 1 - MVP)
- ✅ Client-side form validation
- ✅ LocalStorage for session data
- ❌ No backend authentication
- ❌ No password encryption
- ❌ No API authentication
- ❌ All data is mock/public

### Future Phases
- 🔒 Backend authentication (JWT tokens)
- 🔒 Password hashing (bcrypt)
- 🔒 API rate limiting
- 🔒 HTTPS enforcement
- 🔒 Payment PCI compliance
- 🔒 User data encryption
- 🔒 Admin role verification

---

## 📈 Performance Considerations

### Current Optimizations
- ✅ CSS variables for efficient theme management
- ✅ Lazy loading placeholder images
- ✅ Debounced search/filter
- ✅ Paginated product lists (12 per page)
- ✅ LocalStorage for quick user retrieval

### Future Optimizations
- Image lazy loading with Intersection Observer
- Service Workers for offline support
- Component code splitting
- Minification and bundling
- CDN for static assets
- Caching strategies

---

## 🧪 Testing Strategy

### Current Testing
- Manual browser testing
- Form validation testing
- Filter functionality testing

### Future Testing
- Unit tests (Jest)
- Integration tests
- E2E tests (Cypress)
- Performance testing (Lighthouse)
- Cross-browser testing

---

## 📊 API Integration (Future)

### Planned API Endpoints

```javascript
// Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/verify

// Products
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
GET    /api/products/search?q=

// Users
GET    /api/users/:id
PUT    /api/users/:id
GET    /api/users/:id/products

// Orders
GET    /api/orders
POST   /api/orders
GET    /api/orders/:id
PUT    /api/orders/:id

// Payments
POST   /api/payments/initiate
POST   /api/payments/verify
```

---

## 🚀 Deployment Architecture (Future)

```
┌─────────────────────────────────────────┐
│     CDN (Cloudinary/CloudFlare)         │
│  Static assets, images, CSS, JS         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Frontend (Vercel/Netlify)              │
│  - React SPA compiled to static files   │
│  - Auto-deployed from Git               │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Backend (Heroku/AWS/DigitalOcean)      │
│  - Node.js/Express API Server           │
│  - Environment: Production              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Database (MongoDB Atlas/AWS)           │
│  - Collections for users, products etc  │
│  - Backups and replication              │
└──────────────────────────────────────────┘
```

---

**Last Updated:** March 26, 2026
**Version:** Phase 1 MVP
