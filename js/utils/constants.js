// ============================================
// APPLICATION CONSTANTS
// ============================================
/* eslint-disable no-unused-vars */

const APP_NAME = 'Uni-Hub';
const APP_VERSION = '1.0.0';
const STORAGE_KEY_PREFIX = 'unihub_';

// Storage keys
// NOTE: CURRENT_USER now uses 'unihub_session' (not 'unihub_current_user')
// This is the key used by authManager.js for storing session data
const STORAGE_KEYS = {
  CURRENT_USER: `${STORAGE_KEY_PREFIX}session`,
  SESSION: `${STORAGE_KEY_PREFIX}session`,
  SELECTED_UNIVERSITY: `${STORAGE_KEY_PREFIX}selected_university`,
  STUDENT_VERIFICATION: `${STORAGE_KEY_PREFIX}student_verification`,
  VERIFICATION_QUEUE: `${STORAGE_KEY_PREFIX}verification_queue`,
  USERS: `${STORAGE_KEY_PREFIX}users`,
  FAVORITES: `${STORAGE_KEY_PREFIX}favorites`,
  CART: `${STORAGE_KEY_PREFIX}cart`,
  SEARCH_HISTORY: `${STORAGE_KEY_PREFIX}search_history`,
  RECENTLY_VIEWED: `${STORAGE_KEY_PREFIX}recently_viewed`,
  PRICE_HISTORY: `${STORAGE_KEY_PREFIX}price_history`,
  THEME: `${STORAGE_KEY_PREFIX}theme`,
  LANGUAGE: `${STORAGE_KEY_PREFIX}language`,
};

// API endpoints (will be used when backend is ready)
const API_ENDPOINTS = {
  BASE_URL: (typeof window !== 'undefined' && window.API_URL) || 'https://uni-hub-production.up.railway.app/api',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    VERIFY_EMAIL: '/auth/verify-email',
  },
  PRODUCTS: {
    GET_ALL: '/products',
    GET_BY_ID: '/products/:id',
    CREATE: '/products',
    UPDATE: '/products/:id',
    DELETE: '/products/:id',
    SEARCH: '/products/search',
    BY_CATEGORY: '/products/category/:categoryId',
  },
  USERS: {
    GET_PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    GET_BY_ID: '/users/:id',
  },
};

// Product conditions
const PRODUCT_CONDITIONS = {
  NEW: 'new',
  LIKE_NEW: 'like-new',
  FAIR: 'fair',
  GOOD: 'good',
  EXCELLENT: 'excellent',
};

// Categories
const CATEGORIES = {
  APPLIANCES: 'appliances',
  HOSTEL_ITEMS: 'hostel-items',
  ACCESSORIES: 'accessories',
  TEXTBOOKS: 'textbooks',
  ELECTRONICS: 'electronics',
  FASHION: 'fashion',
  THRIFTS: 'thrifts',
};

// Delivery modes
const DELIVERY_MODES = {
  BOLT: 'bolt',
  YANGO: 'yango',
  IN_PERSON: 'inperson',
};

// Payment modes
const PAYMENT_MODES = {
  MOMO: 'momo',
  TELECEL: 'telecel',
  BANK: 'bank',
  CASH: 'cash',
};

// User roles
const USER_ROLES = {
  BUYER: 'buyer',
  SELLER: 'seller',
  ADMIN: 'admin',
};

// Order statuses
const ORDER_STATUS = {
  PLACED: 'placed',
  CONFIRMED: 'confirmed',
  IN_TRANSIT: 'in-transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

// Routes
const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  BROWSE: '/browse',
  PRODUCT_DETAIL: '/product/:id',
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDERS: '/orders',
  WISHLIST: '/wishlist',
  SELLING: '/selling',
  ADD_PRODUCT: '/add-product',
  ADMIN: '/admin',
  NOT_FOUND: '/404',
};

// Default sort options
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'popular', label: 'Most Popular' },
];

// Validation patterns
const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Accept Ghana phone formats: +233XXXXXXXXX, +233 XXX XXXX XXX, 0XXXXXXXXX, 0 XXX XXXX XXX
  PHONE: /^(\+233|0)[\s-]?[0-9]{7,9}[\s-]?[0-9]{0,3}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  URL: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w -]*)*\/?$/,
};

// Error messages
const ERROR_MESSAGES = {
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_PASSWORD:
    'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  PASSWORD_MISMATCH: 'Passwords do not match',
  FIELD_REQUIRED: 'This field is required',
  SOMETHING_WENT_WRONG: 'Something went wrong. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
};

// Success messages
const SUCCESS_MESSAGES = {
  PRODUCT_CREATED: 'Product listed successfully!',
  PRODUCT_UPDATED: 'Product updated successfully!',
  PRODUCT_DELETED: 'Product deleted successfully!',
  ACCOUNT_CREATED: 'Account created successfully!',
  LOGIN_SUCCESS: 'Logged in successfully!',
  LOGOUT_SUCCESS: 'Logged out successfully!',
};

// Pagination
const PAGINATION = {
  DEFAULT_PAGE_SIZE: 12,
  PAGE_SIZE_OPTIONS: [12, 24, 48],
};

// Time constants (in milliseconds)
const TIME = {
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 3000,
  ANIMATION_DURATION: 200,
};

// Make constants available globally for module scripts
if (typeof window !== 'undefined') {
  window.API_URL = API_ENDPOINTS.BASE_URL;
  window.APP_NAME = APP_NAME;
  window.APP_VERSION = APP_VERSION;
  window.STORAGE_KEY_PREFIX = STORAGE_KEY_PREFIX;
  window.STORAGE_KEYS = STORAGE_KEYS;
  window.API_ENDPOINTS = API_ENDPOINTS;
  window.PRODUCT_CONDITIONS = PRODUCT_CONDITIONS;
  window.CATEGORIES = CATEGORIES;
  window.DELIVERY_MODES = DELIVERY_MODES;
  window.PAYMENT_MODES = PAYMENT_MODES;
  window.USER_ROLES = USER_ROLES;
  window.ORDER_STATUS = ORDER_STATUS;
  window.ROUTES = ROUTES;
  window.SORT_OPTIONS = SORT_OPTIONS;
  window.VALIDATION_PATTERNS = VALIDATION_PATTERNS;
  window.ERROR_MESSAGES = ERROR_MESSAGES;
  window.SUCCESS_MESSAGES = SUCCESS_MESSAGES;
window.PAGINATION = PAGINATION;
window.TIME = TIME;
window.ORDER_STATUS = ORDER_STATUS;
}
