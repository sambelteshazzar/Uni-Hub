// Configuration - Injected at build time or via environment
// Set your Paystack public key here (or via build-time env replacement)
window.PAYSTACK_PUBLIC_KEY = 'pk_test_xxxxxxxxxxxx';

// Backend API URL.
// Respect a value already set before this script runs (e2e tests inject
// it via addInitScript, and app-init.js does the same check) so we never
// clobber it. Otherwise default to the local backend when served from
// localhost and the Render backend elsewhere.
if (typeof window.API_URL === 'undefined') {
  const isLocalhost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  window.API_URL = isLocalhost
    ? 'http://localhost:5000/api'
    : 'https://uni-hub-bnxi.onrender.com/api';
}

// Google OAuth Client ID - Replace with your actual client ID from Google Cloud Console
window.GOOGLE_CLIENT_ID =
  '607049913987-rnvuedn1s20ima2rmam0lgvmolh2fr3t.apps.googleusercontent.com';
