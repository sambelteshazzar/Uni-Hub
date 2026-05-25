# Uni-Hub - Project Documentation

## 📋 Project Overview

**Uni-Hub** is a student-focused e-commerce marketplace platform designed for buying and selling items within university communities. It's built to be web-first with mobile app expansion planned for later phases.

**Current Version:** Phase 1 MVP (Landing & Browsing)

## 🎯 Phase 1 Implementation Status

### ✅ Completed Features

#### 1. **Landing Page**
- University selection interface
- Feature showcase section
- Category browser
- Call-to-action sections
- Fully responsive design

#### 2. **User Authentication**
- User registration page
- User login page
- Password recovery interface
- Form validation with error messages
- Local storage for user sessions

#### 3. **Product Browsing**
- Product listing with grid layout
- Product cards with images, prices, seller info, and ratings
- Product detail page with full information
- Wishlist functionality (save items)

#### 4. **Search & Filtering**
- Search by product title/description
- Filter by category
- Filter by condition (Fair, Good, Excellent)
- Price range filtering
- Sort options (newest, price, rating, popular)
- Real-time filter application

#### 5. **MockData System**
- 8+ sample products with realistic data
- Multiple categories (Appliances, Hostel Items, Electronics, etc.)
- University configuration
- Delivery and payment method options

#### 6. **Design System**
- CSS Variables for consistent theming
- Responsive design (mobile, tablet, desktop)
- Component library (buttons, cards, forms, navbar)
- Dark/light color scheme ready

## 📁 Project Structure

```
uni-hub/
├── index.html                    ← Main entry point (in root folder)
├── package.json                  ← Dependencies & scripts
├── README.md                     ← Project overview
│
├── css/
│   ├── style.css                ← Global styles & typography
│   ├── variables.css            ← Design tokens & CSS variables
│   ├── responsive.css           ← Media queries (expandable)
│   ├── components/
│   │   ├── buttons.css          ← Button styles
│   │   ├── cards.css            ← Card components
│   │   ├── navbar.css           ← Navigation bar
│   │   ├── footer.css           ← Footer
│   │   └── forms.css            ← Form elements
│   └── pages/
│       └── home.css             ← Page-specific styles
│
├── js/
│   ├── app.js                   ← Router & main app logic
│   ├── utils/
│   │   ├── constants.js         ← App constants & config
│   │   ├── storage.js           ← LocalStorage manager
│   │   ├── validation.js        ← Form validator
│   │   ├── formatters.js        ← Text formatting utilities
│   │   └── api.js               ← API client (mock & future backend)
│   ├── modules/
│   │   ├── auth.js              ← Authentication logic
│   │   └── products.js          ← Product management
│   └── pages/
│       └── pages.js             ← Page renderers
│
├── data/
│   ├── config.json              ← App configuration (universities, categories)
│   └── products.json            ← Mock product data
│
├── assets/
│   ├── images/
│   │   ├── logo/
│   │   ├── banners/
│   │   ├── icons/
│   │   └── products/
│   ├── fonts/
│   └── videos/
│
└── docs/
    ├── SETUP.md                 ← This file
    ├── API-DOCS.md              ← API documentation (future)
    └── ARCHITECTURE.md          ← Technical architecture
```

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Optional: Node.js (for running a local server)

### Option 1: Direct File Opening
1. Navigate to the project root folder
2. Open `index.html` directly in your browser
3. The app should load with the landing page

### Option 2: Using Local Server (Recommended)
```bash
# Using Python (if installed)
python -m http.server 8000

# Using Node.js http-server
npx http-server -p 8000

# Using npm scripts
npm start
```

Then visit: `http://localhost:8000`

## 📚 How to Use

### 1. **Select University**
- On the landing page, click on your university
- Available universities: UG, KNUST, UCC, UDS, UEW, Ashesi

### 2. **Create Account or Login**
- Click "Create Account" for new users
- Click "Login" for existing users
- For demo, use any email/password combination

### 3. **Browse Products**
- Click "Start Browsing" or browse by category
- Use filters: category, condition, price range
- Search for specific items

### 4. **Add to Wishlist**
- Click the heart icon on any product card
- Access saved items in the wishlist

### 5. **View Product Details**
- Click any product to see full details
- View seller information and ratings
- Choose delivery and payment methods
- Add to cart (coming in Phase 2)

## 🎨 Design System

### Colors
- **Primary:** #6366f1 (Indigo) - Main brand color
- **Secondary:** #ec4899 (Pink) - Accent color
- **Success:** #10b981 (Green)
- **Warning:** #f59e0b (Amber)
- **Danger:** #ef4444 (Red)

