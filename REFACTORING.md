# Uni-Hub Refactoring Guide

This document tracks the ongoing refactoring efforts for the Uni-Hub codebase.

## ✅ Completed Refactoring Tasks

### 1. Build Configuration
- ✅ Updated `vite.config.js` for cleaner build configuration
- ✅ Removed unnecessary warning suppression

### 2. Backend Improvements
- ✅ Created centralized error handling utility (`backend/utils/errorHandler.js`)
  - `ApiError` class for consistent error throwing
  - `asyncHandler` wrapper to eliminate try-catch boilerplate
  - Centralized error handlers for SQLite constraints, duplicate keys, and JWT errors
  - `errorHandler` middleware for consistent error responses
  - `notFoundHandler` for 404 responses
- ✅ Refactored `backend/server.js` to import error handlers
- ✅ Refactored `backend/controllers/auth.controller.js` to use `asyncHandler` pattern (example for other controllers)

### 3. Frontend ES6 Module Conversion
- ✅ Converted `js/utils/constants.js` to ES6 exports
- ✅ Converted `js/utils/storage.js` to ES6 exports
- ✅ Converted `js/router.js` to ES6 exports
- ✅ Converted `js/app.js` to ES6 exports with imports
- ✅ Created `js/main.js` as ES6 module entry point

### 4. Code Quality
- ✅ Ran ESLint with auto-fix across all files
- ✅ Ran Prettier formatting across all JS and CSS files
- ✅ Fixed spacing, indentation, and style issues

## 🚧 In Progress / Needs Completion

### 1. Frontend ES6 Module Migration
The following files need to be converted to ES6 modules with proper imports/exports:

#### Utils (Priority: HIGH)
- [ ] `js/utils/validation.js`
- [ ] `js/utils/formatters.js`
- [ ] `js/utils/crypto.js`
- [ ] `js/utils/api.js`

#### Modules (Priority: HIGH)
- [ ] `js/modules/auth.js`
- [ ] `js/modules/products.js`
- [ ] `js/modules/cart.js`
- [ ] `js/modules/checkout.js`
- [ ] `js/modules/payment.js`
- [ ] `js/modules/delivery.js`
- [ ] `js/modules/messaging.js`
- [ ] `js/modules/reviews.js`
- [ ] `js/modules/region.js`
- [ ] `js/modules/search.js`
- [ ] `js/modules/toast.js`
- [ ] `js/modules/notifications.js`
- [ ] `js/modules/modals.js`

#### Admin Modules (Priority: MEDIUM)
- [ ] `js/admin/admin-auth.js`
- [ ] `js/admin/admin-products.js`
- [ ] `js/admin/admin-users.js`
- [ ] `js/admin/admin-orders.js`
- [ ] `js/admin/admin-reports.js`

#### Pages (Priority: MEDIUM)
- [ ] `js/pages/pages.js` (4941 lines - consider splitting)
- [ ] `js/pages/messages.js`
- [ ] `js/pages/landing-page-loader.js`
- [ ] `js/pages/bestbuy-landing.js`
- [ ] `js/pages/bestbuy-auth-dashboard.js`

### 2. Backend Controller Refactoring
Convert all controllers to use the `asyncHandler` pattern. Files to refactor:
- [ ] `backend/controllers/product.controller.js`
- [ ] `backend/controllers/order.controller.js`
- [ ] `backend/controllers/message.controller.js`
- [ ] `backend/controllers/payment.controller.js`
- [ ] `backend/controllers/delivery.controller.js`
- [ ] `backend/controllers/report.controller.js`
- [ ] `backend/controllers/review.controller.js`
- [ ] `backend/controllers/verification.controller.js`

### 3. HTML Entry Point Update
- [ ] Update `index.html` to use `<script type="module" src="js/main.js">` instead of multiple script tags
- [ ] Remove old script tags once main.js is fully functional
- [ ] Test all functionality works with module system

### 4. ESLint Warning Resolution
Remaining warnings to address:
- 28 errors related to redeclared globals and missing function spaces
- 36 warnings about unused variables
- See `npm run lint:check` output for full list

## 📋 Refactoring Patterns & Examples

### Backend Controller Pattern (Before)
```javascript
exports.register = async (req, res) => {
  try {
    // Logic here
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### Backend Controller Pattern (After)
```javascript
const { ApiError, asyncHandler } = require('../utils/errorHandler');

exports.register = asyncHandler(async (req, res) => {
  // Logic here - errors automatically caught
  if (validationFailed) {
    throw new ApiError(400, 'Validation error message');
  }
  
  res.json({ success: true });
});
```

### Frontend Module Pattern (Before)
```javascript
class StorageManager {
  // class implementation
}

const storageManager = new StorageManager();
```

### Frontend Module Pattern (After)
```javascript
export class StorageManager {
  // class implementation
}

export default new StorageManager();
```

## 🎯 Benefits of Refactoring

1. **Better Code Organization**: ES6 modules provide explicit dependencies
2. **Easier Testing**: Isolated modules are easier to unit test
3. **Improved Maintainability**: Smaller, focused files are easier to understand
4. **Tree Shaking**: ES6 modules enable better bundling and optimization
5. **Consistent Error Handling**: Centralized error handlers reduce boilerplate
6. **Modern JavaScript**: Using current best practices and standards

## 🚀 Next Steps

1. Complete frontend module migration (all utils, modules, pages)
2. Refactor all backend controllers to use `asyncHandler`
3. Update `index.html` to use single module entry point
4. Resolve remaining ESLint errors and warnings
5. Add unit tests for critical modules
6. Consider breaking up large files (pages.js at 4941 lines)

## 📝 Notes

- The refactoring is designed to be **incremental** - the app should remain functional at each step
- Global variables are temporarily maintained via `window` assignments in `main.js` for backward compatibility
- Once all modules are converted, the global assignments can be removed
- The backend error handling utility is ready to use across all controllers

## 🐛 Known Issues

- Some modules rely heavily on global scope and will need careful migration
- The `pages.js` file is extremely large (4941 lines) and should be split into smaller page components
- Messaging module has dependencies on Socket.io that need special handling

## 📚 Resources

- [ES6 Modules Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Express Error Handling Best Practices](https://expressjs.com/en/guide/error-handling.html)
- [Vite Documentation](https://vitejs.dev/guide/)