### Typography
- **Font Family:** System fonts (Apple, Windows, Linux compatible)
- **Sizes:** 12px to 48px scale
- **Weights:** Light (300) to Bold (700)

### Spacing
- Base unit: 8px
- Scale: xs (4px) → sm (8px) → md (16px) → lg (24px) → xl (32px) → 2xl (48px) → 3xl (64px)

## 🔧 Core Modules

### `StorageManager` (storage.js)
```javascript
// Save data
StorageManager.set(STORAGE_KEYS.CURRENT_USER, userData);

// Get data
const user = StorageManager.get(STORAGE_KEYS.CURRENT_USER);

// Remove data
StorageManager.remove(STORAGE_KEYS.CURRENT_USER);

// Clear all app data
StorageManager.clear();
```

### `Validator` (validation.js)
```javascript
// Validate email
Validator.isValidEmail('test@example.com');

// Validate phone (Ghana format)
Validator.isValidPhone('+233501234567');

// Validate password strength
Validator.isValidPassword('SecurePass123!');

// Validate form
const errors = Validator.validateForm(fields, rules);
```

### `Formatter` (formatters.js)
```javascript
// Format price
Formatter.formatPrice(1200, 'GHS'); // "GHS 1,200.00"

// Format date
Formatter.formatDate('2026-03-20'); // "Mar 20, 2026"

// Format relative time
Formatter.formatTimeAgo('2026-03-20'); // "2 days ago"

// Truncate text
Formatter.truncate('Long text...', 20); // "Long text..."
```

### `AuthManager` (auth.js)
```javascript
// Register user
const result = await authManager.register(userData);

// Login user
const result = await authManager.login(email, password);

// Logout
authManager.logout();

// Get current user
const user = authManager.getCurrentUser();

// Check if logged in
authManager.isLoggedIn(); // true/false
```

### `ProductsManager` (products.js)
```javascript
// Initialize products
await productsManager.init();

// Get all products
const allProducts = productsManager.getAll();

// Filter products
productsManager.filter({ category: 'electronics', university: 'ug' });

// Search
productsManager.search('laptop');

// Get paginated results
const page = productsManager.getPaginated(1, 12);

// Wishlist
productsManager.addToWishlist(productId);
productsManager.isInWishlist(productId);
```

### `Pages` (pages.js)
```javascript
// Render pages
Pages.renderLanding();
Pages.renderLogin();
Pages.renderBrowse();
Pages.renderProductDetail(productId);

// Handle submissions
await Pages.handleLogin(event);
await Pages.handleRegister(event);
```

## 📊 Data Models

### User
```javascript
{
  id: "user_1234567890",
  fullName: "John Doe",
  email: "john@example.com",
  phone: "0500123456",
  university: "ug",
  role: "buyer", // or "seller" or "admin"
  avatar: "https://...",
  createdAt: "2026-03-20T10:00:00Z",
  isVerified: true
}
```

### Product
```javascript
{
  id: "prod-001",
  title: "NASCO 1.5HP Split AC",
  description: "...",
  price: 1200,
  currency: "GHS",
  category: "appliances",
  condition: "good", // fair, good, excellent
  seller: { id, name, rating },
  images: ["url1", "url2"],
  deliveryModes: ["bolt", "yango"],
  paymentModes: ["momo", "bank"],
  university: "ug",
  createdAt: "2026-03-20",
  status: "active"
}
```

## 🔄 Next Steps (Phase 2)

### Roadmap
1. **Cart System** - Add/remove items, adjust quantities
2. **Checkout** - Order placement and review
3. **Payment Integration** - Paystack API for MoMo, Bank Transfer
4. **Delivery Selection** - Choose between Bolt, Yango, In-person
5. **Order Tracking** - Real-time order status updates

### Tech Debt
- Migrate to React.js for better component management
- Implement proper routing (React Router)
- Add state management (Redux/Context API)
- Backend API integration (Node.js + Express)
- Database (SQLite via better-sqlite3)

## 🐛 Known Issues
- None currently - test and report any issues!

## 📝 Development Notes

### Code Style
- Use camelCase for variables and functions
- Use PascalCase for classes
- Use UPPER_SNAKE_CASE for constants
- Keep functions small and focused
- Add JSDoc comments for public methods

### Adding New Features
1. Create module in `js/modules/` if needed
2. Add styles to `css/components/` or `css/pages/`
3. Add page renderer to `js/pages/pages.js`
4. Add constants to `js/utils/constants.js`
5. Test across browsers and devices

## 📞 Support & Contact

**Issues:** Report bugs in the GitHub repository
**Questions:** Start a discussion or open an issue
**Email:** support@uni-hub.local

---

**Last Updated:** March 26, 2026
**Maintainer:** Uni-Hub Development Team
