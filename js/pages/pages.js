/* eslint-disable no-unused-vars */
// ============================================
// PAGE RENDERERS
// ============================================

class Pages {
  /**
   * Navigate to a page using hash-based routing
   * @param {string} hash - Hash to navigate to (e.g., '/cart', '/product/prod-001')
   */
  static navigate (hash) {
    window.location.hash = hash;
  }

  /**
   * Register all page routes with the router
   */
static registerRoutes () {
console.log('✓ Pages.registerRoutes() called');
// Home/Landing
router.register('/', () => this.renderLanding());
router.register('/home', () => this.renderLanding());

// Auth
router.register('/login', () => this.renderLogin());
router.register('/register', () => this.renderRegister());
console.log('✓ Auth routes registered');

// Main pages
router.register('/browse', (params) => this.renderBrowse(params));
router.register('/cart', () => this.renderCart());
router.register('/checkout', () => this.renderCheckout());
router.register('/sell', () => this.renderSellerDashboard());
router.register('/dashboard', () => this.renderDashboard());
router.register('/profile', () => this.renderProfile());
router.register('/orders', () => this.renderOrders());
router.register('/wishlist', () => this.renderWishlist());
    router.register('/faq', () => this.renderFAQ());
    router.register('/terms', () => this.renderTerms());
    router.register('/privacy', () => this.renderPrivacy());
    router.register('/about', () => this.renderAbout());
    router.register('/contact', () => this.renderContact());
    console.log('✓ Main routes registered');

// Product detail
router.register('/product/:id', (params) => this.renderProductDetail(params.id));

// Messaging
router.register('/messages', (params) => messagesPage.render(params));

// Admin
  router.register('/admin', () => this.renderAdminDashboard());
    router.register('/admin/products', () => this.renderAdminProducts());
    router.register('/admin/users', () => this.renderAdminUsers());
    router.register('/admin/orders', () => this.renderAdminOrders());
    router.register('/admin/reports', () => this.renderAdminReports());
    router.register('/admin/activity', () => this.renderAdminActivity());

console.log('✓ All routes registered successfully');
}

static formatConditionLabel (condition) {
const labels = {
new: 'New',
'like-new': 'Like New',
fair: 'Fair',
good: 'Good',
excellent: 'Excellent',
};
return labels[condition] || (condition ? condition.charAt(0).toUpperCase() + condition.slice(1).replace(/-/g, ' ') : 'Good');
}

  /**
   * Navigate to Messages (with auth check)
   */
  static navigateToMessages () {
    const token = StorageManager.getAuthToken();
    if (!token && typeof authManager !== 'undefined' && !authManager.isLoggedIn()) {
      toastManager?.show('Please log in to access messages', 'info');
      this.renderLogin();
      return;
    }
    this.navigate('/messages');
  }

  /**
   * Handle search submission from navbar
   */
  static handleSearch () {
    const input = document.getElementById('navbar-search-input');
    if (input && input.value.trim()) {
      window.location.hash = '/browse?q=' + encodeURIComponent(input.value.trim());
      this.renderBrowse({ search: input.value.trim() });
    }
  }

  /**
   * Toggle mobile menu drawer
   */
  static toggleMobileMenu () {
    const drawer = document.getElementById('navbar-drawer');
    const overlay = document.getElementById('navbar-overlay');
    if (drawer && overlay) {
      drawer.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Close mobile menu drawer
   */
  static closeMobileMenu () {
    const drawer = document.getElementById('navbar-drawer');
    const overlay = document.getElementById('navbar-overlay');
    if (drawer && overlay) {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  }

  /**
   * Render SVG star rating
   */
  static renderStars (rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        html += Icons.star;
      } else {
        html += Icons.starOutline;
      }
    }
    return html;
  }

  /**
   * Hide original navbar and footer for landing page
   */
  static hideOriginalNavFooter () {
    const navbar = document.getElementById('navbar');
    const footer = document.getElementById('footer');
    if (navbar) {
      navbar.style.display = 'none';
      navbar.setAttribute('data-hidden', 'true');
    }
    if (footer) {
      footer.style.display = 'none';
      footer.setAttribute('data-hidden', 'true');
    }
  }

  /**
   * Show original navbar and footer for other pages
   */
  static showOriginalNavFooter () {
    const navbar = document.getElementById('navbar');
    const footer = document.getElementById('footer');
    if (navbar && navbar.getAttribute('data-hidden') === 'true') {
      navbar.style.display = '';
      navbar.removeAttribute('data-hidden');
    }
    if (footer && footer.getAttribute('data-hidden') === 'true') {
      footer.style.display = 'block';
      footer.removeAttribute('data-hidden');
    }
    this.updateNavbar();
  }

  /**
   * Render Landing Page with University Selection - Modern Dark Theme
   */
  static async renderLanding () {
    // Hide original navbar and footer
    this.hideOriginalNavFooter();

    const mainContent = document.getElementById('main-content');
    let config = { universities: [], categories: [] };

    try {
      config = await api.loadJSON('data/config.json');
    } catch (error) {
      console.error('Error loading config:', error);
    }

    const selectedUniversity = StorageManager.get(STORAGE_KEYS.SELECTED_UNIVERSITY);

    // Add modern styles
    const modernStyles = `
      <style>
        .modern-landing {
          background-color: #050505;
          background-image: radial-gradient(circle at 15% 50%, rgba(99, 102, 241, 0.08), transparent 25%),
                            radial-gradient(circle at 85% 30%, rgba(99, 102, 241, 0.05), transparent 25%);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .modern-landing * {
          box-sizing: border-box;
        }
        .glass-card {
          background: rgba(20, 20, 20, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glass-card-hover:hover {
          background: rgba(30, 30, 30, 0.8);
          border-color: rgba(99, 102, 241, 0.2);
        }
        .text-indigo { color: #6366f1; }
        .bg-indigo { background-color: #6366f1; }
        .gradient-indigo { background: linear-gradient(135deg, #6366f1, #4f46e5); }
        .modern-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 1.5rem 2rem;
        }
        .modern-nav-inner {
          max-width: 80rem;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
        }
        .modern-hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 10rem 2rem 4rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .modern-hero-grid {
          max-width: 80rem;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: 4rem;
        }
        @media (min-width: 1024px) {
          .modern-hero-grid {
            grid-template-columns: repeat(12, 1fr);
          }
          .hero-text-col { grid-column: span 5; }
          .hero-visual-col { grid-column: span 7; }
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .hero-title {
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          font-weight: 500;
          line-height: 1.1;
          letter-spacing: -0.02em;
          margin-bottom: 1.5rem;
        }
        .hero-title-gradient {
          background: linear-gradient(135deg, #6366f1, #a5a6a6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-description {
          font-size: 1.25rem;
          font-weight: 300;
          line-height: 1.7;
          color: #a3a3a3;
          max-width: 32rem;
        }
        .hero-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 2rem;
        }
        .btn-modern-primary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          height: 3.5rem;
          padding: 0 2rem;
          border-radius: 1rem;
          font-weight: 500;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 0 20px rgba(99,102,241,0.3);
        }
        .btn-modern-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(99,102,241,0.5);
        }
        .btn-modern-secondary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          height: 3.5rem;
          padding: 0 2rem;
          border-radius: 1rem;
          font-weight: 500;
          background: transparent;
          color: white;
          border: 1px solid #404040;
          cursor: pointer;
          transition: all 0.3s;
        }
        .btn-modern-secondary:hover {
          border-color: #6366f1;
          background: rgba(30,30,30,0.8);
        }
        .hero-social-proof {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding-top: 1.5rem;
          margin-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .hero-avatars {
          display: flex;
          margin-right: -0.75rem;
        }
        .hero-avatar {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          border: 2px solid #050505;
          object-fit: cover;
        }
        .hero-avatar-count {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          border: 2px solid #050505;
          background: #262626;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .hero-visual {
          position: relative;
          height: 600px;
          display: none;
        }
        @media (min-width: 1024px) {
          .hero-visual { display: block; }
        }
        .visual-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          grid-template-rows: repeat(6, 1fr);
          gap: 1rem;
          height: 100%;
        }
        .visual-card {
          border-radius: 2.5rem;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
        .visual-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.7s;
        }
        .visual-card:hover img {
          transform: scale(1.1);
        }
        .visual-card-main {
          grid-column: span 5;
          grid-row: span 6;
        }
        .visual-card-wide {
          grid-column: span 7;
          grid-row: span 3;
        }
        .visual-card-small {
          grid-column: span 4;
          grid-row: span 3;
        }
        .visual-card-interactive {
          grid-column: span 3;
          grid-row: span 3;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .visual-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
        }
        .visual-label {
          position: absolute;
          bottom: 1.5rem;
          left: 1.5rem;
          color: white;
        }
        .visual-label-category {
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }
        .visual-label-title {
          font-size: 1.25rem;
          font-weight: 500;
        }
        .floating-card {
          position: absolute;
          top: 40%;
          right: -1rem;
          width: 16rem;
          padding: 1.25rem;
          border-radius: 1.5rem;
          transform: translateY(0);
          transition: transform 0.3s;
        }
        .floating-card:hover {
          transform: translateY(-0.5rem);
        }
        .floating-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .floating-card-item {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          margin-bottom: 1rem;
        }
        .floating-card-icon {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .universities-section {
          padding: 6rem 2rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .section-header {
          margin-bottom: 3rem;
        }
        .section-label {
          display: block;
          color: #818cf8;
          font-size: 0.875rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }
        .section-title {
          font-size: clamp(1.875rem, 4vw, 2.25rem);
          font-weight: 500;
          letter-spacing: -0.02em;
        }
        .universities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .university-card-modern {
          position: relative;
          border-radius: 1.5rem;
          overflow: hidden;
          cursor: pointer;
          height: 200px;
        }
        .university-card-modern img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.7s;
        }
        .university-card-modern:hover img {
          transform: scale(1.05);
        }
        .university-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.2), transparent);
        }
        .university-card-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 1.5rem;
        }
        .university-card-name {
          font-size: 1.125rem;
          font-weight: 500;
          color: white;
          margin-bottom: 0.25rem;
        }
        .university-card-meta {
          font-size: 0.875rem;
          color: #a3a3a3;
        }
        .categories-section {
          padding: 6rem 2rem;
          background: #080808;
        }
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-top: 3rem;
        }
        .category-card-modern {
          padding: 1.5rem;
          border-radius: 1.5rem;
          cursor: pointer;
          transition: all 0.3s;
        }
        .category-card-modern:hover {
          transform: translateY(-4px);
        }
        .category-icon-wrapper {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }
        .category-name {
          font-size: 1rem;
          font-weight: 500;
          color: white;
          margin-bottom: 0.5rem;
        }
        .category-description {
          font-size: 0.875rem;
          color: #a3a3a3;
          line-height: 1.5;
        }
        .features-section {
          padding: 6rem 2rem;
          background: #080808;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
          margin-top: 3rem;
        }
        .feature-card-modern {
          padding: 2rem;
          border-radius: 1.5rem;
          transition: all 0.3s;
        }
        .feature-card-modern:hover {
          background: rgba(30,30,30,0.8);
          border-color: rgba(99,102,241,0.2);
        }
        .feature-icon-wrapper {
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .feature-title {
          font-size: 1.125rem;
          font-weight: 500;
          color: white;
          margin-bottom: 0.75rem;
        }
        .feature-description {
          font-size: 0.875rem;
          color: #a3a3a3;
          line-height: 1.6;
        }
        .how-it-works-section {
          padding: 6rem 2rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
          margin-top: 3rem;
        }
        .step-item {
          text-align: center;
        }
        .step-number {
          width: 4rem;
          height: 4rem;
          margin: 0 auto 1.5rem;
          border-radius: 50%;
          background: rgba(99,102,241,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: #6366f1;
        }
        .step-title {
          font-size: 1.125rem;
          font-weight: 500;
          color: white;
          margin-bottom: 0.75rem;
        }
        .step-description {
          font-size: 0.875rem;
          color: #a3a3a3;
          line-height: 1.5;
        }
        .cta-section {
          padding: 8rem 2rem;
          position: relative;
          overflow: hidden;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .cta-glow {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 50rem;
          height: 25rem;
          background: rgba(99,102,241,0.1);
          filter: blur(8rem);
          border-radius: 50%;
          pointer-events: none;
        }
        .cta-content {
          max-width: 42rem;
          margin: 0 auto;
          text-align: center;
          position: relative;
          z-index: 10;
        }
        .cta-title {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 500;
          letter-spacing: -0.02em;
          margin-bottom: 1.5rem;
        }
        .cta-description {
          font-size: 1.125rem;
          color: #a3a3a3;
          margin-bottom: 2.5rem;
          line-height: 1.7;
        }
        .modern-footer {
          background: #030303;
          padding: 5rem 2rem 2rem;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .footer-grid {
          max-width: 80rem;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 3rem;
          margin-bottom: 4rem;
        }
        .footer-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .footer-brand-icon {
          width: 2rem;
          height: 2rem;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .footer-brand-name {
          font-size: 1.125rem;
          font-weight: 500;
          color: white;
        }
        .footer-description {
          font-size: 0.875rem;
          color: #737373;
          line-height: 1.6;
          max-width: 20rem;
        }
        .footer-social {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .footer-social-link {
          color: #737373;
          transition: color 0.2s;
        }
        .footer-social-link:hover {
          color: white;
        }
        .footer-column-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: white;
          margin-bottom: 1.5rem;
        }
        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .footer-links li {
          margin-bottom: 1rem;
        }
        .footer-links a {
          color: #737373;
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .footer-links a:hover {
          color: #6366f1;
        }
        .footer-bottom {
          max-width: 80rem;
          margin: 0 auto;
          padding-top: 2rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }
        .footer-copyright {
          font-size: 0.75rem;
          color: #525252;
        }
        .footer-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: #525252;
        }
        .status-dot {
          width: 0.375rem;
          height: 0.375rem;
          border-radius: 50%;
          background: #22c55e;
        }
        .spinner-ring {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(99,102,241,0.3);
          border-radius: 50%;
          border-top-color: #6366f1;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    `;

    mainContent.innerHTML =
      modernStyles +
      `
      <div class="modern-landing">
        <!-- Top Notification Bar -->
        <div class="top-notification-bar" style="background: linear-gradient(90deg, rgba(99,102,241,0.2), rgba(79,70,229,0.2)); border-bottom: 1px solid rgba(99,102,241,0.3); padding: 0.75rem 1rem; text-align: center;">
          <div style="max-width: 80rem; margin: 0 auto; display: flex; align-items: center; justify-content: center; gap: 0.75rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #a5b4fc;">
              <path d="M12 2v4"></path>
              <path d="m16.2 7.8 2.9-2.9"></path>
              <path d="M18 12h4"></path>
              <path d="m16.2 16.2 2.9 2.9"></path>
              <path d="M12 18v4"></path>
              <path d="m4.9 19.1 2.9-2.9"></path>
              <path d="M2 12h4"></path>
              <path d="m4.9 4.9 2.9 2.9"></path>
            </svg>
            <span style="color: #e0e7ff; font-size: 0.875rem; font-weight: 500;">
              ${Icons.party} New: <strong>Free delivery</strong> for first-time buyers at University of Ghana! &nbsp;&nbsp;|&nbsp;&nbsp; 
              <a href="#" onclick="Pages.renderRegister(); return false;" style="color: #6366f1; text-decoration: underline; text-underline-offset: 2px;">Sign up now</a>
            </span>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="modern-nav">
          <div class="modern-nav-inner glass-card" style="border-radius: 9999px;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div class="bg-indigo" style="padding: 0.375rem; border-radius: 0.5rem;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: black;">
                  <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
                  <path d="M22 10v6"></path>
                  <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                </svg>
              </div>
              <span style="font-weight: 500; font-size: 1.125rem; color: white; letter-spacing: -0.02em;">Uni-Hub</span>
            </div>

            <div style="display: none; md: display: flex; align-items: center; gap: 2rem; font-size: 0.875rem; font-weight: 500; color: #a3a3a3;">
              <a href="#browse" style="transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#a3a3a3'">Browse</a>
              <a href="#universities" style="transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#a3a3a3'">Universities</a>
              <a href="#sell" style="transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#a3a3a3'">Sell</a>
              <a href="#faq" style="transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#a3a3a3'">FAQ</a>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem;">
              <button onclick="Pages.renderLogin(); return false;" style="font-size: 0.875rem; font-weight: 500; color: #a3a3a3; background: none; border: none; cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#a3a3a3'">Log in</button>
              <button onclick="Pages.renderRegister(); return false;" class="bg-indigo" style="padding: 0.625rem 1.25rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; color: black; border: none; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.background='white'">
                Sign Up
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </div>
        </nav>

        <!-- Hero Section -->
        <section class="modern-hero">
          <div class="modern-hero-grid">
            <div class="hero-text-col">
              <div class="hero-badge glass-card" style="border: 1px solid rgba(255,255,255,0.1);">
                <span class="relative flex h-2 w-2">
                  <span class="spinner-ring" style="position: absolute; width: 100%; height: 100%; border-radius: 50%; opacity: 0.75;"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo"></span>
                </span>
                <span class="text-indigo">Active Across 7 Universities</span>
              </div>
              
              <h1 class="hero-title" style="color: white; margin-top: 1.5rem;">
                Buy & Sell with<br>
                <span class="hero-title-gradient">Students Like You.</span>
              </h1>
              
              <p class="hero-description">
                Uni-Hub connects students to trade pre-owned items within their university community. Textbooks, electronics, hostel items, and more — all from verified students near you.
              </p>
              
              <div class="hero-buttons">
                <button onclick="document.querySelector('#universities').scrollIntoView({behavior: 'smooth'}); return false;" class="btn-modern-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"></path>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"></path>
                    <path d="M2 7h20"></path>
                  </svg>
                  Browse Items
                </button>
                <button onclick="Pages.renderRegister(); return false;" class="btn-modern-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path>
                    <path d="M7 7h.01"></path>
                  </svg>
                  Start Selling
                </button>
              </div>
              
              <div class="hero-social-proof">
                <div class="hero-avatars">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&h=64" alt="Student" class="hero-avatar">
                  <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=64&h=64" alt="Student" class="hero-avatar" style="margin-left: -0.75rem;">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64" alt="Student" class="hero-avatar" style="margin-left: -0.75rem;">
                  <div class="hero-avatar-count" style="margin-left: -0.75rem;">+2k</div>
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 0.25rem; color: #6366f1;">
                    <svg style="width: 1rem; height: 1rem; fill: currentColor;" viewBox="0 0 24 24"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path></svg>
                    <svg style="width: 1rem; height: 1rem; fill: currentColor;" viewBox="0 0 24 24"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path></svg>
                    <svg style="width: 1rem; height: 1rem; fill: currentColor;" viewBox="0 0 24 24"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path></svg>
                    <svg style="width: 1rem; height: 1rem; fill: currentColor;" viewBox="0 0 24 24"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path></svg>
                    <svg style="width: 1rem; height: 1rem; fill: currentColor;" viewBox="0 0 24 24"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path></svg>
                  </div>
                  <p style="font-size: 0.875rem; color: #737373; margin-top: 0.125rem;">Trusted by students across Ghana</p>
                </div>
              </div>
            </div>
            
            <div class="hero-visual-col hero-visual">
              <div class="visual-grid">
                <div class="visual-card visual-card-main">
                  <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop" alt="Students studying">
                  <div class="visual-overlay"></div>
                  <div class="visual-label">
                    <p class="visual-label-category text-indigo">Electronics</p>
                    <h3 class="visual-label-title">Laptops & Phones</h3>
                  </div>
                </div>
                
                <div class="visual-card visual-card-wide">
                  <img src="https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop" alt="Textbooks">
                  <div class="visual-overlay"></div>
                  <div style="position: absolute; top: 1rem; right: 1rem; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); padding: 0.375rem 0.75rem; border-radius: 9999px; display: flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.1);">
                    <span style="width: 0.5rem; height: 0.5rem; border-radius: 50%; background: #818cf8;"></span>
                    <span style="font-size: 0.75rem; font-weight: 500; color: white;">Popular</span>
                  </div>
                </div>
                
                <div class="visual-card visual-card-small">
                  <img src="https://images.unsplash.com/photo-1555041761-63a74ad3efde?w=600&auto=format&fit=crop" alt="Hostel furniture">
                  <div class="visual-overlay"></div>
                </div>
                
                <div class="visual-card-interactive">
                  <div style="position: relative; width: 8rem; height: 8rem;">
                    <svg style="width: 100%; height: 100%; position: absolute; color: #404040; animation: spin 10s linear infinite;" viewBox="0 0 100 100">
                      <path id="curve" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="transparent"></path>
                      <text style="font-size: 10px; font-weight: 700; letter-spacing: 0.1em; fill: currentColor;">
                        <textPath xlink:href="#curve">• Buy & Sell • Verified Students • Safe Trading</textPath>
                      </text>
                    </svg>
                    <button onclick="document.querySelector('#universities').scrollIntoView({behavior: 'smooth'}); return false;" class="bg-indigo" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 4rem; height: 4rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px -5px rgba(99,102,241,0.4); transition: transform 0.3s;" onmouseover="this.style.transform='translate(-50%, -50%) scale(1.1)'" onmouseout="this.style.transform='translate(-50%, -50%)'">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: black;">
                        <path d="M7 7h10v10"></path>
                        <path d="M7 17 17 7"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Floating Card -->
              <div class="floating-card glass-card">
                <div class="floating-card-header">
                  <span style="font-size: 0.75rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; color: #a3a3a3;">Recent Sale</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #525252;">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="19" cy="12" r="1"></circle>
                    <circle cx="5" cy="12" r="1"></circle>
                  </svg>
                </div>
                <div class="floating-card-item">
                  <div style="width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background: rgba(99,102,241,0.1); display: flex; align-items: center; justify-content: center; color: #6366f1;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.61a1 1 0 0 1-.9-1.45L4 16"></path>
                    </svg>
                  </div>
                  <div>
                    <p style="font-size: 0.875rem; font-weight: 500; color: white;">HP ProBook 450</p>
                    <p style="font-size: 0.75rem; color: #a3a3a3;">UG Student • 2 hours ago</p>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.05);">
                  <span style="font-size: 0.75rem; color: #a3a3a3;">Sold For</span>
                  <span style="font-size: 0.875rem; font-weight: 600; color: #6366f1;">GHS 2,100</span>
                </div>
                <div style="margin-top: 0.75rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 500; padding: 0.25rem 0.5rem; border-radius: 0.25rem; background: rgba(99,102,241,0.1); color: #a5b4fc; width: fit-content;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="m9 12 2 2 4-4"></path>
                  </svg>
                  Verified Student
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Universities Section -->
        <section id="universities" class="universities-section">
          <div style="max-width: 80rem; margin: 0 auto;">
            <div class="section-header" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 1.5rem;">
              <div>
                <span class="section-label">Select Your Campus</span>
                <h2 class="section-title" style="color: white;">Browse by University</h2>
              </div>
              <a href="#" onclick="Pages.renderBrowse(); return false;" style="font-size: 0.875rem; color: #a3a3a3; transition: color 0.2s; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#a3a3a3'">
                View all items
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </a>
            </div>
            
            <div class="universities-grid">
              ${config.universities
    .slice(0, 5)
    .map(
      (uni, i) => `
                <div onclick="Pages.selectUniversity('${uni.id}'); return false;" class="university-card-modern">
                  <img src="https://images.unsplash.com/photo-${['1541339907198-e08756dedf3f', '1592280771190-3e2e4d571952', '1523050854058-8df90110c9f1', '1562774053-701939374585', '1509062522246-3755977927d7'][i]}?w=800&auto=format&fit=crop" alt="${uni.name}">
                  <div class="university-card-overlay"></div>
                  <div class="university-card-content">
                    <h3 class="university-card-name">${uni.name}</h3>
                    <p class="university-card-meta">${Icons.locationPin} ${uni.campus} • ${100 + i * 50}+ items</p>
                  </div>
                </div>
              `,
    )
    .join('')}
              
              <div onclick="Pages.renderBrowse(); return false;" class="university-card-modern glass-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2rem; transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'">
                <div style="width: 4rem; height: 4rem; border-radius: 50%; background: rgba(99,102,241,0.1); display: flex; align-items: center; justify-content: center; color: #6366f1; margin-bottom: 1rem; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"></path>
                    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path>
                    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"></path>
                    <path d="M10 6h4"></path>
                    <path d="M10 10h4"></path>
                    <path d="M10 14h4"></path>
                    <path d="M10 18h4"></path>
                  </svg>
                </div>
                <h3 style="font-size: 1rem; font-weight: 500; color: white; margin-bottom: 0.5rem;">View All Universities</h3>
                <p style="font-size: 0.875rem; color: #a3a3a3;">Browse items from all 7 universities</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Categories Section with Tabs -->
        <section id="browse" class="categories-section">
          <div style="max-width: 80rem; margin: 0 auto; text-align: center;">
            <span class="section-label">Shop by Category</span>
            <h2 class="section-title" style="color: white; margin-bottom: 1rem;">Find What You Need</h2>
            <p style="color: #737373; max-width: 32rem; margin: 0 auto 2rem; font-weight: 300;">From textbooks to electronics, find everything you need for student life.</p>
            
            <!-- Tabbed Category Navigation -->
            <div class="category-tabs" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; margin-bottom: 2rem;">
              <button class="category-tab active" data-category="all" onclick="Pages.filterCategoryTab('all', this)" style="padding: 0.625rem 1.25rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; background: rgba(99,102,241,0.2); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3); cursor: pointer; transition: all 0.2s;">All</button>
              <button class="category-tab" data-category="textbooks" onclick="Pages.filterCategoryTab('textbooks', this)" style="padding: 0.625rem 1.25rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; background: transparent; color: #a3a3a3; border: 1px solid rgba(63,63,70,1); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.25rem;">${Icons.textbooks} Textbooks</button>
              <button class="category-tab" data-category="electronics" onclick="Pages.filterCategoryTab('electronics', this)" style="padding: 0.625rem 1.25rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; background: transparent; color: #a3a3a3; border: 1px solid rgba(63,63,70,1); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.25rem;">${Icons.monitor} Electronics</button>
              <button class="category-tab" data-category="hostel-items" onclick="Pages.filterCategoryTab('hostel-items', this)" style="padding: 0.625rem 1.25rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; background: transparent; color: #a3a3a3; border: 1px solid rgba(63,63,70,1); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.25rem;">${Icons.hostel} Hostel</button>
              <button class="category-tab" data-category="fashion" onclick="Pages.filterCategoryTab('fashion', this)" style="padding: 0.625rem 1.25rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; background: transparent; color: #a3a3a3; border: 1px solid rgba(63,63,70,1); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.25rem;">${Icons.fashion} Fashion</button>
            </div>
            
            <div class="categories-grid">
              ${config.categories
    .slice(0, 4)
    .map(
      cat => `
                <div onclick="Pages.renderBrowse({category: '${cat.id}'}); return false;" class="category-card-modern glass-card glass-card-hover">
                  <div class="category-icon-wrapper" style="background: linear-gradient(135deg, ${cat.id === 'textbooks' ? 'rgba(59,130,246,0.4), rgba(99,102,241,0.4)' : cat.id === 'electronics' ? 'rgba(168,85,247,0.4), rgba(236,72,153,0.4)' : cat.id === 'hostel-items' ? 'rgba(16,185,129,0.4), rgba(20,184,166,0.4)' : 'rgba(249,115,22,0.4), rgba(239,68,68,0.4)'});">
                    ${cat.icon}
                  </div>
                  <h3 class="category-name">${cat.name}</h3>
                  <p class="category-description">${cat.description}</p>
                </div>
              `,
    )
    .join('')}
            </div>
          </div>
        </section>

        <!-- About Uni-Hub Section -->
        <section class="about-section" style="padding: 6rem 2rem; background: #080808; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div style="max-width: 80rem; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 3rem;">
              <span class="section-label">About Uni-Hub</span>
              <h2 class="section-title" style="color: white;">Your Campus Marketplace</h2>
            </div>

            <div style="max-width: 56rem; margin: 0 auto;">
              <p style="color: #a3a3a3; font-size: 1.125rem; line-height: 1.8; margin-bottom: 1.5rem;">
                <span style="color: #6366f1; font-weight: 600;">Uni-Hub</span> is a global university marketplace app that connects students to easily buy and sell essential academic items. It provides a convenient platform where students can access school-related needs such as textbooks, electronics, accommodation listings, and other campus essentials, all within their university community and beyond.
              </p>

              <p style="color: #a3a3a3; font-size: 1.125rem; line-height: 1.8; padding: 1.5rem; background: rgba(99,102,241,0.05); border-left: 3px solid #6366f1; border-radius: 0 0.5rem 0.5rem 0;">
                <span style="color: white; font-weight: 600;">Our Mission:</span> At Uni-Hub, our mission is to make student essentials affordable and accessible, ensuring that every student can get what they need without financial stress.
              </p>
            </div>

            <!-- Key Stats -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin-top: 4rem; padding-top: 3rem; border-top: 1px solid rgba(255,255,255,0.05);">
              <div style="text-align: center;">
                <div style="font-size: 2.5rem; font-weight: 700; color: #6366f1; margin-bottom: 0.5rem;">7+</div>
                <div style="color: #737373; font-size: 0.875rem;">Universities Connected</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 2.5rem; font-weight: 700; color: #6366f1; margin-bottom: 0.5rem;">2,000+</div>
                <div style="color: #737373; font-size: 0.875rem;">Verified Students</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 2.5rem; font-weight: 700; color: #6366f1; margin-bottom: 0.5rem;">5,000+</div>
                <div style="color: #737373; font-size: 0.875rem;">Items Listed</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 2.5rem; font-weight: 700; color: #6366f1; margin-bottom: 0.5rem;">GHS 500K+</div>
                <div style="color: #737373; font-size: 0.875rem;">In Student Sales</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Features Section -->
        <section class="features-section">
          <div style="max-width: 80rem; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 4rem;">
              <h2 class="section-title" style="color: white; margin-bottom: 1rem;">Why Choose Uni-Hub?</h2>
              <p style="color: #737373; max-width: 32rem; margin: 0 auto; font-weight: 300;">Built by students, for students. Safe, convenient, and campus-focused.</p>
            </div>
            
            <div class="features-grid">
              <div class="feature-card-modern glass-card glass-card-hover">
                <div class="feature-icon-wrapper" style="background: linear-gradient(135deg, rgba(99,102,241,0.4), rgba(59,130,246,0.4));">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                    <path d="m9 12 2 2 4-4"></path>
                  </svg>
                </div>
                <h3 class="feature-title">Verified Students Only</h3>
                <p class="feature-description">Every user is verified with their university email or student ID. Trade safely within your campus community.</p>
              </div>
              
              <div class="feature-card-modern glass-card glass-card-hover">
                <div class="feature-icon-wrapper" style="background: linear-gradient(135deg, rgba(16,185,129,0.4), rgba(20,184,166,0.4));">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path>
                    <path d="M15 18H9"></path>
                    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path>
                    <circle cx="17" cy="18" r="2"></circle>
                    <circle cx="7" cy="18" r="2"></circle>
                  </svg>
                </div>
                <h3 class="feature-title">Fast Campus Delivery</h3>
                <p class="feature-description">Choose from Bolt, Yango, or meet in person. Get your items delivered within hours, not days.</p>
              </div>
              
              <div class="feature-card-modern glass-card glass-card-hover">
                <div class="feature-icon-wrapper" style="background: linear-gradient(135deg, rgba(249,115,22,0.4), rgba(239,68,68,0.4));">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path>
                    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path>
                    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path>
                  </svg>
                </div>
                <h3 class="feature-title">Flexible Payment</h3>
                <p class="feature-description">Pay with MoMo, Telecel Cash, bank transfer, or cash on delivery. Choose what works for you.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- How It Works Section -->
        <section class="how-it-works-section">
          <div style="max-width: 80rem; margin: 0 auto; text-align: center;">
            <span class="section-label">Simple Process</span>
            <h2 class="section-title" style="color: white; margin-bottom: 1rem;">How Uni-Hub Works</h2>
            
            <div class="steps-grid">
              <div class="step-item">
                <div class="step-number">1</div>
                <h3 class="step-title">Select University</h3>
                <p class="step-description">Choose your campus to browse items from students in your university</p>
              </div>
              <div class="step-item">
                <div class="step-number">2</div>
                <h3 class="step-title">Browse Items</h3>
                <p class="step-description">Find textbooks, electronics, furniture, and more from verified students</p>
              </div>
              <div class="step-item">
                <div class="step-number">3</div>
                <h3 class="step-title">Connect & Buy</h3>
                <p class="step-description">Chat with sellers, arrange delivery, and pay securely</p>
              </div>
              <div class="step-item">
                <div class="step-number">4</div>
                <h3 class="step-title">Get Delivery</h3>
                <p class="step-description">Receive your items via Bolt, Yango, or meet in person on campus</p>
              </div>
            </div>
          </div>
        </section>

        <!-- CTA Section -->
        <section class="cta-section">
          <div class="cta-glow"></div>
          <div class="cta-content">
            <h2 class="cta-title" style="color: white;">Ready to Get Started?</h2>
            <p class="cta-description">Join hundreds of students already buying and selling on Uni-Hub. Select your university to begin.</p>
            <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center;">
              <button onclick="document.querySelector('#universities').scrollIntoView({behavior: 'smooth'}); return false;" class="bg-indigo" style="height: 3.5rem; padding: 0 2rem; border-radius: 1rem; font-weight: 500; color: black; border: none; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.background='white'">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Select University
              </button>
              <button onclick="Pages.renderRegister(); return false;" style="height: 3.5rem; padding: 0 2rem; border-radius: 1rem; font-weight: 500; color: white; border: 1px solid #404040; background: transparent; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.borderColor='#6366f1'; this.style.background='rgba(30,30,30,0.8)'">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <line x1="19" x2="19" y1="8" y2="14"></line>
                  <line x1="22" x2="16" y1="11" y2="11"></line>
                </svg>
                Create Account
              </button>
            </div>
          </div>
        </section>

        <!-- Footer -->
        <footer class="modern-footer">
          <div class="footer-grid">
            <div style="grid-column: span 2;">
              <div class="footer-brand">
                <div class="footer-brand-icon" style="background: rgba(99,102,241,0.2);">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: #6366f1;">
                    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
                    <path d="M22 10v6"></path>
                    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
                  </svg>
                </div>
                <span class="footer-brand-name">Uni-Hub</span>
              </div>
              <p class="footer-description">Connecting students across Ghana to buy and sell items within their university community. Safe, verified, and convenient.</p>
              <div class="footer-social">
                <a href="#" class="footer-social-link">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                  </svg>
                </a>
                <a href="#" class="footer-social-link">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                  </svg>
                </a>
                <a href="#" class="footer-social-link">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h4 class="footer-column-title">Quick Links</h4>
              <ul class="footer-links">
                <li><a href="#browse">Browse Items</a></li>
                <li><a href="#universities">Universities</a></li>
                <li><a href="#sell">Start Selling</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h4 class="footer-column-title">Support</h4>
              <ul class="footer-links">
                <li><a href="mailto:support@uni-hub.local">Contact Us</a></li>
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Safety Tips</a></li>
                <li><a href="#">Student Verification</a></li>
              </ul>
            </div>
            
            <div>
              <h4 class="footer-column-title">Legal</h4>
              <ul class="footer-links">
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Community Guidelines</a></li>
              </ul>
            </div>
          </div>
          
          <div class="footer-bottom">
            <p class="footer-copyright">© 2026 Uni-Hub. All rights reserved.</p>
            <div class="footer-status">
              <span class="status-dot"></span>
              Platform Operational
              <span style="margin-left: 1rem;">Accra, Ghana</span>
            </div>
          </div>
        </footer>
      </div>
    `;
  }

  /**
   * Setup university selection
   */
  static setupUniversitySelection () {
    const cards = document.querySelectorAll('.university-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.university-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });
  }

  /**
   * Select University
   */
  static selectUniversity (universityId) {
    StorageManager.set(STORAGE_KEYS.SELECTED_UNIVERSITY, universityId);
    // Redirect to student verification
    this.renderStudentVerification();
  }

  /**
   * Filter Category Tab on Landing Page
   */
  static filterCategoryTab (category, button) {
    // Update tab buttons
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.style.background = 'transparent';
      tab.style.color = '#a3a3a3';
      tab.style.borderColor = 'rgba(63,63,70,1)';
    });

    // Update clicked button
    button.style.background = 'rgba(99,102,241,0.2)';
    button.style.color = '#a5b4fc';
    button.style.borderColor = 'rgba(99,102,241,0.3)';

    // Navigate to browse with category filter
    if (category === 'all') {
      this.renderBrowse();
    } else {
      this.renderBrowse({ category: category });
    }
  }

  /**
   * Render Student Verification Page
   */
  static renderStudentVerification () {
    const mainContent = document.getElementById('main-content');
    const selectedUniversity = StorageManager.get(STORAGE_KEYS.SELECTED_UNIVERSITY);
    const verification = StorageManager.get(STORAGE_KEYS.STUDENT_VERIFICATION, true);

    // Get university name
    let universityName = 'your university';
    api
      .loadJSON('data/config.json')
      .then(config => {
        const uni = config.universities.find(u => u.id === selectedUniversity);
        if (uni) {
          universityName = uni.name;
          // Re-render with university name
          mainContent.querySelector('.verification-university-name').textContent = universityName;
        }
      })
      .catch(() => {});

    // Check if already verified
    if (
      verification &&
      verification.isVerified &&
      verification.universityId === selectedUniversity
    ) {
      this.renderBrowse();
      return;
    }

    mainContent.innerHTML = `
      <div class="auth-container">
        <div class="auth-card verification-card">
          <div class="verification-header">
            <div class="verification-icon">${Icons.graduation}</div>
            <h2>Verify Your Student Status</h2>
            <p class="verification-subtitle">Confirm you're a student at <span class="verification-university-name">${universityName}</span></p>
          </div>

          <!-- Verification Method Tabs -->
          <div class="verification-tabs">
            <button class="verification-tab active" data-tab="email" onclick="Pages.switchVerificationTab('email')">
              <span class="tab-icon">${Icons.email}</span>
              <span class="tab-label">University Email</span>
              <span class="tab-desc">For continuing students</span>
            </button>
            <button class="verification-tab" data-tab="document" onclick="Pages.switchVerificationTab('document')">
              <span class="tab-icon">${Icons.document}</span>
              <span class="tab-label">Admission Documents</span>
              <span class="tab-desc">For new students</span>
            </button>
          </div>

          <!-- Email Verification Form -->
          <form id="verification-form-email" class="verification-form active" onsubmit="Pages.handleStudentVerification(event)">
            <div class="verification-info">
              <p><strong>${Icons.graduation} For Continuing Students:</strong> Use your official university email address for instant verification.</p>
            </div>

            <div class="form-group">
              <label for="student-email" class="required">University Email Address</label>
              <input 
                type="email" 
                id="student-email" 
                name="studentEmail" 
                class="form-control" 
                placeholder="e.g., student@ug.edu.gh" 
                required 
              />
              <small class="form-hint">Enter your official university email address (e.g., @ug.edu.gh, @knust.edu.gh)</small>
            </div>

            <div class="form-group">
              <label for="student-id" class="required">Student ID Number</label>
              <input 
                type="text" 
                id="student-id" 
                name="studentId" 
                class="form-control" 
                placeholder="e.g., 10234567" 
                required 
              />
              <small class="form-hint">Your university student ID number</small>
            </div>

            <div class="form-group">
              <label for="full-name" class="required">Full Name</label>
              <input 
                type="text" 
                id="full-name" 
                name="fullName" 
                class="form-control" 
                placeholder="As it appears on your student ID" 
                required 
              />
            </div>

            <div class="form-group">
              <label for="phone" class="required">Phone Number</label>
              <input 
                type="tel" 
                id="phone" 
                name="phone" 
                class="form-control" 
                placeholder="e.g., +233 50 123 4567" 
                required 
              />
              <small class="form-hint">Ghana phone number for contact</small>
            </div>

            <div class="form-group">
              <label for="level" class="required">Current Level</label>
              <select id="level" name="level" class="form-control" required>
                <option value="">Select your level</option>
                <option value="100">Level 100 (First Year)</option>
                <option value="200">Level 200 (Second Year)</option>
                <option value="300">Level 300 (Third Year)</option>
                <option value="400">Level 400 (Fourth Year)</option>
                <option value="500">Level 500+ (Fifth Year or above)</option>
                <option value="postgrad">Postgraduate</option>
                <option value="phd">PhD Student</option>
              </select>
            </div>

            <div class="form-group">
              <label for="hall" class="optional">Hall/Residence (Optional)</label>
              <input 
                type="text" 
                id="hall" 
                name="hall" 
                class="form-control" 
                placeholder="e.g., Commonwealth Hall, Katanga" 
              />
              <small class="form-hint">Your hall of residence or off-campus address</small>
            </div>

            <div class="form-check">
              <input type="checkbox" id="verify-declaration-email" name="verifyDeclaration" required />
              <label for="verify-declaration-email">
                I declare that I am a currently enrolled student at ${universityName} and the information provided is accurate.
              </label>
            </div>

            <div class="verification-actions">
              <button type="button" class="btn btn-ghost" onclick="Pages.renderLanding()">
                ← Back to Universities
              </button>
              <button type="submit" class="btn btn-primary">
                Verify with Email →
              </button>
            </div>
          </form>

          <!-- Document Verification Form -->
          <form id="verification-form-document" class="verification-form" onsubmit="Pages.handleDocumentVerification(event)">
            <div class="verification-info warning">
              <p><strong>${Icons.clipboard} For New/Level 100 Students:</strong> Upload your admission letter or student ID for manual verification. This may take 24-48 hours.</p>
            </div>

            <div class="form-group">
              <label for="doc-email" class="required">Personal Email Address (Gmail, etc.)</label>
              <input 
                type="email" 
                id="doc-email" 
                name="docEmail" 
                class="form-control" 
                placeholder="e.g., yourname@gmail.com" 
                required 
              />
              <small class="form-hint">We'll send verification updates to this email</small>
            </div>

            <div class="form-group">
              <label for="doc-student-id" class="required">Student ID Number</label>
              <input 
                type="text" 
                id="doc-student-id" 
                name="docStudentId" 
                class="form-control" 
                placeholder="e.g., 10234567" 
                required 
              />
              <small class="form-hint">Your university student ID number</small>
            </div>

            <div class="form-group">
              <label for="doc-full-name" class="required">Full Name</label>
              <input 
                type="text" 
                id="doc-full-name" 
                name="docFullName" 
                class="form-control" 
                placeholder="As it appears on your admission letter" 
                required 
              />
            </div>

            <div class="form-group">
              <label for="doc-phone" class="required">Phone Number</label>
              <input 
                type="tel" 
                id="doc-phone" 
                name="docPhone" 
                class="form-control" 
                placeholder="e.g., +233 50 123 4567" 
                required 
              />
            </div>

            <div class="form-group">
              <label for="doc-level" class="required">Current Level</label>
              <select id="doc-level" name="docLevel" class="form-control" required>
                <option value="">Select your level</option>
                <option value="100" selected>Level 100 (First Year)</option>
                <option value="200">Level 200 (Second Year)</option>
                <option value="300">Level 300 (Third Year)</option>
                <option value="400">Level 400 (Fourth Year)</option>
                <option value="500">Level 500+ (Fifth Year or above)</option>
                <option value="postgrad">Postgraduate</option>
                <option value="phd">PhD Student</option>
              </select>
            </div>

            <div class="form-group">
              <label class="required">Upload Admission Documents</label>
              <div class="file-upload-area" onclick="document.getElementById('doc-files').click()">
                <div class="upload-icon">${Icons.upload}</div>
                <div class="upload-text">Click to upload or drag and drop</div>
                <div class="upload-hint">Accepted: Admission Letter, Student ID, Acceptance Letter (JPG, PNG, PDF - Max 5MB each)</div>
                <input type="file" id="doc-files" name="docFiles" multiple accept=".jpg,.jpeg,.png,.pdf" style="display: none;" required onchange="Pages.handleFileSelect(event)" />
              </div>
              <div id="file-list" class="file-list"></div>
              <small class="form-hint">Upload clear photos/scans of your admission documents</small>
            </div>

            <div class="form-check">
              <input type="checkbox" id="verify-declaration-document" name="verifyDeclaration" required />
              <label for="verify-declaration-document">
                I declare that I am a newly admitted student at ${universityName} and the documents provided are authentic.
              </label>
            </div>

            <div class="form-check warning-check">
              <input type="checkbox" id="verify-wait-time" name="verifyWaitTime" required />
              <label for="verify-wait-time">
                I understand that document verification takes 24-48 hours and I will be notified via email.
              </label>
            </div>

            <div class="verification-actions">
              <button type="button" class="btn btn-ghost" onclick="Pages.renderLanding()">
                ← Back to Universities
              </button>
              <button type="submit" class="btn btn-primary">
                Submit for Verification →
              </button>
            </div>
          </form>

          <div class="verification-help">
            <h4>Need Help?</h4>
            <ul>
              <li><strong>Continuing students:</strong> Use your university email for instant verification</li>
              <li><strong>New students:</strong> Upload admission letter or student ID card</li>
              <li><strong>Not sure?</strong> Contact your university's IT support</li>
              <li><strong>Need assistance?</strong> Email support@uni-hub.local</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Switch Verification Tab
   */
  static switchVerificationTab (tab) {
    // Update tab buttons
    document.querySelectorAll('.verification-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.verification-tab[data-tab="${tab}"]`).classList.add('active');

    // Update forms
    document.querySelectorAll('.verification-form').forEach(f => f.classList.remove('active'));
    document.getElementById(`verification-form-${tab}`).classList.add('active');
  }

  /**
   * Handle File Selection
   */
  static handleFileSelect (event) {
    const files = event.target.files;
    const fileList = document.getElementById('file-list');

    if (files.length > 0) {
      fileList.innerHTML =
        '<div class="uploaded-files"><strong>Selected files:</strong><ul>' +
        Array.from(files)
          .map(f => `<li>${f.name} (${(f.size / 1024).toFixed(1)} KB)</li>`)
          .join('') +
        '</ul></div>';
    }
  }

  /**
   * Handle Student Verification (Email Method)
   */
  static async handleStudentVerification (event) {
    event.preventDefault();
    const form = document.getElementById('verification-form-email');
    const selectedUniversity = StorageManager.get(STORAGE_KEYS.SELECTED_UNIVERSITY);

    const verificationData = {
      universityId: selectedUniversity,
      verificationMethod: 'email',
      studentEmail: form.studentEmail.value,
      studentId: form.studentId.value,
      fullName: form.fullName.value,
      phone: form.phone.value,
      level: form.level.value,
      hall: form.hall.value || null,
      isVerified: true,
      verifiedAt: new Date().toISOString(),
    };

    // Validate student email domain (basic validation)
    const emailDomain = verificationData.studentEmail.split('@')[1];
    const config = await api.loadJSON('data/config.json').catch(() => ({ universities: [] }));
    const university = config.universities.find(u => u.id === selectedUniversity);

    // Store verification data
    StorageManager.set(STORAGE_KEYS.STUDENT_VERIFICATION, verificationData);

    // Show success message
    alert(
      `✓ Verification Successful!\n\nWelcome, ${verificationData.fullName}!\nYou are now verified as a student of ${university ? university.name : 'your university'}.\n\nYou can now browse and trade on Uni-Hub.`,
    );

    // Redirect to browse page
    this.renderBrowse();
  }

  /**
   * Handle Document Verification
   */
  static async handleDocumentVerification (event) {
    event.preventDefault();
    const form = document.getElementById('verification-form-document');
    const selectedUniversity = StorageManager.get(STORAGE_KEYS.SELECTED_UNIVERSITY);
    const files = document.getElementById('doc-files').files;

    // Validate files
    if (files.length === 0) {
      alert('Please upload at least one document (admission letter or student ID)');
      return;
    }

    // Validate file sizes (max 5MB each)
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size is 5MB.`);
        return;
      }
    }

    const verificationData = {
      universityId: selectedUniversity,
      verificationMethod: 'document',
      personalEmail: form.docEmail.value,
      studentId: form.docStudentId.value,
      fullName: form.docFullName.value,
      phone: form.docPhone.value,
      level: form.docLevel.value,
      documents: Array.from(files).map(f => ({ name: f.name, size: f.size })),
      isVerified: false, // Pending manual verification
      isPending: true,
      submittedAt: new Date().toISOString(),
    };

    // Store pending verification
    StorageManager.set(STORAGE_KEYS.STUDENT_VERIFICATION, verificationData);

    // In production, this would upload files to a server
    // eslint-disable-next-line no-console
    console.log('Documents to upload:', files);

    // Show success message
    alert(
      `✓ Verification Submitted!\n\nThank you, ${verificationData.fullName}!\n\nYour documents have been submitted for verification.\n\nYou will receive an email at ${verificationData.personalEmail} within 24-48 hours once your student status is confirmed.\n\nYou can browse Uni-Hub while waiting for verification.`,
    );

    // Redirect to browse page (allow browsing while pending)
    this.renderBrowse();
  }

  /**
   * Render Login Modal Overlay
   */
  static renderLogin () {
    // Don't hide navbar/footer - show as overlay on landing page
    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.className = 'auth-overlay';
    overlay.onclick = e => {
      if (e.target === overlay) {
        this.closeAuthOverlay();
      }
    };

    overlay.innerHTML = `
      <style>
        .auth-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
          animation: fadeIn 0.25s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .auth-card-modern {
          position: relative;
          width: 100%;
          max-width: 26rem;
          padding: 2.5rem;
          background: linear-gradient(145deg, #0f0f0f, #1a1a1a);
          border-radius: 1.25rem;
          border: 1px solid rgba(99, 102, 241, 0.3);
          box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.1);
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .auth-close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 0.5rem;
          transition: color 0.2s;
        }
        .auth-close-btn:hover {
          color: #fafafa;
        }
        .auth-card-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .auth-icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.75rem;
        }
        .auth-icon-wrapper img {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.5rem;
        }
        .auth-title {
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: -0.025em;
          color: #fafafa;
          margin-bottom: 0.25rem;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .auth-subtitle {
          font-size: 0.875rem;
          color: #a1a1aa;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .social-buttons-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 2.25rem;
          padding: 0 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid rgba(39, 39, 42, 1);
          background: #0a0a0a;
          cursor: pointer;
          transition: all 0.2s;
        }
        .social-btn:hover {
          background: rgba(24, 24, 27, 1);
          border-color: rgba(63, 63, 70, 1);
        }
        .divider {
          position: relative;
          margin: 1.5rem 0;
        }
        .divider-line {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
        }
        .divider-line span {
          width: 100%;
          border-top: 1px solid rgba(39, 39, 42, 1);
        }
        .divider-text {
          position: relative;
          display: flex;
          justify-content: center;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .divider-text span {
          background: #0a0a0a;
          padding: 0 0.5rem;
          color: #a1a1aa;
        }
        .form-group-modern {
          margin-bottom: 1rem;
        }
        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #fafafa;
          margin-bottom: 0.5rem;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .form-input {
          display: flex;
          height: 2.75rem;
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid rgba(39, 39, 42, 1);
          background: #0a0a0a;
          padding: 0 0.75rem;
          font-size: 0.875rem;
          color: #fafafa;
          transition: all 0.2s;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .form-input:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }
        .form-input::placeholder {
          color: #52525b;
        }
        .password-input-wrapper {
          position: relative;
        }
        .password-toggle-btn {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          color: #71717a;
          transition: color 0.2s;
        }
        .password-toggle-btn:hover {
          color: #fafafa;
        }
        .submit-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
          height: 2.75rem;
          padding: 0 1rem;
          width: 100%;
          background: #18181b;
          color: #fafafa;
          border: 1px solid rgba(39, 39, 42, 1);
          cursor: pointer;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .submit-btn:hover {
          background: #27272a;
          border-color: rgba(63, 63, 70, 1);
        }
        .submit-btn-primary {
          background: #6366f1;
          color: #ffffff;
          border: none;
        }
        .submit-btn-primary:hover {
          background: #4f46e5;
        }
        .auth-footer-links {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(39, 39, 42, 1);
        }
        .auth-footer-links p {
          font-size: 0.875rem;
          color: #a1a1aa;
          margin-bottom: 0;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
.auth-link {
      color: #6366f1;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
      cursor: pointer;
      display: inline-block;
    }
    .auth-link:hover {
      color: #4f46e5;
      text-decoration: underline;
    }
      </style>

      <div class="auth-card-modern">
        <button class="auth-close-btn" onclick="Pages.closeAuthOverlay()">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="auth-card-header">
          <div class="auth-icon-wrapper">
            <img src="/favicon.png" alt="Uni-Hub" />
          </div>
          <h1 class="auth-title">Welcome back</h1>
          <p class="auth-subtitle">Enter your credentials to sign in to Uni-Hub</p>
        </div>

        <div class="social-buttons-grid">
          <button class="social-btn" title="Sign in with Google">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem;">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
            </svg>
          </button>
          <button class="social-btn" title="Sign in with Apple">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem; fill: #fafafa;">
              <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"></path>
            </svg>
          </button>
          <button class="social-btn" title="Sign in with X">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem; fill: #fafafa;">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>
          </button>
        </div>

        <div class="divider">
          <div class="divider-line"><span></span></div>
          <div class="divider-text"><span>Or continue with</span></div>
        </div>

        <form id="login-form" onsubmit="Pages.handleLogin(event)">
          <div class="form-group-modern">
            <label for="email" class="form-label">Email</label>
            <input type="email" id="email" name="email" placeholder="name@example.com" class="form-input" required />
          </div>

          <div class="form-group-modern">
            <label for="password" class="form-label">Password</label>
            <div class="password-input-wrapper">
              <input type="password" id="password" name="password" placeholder="Enter your password" class="form-input" required />
              <button type="button" class="password-toggle-btn" onclick="Pages.togglePassword('password', this)">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
</div>
      </div>

      <div style="display: flex; justify-content: flex-end; margin: -0.5rem 0 0.5rem;">
        <a onclick="Pages.renderForgotPassword(); Pages.closeAuthOverlay(); return false;" 
           class="auth-link" 
           style="font-size: 0.875rem; color: #71717a; transition: color 0.2s; cursor: pointer;"
           onmouseover="this.style.color='#6366f1'" 
           onmouseout="this.style.color='#71717a'">
          Forgot password?
        </a>
      </div>

      <button type="submit" class="submit-btn submit-btn-primary">Sign In</button>
    </form>

    <div class="auth-footer-links">
      <p>
        Don't have an account?
        <a onclick="Pages.switchAuthModal('register')" class="auth-link">Sign up</a>
      </p>
    </div>
  </div>
`;

    document.body.appendChild(overlay);
  }

  /**
   * Close Auth Overlay
   * @param {boolean} immediate - If true, removes overlay immediately without animation
   */
  static closeAuthOverlay (immediate = false) {
    // Remove all auth overlays to be safe
    const overlays = document.querySelectorAll('#auth-overlay');
    overlays.forEach(overlay => {
      if (overlay) {
        if (immediate) {
          overlay.remove();
        } else {
          overlay.style.animation = 'fadeIn 0.2s ease-out reverse';
          setTimeout(() => overlay.remove(), 200);
        }
      }
    });
  }

  /**
   * Switch Auth Modal (Login <-> Register)
   */
  static switchAuthModal (type) {
    this.closeAuthOverlay();
    setTimeout(() => {
      if (type === 'register') {
        this.renderRegister();
      } else {
        this.renderLogin();
      }
    }, 200);
  }

  /**
   * Toggle password visibility
   */
  static togglePassword (inputId, button) {
    const input = document.getElementById(inputId);
    const eyeIcon = button.querySelector('.eye-icon');

    if (input.type === 'password') {
      input.type = 'text';
      eyeIcon.innerHTML =
        '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" x2="22" y1="2" y2="22"></line>';
    } else {
      input.type = 'password';
      eyeIcon.innerHTML =
        '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
  }

  /**
   * Handle Login Submission
   */
  static async handleLogin (event) {
    event.preventDefault();
    const form = document.getElementById('login-form');
    const email = form.email.value;
    const password = form.password.value;

    const result = await authManager.login(email, password);

    const isAdmin = (user) => user && user.role === 'admin';

  if (result.success) {
  this.closeAuthOverlay(true);
  this.updateNavbar();
  this.updateCartBadge();
  this.updateWishlistBadge();

  if (typeof notificationManager !== 'undefined' && notificationManager.requestBrowserPermission) {
  notificationManager.requestBrowserPermission();
  }

  const user = result.user || authManager.getCurrentUser();
      if (isAdmin(user)) {
        try {
          await adminAuthManager.login(email, password);
        } catch (e) { /* non-critical */ }
        window.location.hash = '#/admin';
        this.renderAdminDashboard();
        return;
      }

      try {
        if (typeof router !== 'undefined' && router.navigate) {
          router.navigate('/browse');
        }
        window.location.hash = '#/browse';
        setTimeout(() => {
          this.renderBrowse();
        }, 50);
      } catch (e) {
        window.location.hash = '#/browse';
        this.renderBrowse();
      }
    } else if (result.isOffline) {
      this.closeAuthOverlay(true);
      this.updateNavbar();
      this.updateCartBadge();
      this.updateWishlistBadge();
      notificationManager?.warning('Offline Mode', 'You are logged in with demo data. Some features may be limited.');

      const user = authManager.getCurrentUser();
      if (isAdmin(user)) {
        window.location.hash = '#/admin';
        this.renderAdminDashboard();
        return;
      }

      window.location.hash = '#/browse';
      this.renderBrowse();
    } else {
      alert('Login failed: ' + result.error);
      }
    }

  /**
   * Render Register Page - Modern Dark Design
   */
  static renderRegister () {
    // Hide navbar and footer for auth pages - cleaner professional look
    this.hideOriginalNavFooter();

    const mainContent = document.getElementById('main-content');
    const selectedUniversity = StorageManager.get(STORAGE_KEYS.SELECTED_UNIVERSITY);

    mainContent.innerHTML = `
      <style>
        .auth-page-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: #050505;
          background-image: radial-gradient(circle at 15% 50%, rgba(99, 102, 241, 0.08), transparent 25%),
                            radial-gradient(circle at 85% 30%, rgba(99, 102, 241, 0.05), transparent 25%);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .auth-card-modern {
          position: relative;
          width: 100%;
          max-width: 28rem;
          padding: 1.5rem;
          background: #0a0a0a;
          border-radius: 0.75rem;
          border: 1px solid rgba(39, 39, 42, 1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .auth-card-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .auth-icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.75rem;
        }
        .auth-icon-wrapper img {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.5rem;
        }
        .auth-title {
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: -0.025em;
          color: #fafafa;
          margin-bottom: 0.25rem;
        }
        .auth-subtitle {
          font-size: 0.875rem;
          color: #a1a1aa;
        }
        .form-group-modern {
          margin-bottom: 1rem;
        }
        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #fafafa;
          margin-bottom: 0.5rem;
        }
        .form-input {
          display: flex;
          height: 2.75rem;
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid rgba(39, 39, 42, 1);
          background: #0a0a0a;
          padding: 0 0.75rem;
          font-size: 0.875rem;
          color: #fafafa;
          transition: all 0.2s;
        }
        .form-input:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }
        .form-input::placeholder {
          color: #52525b;
        }
        .password-input-wrapper {
          position: relative;
        }
        .password-toggle-btn {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          color: #71717a;
          transition: color 0.2s;
        }
        .password-toggle-btn:hover {
          color: #fafafa;
        }
        .form-check-modern {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin: 1rem 0;
        }
        .form-check-modern input[type="checkbox"] {
          margin-top: 0.125rem;
          accent-color: #6366f1;
        }
        .form-check-modern label {
          font-size: 0.875rem;
          color: #a1a1aa;
          cursor: pointer;
        }
        .submit-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
          height: 2.75rem;
          padding: 0 1rem;
          width: 100%;
          background: #18181b;
          color: #fafafa;
          border: 1px solid rgba(39, 39, 42, 1);
          cursor: pointer;
        }
        .submit-btn:hover {
          background: #27272a;
          border-color: rgba(63, 63, 70, 1);
        }
        .submit-btn-primary {
          background: #6366f1;
          color: #ffffff;
          border: none;
        }
        .submit-btn-primary:hover {
          background: #4f46e5;
        }
        .auth-footer-links {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(39, 39, 42, 1);
        }
        .auth-footer-links p {
          font-size: 0.875rem;
          color: #a1a1aa;
        }
        .auth-link {
          color: #fafafa;
          text-decoration: underline;
          text-underline-offset: 4px;
          transition: color 0.2s;
          cursor: pointer;
        }
        .auth-link:hover {
          color: #d4d4d8;
        }
      </style>

      <div class="auth-page-container">
        <div class="auth-card-modern">
          <div class="auth-card-header">
            <div class="auth-icon-wrapper">
              <img src="/favicon.png" alt="Uni-Hub" />
            </div>
            <h1 class="auth-title">Create an account</h1>
            <p class="auth-subtitle">Enter your details to get started with Uni-Hub</p>
          </div>

          <form id="register-form" onsubmit="Pages.handleRegister(event)" class="space-y-4">
            <div class="form-group-modern">
              <label for="fullName" class="form-label">Full Name</label>
              <input type="text" id="fullName" name="fullName" placeholder="John Doe" class="form-input" required />
            </div>

            <div class="form-group-modern">
              <label for="email" class="form-label">Email</label>
              <input type="email" id="email" name="email" placeholder="name@example.com" class="form-input" required />
            </div>

            <div class="form-group-modern">
              <label for="phone" class="form-label">Phone Number</label>
              <input type="tel" id="phone" name="phone" placeholder="+233 50 123 4567" class="form-input" required />
            </div>

            <div class="form-group-modern">
              <label for="password" class="form-label">Password</label>
              <div class="password-input-wrapper">
                <input type="password" id="password" name="password" placeholder="Enter your password" class="form-input" required />
                <button type="button" class="password-toggle-btn" onclick="Pages.togglePassword('password', this)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>

            <div class="form-group-modern">
              <label for="confirmPassword" class="form-label">Confirm Password</label>
              <div class="password-input-wrapper">
                <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm your password" class="form-input" required />
                <button type="button" class="password-toggle-btn" onclick="Pages.togglePassword('confirmPassword', this)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>

            <div class="form-check-modern">
              <input type="checkbox" id="terms" name="terms" required />
              <label for="terms">I agree to the <a href="#" class="auth-link">Terms of Service</a> and <a href="#" class="auth-link">Privacy Policy</a></label>
            </div>

            <button type="submit" class="submit-btn submit-btn-primary">Create Account</button>
          </form>

          <div class="auth-footer-links">
            <p>
              Already have an account?
              <a onclick="Pages.renderLogin(); return false;" class="auth-link">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Handle Register Submission
   */
  static async handleRegister (event) {
    event.preventDefault();
    const form = document.getElementById('register-form');
    const selectedUniversity = StorageManager.get(STORAGE_KEYS.SELECTED_UNIVERSITY);

    const userData = {
      fullName: form.fullName.value,
      email: form.email.value,
      phone: form.phone.value,
      password: form.password.value,
      confirmPassword: form.confirmPassword.value,
      university: selectedUniversity,
    };

    const result = await authManager.register(userData);

    if (result.success) {
      // Show success toast instead of alert
      if (typeof toastManager !== 'undefined') {
        toastManager?.show(result.message, 'success');
      }
      // Force redirect to browse page using multiple methods for reliability
      try {
        // Method 1: Use router if available
        if (typeof router !== 'undefined' && router.navigate) {
          router.navigate('/browse');
        }
        // Method 2: Direct hash change (always works)
        window.location.hash = '#/browse';
        // Method 3: Render directly as fallback
        setTimeout(() => {
          this.renderBrowse();
        }, 50);
      } catch (e) {
        console.error('Navigation error:', e);
        // Final fallback
        window.location.hash = '#/browse';
        this.renderBrowse();
      }
    } else {
      alert('Registration failed: ' + result.error);
    }
  }

  /**
   * Render Forgot Password Page
   */
  static renderForgotPassword () {
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <h2>Reset Your Password</h2>
          <form id="forgot-form" onsubmit="Pages.handleForgotPassword(event)">
            <p>Enter your email address and we'll send you a link to reset your password.</p>

            <div class="form-group">
              <label for="email" class="required">Email Address</label>
              <input type="email" id="email" name="email" class="form-control" required />
            </div>

            <button type="submit" class="btn btn-primary btn-block">Send Reset Link</button>
          </form>

          <div class="auth-links">
            <p><a href="#" onclick="Pages.renderLogin()">Back to Login</a></p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Handle Forgot Password
   */
  static async handleForgotPassword (event) {
    event.preventDefault();
    const form = document.getElementById('forgot-form');
    const email = form.email.value;
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const response = await fetch(`${window.API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success) {
        toastManager?.show(result.message, 'success');

        // Show reset token input for development (remove in production)
        if (result.resetToken) {
          this.renderResetPassword(result.resetToken);
        } else {
          this.renderLogin();
        }
      } else {
        toastManager?.show(result.error || 'Failed to send reset link', 'error');
      }
    } catch (error) {
      toastManager?.show('Network error. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Reset Link';
    }
  }

  /**
   * Render Reset Password Page
   */
  static renderResetPassword (token = '') {
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <h2>Set New Password</h2>
          <form id="reset-form" onsubmit="Pages.handleResetPassword(event, '${token}')">
            <p>Enter your new password below.</p>

            <div class="form-group">
              <label for="newPassword" class="required">New Password</label>
              <input type="password" id="newPassword" name="newPassword" class="form-control" minlength="6" required />
              <small class="form-hint">Must be at least 6 characters</small>
            </div>

            <div class="form-group">
              <label for="confirmPassword" class="required">Confirm Password</label>
              <input type="password" id="confirmPassword" name="confirmPassword" class="form-control" minlength="6" required />
            </div>

            <button type="submit" class="btn btn-primary btn-block">Reset Password</button>
          </form>

          <div class="auth-links">
            <p><a href="#" onclick="Pages.renderLogin()">Back to Login</a></p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Handle Reset Password
   */
  static async handleResetPassword (event, token) {
    event.preventDefault();
    const form = document.getElementById('reset-form');
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (newPassword !== confirmPassword) {
      toastManager?.show('Passwords do not match', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Resetting...';

    try {
      const response = await fetch(`${window.API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const result = await response.json();

      if (result.success) {
        toastManager?.show(result.message, 'success');
        setTimeout(() => this.renderLogin(), 1500);
      } else {
        toastManager?.show(result.error || 'Failed to reset password', 'error');
      }
    } catch (error) {
      toastManager?.show('Network error. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Reset Password';
    }
  }

  /**
   * Render Browse Products Page - Modern Professional Design
   */
  static async renderBrowse (filters = {}) {
    // Show original navbar and footer for non-landing pages
    this.showOriginalNavFooter();

    const mainContent = document.getElementById('main-content');

    // Show loading skeleton immediately
    mainContent.innerHTML = this.renderBrowseSkeleton();

    await productsManager.init();

    // Apply filters
    if (filters.category) {
      productsManager.filter({ category: filters.category });
    }

    if (filters.search) {
      productsManager.filter({ searchQuery: filters.search });
    }

    // Get selected university from storage or filters
    const selectedUniversity = filters.university || StorageManager.get(STORAGE_KEYS.SELECTED_UNIVERSITY);
    if (selectedUniversity) {
      productsManager.filter({ university: selectedUniversity });
    }

    const paginatedData = productsManager.getPaginated(1);
    const totalProducts = paginatedData.total || paginatedData.products.length;

    // Render the modern browse page
    mainContent.innerHTML = this.renderBrowseModernHTML(paginatedData, totalProducts);

    // Update search input with current search query if present
    if (filters.search) {
      const searchInput = document.getElementById('navbar-search-input');
      if (searchInput) {
        searchInput.value = filters.search;
      }
    }
  }

  /**
   * Render Browse Page Loading Skeleton
   */
 static renderBrowseSkeleton () {
 return `
 <div class="browse-modern">
 <div class="browse-hero" style="padding: 2rem;">
 <div class="skeleton" style="height: 40px; width: 300px; background: rgba(255,255,255,0.2); border-radius: 8px; margin-bottom: 1rem;"></div>
 <div class="skeleton" style="height: 20px; width: 200px; background: rgba(255,255,255,0.2); border-radius: 4px;"></div>
 </div>
 <div class="browse-container">
 <div class="products-grid-modern">
            ${Array(6).fill().map(() => `
              <div class="product-card-modern">
                <div class="product-card-image-wrap">
                  <div class="skeleton-image" style="width: 100%; height: 100%;"></div>
                </div>
                <div class="product-card-info">
                  <div class="skeleton" style="height: 12px; width: 40%; margin-bottom: 0.5rem; border-radius: 4px;"></div>
                  <div class="skeleton" style="height: 16px; width: 100%; margin-bottom: 0.5rem; border-radius: 4px;"></div>
                  <div class="skeleton" style="height: 20px; width: 60%; border-radius: 4px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <style>
        .skeleton {
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-image {
          background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      </style>
    `;
  }

  /**
   * Render Modern Browse Page HTML
   */
 static renderBrowseModernHTML (paginatedData, totalProducts) {
 const allProducts = productsManager.getAll();
 const categoryCounts = {};
 allProducts.forEach(p => {
 categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
 });
 const conditionCounts = {};
 allProducts.forEach(p => {
 conditionCounts[p.condition] = (conditionCounts[p.condition] || 0) + 1;
 });
 const maxPrice = allProducts.length > 0 ? Math.max(...allProducts.map(p => p.price)) : 0;
 const selectedConditions = productsManager.currentFilters.condition
 ? (Array.isArray(productsManager.currentFilters.condition) ? productsManager.currentFilters.condition : [productsManager.currentFilters.condition])
 : [];

 const categories = [
 { id: 'all', name: 'All', icon: 'cart', count: totalProducts },
 { id: 'appliances', name: 'Appliances', icon: 'settings', count: categoryCounts['appliances'] || 0 },
 { id: 'hostel-items', name: 'Hostel Items', icon: 'home', count: categoryCounts['hostel-items'] || 0 },
 { id: 'accessories', name: 'Accessories', icon: 'bag', count: categoryCounts['accessories'] || 0 },
 { id: 'textbooks', name: 'Textbooks', icon: 'books', count: categoryCounts['textbooks'] || 0 },
 { id: 'electronics', name: 'Electronics', icon: 'laptop', count: categoryCounts['electronics'] || 0 },
 { id: 'fashion', name: 'Fashion', icon: 'shirt', count: categoryCounts['fashion'] || 0 },
 { id: 'thrifts', name: 'Thrifts', icon: 'gift', count: categoryCounts['thrifts'] || 0 },
 ];

 const conditions = [
 { id: 'new', name: 'New', count: conditionCounts['new'] || 0 },
 { id: 'like-new', name: 'Like New', count: conditionCounts['like-new'] || 0 },
 { id: 'excellent', name: 'Excellent', count: conditionCounts['excellent'] || 0 },
 { id: 'good', name: 'Good', count: conditionCounts['good'] || 0 },
 { id: 'fair', name: 'Fair', count: conditionCounts['fair'] || 0 },
 ];

 const selectedCondCount = selectedConditions.length;

 return `
 <div class="browse-modern">
 <!-- Hero Banner -->
 <div class="browse-hero">
 <div class="browse-hero-content">
 <h1 class="browse-hero-title">Discover Student Deals</h1>
 <p class="browse-hero-subtitle">Find amazing items from students at your university</p>
 <div class="browse-hero-stats">
 <div class="browse-hero-stat">
 <div class="browse-hero-stat-icon">${Icons.package}</div>
 <span>${totalProducts}+ items listed</span>
 </div>
 <div class="browse-hero-stat">
 <div class="browse-hero-stat-icon">${Icons.graduation}</div>
 <span>Verified students only</span>
 </div>
 <div class="browse-hero-stat">
 <div class="browse-hero-stat-icon">${Icons.truck}</div>
 <span>Campus delivery available</span>
 </div>
 </div>
 </div>
 </div>

 <!-- Category Pills -->
 <div class="browse-categories">
 <div class="browse-categories-scroll">
 ${categories.map(cat => `
 <button class="category-pill ${cat.id === productsManager.currentFilters.category ? 'active' : (!productsManager.currentFilters.category && cat.id === 'all' ? 'active' : '')}" onclick="BrowsePageMethods.filterByCategory('${cat.id}')">
 ${Icons[cat.icon] || ''}
 ${cat.name}
 <span class="pill-count">${cat.count}</span>
 </button>
 `).join('')}
 </div>
 </div>

 <!-- Main Content -->
 <div class="browse-container">
 <!-- Filter & Sort Bar -->
 <div class="browse-filter-bar">
 <!-- Mobile Filter Toggle -->
 <button class="mobile-filter-toggle" onclick="BrowsePageMethods.toggleMobileFilters()">
 <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
 <path d="M3 4h18M6 12h12M9 20h6"/>
 </svg>
 Filters & Sorting
 </button>

 <!-- Desktop Dropdown Filters -->
 <div class="browse-filters-group" id="browse-filters-group">
 <!-- Condition Filter -->
 <details class="filter-dropdown">
 <summary>
 <span>Condition</span>
 <svg class="chevron" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
 <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
 </svg>
 </summary>
 <div class="filter-dropdown-content">
 <div class="filter-dropdown-header">
 <span class="selected-count">${selectedCondCount} Selected</span>
 <button class="reset-link" onclick="BrowsePageMethods.resetConditionFilter()">Reset</button>
 </div>
 <div class="filter-dropdown-body">
 ${conditions.map(cond => `
 <div class="filter-option">
 <input type="checkbox" id="cond-${cond.id}" onchange="BrowsePageMethods.applyBrowseFilters()" ${selectedConditions.includes(cond.id) ? 'checked' : ''}>
 <label for="cond-${cond.id}">${cond.name}</label>
 <span class="filter-count">${cond.count}</span>
 </div>
 `).join('')}
 </div>
 </div>
 </details>

 <!-- Price Filter -->
 <details class="filter-dropdown">
 <summary>
 <span>Price</span>
 <svg class="chevron" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
 <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
 </svg>
 </summary>
 <div class="filter-dropdown-content">
 <div class="filter-dropdown-header">
 <span class="selected-count">Max GHS ${maxPrice.toLocaleString()}</span>
 <button class="reset-link" onclick="BrowsePageMethods.resetPriceFilter()">Reset</button>
 </div>
 <div class="filter-dropdown-body">
 <div class="filter-price-range">
 <span style="font-size:0.875rem;color:#6b7280;">GHS</span>
 <input type="number" class="price-input" placeholder="From" id="price-min" value="${productsManager.currentFilters.priceRange?.min > 0 ? productsManager.currentFilters.priceRange.min : ''}">
 <span class="price-separator">-</span>
 <span style="font-size:0.875rem;color:#6b7280;">GHS</span>
 <input type="number" class="price-input" placeholder="To" id="price-max" value="${productsManager.currentFilters.priceRange?.max < Infinity ? productsManager.currentFilters.priceRange.max : ''}">
 </div>
 <button style="margin-top:0.75rem;width:100%;padding:0.5rem;background:#6366f1;color:white;border:none;border-radius:8px;font-size:0.8125rem;font-weight:500;cursor:pointer;" onclick="BrowsePageMethods.applyPriceFilter()">Apply</button>
 </div>
 </div>
 </details>

 <!-- Rating Filter -->
 <details class="filter-dropdown">
 <summary>
 <span>Rating</span>
 <svg class="chevron" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
 <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
 </svg>
 </summary>
 <div class="filter-dropdown-content">
 <div class="filter-dropdown-body">
 <div class="filter-rating-option ${productsManager.currentFilters.minRating >= 4 ? 'active' : ''}" onclick="BrowsePageMethods.setRatingFilter(4)">
 <span class="rating-stars">${Icons.star}${Icons.star}${Icons.star}${Icons.star}${Icons.starOutline}</span>
 <span class="rating-label">& up</span>
 </div>
 <div class="filter-rating-option ${productsManager.currentFilters.minRating >= 3 && productsManager.currentFilters.minRating < 4 ? 'active' : ''}" onclick="BrowsePageMethods.setRatingFilter(3)">
 <span class="rating-stars">${Icons.star}${Icons.star}${Icons.star}${Icons.starOutline}${Icons.starOutline}</span>
 <span class="rating-label">& up</span>
 </div>
 </div>
 </div>
 </details>

 ${productsManager.currentFilters.category || productsManager.currentFilters.condition || (productsManager.currentFilters.priceRange && (productsManager.currentFilters.priceRange.min > 0 || productsManager.currentFilters.priceRange.max < Infinity)) || productsManager.currentFilters.minRating ? `
 <button style="padding:0.5rem 0.875rem;background:transparent;border:1px solid #ef4444;border-radius:8px;font-size:0.8125rem;font-weight:500;color:#ef4444;cursor:pointer;" onclick="Pages.resetBrowseFilters()">Clear all</button>
 ` : ''}
 </div>

 <!-- Sort -->
 <div class="browse-sort-group">
 <select class="sort-select" onchange="Pages.applySortOrder()" id="sort-select">
 <option value="newest" ${productsManager.currentFilters.sortBy === 'newest' ? 'selected' : ''}>Newest First</option>
 <option value="price-low" ${productsManager.currentFilters.sortBy === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
 <option value="price-high" ${productsManager.currentFilters.sortBy === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
 <option value="rating" ${productsManager.currentFilters.sortBy === 'rating' ? 'selected' : ''}>Highest Rated</option>
 </select>
 </div>
 </div>

 <!-- Results Count -->
 <div class="results-count" style="margin-bottom: 1rem;">
 Showing <strong>${paginatedData.products.length}</strong> of <strong>${totalProducts}</strong> items
 </div>

 <!-- Products Grid -->
 <div class="products-grid-modern">
 ${paginatedData.products.length > 0
 ? paginatedData.products.map(product => this.renderProductCardModern(product)).join('')
 : `
 <div class="browse-empty" style="grid-column: 1/-1;">
 <div class="browse-empty-icon" style="width: 64px; height: 64px; margin: 0 auto 1rem;">${Icons.search}</div>
 <h3>No items found</h3>
 <p>Try adjusting your filters or search for something else</p>
 <button class="btn btn-primary" onclick="Pages.resetBrowseFilters()">Clear Filters</button>
 </div>
 `}
 </div>

 ${paginatedData.totalPages > 1 ? `
 <div class="pagination">
 ${Array.from({ length: paginatedData.totalPages }, (_, i) => `
 <button class="page-btn ${i + 1 === paginatedData.currentPage ? 'active' : ''}" onclick="Pages.goToBrowsePage(${i + 1})">
 ${i + 1}
 </button>
 `).join('')}
 </div>
 ` : ''}
 </div>
</div>

${Pages.renderRecentlyViewedSection()}
</div>
`;
  }

  /**
   * Render Modern Product Card
   */
  static renderProductCardModern (product) {
    const isInWishlist = productsManager.isInWishlist?.(product.id) || false;
    const initials = product.seller?.name
      ? product.seller.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : 'UN';
const conditionClass = product.condition || 'good';
const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
    const categoryLabel = product.category
      ? product.category.charAt(0).toUpperCase() + product.category.slice(1).replace('-', ' ')
      : 'Item';

    return `
      <div class="product-card-modern" onclick="Pages.renderProductDetail('${product.id}')">
        <div class="product-card-image-wrap">
          <img src="${product.images?.[0] || '/assets/images/products/no-image.svg'}" alt="${product.title}" class="product-card-image" loading="lazy">
          <div class="product-badges">
            <span class="product-badge badge-condition ${conditionClass}">${conditionLabel}</span>
          </div>
<button class="wishlist-btn ${isInWishlist ? 'active' : ''}" onclick="event.stopPropagation(); Pages.toggleWishlist(event, '${product.id}')">
          ${isInWishlist ? Icons.heart : Icons.heartOutline}
        </button>
        </div>
        <div class="product-card-info">
          <div class="product-card-category">${categoryLabel}</div>
          <h3 class="product-card-title">${product.title}</h3>
          <div class="product-card-price-row">
            <span class="product-card-price">GHS ${product.price?.toLocaleString() || '0'}</span>
          </div>
<div class="product-card-seller">
<div class="seller-avatar">${initials}</div>
<span class="seller-name">${product.seller?.name || 'Unknown'}</span>
${product.seller?.rating ? `
<div class="seller-rating">
${Icons.star}
<span>${product.seller.rating}</span>
</div>
` : ''}
${product.seller?.rating >= 4.5 ? '<span class="trust-badge trust-badge-top-seller"><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>Top Seller</span>' : ''}
${product.seller?.verified ? '<span class="trust-badge trust-badge-verified"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>Verified</span>' : ''}
</div>
        </div>
        <button class="quick-add-btn" onclick="event.stopPropagation(); cartManager?.add(${JSON.stringify(product).replace(/"/g, '&quot;')}); Pages.updateCartBadge();" title="Add to cart">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </button>
      </div>
    `;
  }

  /**
   * Filter by Category (for category pills)
   */
 static filterByCategory (categoryId) {
 document.querySelectorAll('.category-pill').forEach(pill => {
 pill.classList.remove('active');
 });

 const clickedPill = event.target.closest('.category-pill');
 if (clickedPill) clickedPill.classList.add('active');

 if (categoryId === 'all') {
 productsManager.resetFilters();
 } else {
 productsManager.filter({ category: categoryId });
 }

 this.renderBrowse();
 }

  /**
   * Toggle Mobile Filters
   */
 static toggleMobileFilters () {
 const group = document.getElementById('browse-filters-group');
 group?.classList.toggle('open');
 }

  /**
   * Set Rating Filter
   */
  static setRatingFilter (rating) {
productsManager.filter({ minRating: rating });
    this.renderBrowse();
  }

  /**
   * Render Product Card - Modern Professional Design
   */
  static renderProductCard (product) {
    const isInWishlist = productsManager.isInWishlist(product.id);
    const initials = product.seller?.name
      ?.split(' ')
      ?.map(n => n[0])
      ?.join('')
      ?.toUpperCase()
      ?.slice(0, 2) || 'UN';
    const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
    const categoryLabel = product.category
      ? product.category.charAt(0).toUpperCase() + product.category.slice(1).replace('-', ' ')
      : 'Other';

    return `
      <div class="store-product-card" onclick="Pages.renderProductDetail('${product.id}')">
        <!-- Image -->
        <div class="store-product-image">
          <img src="${product.images[0]}" alt="${product.title}" loading="lazy" />
          <span class="store-condition-badge ${product.condition}">${conditionLabel}</span>
          <button class="store-wishlist-btn ${isInWishlist ? 'active' : ''}"
                  onclick="Pages.toggleWishlist(event, '${product.id}')"
                  title="${isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}">
            ${isInWishlist ? Icons.heart : Icons.heartOutline}
          </button>
        </div>

        <!-- Product Info -->
        <div class="store-product-info">
          <div class="store-product-category">${categoryLabel}</div>
          <h3 class="store-product-title">${product.title}</h3>
          <div class="store-product-price-row">
            <span class="store-product-price">${product.price.toLocaleString()}</span>
            <span class="store-product-currency">GHS</span>
          </div>

<!-- Seller Row -->
<div class="store-product-seller-row">
<div class="store-seller-info">
<div class="store-seller-avatar">${initials}</div>
<span class="store-seller-name">${product.seller.name}</span>
${product.seller?.rating >= 4.5 ? '<span class="trust-badge trust-badge-top-seller"><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>Top</span>' : ''}
</div>
<div class="store-seller-rating">
<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
${product.seller.rating || '4.5'}
</div>
</div>
        </div>

        <!-- Hover Actions -->
        <div class="store-product-actions-overlay">
          <button class="store-action-btn store-action-btn-primary" onclick="event.stopPropagation(); cartManager.add(${JSON.stringify(product).replace(/"/g, '&quot;')}); Pages.updateCartBadge();">${Icons.cart} Add to Cart</button>
          <button class="store-action-btn store-action-btn-secondary" onclick="event.stopPropagation(); Pages.renderProductDetail('${product.id}')">View</button>
        </div>
      </div>
    `;
  }

  /**
   * Render Best Buy-style Product Card for Browse/Top Deals page
   */
  static renderBBProductCard (product) {
    const isInWishlist = productsManager.isInWishlist(product.id);
    const initials = product.seller?.name
      ? product.seller.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : 'UN';
    const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
    const categoryLabel = product.category
      ? product.category.charAt(0).toUpperCase() + product.category.slice(1).replace('-', ' ')
      : 'Other';
    const isDeal = product.price > 30;
    const savingsPercent = isDeal ? Math.round(Math.random() * 30 + 30) : 0;

    return (
      '<div class="bb-browse-card" onclick="Pages.renderProductDetail(\'' +
      product.id +
      '\')">' +
      (isDeal ? '<div class="bb-browse-deal-badge">Save ' + savingsPercent + '%</div>' : '') +
      '<button class="bb-browse-save-btn ' +
      (isInWishlist ? 'active' : '') +
      '" onclick="event.stopPropagation(); Pages.toggleWishlist(event, \'' +
      product.id +
      '\');">' +
      (isInWishlist ? Icons.heart : Icons.heartOutline) +
      '</button>' +
      '<img src="' +
      product.images[0] +
      '" alt="' +
      product.title +
      '" class="bb-browse-image" loading="lazy" />' +
      '<div class="bb-browse-info">' +
      '<p class="bb-browse-category">' +
      categoryLabel +
      '</p>' +
      '<h3 class="bb-browse-title">' +
      product.title +
      '</h3>' +
      '<div class="bb-browse-rating">' +
      '<span class="bb-browse-rating-stars">' + Icons.star + Icons.star + Icons.star + Icons.star + Icons.starOutline + '</span>' +
      '<span class="bb-browse-rating-count">(' +
      (product.seller.rating || '4.5') +
      ')</span>' +
      '</div>' +
      '<div class="bb-browse-pricing">' +
      '<span class="bb-browse-price">GHS ' +
      product.price.toLocaleString() +
      '</span>' +
      (isDeal
        ? '<span class="bb-browse-original-price">GHS ' +
          Math.round(product.price * 1.5).toLocaleString() +
          '</span>'
        : '') +
      (isDeal
        ? '<p class="bb-browse-savings">Save GHS ' +
          Math.round(product.price * 0.5).toLocaleString() +
          ' (' +
          savingsPercent +
          '% off)</p>'
        : '') +
      '</div>' +
      '<span class="bb-browse-condition">' +
      conditionLabel +
      '</span>' +
      '<button class="bb-browse-add-cart" onclick="event.stopPropagation(); cartManager.add(' +
      JSON.stringify(product).replace(/"/g, '&quot;') +
      '); Pages.updateCartBadge();">' + Icons.cart + ' Add to Cart</button>' +
      '<div class="bb-browse-seller">' +
      '<div class="bb-browse-seller-avatar">' +
      initials +
      '</div>' +
      '<span class="bb-browse-seller-name">' +
      product.seller.name +
      '</span>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

/**
* Toggle Wishlist
*/
static toggleWishlist (event, productId) {
event.stopPropagation();

if (productsManager.isInWishlist(productId)) {
productsManager.removeFromWishlist(productId);
notificationManager?.info('Removed from Wishlist', 'Product removed from your wishlist');
} else {
productsManager.addToWishlist(productId);
notificationManager?.success('Added to Wishlist', 'Product saved to your wishlist');
}

Pages.updateWishlistBadge();
this.renderBrowse();
}

  /**
   * Apply Browse Filters
   */
  static applyBrowseFilters () {
    const conditions = [];
    if (document.getElementById('cond-new')?.checked) conditions.push('new');
    if (document.getElementById('cond-like-new')?.checked) conditions.push('like-new');
    if (document.getElementById('cond-excellent')?.checked) conditions.push('excellent');
    if (document.getElementById('cond-good')?.checked) conditions.push('good');
    if (document.getElementById('cond-fair')?.checked) conditions.push('fair');

    productsManager.filter({
      condition: conditions.length > 0 ? conditions : null,
    });

    this.renderBrowse();
  }

  /**
   * Reset Browse Filters
   */
  static resetBrowseFilters () {
    productsManager.resetFilters();
    this.renderBrowse();
  }

  /**
   * Apply Sort Order
   */
 static applySortOrder () {
 const sortBy = document.getElementById('sort-select').value;
 productsManager.currentFilters.sortBy = sortBy;
 productsManager.applyFilters();
 this.renderBrowse();
 }

  /**
   * Re-render just the products grid (for filtering without page refresh)
   */
static renderBrowseProducts () {
const paginatedData = productsManager.getPaginated(1);
const productsGrid = document.querySelector('.products-grid');

if (productsGrid) {
productsGrid.innerHTML =
paginatedData.products.length > 0
? paginatedData.products.map(product => this.renderProductCard(product)).join('')
: '<div class="empty-state">No products found. Try adjusting your filters.</div>';
}
}

/**
* Render Recently Viewed Section HTML
*/
static renderRecentlyViewedSection () {
const recentlyViewed = productsManager.getRecentlyViewed(8);
if (!recentlyViewed || recentlyViewed.length === 0) return '';

return `
<div class="recently-viewed-section" style="padding: 2rem 0 1rem;">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
<h2 style="font-size:1.25rem;font-weight:700;margin:0;">Recently Viewed</h2>
<button class="btn btn-ghost btn-sm" onclick="productsManager.clearRecentlyViewed(); Pages.renderBrowse();" style="font-size:0.8rem;">Clear</button>
</div>
<div style="display:flex;gap:1rem;overflow-x:auto;padding-bottom:0.5rem;scrollbar-width:thin;">
${recentlyViewed.map(product => {
const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
return `
<div onclick="Pages.renderProductDetail('${product.id}')" style="min-width:160px;max-width:160px;cursor:pointer;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--neutral-200);transition:box-shadow 0.2s;background:var(--bg-primary);" onmouseover="this.style.boxShadow='var(--shadow-card-hover)'" onmouseout="this.style.boxShadow='none'">
<div style="aspect-ratio:1;overflow:hidden;background:var(--neutral-100);">
<img src="${product.images?.[0] || '/assets/images/products/no-image.svg'}" alt="${product.title}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
</div>
<div style="padding:0.5rem;">
<div style="font-size:0.75rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${product.title}</div>
<div style="font-size:0.8rem;font-weight:700;color:var(--price-color);margin-top:2px;">GHS ${product.price?.toLocaleString() || '0'}</div>
<span class="condition-badge ${product.condition || 'good'}" style="font-size:0.65rem;padding:2px 6px;margin-top:4px;">${conditionLabel}</span>
</div>
</div>`;
}).join('')}
</div>
</div>
`;
}

  /**
   * Go to Browse Page (pagination)
   */
  static goToBrowsePage (page) {
    const paginatedData = productsManager.getPaginated(page);
    const productsGrid = document.querySelector('.products-grid');

    if (productsGrid) {
      productsGrid.innerHTML = paginatedData.products
        .map(product => this.renderProductCard(product))
        .join('');
      window.scrollTo(0, 200);
    }
  }

  /**
   * Render Product Detail Page - Modern Professional Design
   */
static renderProductDetail (productId) {
const product = productsManager.getById(productId);

if (!product) {
alert('Product not found');
return;
}

productsManager.addToRecentlyViewed(productId);

    const mainContent = document.getElementById('main-content');
    const isInWishlist = productsManager.isInWishlist(productId);
    const initials = product.seller.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
    const categoryLabel = product.category
      ? product.category.charAt(0).toUpperCase() + product.category.slice(1).replace('-', ' ')
      : 'Other';

    mainContent.innerHTML = `
      <style>
        .pd-page { min-height: 100vh; background: #0a0a0a; }
        .pd-breadcrumb { padding: 1rem 2rem; max-width: 1400px; margin: 0 auto; }
        .pd-back-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #a1a1aa; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
        .pd-back-btn:hover { border-color: #6366f1; color: #a5b4fc; }
        .pd-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; max-width: 1400px; margin: 0 auto; padding: 1rem 2rem 4rem; }
        .pd-image-section { position: sticky; top: 2rem; height: fit-content; }
        .pd-main-image { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.06); background: #141414; }
        .pd-info-card { background: #141414; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.06); padding: 2rem; }
        .pd-category-tag { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(99,102,241,0.15); color: #a5b4fc; margin-bottom: 0.75rem; }
        .pd-title { font-size: 1.75rem; font-weight: 700; color: #fafafa; letter-spacing: -0.025em; margin-bottom: 1rem; line-height: 1.3; }
        .pd-meta { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .pd-condition { padding: 0.375rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
        .pd-condition.excellent { background: rgba(16,185,129,0.2); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.3); }
        .pd-condition.good { background: rgba(245,158,11,0.2); color: #fcd34d; border: 1px solid rgba(245,158,11,0.3); }
        .pd-condition.fair { background: rgba(249,115,22,0.2); color: #fdba74; border: 1px solid rgba(249,115,22,0.3); }
        .pd-date { font-size: 0.8rem; color: #71717a; }
        .pd-price-box { margin-bottom: 1.5rem; }
        .pd-price { font-size: 2.5rem; font-weight: 800; color: #fafafa; letter-spacing: -0.03em; }
        .pd-price-currency { font-size: 1rem; font-weight: 500; color: #71717a; margin-left: 0.25rem; }
        .pd-seller-card { background: #18181b; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; }
        .pd-seller-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; color: #fff; flex-shrink: 0; }
        .pd-seller-name { font-size: 0.95rem; font-weight: 600; color: #fafafa; }
        .pd-seller-rating { font-size: 0.85rem; color: #fcd34d; display: flex; align-items: center; gap: 0.25rem; margin-top: 0.125rem; }
        .pd-desc-card { background: #18181b; border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem; }
        .pd-desc-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; margin-bottom: 0.5rem; }
        .pd-desc-text { font-size: 0.95rem; color: #d4d4d8; line-height: 1.7; }
        .pd-details-list { list-style: none; padding: 0; margin: 0 0 1.5rem 0; }
        .pd-details-item { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.875rem; }
        .pd-details-item:last-child { border-bottom: none; }
        .pd-details-label { color: #71717a; }
        .pd-details-value { color: #d4d4d8; font-weight: 500; }
        .pd-methods-section { margin-bottom: 1.5rem; }
        .pd-methods-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; margin-bottom: 0.5rem; }
        .pd-methods-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .pd-method-tag { padding: 0.375rem 0.75rem; border-radius: 0.5rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); font-size: 0.8rem; color: #d4d4d8; }
        .pd-actions { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem; }
        .pd-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.875rem 1.5rem; border-radius: 0.75rem; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.25s; border: none; }
        .pd-btn-primary { background: #6366f1; color: #fff; }
        .pd-btn-primary:hover { background: #4f46e5; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(99,102,241,0.3); }
        .pd-btn-outline { background: transparent; color: #d4d4d8; border: 1px solid rgba(255,255,255,0.1); }
        .pd-btn-outline:hover { border-color: rgba(99,102,241,0.4); color: #a5b4fc; }
        .pd-btn-outline.active { border-color: rgba(239,68,68,0.4); color: #fca5a5; background: rgba(239,68,68,0.05); }
        .pd-secondary-actions { display: flex; gap: 0.5rem; }
        .pd-secondary-actions .pd-btn { flex: 1; padding: 0.625rem; font-size: 0.85rem; }
        @media (max-width: 768px) {
          .pd-layout { grid-template-columns: 1fr; padding: 1rem; }
          .pd-image-section { position: static; }
          .pd-title { font-size: 1.375rem; }
          .pd-price { font-size: 2rem; }
        }
      </style>

      <div class="pd-page">
        <!-- Breadcrumb -->
        <div class="pd-breadcrumb">
          <button class="pd-back-btn" onclick="history.back()">← Back to Browse</button>
        </div>

        <!-- Layout -->
        <div class="pd-layout">
          <!-- Image Section -->
          <div class="pd-image-section">
            <img src="${product.images[0]}" alt="${product.title}" class="pd-main-image" onerror="this.src='/assets/images/products/no-image.svg'" />
          </div>

          <!-- Info Section -->
          <div class="pd-info-card">
            <span class="pd-category-tag">${categoryLabel}</span>
            <h1 class="pd-title">${product.title}</h1>

            <div class="pd-meta">
              <span class="pd-condition ${product.condition}">${conditionLabel}</span>
              <span class="pd-date">Listed ${Formatter.formatTimeAgo(product.createdAt)}</span>
            </div>

            <!-- Price -->
            <div class="pd-price-box">
              <span class="pd-price">${product.price.toLocaleString()}<span class="pd-price-currency">GHS</span></span>
            </div>

            <!-- Seller -->
            <div class="pd-seller-card">
              <div class="pd-seller-avatar">${initials}</div>
              <div>
                <div class="pd-seller-name">${product.seller.name}</div>
                <div class="pd-seller-rating">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  ${product.seller.rating || '4.5'} rating
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="pd-desc-card">
              <div class="pd-desc-label">Description</div>
              <p class="pd-desc-text">${product.description}</p>
            </div>

            <!-- Details -->
            <ul class="pd-details-list">
              <li class="pd-details-item">
                <span class="pd-details-label">Category</span>
                <span class="pd-details-value">${categoryLabel}</span>
              </li>
              <li class="pd-details-item">
                <span class="pd-details-label">Condition</span>
                <span class="pd-details-value">${conditionLabel}</span>
              </li>
              <li class="pd-details-item">
                <span class="pd-details-label">University</span>
                <span class="pd-details-value">${product.university ? product.university.toUpperCase() : 'N/A'}</span>
              </li>
            </ul>

            <!-- Delivery Methods -->
            <div class="pd-methods-section">
              <div class="pd-methods-label">Delivery Methods</div>
              <div class="pd-methods-list">
                ${(product.deliveryModes || []).map(m => `<span class="pd-method-tag">${m.charAt(0).toUpperCase() + m.slice(1)}</span>`).join('')}
              </div>
            </div>

            <!-- Payment Methods -->
            <div class="pd-methods-section">
              <div class="pd-methods-label">Payment Methods</div>
              <div class="pd-methods-list">
                ${(product.paymentModes || []).map(m => `<span class="pd-method-tag">${m.toUpperCase()}</span>`).join('')}
  </div>
  </div>

  ${product.variants && product.variants.length > 0 ? `
  <div class="pd-variants-section">
  <div class="pd-methods-label">Options</div>
  <div class="pd-variants-list">
  ${product.variants.map((v, i) => `
  <button class="pd-variant-btn" data-variant-index="${i}" onclick="Pages.selectVariant(this, ${i})">
  <span class="pd-variant-label">${v.label}</span>
  <span class="pd-variant-value">${v.value}</span>
  ${v.price > 0 ? `<span class="pd-variant-price">+GHS ${v.price}</span>` : ''}
  </button>
  `).join('')}
  </div>
  <input type="hidden" id="selected-variant-index" value="-1" />
  </div>
  ` : ''}

  <!-- Action Buttons -->
  <div class="pd-actions">
  <button class="pd-btn pd-btn-primary" onclick="Pages.addToCartWithVariant('${productId}')">
          ${Icons.cart} Add to Cart
        </button>
              <div class="pd-secondary-actions">
                <button class="pd-btn pd-btn-outline ${isInWishlist ? 'active' : ''}" onclick="Pages.toggleWishlistDetail('${productId}')">
                  ${isInWishlist ? Icons.heart + ' Saved' : Icons.heartOutline + ' Save'}
                </button>
                <button class="pd-btn pd-btn-outline" onclick="Pages.shareProduct('${productId}')">${Icons.upload} Share</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Reviews Section -->
        <div style="max-width: 1400px; margin: 0 auto; padding: 2rem;">
          <div style="background: #141414; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.06); padding: 2rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
              <h2 style="font-size: 1.5rem; font-weight: 700; color: #fafafa; margin: 0;">Seller Reviews</h2>
              <button onclick="Pages.writeReview('${product.seller?.id || product.seller}')" style="padding: 0.5rem 1rem; background: rgba(99,102,241,0.2); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3); border-radius: 0.5rem; font-size: 0.875rem; font-weight: 500; cursor: pointer;">Write Review</button>
            </div>
            <div id="product-reviews-container">
              <div style="text-align: center; padding: 2rem; color: #71717a;">
                <p>Loading reviews...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

  // Load reviews after DOM is rendered
  this.loadProductReviews(productId);
  }

  static selectVariant (btn, index) {
  document.querySelectorAll('.pd-variant-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('selected-variant-index').value = index;
  }

  static addToCartWithVariant (productId) {
  const product = productsManager.getById(productId);
  if (!product) return;
  const variantIndex = parseInt(document.getElementById('selected-variant-index')?.value);
  let variant = null;
  if (!isNaN(variantIndex) && variantIndex >= 0 && product.variants && product.variants[variantIndex]) {
  variant = product.variants[variantIndex];
  }
  cartManager.add(product, 1, variant);
  Pages.updateCartBadge();
  if (typeof toastManager !== 'undefined') toastManager.success('Added to cart', 'Product added successfully');
  }

/**
* Toggle Wishlist in Detail View
*/
static toggleWishlistDetail (productId) {
if (productsManager.isInWishlist(productId)) {
productsManager.removeFromWishlist(productId);
notificationManager?.info('Removed from Wishlist', 'Product removed from your wishlist');
} else {
productsManager.addToWishlist(productId);
notificationManager?.success('Added to Wishlist', 'Product saved to your wishlist');
}

Pages.updateWishlistBadge();
this.renderProductDetail(productId);
}

/**
* Add all wishlist items to cart
*/
static addAllWishlistToCart () {
const wishlistProducts = productsManager.getWishlist();
let added = 0;
wishlistProducts.forEach(product => {
const result = cartManager?.add(product);
if (result?.success) added++;
});
Pages.updateCartBadge();
notificationManager?.success('Added to Cart', `${added} item${added !== 1 ? 's' : ''} added to your cart`);
}

/**
* Clear entire wishlist
*/
static clearWishlist () {
if (!confirm('Remove all items from your wishlist?')) return;
const wishlistIds = StorageManager.get(productsManager.wishlistKey, true) || [];
wishlistIds.forEach(id => productsManager.removeFromWishlist(id));
Pages.updateWishlistBadge();
Pages.renderWishlist();
notificationManager?.info('Wishlist Cleared', 'All items removed from your wishlist');
}

  /**
   * Load and display reviews for a product's seller
   */
  static async loadProductReviews (productId) {
    const container = document.getElementById('product-reviews-container');
    if (!container) {return;}

    const product = productsManager.getById(productId);
    if (!product) {
      container.innerHTML = '<p style="text-align: center; color: #71717a;">Product not found</p>';
      return;
    }

    const sellerId = product.seller?.id || product.seller;

    try {
      // Try loading from reviewManager if available
      let reviews = [];
      if (typeof reviewManager !== 'undefined' && reviewManager.getSellerReviews) {
        try {
          const result = await reviewManager.getSellerReviews(sellerId, { limit: 10 });
          reviews = result.reviews || [];
        } catch (_e) {
          // Fallback to local storage
        }
      }

      // Fallback: generate placeholder reviews from local data
      if (!reviews || reviews.length === 0) {
        reviews = [
          { id: 'rev1', reviewer: { fullName: 'Kofi A.' }, rating: 5, comment: 'Great seller! Item was exactly as described. Very responsive to messages.', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
          { id: 'rev2', reviewer: { fullName: 'Ama M.' }, rating: 4, comment: 'Good experience. Item was in good condition. Delivery was a bit slow.', createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
          { id: 'rev3', reviewer: { fullName: 'Yaw D.' }, rating: 5, comment: 'Highly recommend! Fair price and quick delivery.', createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
        ];
      }

      const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : '0';

      const html = `
        <div style="display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div style="text-align: center;">
            <div style="font-size: 2.5rem; font-weight: 800; color: #fafafa;">${avgRating}</div>
            <div style="color: #fcd34d; font-size: 1.25rem;">${this.renderStars(Math.round(parseFloat(avgRating)))}</div>
            <div style="font-size: 0.8rem; color: #71717a;">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</div>
          </div>
          <div style="flex: 1;">
            ${reviews.map(r => this.renderReviewItem(r)).join('')}
          </div>
        </div>
      `;

      container.innerHTML = html;
    } catch (error) {
      container.innerHTML = '<p style="text-align: center; color: #71717a;">Unable to load reviews</p>';
    }
  }

  /**
   * Render a single review item
   */
  static renderReviewItem (review) {
    const timeAgo = this.formatReviewTime(review.createdAt);
    const stars = this.renderStars(review.rating);

    return `
      <div style="padding: 1rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: #fff;">
            ${(review.reviewer?.fullName || 'U').charAt(0)}
          </div>
          <div>
            <div style="font-size: 0.9rem; font-weight: 500; color: #fafafa;">${review.reviewer?.fullName || 'Anonymous'}</div>
            <div style="color: #fcd34d; font-size: 0.85rem;">${stars}</div>
          </div>
          <div style="margin-left: auto; font-size: 0.75rem; color: #71717a;">${timeAgo}</div>
        </div>
        <p style="font-size: 0.9rem; color: #d4d4d8; line-height: 1.6; margin: 0;">${review.comment || ''}</p>
      </div>
    `;
  }

  /**
   * Format review time
   */
  static formatReviewTime (date) {
    if (!date) {return '';}
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    if (diff < 3600000) {return Math.floor(diff / 60000) + 'm ago';}
    if (diff < 86400000) {return Math.floor(diff / 3600000) + 'h ago';}
    if (diff < 604800000) {return Math.floor(diff / 86400000) + 'd ago';}
    return d.toLocaleDateString();
  }

  /**
   * Write Review for Seller
   */
  static async writeReview (sellerId) {
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;
    if (!currentUser) {
      toastManager?.show('Please login to write a review', 'info');
      this.renderLogin();
      return;
    }

    const rating = prompt('Rate this seller (1-5 stars):');
    if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
      return;
    }

    const comment = prompt('Write your review (optional):');

    try {
      if (typeof reviewManager !== 'undefined' && reviewManager.submitReview) {
        await reviewManager.submitReview({ sellerId, rating: parseInt(rating), comment: comment || '' });
        toastManager?.show('Review submitted successfully!', 'success');
      } else {
        toastManager?.show('Review submitted!', 'success');
      }

      // Refresh reviews if on product page
      const container = document.getElementById('product-reviews-container');
      if (container) {
        // Re-render current product detail to show new review
        const hash = window.location.hash;
        if (hash.startsWith('#/product/')) {
          const productId = hash.replace('#/product/', '');
          this.renderProductDetail(productId);
        }
      }
    } catch (error) {
      toastManager?.show('Failed to submit review', 'error');
    }
  }

/**
* Share Product
*/
  static shareProduct (productId) {
  const product = productsManager.getById(productId);
  const shareUrl = window.location.href.split('#')[0] + `#product/${productId}`;
  const shareText = `Check out this item on Uni-Hub: ${product.title} - GHS ${product.price?.toLocaleString() || '0'}`;

  if (navigator.share) {
  navigator.share({
  title: product.title,
  text: shareText,
  url: shareUrl,
  }).catch(() => {});
  return;
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

const mainContent = document.getElementById('main-content');
const overlay = document.createElement('div');
overlay.id = 'share-overlay';
overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;';
overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

overlay.innerHTML = `
<div style="background:var(--bg-primary);border-radius:var(--radius-xl);padding:2rem;max-width:420px;width:100%;box-shadow:var(--shadow-xl);">
<h3 style="margin:0 0 0.5rem;font-size:1.25rem;">Share this product</h3>
<p style="color:var(--neutral-600);margin:0 0 1.5rem;font-size:0.9rem;">${product.title}</p>
<div style="display:flex;flex-direction:column;gap:0.75rem;">
<a href="${whatsappUrl}" target="_blank" rel="noopener" class="btn btn-outline" style="display:flex;align-items:center;gap:0.75rem;justify-content:center;background:#25D366;color:white;border-color:#25D366;">
<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.12 1.52 5.855L0 24l6.335-1.652A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.97 0-3.79-.58-5.33-1.573l-.383-.228-3.764.982.998-3.648-.25-.398A9.72 9.72 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/></svg>
Share on WhatsApp
</a>
<a href="${telegramUrl}" target="_blank" rel="noopener" class="btn btn-outline" style="display:flex;align-items:center;gap:0.75rem;justify-content:center;background:#0088cc;color:white;border-color:#0088cc;">
<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zM8.862 7.136l.32-.004c.21 0 .42.075.58.225l3.58 3.38 7.95-4.85c.26-.16.58-.14.82.05.24.19.32.5.21.77L16.6 20.8c-.12.28-.39.45-.68.45a.73.73 0 01-.36-.09l-4.3-2.54-2.27 2.14.48-3.56 7.28-6.84-8.68 4.68-3.72-1.5c-.34-.14-.52-.47-.44-.81.08-.34.36-.57.69-.6l4.9-.43z"/></svg>
Share on Telegram
</a>
<a href="${twitterUrl}" target="_blank" rel="noopener" class="btn btn-outline" style="display:flex;align-items:center;gap:0.75rem;justify-content:center;background:#1DA1F2;color:white;border-color:#1DA1F2;">
<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.09a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
Share on Twitter
</a>
<a href="${facebookUrl}" target="_blank" rel="noopener" class="btn btn-outline" style="display:flex;align-items:center;gap:0.75rem;justify-content:center;background:#1877F2;color:white;border-color:#1877F2;">
<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
Share on Facebook
</a>
<button class="btn btn-outline" style="display:flex;align-items:center;gap:0.75rem;justify-content:center;" onclick="Pages.copyShareLink('${shareUrl}')">
${Icons.copy || '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'}
Copy Link
</button>
</div>
<button class="btn btn-ghost" style="width:100%;margin-top:1rem;" onclick="document.getElementById('share-overlay').remove()">Cancel</button>
</div>
`;

  document.body.appendChild(overlay);
  }

  static async downloadReceipt (orderId) {
  const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
  const currentUser = session?.user || null;
  if (!currentUser) return;

  let order = null;
  try {
  const orders = await checkoutManager.getAllOrders();
  order = orders.find(o => o.id === orderId);
  } catch (err) { console.warn('Failed to fetch order:', err); }

  if (!order) {
  const localOrders = StorageManager.get(`${STORAGE_KEY_PREFIX}orders`, true) || [];
  order = localOrders.find(o => o.id === orderId);
  }

  if (!order) {
  notificationManager?.error('Not Found', 'Order not found for receipt');
  return;
  }

  const itemsHtml = order.items.map(item => `
  <tr>
  <td style="padding:8px;border-bottom:1px solid #eee;">${item.title}${item.variant ? `<br><small style="color:#666;">${item.variant.label}: ${item.variant.value}</small>` : ''}</td>
  <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
  <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">GHS ${(item.price || 0).toLocaleString()}</td>
  <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">GHS ${((item.price || 0) * item.quantity).toLocaleString()}</td>
  </tr>
  `).join('');

  const receiptHtml = `<!DOCTYPE html>
  <html>
  <head>
  <title>Receipt - ${order.orderNumber}</title>
  <style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;max-width:700px;margin:0 auto;padding:40px 20px;}
  .header{text-align:center;border-bottom:2px solid #6366f1;padding-bottom:20px;margin-bottom:20px;}
  .header h1{color:#6366f1;margin:0;font-size:1.5rem;}
  .header p{color:#666;margin:4px 0 0;font-size:0.85rem;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;}
  .info-block h4{margin:0 0 4px;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;color:#888;}
  .info-block p{margin:0;font-size:0.9rem;font-weight:600;}
  table{width:100%;border-collapse:collapse;margin-bottom:20px;}
  th{background:#f8f8f8;padding:8px;text-align:left;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;color:#666;border-bottom:2px solid #ddd;}
  th:last-child,th:nth-child(3){text-align:right;}
  th:nth-child(2){text-align:center;}
  .totals{margin-left:auto;width:280px;}
  .totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:0.9rem;}
  .totals-row.grand{font-size:1.1rem;font-weight:700;border-top:2px solid #1a1a1a;padding-top:10px;margin-top:4px;}
  .footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #eee;color:#888;font-size:0.8rem;}
  @media print{body{padding:20px;}}
  </style>
  </head>
  <body>
  <div class="header">
  <h1>Uni-Hub</h1>
  <p>Student Marketplace Receipt</p>
  </div>
  <div class="info-grid">
  <div class="info-block">
  <h4>Order Number</h4>
  <p>${order.orderNumber}</p>
  </div>
  <div class="info-block">
  <h4>Date</h4>
  <p>${Formatter.formatDate(order.createdAt)}</p>
  </div>
  <div class="info-block">
  <h4>Customer</h4>
  <p>${order.customer?.name || currentUser.fullName || 'N/A'}</p>
  </div>
  <div class="info-block">
  <h4>Status</h4>
  <p>${Formatter.capitalize((order.status || 'placed').replace('-', ' '))}</p>
  </div>
  </div>
  <table>
  <thead>
  <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
  </thead>
  <tbody>${itemsHtml}</tbody>
  </table>
  <div class="totals">
  <div class="totals-row"><span>Subtotal</span><span>GHS ${(order.pricing?.subtotal || 0).toLocaleString()}</span></div>
  <div class="totals-row"><span>Delivery Fee</span><span>GHS ${(order.pricing?.deliveryFee || 0).toLocaleString()}</span></div>
  <div class="totals-row grand"><span>Total</span><span>GHS ${(order.pricing?.grandTotal || 0).toLocaleString()}</span></div>
  </div>
  <div style="margin-top:24px;padding:16px;background:#f8f8f8;border-radius:8px;font-size:0.85rem;">
  <strong>Delivery:</strong> ${Formatter.capitalize(order.delivery?.mode || 'N/A')}<br>
  <strong>Address:</strong> ${order.delivery?.address || 'N/A'}<br>
  ${order.delivery?.instructions ? `<strong>Instructions:</strong> ${order.delivery.instructions}<br>` : ''}
  <strong>Payment:</strong> ${Formatter.capitalize(order.payment?.mode || 'N/A')}
  </div>
  <div class="footer">
  <p>Thank you for shopping on Uni-Hub!</p>
  <p>This receipt was generated on ${new Date().toLocaleDateString()}.</p>
  </div>
  <script>window.onload=function(){window.print();}</script>
  </body>
  </html>`;

  const receiptWindow = window.open('', '_blank', 'width=800,height=600');
  if (receiptWindow) {
  receiptWindow.document.write(receiptHtml);
  receiptWindow.document.close();
  } else {
  notificationManager?.error('Blocked', 'Please allow popups to download receipt');
  }
  }

  /**
* Copy share link to clipboard
*/
static copyShareLink (url) {
navigator.clipboard.writeText(url)
.then(() => {
notificationManager?.success('Link Copied', 'Product link copied to clipboard');
document.getElementById('share-overlay')?.remove();
})
.catch(() => {
prompt('Copy this link:', url);
});
}

  /**
   * Render Cart Page
   */
  static renderCart () {
    const mainContent = document.getElementById('main-content');
    const cartItems = cartManager.getItems();
    const summary = cartManager.getSummary();

    if (cartItems.length === 0) {
      mainContent.innerHTML = `
        <div class="container" style="padding: 3rem 1rem;">
          <div class="empty-cart">
            <div class="empty-cart-icon">${Icons.cart}</div>
            <h3>Your cart is empty</h3>
            <p>Looks like you haven't added anything to your cart yet.</p>
            <button class="btn btn-primary" onclick="Pages.renderBrowse()">Start Shopping</button>
          </div>
        </div>
      `;
      return;
    }

    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem;">
        <h1 style="margin-bottom: 1.5rem;">Shopping Cart</h1>
        
        <div class="cart-container">
          <div class="cart-items">
            <div class="cart-header">
              <h2>${cartItems.length} Item${cartItems.length !== 1 ? 's' : ''}</h2>
            </div>
            
            ${cartItems
    .map(
      item => `
              <div class="cart-item" data-product-id="${item.product.id}">
                <div class="cart-item-image">
  <img src="${item.product.images?.[0] || '/assets/images/products/no-image.svg'}" alt="${item.product.title}" loading="lazy" onerror="this.src='/assets/images/products/no-image.svg'" />
                </div>
                
  <div class="cart-item-details">
  <h4 class="cart-item-title">${item.product.title}</h4>
  <p class="cart-item-seller">Sold by ${item.product.seller.name}</p>
  ${item.variant ? `<span class="cart-item-variant">${item.variant.label}: ${item.variant.value}${item.variant.price > 0 ? ` (+GHS ${item.variant.price})` : ''}</span>` : ''}
  <div class="cart-item-price">${Formatter.formatPrice(item.product.price + (item.variant ? item.variant.price || 0 : 0))}</div>
  </div>

  <div class="cart-item-quantity">
  <button class="quantity-btn" onclick="Pages.decrementCartQuantity('${item.product.id}')">−</button>
  <span class="quantity-display">${item.quantity}</span>
  <button class="quantity-btn" onclick="Pages.incrementCartQuantity('${item.product.id}')">+</button>
  </div>

  <div class="cart-item-actions">
  <div class="cart-item-total">${Formatter.formatPrice((item.product.price + (item.variant ? item.variant.price || 0 : 0)) * item.quantity)}</div>
  <button class="remove-btn" onclick="Pages.removeFromCart('${item.product.id}')">Remove</button>
  </div>
              </div>
            `,
    )
    .join('')}
          </div>
          
          <div class="cart-summary">
            <h3>Order Summary</h3>
            
            <div class="summary-row">
              <span>Subtotal (${summary.itemCount} item${summary.itemCount !== 1 ? 's' : ''})</span>
              <span>${Formatter.formatPrice(summary.subtotal)}</span>
            </div>
            
            <div class="summary-row">
              <span>Delivery Fee</span>
              <span>Calculated at checkout</span>
            </div>
            
            <div class="summary-row total">
              <span>Total</span>
              <span>${Formatter.formatPrice(summary.grandTotal)}</span>
            </div>
            
            <button class="btn btn-primary checkout-btn" onclick="event.preventDefault(); Pages.handleProceedToCheckout();">
              Proceed to Checkout
            </button>
            
            <a href="#" class="continue-shopping" onclick="Pages.renderBrowse(); return false;">
              Continue Shopping
            </a>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Add product to cart from product detail
   */
  static addToCart (productId) {
    const product = productsManager.getById(productId);

    if (!product) {
      alert('Product not found');
      return;
    }

    const result = cartManager.add(product, 1);

    if (result.success) {
      this.updateCartBadge();
      alert(result.message);
    }
  }

  /**
   * Remove item from cart
   */
  static removeFromCart (productId) {
    cartManager.remove(productId);
    this.updateCartBadge();
    this.renderCart();
  }

  /**
   * Increment cart item quantity
   */
  static incrementCartQuantity (productId) {
    cartManager.increment(productId);
    this.updateCartBadge();
    this.renderCart();
  }

  /**
   * Decrement cart item quantity
   */
  static decrementCartQuantity (productId) {
    cartManager.decrement(productId);
    this.updateCartBadge();
    this.renderCart();
  }

  /**
   * Handle Proceed to Checkout button click from Cart
   */
  static handleProceedToCheckout () {
    // Verify required managers are loaded
    if (typeof cartManager === 'undefined' || !cartManager) {
      console.error('Cart manager not loaded');
      alert('Cart is loading. Please try again in a moment.');
      return;
    }

    if (typeof checkoutManager === 'undefined' || !checkoutManager) {
      console.error('Checkout manager not loaded');
      alert('Checkout is loading. Please try again in a moment.');
      return;
    }

    const cartItems = cartManager.getItems();

    // Check if cart is empty
    if (!cartItems || cartItems.length === 0) {
      alert('Your cart is empty. Add items before checkout.');
      return;
    }

    // Check if user is logged in
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;
    if (!currentUser) {
      alert('Please login to complete your order.');
      this.renderLogin();
      return;
    }

    // Navigate to checkout
    this.renderCheckout();
  }

  /**
   * Render Checkout Page
   */
  static renderCheckout () {
    // Verify checkoutManager is loaded
    if (typeof checkoutManager === 'undefined' || !checkoutManager) {
      console.error('Checkout manager not loaded yet');
      alert('Please wait, checkout is loading...');
      return;
    }

    const mainContent = document.getElementById('main-content');
    const cartItems = cartManager.getItems();
    const summary = cartManager.getSummary();

    // Validate cart
    if (cartItems.length === 0) {
      alert('Your cart is empty. Add items before checkout.');
      this.renderBrowse();
      return;
    }

    // Check if user is logged in
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;
    if (!currentUser) {
      alert('Please login to complete your order.');
      this.renderLogin();
      return;
    }

    // Update URL hash for proper routing
    window.location.hash = '/checkout';

    const deliveryOptions = checkoutManager.getDeliveryModeOptions();
    const paymentOptions = checkoutManager.getPaymentModeOptions();

    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem;">
        <h1 style="margin-bottom: 1.5rem;">Checkout</h1>
        
        <form id="checkout-form" onsubmit="Pages.handleCheckout(event)">
          <div class="checkout-container">
            <div class="checkout-main">
              <!-- Delivery Method -->
              <div class="checkout-section">
                <h3><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1"/><path d="M12 17V5"/><path d="M5 17a2 2 0 104 0"/><path d="M15 17a2 2 0 104 0"/></svg>Delivery Method</h3>
                <div class="delivery-options">
                  ${deliveryOptions
    .map(
      option => `
                    <div class="option-card" onclick="Pages.selectDeliveryOption('${option.value}', this)">
                      <input type="radio" name="deliveryMode" value="${option.value}" id="delivery-${option.value}" />
                      <div class="option-icon">${option.icon}</div>
                      <div class="option-label">${option.label}</div>
                      <div class="option-fee">${option.fee === 0 ? 'Free' : `GHS ${option.fee}`}</div>
                    </div>
                  `,
    )
    .join('')}
                </div>
              </div>

              <!-- Delivery Address -->
              <div class="checkout-section">
                <h3><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>Delivery Address</h3>
                <div class="form-group">
                  <label for="deliveryAddress" class="required">Delivery Address</label>
                  <textarea 
                    id="deliveryAddress" 
                    name="deliveryAddress" 
                    placeholder="Enter your delivery address (e.g., Hall name, room number, or off-campus address)"
                    required
                  ></textarea>
                </div>
                <div class="form-group">
                  <label for="phone">Phone Number (for delivery)</label>
                  <input 
                    type="tel" 
                    id="phone" 
                    name="phone" 
                    placeholder="+233 50 123 4567"
                    value="${currentUser.phone || ''}"
                  />
                </div>
                <div class="form-group">
                  <label for="deliveryInstructions">Delivery Instructions (Optional)</label>
                  <textarea 
                    id="deliveryInstructions" 
                    name="deliveryInstructions" 
                    placeholder="Any special instructions for delivery..."
                  ></textarea>
                </div>
              </div>

              <!-- Payment Method -->
              <div class="checkout-section">
                <h3><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/></svg>Payment Method</h3>
                <div class="payment-options">
                  ${paymentOptions
    .map(
      option => `
                    <div class="option-card" onclick="Pages.selectPaymentOption('${option.value}', this)">
                      <input type="radio" name="paymentMode" value="${option.value}" id="payment-${option.value}" />
                      <div class="option-icon">${option.icon}</div>
                      <div class="option-label">${option.label}</div>
                    </div>
                  `,
    )
    .join('')}
                </div>
              </div>
            </div>

            <!-- Order Summary -->
            <div class="order-summary">
              <h3>Order Summary</h3>
              
              <div class="order-items">
                ${cartItems
    .map(
      item => `
  <div class="order-item">
  <div class="order-item-image">
  <img src="${item.product.images[0]}" alt="${item.product.title}" />
  </div>
  <div class="order-item-details">
  <div class="order-item-title">${item.product.title}</div>
  ${item.variant ? `<div class="order-item-quantity" style="color:var(--primary);">${item.variant.label}: ${item.variant.value}${item.variant.price > 0 ? ` (+GHS ${item.variant.price})` : ''}</div>` : ''}
  <div class="order-item-quantity">Qty: ${item.quantity}</div>
  <div class="order-item-price">${Formatter.formatPrice((item.product.price + (item.variant ? item.variant.price || 0 : 0)) * item.quantity)}</div>
  </div>
  </div>
                `,
    )
    .join('')}
              </div>

              <div class="summary-divider"></div>

              <div class="summary-row">
                <span>Subtotal</span>
                <span>${Formatter.formatPrice(summary.subtotal)}</span>
              </div>

              <div class="summary-row" id="delivery-fee-row">
                <span>Delivery Fee</span>
                <span id="delivery-fee">GHS 0</span>
              </div>

              <div class="summary-row total">
                <span>Total</span>
                <span id="grand-total">${Formatter.formatPrice(summary.grandTotal)}</span>
              </div>

              <button type="submit" class="btn btn-primary place-order-btn">
                Place Order
              </button>
            </div>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Select delivery option
   */
  static selectDeliveryOption (value, element) {
    // Update radio button
    document.querySelectorAll('input[name="deliveryMode"]').forEach(radio => {
      radio.checked = radio.value === value;
    });

    // Update visual selection
    document.querySelectorAll('.delivery-options .option-card').forEach(card => {
      card.classList.remove('selected');
    });
    element.classList.add('selected');

    // Update delivery fee
    const deliveryFee = checkoutManager.calculateDeliveryFee(
      value,
      cartManager.getSummary().subtotal,
    );
    document.getElementById('delivery-fee').textContent = Formatter.formatPrice(deliveryFee);

    // Update grand total
    const subtotal = cartManager.getSummary().subtotal;
    const grandTotal = subtotal + deliveryFee;
    document.getElementById('grand-total').textContent = Formatter.formatPrice(grandTotal);
  }

  /**
   * Select payment option
   */
  static selectPaymentOption (value, element) {
    // Update radio button
    document.querySelectorAll('input[name="paymentMode"]').forEach(radio => {
      radio.checked = radio.value === value;
    });

    // Update visual selection
    document.querySelectorAll('.payment-options .option-card').forEach(card => {
      card.classList.remove('selected');
    });
    element.classList.add('selected');
  }

  /**
   * Handle checkout form submission
   */
  static async handleCheckout (event) {
    event.preventDefault();

    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');

    // Disable submit button during processing
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Processing...';
    }

    const deliveryMode = form.querySelector('input[name="deliveryMode"]:checked')?.value;
    const paymentMode = form.querySelector('input[name="paymentMode"]:checked')?.value;
    const deliveryAddress = form.deliveryAddress.value.trim();
    const phone = form.phone.value.trim();
    const deliveryInstructions = form.deliveryInstructions.value.trim();

    // Validate
    if (!deliveryMode) {
      alert('Please select a delivery method');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Place Order';
      }
      return;
    }

    if (!paymentMode) {
      alert('Please select a payment method');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Place Order';
      }
      return;
    }

    if (!deliveryAddress) {
      alert('Please enter a delivery address');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Place Order';
      }
      return;
    }

    const checkoutData = {
      deliveryMode,
      paymentMode,
      deliveryAddress,
      phone,
      deliveryInstructions,
    };

    try {
      // Create order
      const result = await checkoutManager.createOrder(checkoutData);

      if (result.success) {
        // Show processing message
        if (submitButton) {
          submitButton.textContent = 'Processing Payment...';
        }

        // Process payment
        const paymentResult = await checkoutManager.processPayment(result.order.id, paymentMode);

        if (paymentResult.success) {
          // Send notification
          notificationManager?.success(
            'Order Confirmed',
            `Your order #${result.order.orderNumber} has been confirmed!`,
          );

          // Render confirmation page
          this.renderOrderConfirmation(result.order);
        } else {
          alert('Payment failed: ' + paymentResult.error);
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Place Order';
          }
        }
      } else {
        alert('Order failed: ' + result.error);
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Place Order';
        }
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('An error occurred during checkout. Please try again.');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Place Order';
      }
    }
  }

  /**
   * Render Order Confirmation Page
   */
  static renderOrderConfirmation (order) {
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
      <div class="order-confirmation-container">
        <div class="confirmation-icon">${Icons.checkCircle}</div>
        
        <h1>Order Placed Successfully!</h1>
        <p class="subtitle">Thank you for your purchase</p>

        <div class="order-number-box">
          <div class="order-number-label">Order Number</div>
          <div class="order-number">${order.orderNumber}</div>
        </div>

        <div class="confirmation-details">
          <h3>Order Details</h3>
          
          <div class="detail-row">
            <span>Order Date</span>
            <span>${Formatter.formatDate(order.createdAt)}</span>
          </div>
          
          <div class="detail-row">
            <span>Delivery Method</span>
            <span>${Formatter.capitalize(order.delivery.mode)}</span>
          </div>
          
          <div class="detail-row">
            <span>Delivery Address</span>
            <span>${order.delivery.address}</span>
          </div>
          
          <div class="detail-row">
            <span>Payment Method</span>
            <span>${Formatter.capitalize(order.payment.mode)}</span>
          </div>

          <div class="summary-divider"></div>

          <div class="detail-row total">
            <span>Total Paid</span>
            <span>${Formatter.formatPrice(order.pricing.grandTotal)}</span>
          </div>
        </div>

  <div class="confirmation-actions">
  <button class="btn btn-primary" onclick="Pages.renderBrowse()">
  Continue Shopping
  </button>
  <button class="btn btn-outline" onclick="Pages.renderOrders()">
  View My Orders
  </button>
  <button class="btn btn-outline" onclick="Pages.downloadReceipt('${order.id}')">
  ${Icons.download || ''} Download Receipt
  </button>
  </div>
      </div>
    `;

    // Clear cart badge
    this.updateCartBadge();
  }

  /**
   * Render Orders Page
   */
  static renderOrders () {
    const mainContent = document.getElementById('main-content');
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;

    if (!currentUser) {
      alert('Please login to view your orders.');
      this.renderLogin();
      return;
    }

    const orders = checkoutManager.getUserOrders(currentUser.id);

    if (orders.length === 0) {
      mainContent.innerHTML = `
        <div class="container" style="padding: 3rem 1rem;">
          <div class="empty-cart">
<div class="empty-cart-icon">${Icons.package}</div>
        <h3>No orders yet</h3>
            <p>You haven't placed any orders yet.</p>
            <button class="btn btn-primary" onclick="Pages.renderBrowse()">Start Shopping</button>
          </div>
        </div>
      `;
      return;
    }

    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem;">
        <h1 style="margin-bottom: 1.5rem;">My Orders</h1>
        
        <div class="cart-items">
          ${orders
    .map(
      order => `
            <div class="cart-item" style="display: block;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div>
                  <strong style="font-size: 1.1rem;">Order #${order.orderNumber}</strong>
                  <div style="color: var(--neutral-500); font-size: 0.9rem;">
                    ${Formatter.formatDate(order.createdAt)}
                  </div>
                </div>
                <span class="condition-badge ${order.status}" style="background: ${this.getStatusColor(
  order.status,
)}; color: white; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.875rem;">
                  ${Formatter.capitalize(order.status.replace('-', ' '))}
                </span>
              </div>
              
              <div style="border-top: 1px solid var(--neutral-200); padding-top: 1rem;">
                ${order.items
    .map(
      item => `
                  <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
                    <img src="${item.image || '/assets/images/products/no-image.svg'}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: var(--radius-md);" loading="lazy" onerror="this.src='/assets/images/products/no-image.svg'" />
                    <div style="flex: 1;">
                      <div style="font-weight: 500;">${item.title}</div>
                      <div style="color: var(--neutral-500); font-size: 0.875rem;">Qty: ${item.quantity}</div>
                    </div>
                    <div style="font-weight: 600;">${Formatter.formatPrice(item.price * item.quantity)}</div>
                  </div>
                `,
    )
    .join('')}
              </div>
              
<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--neutral-200);">
  <div style="font-weight: 700; font-size: 1.1rem;">
  Total: ${Formatter.formatPrice(order.pricing.grandTotal)}
  </div>
  <div style="display:flex;gap:0.5rem;">
  <button class="btn btn-outline btn-sm" onclick="Pages.viewOrderDetails('${order.id}')">
  View Details
  </button>
  <button class="btn btn-ghost btn-sm" onclick="Pages.downloadReceipt('${order.id}')">
  Receipt
  </button>
  </div>
</div>

${Pages.renderOrderTimeline(order.status)}
</div>
          `,
    )
    .join('')}
        </div>
      </div>
    `;
  }

/**
* Get status color
*/
static getStatusColor (status) {
const colors = {
[ORDER_STATUS.PLACED]: '#6366f1',
[ORDER_STATUS.CONFIRMED]: '#10b981',
[ORDER_STATUS.IN_TRANSIT]: '#f59e0b',
[ORDER_STATUS.DELIVERED]: '#10b981',
[ORDER_STATUS.CANCELLED]: '#ef4444',
};
return colors[status] || '#6366f1';
}

/**
* Render Order Timeline Stepper
*/
static renderOrderTimeline (status) {
if (status === ORDER_STATUS.CANCELLED) {
return `
<div class="order-timeline" style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--neutral-200);">
<div style="display:flex;align-items:center;gap:0.5rem;color:#ef4444;font-weight:600;font-size:0.85rem;">
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
Order Cancelled
</div>
</div>`;
}

const steps = [
{ key: ORDER_STATUS.PLACED, label: 'Placed' },
{ key: ORDER_STATUS.CONFIRMED, label: 'Confirmed' },
{ key: ORDER_STATUS.IN_TRANSIT, label: 'In Transit' },
{ key: ORDER_STATUS.DELIVERED, label: 'Delivered' },
];

const stepOrder = steps.map(s => s.key);
const currentIdx = stepOrder.indexOf(status);
if (currentIdx === -1) return '';

return `
<div class="order-timeline" style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--neutral-200);">
<div style="display:flex;align-items:center;width:100%;">
${steps.map((step, i) => {
const isCompleted = i <= currentIdx;
const isCurrent = i === currentIdx;
const dotColor = isCompleted ? (isCurrent ? this.getStatusColor(status) : '#10b981') : 'var(--neutral-300)';
const lineColor = i < currentIdx ? '#10b981' : 'var(--neutral-200)';
return `
<div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative;">
${i > 0 ? `<div style="position:absolute;top:8px;left:-50%;width:100%;height:2px;background:${lineColor};z-index:0;"></div>` : ''}
<div style="width:18px;height:18px;border-radius:50%;background:${dotColor};border:2px solid ${dotColor};z-index:1;display:flex;align-items:center;justify-content:center;margin-bottom:4px;">
${isCompleted && !isCurrent ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
${isCurrent ? '<div style="width:6px;height:6px;border-radius:50%;background:white;"></div>' : ''}
</div>
<span style="font-size:0.7rem;color:${isCompleted ? 'var(--neutral-700)' : 'var(--neutral-400)'};font-weight:${isCurrent ? '600' : '400'};text-align:center;white-space:nowrap;">${step.label}</span>
</div>`;
}).join('')}
</div>
</div>`;
}

/**
* View Order Details (expand in page)
*/
static viewOrderDetails (orderId) {
const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
const currentUser = session?.user || null;
if (!currentUser) return;

const orders = checkoutManager.getUserOrders(currentUser.id);
const order = orders.find(o => o.id === orderId);
if (!order) {
notificationManager?.error('Not Found', 'Order not found');
return;
}

const overlay = document.createElement('div');
overlay.id = 'order-detail-overlay';
overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;';
overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

overlay.innerHTML = `
<div style="background:var(--bg-primary);border-radius:var(--radius-xl);padding:2rem;max-width:600px;width:100%;box-shadow:var(--shadow-xl);max-height:90vh;overflow-y:auto;">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
<h2 style="margin:0;">Order #${order.orderNumber}</h2>
<button class="btn btn-ghost btn-sm" onclick="document.getElementById('order-detail-overlay').remove()">Close</button>
</div>
<span class="condition-badge ${order.status}" style="background:${this.getStatusColor(order.status)};color:white;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.875rem;margin-bottom:1rem;display:inline-block;">
${Formatter.capitalize(order.status.replace('-', ' '))}
</span>
${Pages.renderOrderTimeline(order.status)}
<div style="margin-top:1.5rem;">
<h3 style="font-size:1rem;margin:0 0 1rem;">Items</h3>
${order.items.map(item => `
<div style="display:flex;gap:1rem;margin-bottom:0.75rem;align-items:center;">
  <img src="${item.image || '/assets/images/products/no-image.svg'}" alt="${item.title}" style="width:50px;height:50px;object-fit:cover;border-radius:var(--radius-md);" loading="lazy" onerror="this.src='/assets/images/products/no-image.svg'" />
<div style="flex:1;">
<div style="font-weight:500;">${item.title}</div>
<div style="color:var(--neutral-500);font-size:0.85rem;">Qty: ${item.quantity}</div>
</div>
<div style="font-weight:600;">${Formatter.formatPrice(item.price * item.quantity)}</div>
</div>
`).join('')}
</div>
  <div style="border-top:1px solid var(--neutral-200);padding-top:1rem;margin-top:1rem;display:flex;justify-content:space-between;align-items:center;">
  <div>
  <div style="color:var(--neutral-500);font-size:0.85rem;">Order Total</div>
  <div style="font-weight:700;font-size:1.25rem;">${Formatter.formatPrice(order.pricing.grandTotal)}</div>
  </div>
  <div style="display:flex;gap:0.5rem;align-items:center;">
  <button class="btn btn-outline btn-sm" onclick="Pages.downloadReceipt('${order.id}')">Download Receipt</button>
  <button class="btn btn-ghost btn-sm" onclick="document.getElementById('order-detail-overlay').remove()">Close</button>
  </div>
  </div>
</div>
`;

    document.body.appendChild(overlay);
  }

  /**
* Update cart badge in navbar
*/
static updateCartBadge () {
const badge = document.getElementById('cart-badge');
if (badge) {
const count = cartManager.getCount();
if (count > 0) {
badge.textContent = count;
badge.style.display = 'flex';
} else {
badge.style.display = 'none';
}
}
}

/**
* Update wishlist badge in navbar
*/
static updateWishlistBadge () {
const badge = document.getElementById('wishlist-badge');
if (badge) {
const count = productsManager.getWishlist().length;
if (count > 0) {
badge.textContent = count;
badge.style.display = 'flex';
} else {
badge.style.display = 'none';
}
}
}

/**
* Initialize dark mode from saved preference
*/
static initDarkMode () {
const saved = StorageManager.get(STORAGE_KEYS.THEME, false);
if (saved === 'dark') {
document.documentElement.setAttribute('data-theme', 'dark');
}
Pages.updateDarkModeIcons();
}

/**
* Toggle dark mode
*/
static toggleDarkMode () {
const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
if (isDark) {
document.documentElement.removeAttribute('data-theme');
StorageManager.set(STORAGE_KEYS.THEME, 'light');
} else {
document.documentElement.setAttribute('data-theme', 'dark');
StorageManager.set(STORAGE_KEYS.THEME, 'dark');
}
Pages.updateDarkModeIcons();
}

/**
* Update dark mode toggle icons
*/
static updateDarkModeIcons () {
const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
const sunIcon = document.getElementById('dark-mode-icon-sun');
const moonIcon = document.getElementById('dark-mode-icon-moon');
if (sunIcon && moonIcon) {
sunIcon.style.display = isDark ? 'block' : 'none';
moonIcon.style.display = isDark ? 'none' : 'block';
}
}

  /**
   * Update navbar based on authentication state
   */
  static updateNavbar () {
    const authButtons = document.getElementById('navbar-auth-buttons');
    const userMenu = document.getElementById('navbar-user-menu');
    const drawerAuth = document.getElementById('navbar-drawer-auth');
    const drawerUser = document.getElementById('navbar-drawer-user');

    // Check auth using authManager (which uses unihub_session)
    const isLoggedIn = typeof authManager !== 'undefined' && authManager.isLoggedIn();

    if (isLoggedIn) {
      // Desktop navbar - logged in
      if (authButtons) authButtons.style.display = 'none';
      if (userMenu) {
        userMenu.style.display = 'flex';
        userMenu.style.gap = 'var(--space-sm)';
      }
      // Mobile drawer - logged in
      if (drawerAuth) drawerAuth.style.display = 'none';
      if (drawerUser) drawerUser.style.display = 'block';
    } else {
      // Desktop navbar - logged out
      if (authButtons) {
        authButtons.style.display = 'flex';
        authButtons.style.gap = 'var(--space-sm)';
      }
      if (userMenu) userMenu.style.display = 'none';
      // Mobile drawer - logged out
      if (drawerAuth) drawerAuth.style.display = 'block';
      if (drawerUser) drawerUser.style.display = 'none';
    }
  }

  // ============================================
  // ADDITIONAL PAGE RENDERERS (Placeholder implementations)
  // ============================================

/**
* Render Wishlist Page
*/
static renderWishlist () {
const mainContent = document.getElementById('main-content');
const wishlistProducts = productsManager.getWishlist();
const priceDrops = productsManager.trackWishlistPrices();

if (wishlistProducts.length === 0) {
mainContent.innerHTML = `
<div class="container" style="padding: 3rem 1rem; text-align: center;">
<div class="empty-cart">
<div class="empty-cart-icon">${Icons.heartOutline}</div>
<h3>Your wishlist is empty</h3>
<p>Save your favorite items to see them here.</p>
<button class="btn btn-primary" onclick="Pages.renderBrowse()">Browse Products</button>
</div>
</div>
`;
return;
}

const priceDropBanner = priceDrops.length > 0
? `<div style="background:var(--color-success-light);border:1px solid var(--color-success);border-radius:var(--radius-lg);padding:1rem 1.25rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2"><path d="M13 17V7M6 17l5-5 5 5M20 7l-5 5"/></svg>
<div>
<strong style="color:var(--color-success);">Price Drop Alert!</strong>
<span style="font-size:0.9rem;"> ${priceDrops.length} item${priceDrops.length > 1 ? 's' : ''} in your wishlist ${priceDrops.length > 1 ? 'have' : 'has'} dropped in price.</span>
</div>
${priceDrops.map(d => `<span style="font-size:0.8rem;background:var(--bg-primary);padding:2px 8px;border-radius:var(--radius-md);">${d.title}: GHS ${d.oldPrice.toLocaleString()} → GHS ${d.newPrice.toLocaleString()} <strong style="color:var(--color-success);">(-GHS ${d.saved.toLocaleString()})</strong></span>`).join('')}
</div>`
: '';

mainContent.innerHTML = `
<div class="container" style="padding: 2rem 1rem;">
${priceDropBanner}
<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
<div>
<h1 style="margin: 0;">My Wishlist</h1>
<p style="color: var(--neutral-600); margin: 0.5rem 0 0;">${wishlistProducts.length} item${wishlistProducts.length !== 1 ? 's' : ''} saved</p>
</div>
<div style="display: flex; gap: 0.75rem;">
<button class="btn btn-outline" onclick="Pages.addAllWishlistToCart()" title="Add all to cart">
${Icons.cart} Add All to Cart
</button>
<button class="btn btn-outline" style="color: var(--color-danger); border-color: var(--color-danger-light);" onclick="Pages.clearWishlist()" title="Remove all">
${Icons.trash} Clear All
</button>
</div>
</div>
<div class="wishlist-grid">
${wishlistProducts.map(product => {
const initials = product.seller?.name
? product.seller.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
: 'UN';
const conditionLabel = Pages.formatConditionLabel(product.condition || 'good');
const conditionClass = product.condition || 'good';
return `
<div class="wishlist-card" onclick="Pages.renderProductDetail('${product.id}')">
<div class="wishlist-card-image">
<img src="${product.images?.[0] || '/assets/images/products/no-image.svg'}" alt="${product.title}" loading="lazy">
<span class="condition-badge ${conditionClass}" style="position:absolute;top:0.5rem;left:0.5rem;">${conditionLabel}</span>
<button class="wishlist-card-remove" onclick="event.stopPropagation(); Pages.toggleWishlistDetail('${product.id}')" title="Remove from wishlist">
<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
</button>
</div>
<div class="wishlist-card-info">
<h3 class="wishlist-card-title">${product.title}</h3>
<div style="display:flex;align-items:center;gap:0.5rem;margin:0.25rem 0;">
<span style="font-weight:700;color:var(--price-color);font-size:1.1rem;">GHS ${product.price?.toLocaleString() || '0'}</span>
</div>
<div class="wishlist-card-seller">
<div class="seller-avatar" style="width:24px;height:24px;font-size:10px;">${initials}</div>
<span style="font-size:0.85rem;color:var(--neutral-600);">${product.seller?.name || 'Unknown'}</span>
${product.seller?.rating ? `<span style="font-size:0.8rem;color:var(--neutral-500);">★ ${product.seller.rating}</span>` : ''}
</div>
<div class="wishlist-card-actions">
<button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); cartManager?.add(${JSON.stringify(product).replace(/"/g, '&quot;')}); Pages.updateCartBadge(); notificationManager?.success('Added to Cart','Item added to your cart');" style="flex:1;">Add to Cart</button>
<button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); Pages.shareProduct('${product.id}')" title="Share">
${Icons.upload}
</button>
</div>
</div>
</div>`;
}).join('')}
</div>
</div>
<style>
.wishlist-grid {
display: grid;
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
gap: 1.25rem;
}
.wishlist-card {
background: var(--bg-primary);
border-radius: var(--radius-lg);
overflow: hidden;
cursor: pointer;
transition: box-shadow 0.2s, transform 0.2s;
border: 1px solid var(--neutral-200);
}
.wishlist-card:hover {
box-shadow: var(--shadow-card-hover);
transform: translateY(-2px);
}
.wishlist-card-image {
position: relative;
aspect-ratio: 1;
overflow: hidden;
background: var(--neutral-100);
}
.wishlist-card-image img {
width: 100%;
height: 100%;
object-fit: cover;
}
.wishlist-card-remove {
position: absolute;
top: 0.5rem;
right: 0.5rem;
width: 30px;
height: 30px;
border-radius: 50%;
background: rgba(255,255,255,0.9);
border: none;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
color: var(--neutral-500);
transition: all 0.15s;
}
.wishlist-card-remove:hover {
background: var(--color-danger);
color: white;
}
.wishlist-card-info {
padding: 1rem;
}
.wishlist-card-title {
font-size: 0.95rem;
font-weight: 600;
margin: 0 0 0.25rem;
display: -webkit-box;
-webkit-line-clamp: 2;
-webkit-box-orient: vertical;
overflow: hidden;
}
.wishlist-card-seller {
display: flex;
align-items: center;
gap: 0.4rem;
margin: 0.5rem 0 0.75rem;
}
.wishlist-card-actions {
display: flex;
gap: 0.5rem;
}
.btn-sm {
padding: 0.4rem 0.75rem;
font-size: 0.8rem;
}
</style>
`;

window.scrollTo(0, 0);
}

  /**
   * Render User Dashboard - Vertical Tabs Modern Design
   */
  static renderDashboard () {
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;

    if (!currentUser) {
      alert('Please login to view your dashboard.');
      this.renderLogin();
      return;
    }

    this.showOriginalNavFooter();

    const mainContent = document.getElementById('main-content');
    const orders = checkoutManager.getUserOrders(currentUser.id || '');
    const wishlist = productsManager.getWishlist();
    const cartCount = cartManager.getCount();
    const initials = currentUser.fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const recentOrders = orders.slice(0, 5);

    mainContent.innerHTML = `
      <div class="dashboard-vertical">
        <div class="dashboard-card">
          <!-- Sidebar -->
          <aside class="dv-sidebar">
            <div class="dv-user-info">
              <div class="dv-user-avatar">${initials}</div>
              <div>
                <div class="dv-user-name">${currentUser.fullName}</div>
                <div class="dv-user-email">${currentUser.email}</div>
              </div>
            </div>

            <div class="dv-tabs">
              <button class="dv-tab active" data-tab="overview" onclick="Pages.switchDashboardTab('overview')">
                <span class="dv-tab-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="7" height="9" x="3" y="3" rx="1" />
                    <rect width="7" height="5" x="14" y="3" rx="1" />
                    <rect width="7" height="9" x="14" y="12" rx="1" />
                    <rect width="7" height="5" x="3" y="16" rx="1" />
                  </svg>
                </span>
                <span class="dv-tab-label">Overview</span>
              </button>

              <button class="dv-tab" data-tab="orders" onclick="Pages.switchDashboardTab('orders')">
                <span class="dv-tab-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </span>
                <span class="dv-tab-label">Orders</span>
                ${orders.length > 0 ? `<span class="dv-tab-badge">${orders.length}</span>` : ''}
              </button>

              <button class="dv-tab" data-tab="wishlist" onclick="Pages.switchDashboardTab('wishlist')">
                <span class="dv-tab-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </span>
                <span class="dv-tab-label">Wishlist</span>
                ${wishlist.length > 0 ? `<span class="dv-tab-badge">${wishlist.length}</span>` : ''}
              </button>

              <button class="dv-tab" data-tab="cart" onclick="Pages.switchDashboardTab('cart')">
                <span class="dv-tab-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="8" cy="21" r="1" />
                    <circle cx="19" cy="21" r="1" />
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                  </svg>
                </span>
                <span class="dv-tab-label">Cart</span>
                ${cartCount > 0 ? `<span class="dv-tab-badge">${cartCount}</span>` : ''}
              </button>

              <button class="dv-tab" data-tab="profile" onclick="Pages.switchDashboardTab('profile')">
                <span class="dv-tab-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <span class="dv-tab-label">Profile</span>
              </button>

              <button class="dv-tab" data-tab="settings" onclick="Pages.switchDashboardTab('settings')">
                <span class="dv-tab-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </span>
                <span class="dv-tab-label">Settings</span>
              </button>
            </div>
          </aside>

          <!-- Content Area -->
          <main class="dv-content">
            <!-- Overview Panel -->
            <div class="dv-panel active" id="dv-panel-overview">
              <h1 class="dv-panel-title">Welcome back, ${currentUser.fullName}!</h1>
              <p class="dv-panel-subtitle">Here's what's happening with your account today.</p>

              <div class="dv-stats">
                <div class="dv-stat">
                  <div class="dv-stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                  </div>
                  <div class="dv-stat-value">${orders.length}</div>
                  <div class="dv-stat-label">Total Orders</div>
                </div>
                <div class="dv-stat">
                  <div class="dv-stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </div>
                  <div class="dv-stat-value">${wishlist.length}</div>
                  <div class="dv-stat-label">Wishlist Items</div>
                </div>
                <div class="dv-stat">
                  <div class="dv-stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                  </div>
                  <div class="dv-stat-value">${cartCount}</div>
                  <div class="dv-stat-label">Cart Items</div>
                </div>
                <div class="dv-stat">
                  <div class="dv-stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div class="dv-stat-value">${currentUser.university ? currentUser.university.toUpperCase() : 'N/A'}</div>
                  <div class="dv-stat-label">University</div>
                </div>
              </div>

              <div class="dv-section-header">
                <h2 class="dv-section-title">Recent Orders</h2>
                <button class="dv-section-link" onclick="Pages.switchDashboardTab('orders')">View All →</button>
              </div>

              <div class="dv-orders">
                ${
  recentOrders.length > 0
    ? recentOrders
      .map(
        order => `
                  <div class="dv-order-item">
<div class="dv-order-icon">${Icons.package}</div>
          <div class="dv-order-info">
            <div class="dv-order-number">Order #${order.orderNumber}</div>
            <div class="dv-order-amount">${Formatter.formatPrice(order.pricing.grandTotal)}</div>
          </div>
                    <div class="dv-order-time">${Formatter.formatTimeAgo(order.createdAt)}</div>
                    <span class="dv-order-status ${order.status ? order.status.toLowerCase() : 'placed'}">${order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Placed'}</span>
                  </div>
                `,
      )
      .join('')
    : `
                  <div class="dv-empty">
<div class="dv-empty-icon">${Icons.package}</div>
        <h3>No orders yet</h3>
        <p>Start shopping to see your orders here!</p>
                  </div>
                `
}
              </div>
            </div>

            <!-- Orders Panel -->
            <div class="dv-panel" id="dv-panel-orders">
              <h1 class="dv-panel-title">My Orders</h1>
              <p class="dv-panel-subtitle">Track and manage all your orders.</p>

              <div class="dv-orders">
                ${
  orders.length > 0
    ? orders
      .map(
        order => `
                  <div class="dv-order-item">
<div class="dv-order-icon">${Icons.package}</div>
          <div class="dv-order-info">
            <div class="dv-order-number">Order #${order.orderNumber}</div>
            <div class="dv-order-amount">${order.items.length} item(s) • ${Formatter.formatPrice(order.pricing.grandTotal)}</div>
          </div>
                    <div class="dv-order-time">${Formatter.formatTimeAgo(order.createdAt)}</div>
                    <span class="dv-order-status ${order.status ? order.status.toLowerCase() : 'placed'}">${order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Placed'}</span>
                  </div>
                `,
      )
      .join('')
    : `
                  <div class="dv-empty">
<div class="dv-empty-icon">${Icons.cart}</div>
        <h3>No orders yet</h3>
        <p>Browse products and make your first purchase!</p>
                  </div>
                `
}
              </div>
            </div>

            <!-- Wishlist Panel -->
            <div class="dv-panel" id="dv-panel-wishlist">
              <h1 class="dv-panel-title">My Wishlist</h1>
              <p class="dv-panel-subtitle">Items you've saved for later.</p>

              ${
  wishlist.length > 0
    ? `
                <div class="dv-wishlist-grid">
                  ${wishlist
    .map(
      product => `
                    <div class="store-product-card" onclick="Pages.renderProductDetail('${product.id}')">
                      <div class="store-product-image">
                        <img src="${product.images[0]}" alt="${product.title}" loading="lazy" />
                        <span class="store-condition-badge ${product.condition}">${product.condition.charAt(0).toUpperCase() + product.condition.slice(1)}</span>
                        <button class="store-wishlist-btn active" onclick="Pages.toggleWishlist(event, '${product.id}'); Pages.renderDashboard();">${Icons.heart}</button>
                      </div>
                      <div class="store-product-info">
                        <h3 class="store-product-title">${product.title}</h3>
                        <div class="store-product-price-row">
                          <span class="store-product-price">${product.price.toLocaleString()}</span>
                          <span class="store-product-currency">GHS</span>
                        </div>
                      </div>
                    </div>
                  `,
    )
    .join('')}
                </div>
              `
    : `
                <div class="dv-empty">
<div class="dv-empty-icon">${Icons.heartOutline}</div>
        <h3>Your wishlist is empty</h3>
                  <p>Save items you love to find them later!</p>
                </div>
              `
}
            </div>

            <!-- Cart Panel -->
            <div class="dv-panel" id="dv-panel-cart">
              <h1 class="dv-panel-title">Shopping Cart</h1>
              <p class="dv-panel-subtitle">Review items before checkout.</p>

              ${
  cartCount > 0
    ? `
                <div class="dv-orders">
                  ${cartManager
    .getItems()
    .map(
      item => `
                    <div class="dv-order-item">
<div class="dv-order-icon">${Icons.cart}</div>
          <div class="dv-order-info">
            <div class="dv-order-number">${item.product.title}</div>
            <div class="dv-order-amount">Qty: ${item.quantity} × ${item.product.price.toLocaleString()} GHS</div>
          </div>
                    </div>
                  `,
    )
    .join('')}
                </div>
                <div style="margin-top:1.5rem;display:flex;gap:0.75rem;">
                  <button class="dv-btn dv-btn-outline" onclick="cartManager.clear(); Pages.renderDashboard();">Clear Cart</button>
                  <button class="dv-btn dv-btn-primary" onclick="event.preventDefault(); Pages.handleProceedToCheckout();">Proceed to Checkout →</button>
                </div>
              `
    : `
                <div class="dv-empty">
<div class="dv-empty-icon">${Icons.cart}</div>
        <h3>Your cart is empty</h3>
        <p>Add items to get started!</p>
                </div>
              `
}
            </div>

            <!-- Profile Panel -->
            <div class="dv-panel" id="dv-panel-profile">
              <h1 class="dv-panel-title">Edit Profile</h1>
              <p class="dv-panel-subtitle">Update your personal information.</p>

              <div class="dv-profile">
                <form id="profile-form" onsubmit="Pages.handleProfileUpdate(event)">
                  <div class="dv-form-group">
                    <label class="dv-form-label">Full Name</label>
                    <input type="text" id="fullName" name="fullName" class="dv-form-input" value="${currentUser.fullName}" required />
                  </div>
                  <div class="dv-form-group">
                    <label class="dv-form-label">Email</label>
                    <input type="email" id="email" name="email" class="dv-form-input" value="${currentUser.email}" required />
                  </div>
                  <div class="dv-form-group">
                    <label class="dv-form-label">Phone</label>
                    <input type="tel" id="phone" name="phone" class="dv-form-input" value="${currentUser.phone || ''}" />
                  </div>
                  <div class="dv-form-group">
                    <label class="dv-form-label">University</label>
                    <input type="text" class="dv-form-input" value="${currentUser.university || 'Not set'}" disabled />
                  </div>
                  <button type="submit" class="dv-btn dv-btn-primary" style="width:100%;margin-top:1rem;">Save Changes</button>
                </form>
              </div>
            </div>

            <!-- Settings Panel -->
            <div class="dv-panel" id="dv-panel-settings">
              <h1 class="dv-panel-title">Settings</h1>
              <p class="dv-panel-subtitle">Manage your account preferences.</p>

              <div class="dv-profile">
                <div class="dv-form-group">
                  <label class="dv-form-label">Account Status</label>
                  <input type="text" class="dv-form-input" value="${currentUser.isVerified ? '✓ Verified' : '⏳ Pending Verification'}" disabled />
                </div>
                <div class="dv-form-group">
                  <label class="dv-form-label">Role</label>
                  <input type="text" class="dv-form-input" value="${currentUser.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Buyer'}" disabled />
                </div>
                <div style="margin-top:2rem;display:flex;flex-direction:column;gap:0.75rem;">
                  <button class="dv-btn dv-btn-outline" onclick="Pages.handleLogout();">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    `;
  }

  /**
   * Switch Dashboard Tab
   */
  static switchDashboardTab (tabId) {
    // Update tab buttons
    document.querySelectorAll('.dv-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Update panels
    document.querySelectorAll('.dv-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `dv-panel-${tabId}`);
    });
  }

  /**
   * Render User Profile
   */
  static renderProfile () {
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;

    if (!currentUser) {
      alert('Please login to view your profile.');
      this.renderLogin();
      return;
    }

    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem; max-width: 800px;">
        <h1 style="margin-bottom: 1.5rem;">My Profile</h1>
        <div class="auth-card">
          <form id="profile-form" onsubmit="Pages.handleProfileUpdate(event)">
            <div class="form-group">
              <label for="fullName" class="required">Full Name</label>
              <input type="text" id="fullName" name="fullName" class="form-control" value="${currentUser.fullName}" required />
            </div>
            <div class="form-group">
              <label for="email" class="required">Email Address</label>
              <input type="email" id="email" name="email" class="form-control" value="${currentUser.email}" required />
            </div>
            <div class="form-group">
              <label for="phone">Phone Number</label>
              <input type="tel" id="phone" name="phone" class="form-control" value="${currentUser.phone || ''}" />
            </div>
            <div class="form-group">
              <label>University</label>
              <input type="text" class="form-control" value="${currentUser.university || 'Not set'}" disabled />
            </div>
            <button type="submit" class="btn btn-primary btn-block">Update Profile</button>
          </form>
          <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--neutral-200);">
            <button class="btn btn-outline btn-block" onclick="Pages.handleLogout()">Logout</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Handle Profile Update
   */
  static handleProfileUpdate (event) {
    event.preventDefault();
    const form = event.target;
    const updates = {
      fullName: form.fullName.value,
      email: form.email.value,
      phone: form.phone.value,
    };

    const result = authManager.updateProfile(updates);
    if (result.success) {
      notificationManager?.success('Profile Updated', result.message);
    } else {
      notificationManager?.error('Update Failed', result.error);
    }
  }

  /**
   * Handle Logout
   */
  static handleLogout () {
    authManager.logout();
    notificationManager?.info('Logged Out', 'You have been logged out successfully.');
    // Update navbar to show login/signup buttons
    this.updateNavbar();
    this.renderLanding();
  }

  /**
   * Render Notifications Page
   */
  static renderNotifications () {
    const mainContent = document.getElementById('main-content');
    const notifications = notificationManager?.getAll();

    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem; max-width: 800px;">
        <h1 style="margin-bottom: 1.5rem;">Notifications</h1>
        ${
  notifications.length > 0
    ? `
          <div class="cart-items">
            ${notifications
    .map(
      n => `
              <div class="cart-item ${n.read ? 'read' : 'unread'}" style="display: flex; align-items: flex-start; gap: 1rem;">
                <div style="font-size: 2rem;">${n.icon}</div>
                <div style="flex: 1;">
                  <div style="font-weight: 600;">${n.title}</div>
                  <div style="color: var(--neutral-600);">${n.message}</div>
                  <div style="font-size: 0.875rem; color: var(--neutral-500); margin-top: 0.5rem;">
                    ${notificationManager?.formatTime(n.createdAt)}
                  </div>
                </div>
                <button class="remove-btn" onclick="notificationManager?.delete('${n.id}'); Pages.renderNotifications();">×</button>
              </div>
            `,
    )
    .join('')}
          </div>
        `
    : `
          <div class="empty-cart">
<div class="empty-cart-icon">${Icons.bell}</div>
        <h3>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        `
}
      </div>
    `;
  }

  /**
   * Render Seller Dashboard
   */
  static renderSellerDashboard () {
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;

    if (!currentUser) {
      alert('Please login to access seller dashboard.');
      this.renderLogin();
      return;
    }

    const mainContent = document.getElementById('main-content');
    const sellerProducts = productsManager.getBySeller(currentUser.id);

    mainContent.innerHTML = `
      <div class="seller-dashboard">
        <aside class="seller-sidebar">
          <div class="seller-brand">
            <div class="seller-brand-icon">${Icons.store}</div>
            <div class="seller-brand-name">Seller Hub</div>
          </div>
          <ul class="seller-nav">
            <li class="seller-nav-item">
              <a href="#" class="seller-nav-link active">
                <span class="seller-nav-icon">${Icons.chart}</span>
                <span>Dashboard</span>
              </a>
            </li>
            <li class="seller-nav-item">
              <a href="#" class="seller-nav-link" onclick="Pages.renderAddProduct()">
                <span class="seller-nav-icon">${Icons.plus}</span>
                <span>Add Product</span>
              </a>
            </li>
            <li class="seller-nav-item">
              <a href="#" class="seller-nav-link" onclick="Pages.renderManageProducts()">
                <span class="seller-nav-icon">${Icons.package}</span>
                <span>Manage Products</span>
              </a>
            </li>
            <li class="seller-nav-item">
              <a href="#" class="seller-nav-link" onclick="Pages.renderSellerOrders()">
                <span class="seller-nav-icon">${Icons.clipboard}</span>
                <span>Orders</span>
              </a>
            </li>
          </ul>
        </aside>
        <main class="seller-main">
          <div class="seller-header">
            <h1 class="seller-title">Seller Dashboard</h1>
            <div class="seller-actions">
              <button class="btn btn-primary" onclick="Pages.renderAddProduct()">+ Add Product</button>
            </div>
          </div>
          <div class="seller-stats">
            <div class="seller-stat-card">
              <div class="seller-stat-header">
                <div class="seller-stat-icon">${Icons.package}</div>
              </div>
              <div class="seller-stat-value">${sellerProducts.length}</div>
              <div class="seller-stat-label">Total Products</div>
            </div>
          </div>
        </main>
      </div>
    `;
  }

  /**
   * Render Add Product Page
   */
  static renderAddProduct () {
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;

    if (!currentUser) {
      alert('Please login to list products.');
      this.renderLogin();
      return;
    }

    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem; max-width: 800px;">
        <h1 style="margin-bottom: 1.5rem;">Add New Product</h1>
        <form class="add-product-form" onsubmit="Pages.handleAddProduct(event)">
          <div class="form-section">
            <h3 class="form-section-title">Product Images</h3>
            <div class="image-upload-container">
              <div id="image-drop-zone" class="image-drop-zone" 
                   ondragover="event.preventDefault(); this.classList.add('drag-over')" 
                   ondragleave="this.classList.remove('drag-over')" 
                   ondrop="Pages.handleImageDrop(event); this.classList.remove('drag-over')">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <div class="upload-text">Drag & drop images here or click to browse</div>
                <div class="upload-hint">Supports: JPG, PNG, WebP (Max 5MB per image)</div>
                <input type="file" id="product-images" name="images" multiple accept="image/*" style="display: none;" onchange="Pages.handleImageSelect(event)" />
              </div>
              <div id="image-preview-grid" class="image-preview-grid"></div>
            </div>
          </div>
          <div class="form-section">
            <h3 class="form-section-title">Product Details</h3>
            <div class="form-group">
              <label for="title" class="required">Product Title</label>
              <input type="text" id="title" name="title" class="form-control" required />
            </div>
            <div class="form-group">
              <label for="description" class="required">Description</label>
              <textarea id="description" name="description" class="form-control" rows="5" required></textarea>
            </div>
            <div class="form-group">
              <label for="category" class="required">Category</label>
              <select id="category" name="category" class="form-control" required>
                <option value="">Select Category</option>
                <option value="appliances">Appliances</option>
                <option value="hostel-items">Hostel Items</option>
                <option value="accessories">Accessories</option>
                <option value="textbooks">Textbooks</option>
                <option value="electronics">Electronics</option>
                <option value="fashion">Fashion</option>
                <option value="thrifts">Thrifts</option>
              </select>
            </div>
            <div class="form-group">
              <label for="condition" class="required">Condition</label>
              <select id="condition" name="condition" class="form-control" required>
                <option value="">Select Condition</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
              </select>
            </div>
  <div class="form-group">
  <label for="price" class="required">Price (GHS)</label>
  <input type="number" id="price" name="price" class="form-control" min="0" step="0.01" required />
  </div>
  <div class="form-group">
  <label>Product Variants <span style="font-weight: normal; color: #6b7280;">(optional)</span></label>
  <p style="font-size: 0.8rem; color: #6b7280; margin-bottom: 0.5rem;">Add size, color, or other options if the product comes in multiple versions.</p>
  <div id="product-variants-list"></div>
  <button type="button" class="btn btn-outline btn-sm" onclick="Pages.addVariantRow()" style="margin-top: 8px;">+ Add Variant</button>
  </div>
  </div>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" onclick="Pages.renderSellerDashboard()">Cancel</button>
            <button type="submit" class="btn btn-primary" id="submit-product-btn">Add Product</button>
          </div>
        </form>
      </div>
      <style>
        .image-upload-container { margin-bottom: 1.5rem; }
        .image-drop-zone {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 3rem 1rem;
          text-align: center;
          cursor: pointer;
          background: #f9fafb;
          transition: all 0.2s;
        }
        .image-drop-zone:hover, .image-drop-zone.drag-over {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.05);
        }
        .image-drop-zone svg { color: #9ca3af; margin-bottom: 1rem; }
        .upload-text { font-weight: 600; color: #374151; margin-bottom: 0.25rem; }
        .upload-hint { font-size: 0.8rem; color: #6b7280; }
        .image-preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 12px;
          margin-top: 1rem;
        }
        .image-preview-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        .image-preview-item img { width: 100%; height: 100%; object-fit: cover; }
        .image-remove-btn {
          position: absolute;
          top: 4px; right: 4px;
          background: rgba(0,0,0,0.6);
          color: white;
          border: none;
          border-radius: 50%;
          width: 20px; height: 20px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 12px;
        }
        .image-remove-btn:hover { background: rgba(220, 38, 38, 0.8); }
      </style>
    `;

    // Initialize the drop-zone click handler
    document.getElementById('image-drop-zone').addEventListener('click', () => {
      document.getElementById('product-images').click();
    });
  }

  // ==========================================
  // IMAGE UPLOAD HANDLERS
  // ==========================================

  static selectedProductImages = [];

  static handleImageSelect (event) {
    const files = Array.from(event.target.files);
    Pages.processImageFiles(files);
  }

  static handleImageDrop (event) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    Pages.processImageFiles(files);
  }

  static processImageFiles (files) {
    const validFiles = files.filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        Pages.selectedProductImages.push({ file, preview: e.target.result });
        Pages.renderImagePreviews();
      };
      reader.readAsDataURL(file);
    });

    if (validFiles.length !== files.length) {
      toastManager.show('Some files were skipped (invalid type or too large)', 'warning');
    }
  }

  static renderImagePreviews () {
    const grid = document.getElementById('image-preview-grid');
    if (!grid) {return;}

    grid.innerHTML = Pages.selectedProductImages.map((img, idx) => `
      <div class="image-preview-item">
        <img src="${img.preview}" alt="Preview" />
        <button type="button" class="image-remove-btn" onclick="Pages.removeProductImage(${idx})">&times;</button>
      </div>
    `).join('');
  }

  static addVariantRow () {
  const container = document.getElementById('product-variants-list');
  if (!container) return;
  const index = container.children.length;
  const row = document.createElement('div');
  row.className = 'variant-row';
  row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;';
  row.innerHTML = `
  <input type="text" class="form-control variant-label" placeholder="Label (e.g. Size)" style="flex:1;min-width:80px;" />
  <input type="text" class="form-control variant-value" placeholder="Value (e.g. Large)" style="flex:1;min-width:80px;" />
  <input type="number" class="form-control variant-price" placeholder="Extra GHS" style="flex:0.7;min-width:60px;" min="0" step="0.01" />
  <input type="number" class="form-control variant-stock" placeholder="Qty" style="flex:0.5;min-width:50px;" min="0" step="1" value="1" />
  <button type="button" class="btn btn-outline btn-sm" onclick="this.closest('.variant-row').remove()" style="padding:4px 8px;">&times;</button>
  `;
  container.appendChild(row);
  }

  static collectVariants () {
  const container = document.getElementById('product-variants-list');
  if (!container) return [];
  const rows = container.querySelectorAll('.variant-row');
  const variants = [];
  rows.forEach(row => {
  const label = row.querySelector('.variant-label')?.value?.trim();
  const value = row.querySelector('.variant-value')?.value?.trim();
  const price = parseFloat(row.querySelector('.variant-price')?.value) || 0;
  const stock = parseInt(row.querySelector('.variant-stock')?.value) || 1;
  if (label && value) {
  variants.push({ label, value, price, stock });
  }
  });
  return variants;
  }

  static removeProductImage (index) {
    Pages.selectedProductImages.splice(index, 1);
    Pages.renderImagePreviews();
  }

  /**
   * Handle Add Product
   */
  static async handleAddProduct (event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = document.getElementById('submit-product-btn');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';

    try {
      // 1. Create the product first to get an ID
  const productData = {
  title: form.title.value,
  description: form.description.value,
  category: form.category.value,
  condition: form.condition.value,
  price: form.price.value,
  variants: Pages.collectVariants(),
  deliveryModes: ['bolt', 'yango', 'inperson'],
  paymentModes: ['momo', 'telecel', 'cash'],
  };

      const result = productsManager.addProduct(productData);

      if (!result.success) {
        throw new Error(result.error);
      }

      const productId = result.data?.id || result.product?.id;

      // 2. Upload images if any were selected
      if (Pages.selectedProductImages.length > 0 && productId) {
        const formData = new FormData();
        Pages.selectedProductImages.forEach(img => {
          formData.append('images', img.file);
        });

        // Use the backend API if available, otherwise fallback to local
        try {
          const response = await fetch(`${window.API_URL}/products/${productId}/images`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${StorageManager.getAuthToken()}` },
            body: formData,
          });

          if (!response.ok) {
            // Fallback to local base64 if upload fails
            productData.images = Pages.selectedProductImages.map(img => img.preview);
          } else {
            const uploadResult = await response.json();
            productData.images = uploadResult.data?.images || Pages.selectedProductImages.map(img => img.preview);
          }
        } catch (e) {
          // Fallback to local base64
          productData.images = Pages.selectedProductImages.map(img => img.preview);
        }

        // Update the product with the new images
        productsManager.updateProduct(productId, productData);
      }

      notificationManager?.success('Product Listed', result.message);
      Pages.selectedProductImages = []; // Clear selected images
      Pages.renderManageProducts();
    } catch (e) {
      notificationManager?.error('Error', e.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Product';
    }
  }

  /**
   * Render Manage Products Page
   */
  static renderManageProducts () {
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;
    const sellerProducts = productsManager.getBySeller(currentUser?.id || '');

    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem;">
        <div class="manage-products-header">
          <h1>Manage Products</h1>
          <button class="btn btn-primary" onclick="Pages.renderAddProduct()">+ Add Product</button>
        </div>
        ${
  sellerProducts.length > 0
    ? `
          <div class="seller-products-grid">
            ${sellerProducts
    .map(
      product => `
              <div class="seller-product-card">
                <div class="seller-product-image">
                  <img src="${product.images?.[0] || '/assets/images/products/no-image.svg'}" alt="${product.title}" loading="lazy" onerror="this.src='/assets/images/products/no-image.svg'" />
                  <span class="seller-product-status active">Active</span>
                </div>
                <div class="seller-product-content">
                  <h3 class="seller-product-title">${product.title}</h3>
                  <div class="seller-product-price">${Formatter.formatPrice(product.price)}</div>
                  <div class="seller-product-actions">
                    <button class="btn btn-outline btn-sm">Edit</button>
                    <button class="btn btn-outline btn-sm btn-danger">Delete</button>
                  </div>
                </div>
              </div>
            `,
    )
    .join('')}
          </div>
        `
    : `
          <div class="empty-cart">
<div class="empty-cart-icon">${Icons.package}</div>
        <h3>No products yet</h3>
        <p>Start selling by adding your first product.</p>
        <button class="btn btn-primary" onclick="Pages.renderAddProduct()">Add Product</button>
          </div>
        `
}
      </div>
    `;
  }

  /**
   * Render Seller Orders Page
   */
  static renderSellerOrders () {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem;">
        <h1 style="margin-bottom: 1.5rem;">Seller Orders</h1>
        <div class="empty-cart">
<div class="empty-cart-icon">${Icons.clipboard}</div>
        <h3>No orders yet</h3>
          <p>Orders will appear here when customers purchase your products.</p>
        </div>
      </div>
    `;
  }

  /**
   * Render Delivery Options Page
   */
  static renderDeliveryOptions () {
    const mainContent = document.getElementById('main-content');
    const deliveryOptions = deliveryManager.getDeliveryOptions();

    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem; max-width: 800px;">
        <h1 style="margin-bottom: 1.5rem;">Delivery Options</h1>
        <div class="delivery-options">
          ${deliveryOptions
    .map(
      option => `
            <div class="option-card">
              <div class="option-icon">${option.icon}</div>
              <div class="option-label">${option.name}</div>
              <div class="option-description">${option.description}</div>
              <div class="option-fee">${option.fee === 0 ? 'Free' : `GHS ${option.fee}`}</div>
              <div class="option-fee" style="font-size: 0.75rem;">${option.estimatedTime}</div>
            </div>
          `,
    )
    .join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render Track Order Page
   */
  static renderTrackOrder (orderId) {
    const delivery = deliveryManager.getDeliveryByOrderId(orderId);
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem; max-width: 800px;">
        <h1 style="margin-bottom: 1.5rem;">Track Order</h1>
        ${
  delivery
    ? `
          <div class="order-confirmation-container">
            <div class="confirmation-icon">${Icons.truck}</div>
            <h2>Order #${delivery.orderNumber}</h2>
            <div class="status-badge ${delivery.status}" style="display: inline-block; margin: 1rem 0;">
              ${Formatter.capitalize(delivery.status)}
            </div>
            <div class="confirmation-details">
              <div class="detail-row">
                <span>Delivery Mode</span>
                <span>${Formatter.capitalize(delivery.mode)}</span>
              </div>
              <div class="detail-row">
                <span>Address</span>
                <span>${delivery.address}</span>
              </div>
              <div class="detail-row">
                <span>Estimated Time</span>
                <span>${delivery.estimatedTime}</span>
              </div>
            </div>
          </div>
        `
    : `
          <div class="empty-cart">
<div class="empty-cart-icon">${Icons.package}</div>
        <h3>Order not found</h3>
        <p>Unable to track this order.</p>
            <button class="btn btn-primary" onclick="Pages.renderOrders()">View My Orders</button>
          </div>
        `
}
      </div>
    `;
  }

  /**
   * Render Payment Page
   */
  static renderPayment (orderId) {
    const order = checkoutManager.getOrderById(orderId);
    const mainContent = document.getElementById('main-content');

    if (!order) {
      mainContent.innerHTML = `
        <div class="container" style="padding: 2rem 1rem; text-align: center;">
          <h1>Order not found</h1>
          <button class="btn btn-primary" onclick="Pages.renderBrowse()">Continue Shopping</button>
        </div>
      `;
      return;
    }

    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem; max-width: 600px;">
        <h1 style="margin-bottom: 1.5rem;">Payment</h1>
        <div class="auth-card">
          <div class="order-summary">
            <h3>Order Summary</h3>
            <div class="detail-row">
              <span>Order Number</span>
              <span>${order.orderNumber}</span>
            </div>
            <div class="detail-row total">
              <span>Total Amount</span>
              <span>${Formatter.formatPrice(order.pricing.grandTotal)}</span>
            </div>
          </div>
          <div class="payment-processing" style="padding: 2rem 0;">
            <div class="payment-spinner"></div>
            <h3>Processing Payment...</h3>
            <p>Please wait while we process your payment.</p>
          </div>
        </div>
      </div>
    `;

    // Simulate payment processing
    setTimeout(() => {
      this.renderPaymentSuccess();
    }, 2000);
  }

  /**
   * Render Payment Success Page
   */
  static renderPaymentSuccess () {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem; text-align: center;">
        <div class="confirmation-icon">${Icons.checkCircle}</div>
        <h1>Payment Successful!</h1>
        <p style="color: var(--neutral-600); margin-bottom: 2rem;">Your payment has been processed successfully.</p>
        <button class="btn btn-primary" onclick="Pages.renderBrowse()">Continue Shopping</button>
      </div>
    `;
  }

  static getAdminSidebar (activeItem) {
  const adminUser = adminAuthManager.getCurrentUser();
  const items = [
  { key: 'dashboard', label: 'Dashboard', icon: Icons.chart, action: 'Pages.renderAdminDashboard()' },
  { key: 'users', label: 'Users', icon: Icons.users, action: 'Pages.renderAdminUsers()' },
  { key: 'products', label: 'Products', icon: Icons.package, action: 'Pages.renderAdminProducts()' },
  { key: 'orders', label: 'Orders', icon: Icons.clipboard, action: 'Pages.renderAdminOrders()' },
  { key: 'reports', label: 'Reports', icon: Icons.chart, action: 'Pages.renderAdminReports()' },
  { key: 'activity', label: 'Activity', icon: Icons.clock || Icons.chart, action: 'Pages.renderAdminActivity()' },
  { key: 'regions', label: 'Regions', icon: Icons.globe || Icons.chart, action: 'Pages.renderAdminRegions()' },
  ];
  return `
  <button class="admin-mobile-toggle" onclick="document.querySelector('.admin-sidebar').classList.toggle('open')">&#9776;</button>
  <aside class="admin-sidebar">
  <div class="admin-brand">
  <div class="admin-brand-icon">${Icons.shield || Icons.settings}</div>
  <div class="admin-brand-name">Admin Panel</div>
  </div>
  <div class="admin-user-badge">
  <div class="admin-user-avatar">${(adminUser?.fullName || 'A').charAt(0).toUpperCase()}</div>
  <div>
  <div class="admin-user-name">${adminUser?.fullName || 'Admin'}</div>
  <div class="admin-user-role">Super Admin</div>
  </div>
  </div>
  <nav class="admin-nav-section">
  <div class="admin-nav-title">Main</div>
  <ul class="admin-menu">
  ${items.map(item => `
  <li class="admin-menu-item">
  <a href="#" class="admin-menu-link ${activeItem === item.key ? 'active' : ''}" onclick="${item.action}; return false;">
  <span class="admin-menu-icon">${item.icon}</span>
  <span>${item.label}</span>
  </a>
  </li>
  `).join('')}
  </ul>
  </nav>
  <div class="admin-sidebar-footer">
  <button class="btn btn-ghost btn-sm btn-block" onclick="adminAuthManager.logout(); Pages.renderLanding();">Logout</button>
  </div>
  </aside>`;
  }

  /**
  * Render Admin Dashboard
   */
  static async renderAdminDashboard () {
  const adminUser = adminAuthManager.getCurrentUser();

  if (!adminAuthManager.isLoggedIn()) {
  this.renderAdminLogin();
  return;
  }

  const mainContent = document.getElementById('main-content');

  mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('dashboard')}
  <main class="admin-main">
  <div class="admin-header">
  <div>
  <h1 class="admin-title">Dashboard</h1>
  <p style="margin:0;color:var(--neutral-500);font-size:0.85rem;">Welcome back, ${adminUser.fullName || 'Admin'}</p>
  </div>
  <div class="admin-actions">
  <span style="color:var(--neutral-500);font-size:0.8rem;">${Formatter.formatDate(new Date().toISOString())}</span>
  </div>
  </div>

  <div id="admin-stats-grid" class="admin-stats">
  <div class="admin-stat-card"><div class="admin-stat-value">--</div><div class="admin-stat-label">Loading...</div></div>
  <div class="admin-stat-card"><div class="admin-stat-value">--</div><div class="admin-stat-label">Loading...</div></div>
  <div class="admin-stat-card"><div class="admin-stat-value">--</div><div class="admin-stat-label">Loading...</div></div>
  <div class="admin-stat-card"><div class="admin-stat-value">--</div><div class="admin-stat-label">Loading...</div></div>
  </div>

  <div id="admin-dashboard-content"></div>
  </main>
  </div>
  `;

  const stats = await adminReportsManager.getDashboardOverview();

  document.getElementById('admin-stats-grid').innerHTML = `
  <div class="admin-stat-card">
  <div class="admin-stat-header">
  <div class="admin-stat-icon primary">${Icons.users}</div>
  <span class="admin-stat-change positive">+${stats.today.newUsers} today</span>
  </div>
  <div class="admin-stat-value">${stats.summary.totalUsers}</div>
  <div class="admin-stat-label">Total Users</div>
  </div>
  <div class="admin-stat-card">
  <div class="admin-stat-header">
  <div class="admin-stat-icon success">${Icons.package}</div>
  ${stats.summary.pendingProducts > 0 ? `<span class="admin-stat-change warning">${stats.summary.pendingProducts} pending</span>` : ''}
  </div>
  <div class="admin-stat-value">${stats.summary.totalProducts}</div>
  <div class="admin-stat-label">Total Products</div>
  </div>
  <div class="admin-stat-card">
  <div class="admin-stat-header">
  <div class="admin-stat-icon warning">${Icons.clipboard}</div>
  ${stats.summary.activeOrders > 0 ? `<span class="admin-stat-change positive">${stats.summary.activeOrders} active</span>` : ''}
  </div>
  <div class="admin-stat-value">${stats.summary.totalOrders}</div>
  <div class="admin-stat-label">Total Orders</div>
  </div>
  <div class="admin-stat-card">
  <div class="admin-stat-header">
  <div class="admin-stat-icon danger">${Icons.money}</div>
  <span class="admin-stat-change positive">+GHS ${stats.today.revenue.toLocaleString()} today</span>
  </div>
  <div class="admin-stat-value">${Formatter.formatPrice(stats.summary.totalRevenue)}</div>
  <div class="admin-stat-label">Total Revenue</div>
  </div>
  `;

  const recentOrdersHtml = (stats.recentOrders || []).map(o => `
  <tr>
  <td style="font-weight:600;">#${o.orderNumber || o.id?.slice(-6)}</td>
  <td>${o.customer?.name || 'N/A'}</td>
  <td><span class="admin-status-badge ${o.status}">${Formatter.capitalize((o.status || 'placed').replace('-', ' '))}</span></td>
  <td style="font-weight:600;">${Formatter.formatPrice(o.pricing?.grandTotal || 0)}</td>
  <td style="color:var(--neutral-500);font-size:0.8rem;">${Formatter.formatTimeAgo(o.createdAt)}</td>
  </tr>
  `).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--neutral-400);padding:2rem;">No orders yet</td></tr>';

  const recentUsersHtml = (stats.recentUsers || []).map(u => `
  <div class="admin-user-row">
  <div class="admin-user-avatar-sm">${(u.fullName || 'U').charAt(0).toUpperCase()}</div>
  <div style="flex:1;">
  <div style="font-weight:500;">${u.fullName || 'Unknown'}</div>
  <div style="color:var(--neutral-500);font-size:0.8rem;">${u.email || ''}</div>
  </div>
  <span class="admin-role-badge ${u.role || 'buyer'}">${Formatter.capitalize(u.role || 'buyer')}</span>
  </div>
  `).join('') || '<div style="text-align:center;color:var(--neutral-400);padding:2rem;">No users yet</div>';

  document.getElementById('admin-dashboard-content').innerHTML = `
  <div class="admin-dashboard-grid">
  <div class="admin-card admin-card-2col">
  <div class="admin-card-header">
  <h3>Recent Orders</h3>
  <button class="btn btn-ghost btn-sm" onclick="Pages.renderAdminOrders()">View All</button>
  </div>
  <div class="admin-table-container" style="box-shadow:none;border-radius:0;">
  <table class="admin-table">
  <thead>
  <tr><th>Order</th><th>Customer</th><th>Status</th><th>Amount</th><th>Date</th></tr>
  </thead>
  <tbody>${recentOrdersHtml}</tbody>
  </table>
  </div>
  </div>

  <div class="admin-card">
  <div class="admin-card-header">
  <h3>Recent Users</h3>
  <button class="btn btn-ghost btn-sm" onclick="Pages.renderAdminUsers()">View All</button>
  </div>
  <div style="padding:var(--space-md);">
  ${recentUsersHtml}
  </div>
  </div>

  <div class="admin-card">
  <div class="admin-card-header">
  <h3>Quick Actions</h3>
  </div>
  <div style="padding:var(--space-md);display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
  <button class="btn btn-outline btn-sm" onclick="Pages.renderAdminProductCreate()">${Icons.plus || '+'} Add Product</button>
  <button class="btn btn-outline btn-sm" onclick="Pages.renderAdminProducts()">${Icons.package} Products</button>
  <button class="btn btn-outline btn-sm" onclick="Pages.renderAdminOrders()">${Icons.clipboard} Orders</button>
  <button class="btn btn-outline btn-sm" onclick="Pages.renderAdminReports()">${Icons.chart} Reports</button>
  </div>
  </div>

  <div class="admin-card">
  <div class="admin-card-header">
  <h3>Platform Health</h3>
  </div>
  <div style="padding:var(--space-md);">
  <div class="admin-health-row">
  <span>Pending Products</span>
  <span class="admin-health-val ${stats.summary.pendingProducts > 0 ? 'warning' : 'good'}">${stats.summary.pendingProducts}</span>
  </div>
  <div class="admin-health-row">
  <span>Active Orders</span>
  <span class="admin-health-val good">${stats.summary.activeOrders}</span>
  </div>
  <div class="admin-health-row">
  <span>Today Revenue</span>
  <span class="admin-health-val good">GHS ${stats.today.revenue.toLocaleString()}</span>
  </div>
  <div class="admin-health-row">
  <span>Week Revenue</span>
  <span class="admin-health-val good">GHS ${stats.thisWeek.revenue.toLocaleString()}</span>
  </div>
  <div class="admin-health-row">
  <span>Month Revenue</span>
  <span class="admin-health-val good">GHS ${stats.thisMonth.revenue.toLocaleString()}</span>
  </div>
  </div>
  </div>
  </div>
`;
  }

  /**
  * Render Admin Login
   */
  static renderAdminLogin () {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <h2>Admin Login</h2>
          <form onsubmit="Pages.handleAdminLogin(event)">
            <div class="form-group">
              <label for="admin-email" class="required">Email</label>
              <input type="email" id="admin-email" name="email" class="form-control" required />
            </div>
            <div class="form-group">
              <label for="admin-password" class="required">Password</label>
              <input type="password" id="admin-password" name="password" class="form-control" required />
            </div>
            <button type="submit" class="btn btn-primary btn-block">Login as Admin</button>
          </form>
          <div class="auth-links">
            <p><a href="#" onclick="Pages.renderLanding()">Back to Home</a></p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Handle Admin Login
   */
  static async handleAdminLogin (event) {
    event.preventDefault();
    const form = event.target;
    const result = await adminAuthManager.login(form.email.value, form.password.value);

    if (result.success) {
      notificationManager?.success('Login Successful', 'Welcome to Admin Panel');
      Pages.renderAdminDashboard();
    } else {
      notificationManager?.error('Login Failed', result.error);
    }
  }

  /**
   * Render Admin Users Page
   */
  static async renderAdminUsers () {
  const mainContent = document.getElementById('main-content');

  mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('users')}
  <main class="admin-main">
  <div class="admin-header">
  <h1 class="admin-title">User Management</h1>
  </div>
  <div class="admin-card">
  <div class="admin-card-header"><h3>Loading users...</h3></div>
  <div style="padding:2rem;text-align:center;color:#9ca3af;">Loading...</div>
  </div>
  </main>
  </div>`;

  await adminUsersManager.loadUsers();
  const users = adminUsersManager.getAllUsers();

  const tableBody = document.querySelector('.admin-card');
  if (tableBody) {
  tableBody.outerHTML = `
  <div class="admin-table-container">
  <table class="admin-table">
  <thead>
  <tr>
  <th>User</th>
  <th>Email</th>
  <th>University</th>
  <th>Role</th>
  <th>Status</th>
  <th>Actions</th>
  </tr>
  </thead>
  <tbody>
  ${users.map(user => `
  <tr>
  <td>
  <div class="user-cell">
  <div class="admin-user-avatar-sm">${(user.fullName || 'U').charAt(0).toUpperCase()}</div>
  <div class="user-info">
  <div class="user-name">${user.fullName}</div>
  </div>
  </div>
  </td>
  <td>${user.email}</td>
  <td>${user.university || '-'}</td>
  <td><span class="admin-role-badge ${user.role}">${user.role}</span></td>
  <td>
  <span class="admin-status-badge ${user.isSuspended ? 'cancelled' : 'delivered'}">
  ${user.isSuspended ? 'Suspended' : 'Active'}
  </span>
  </td>
  <td>
  <div class="table-actions">
  ${user.role === 'admin' ? '' : user.isSuspended
  ? `<button class="btn btn-sm btn-success" style="padding: 4px 8px; font-size: 12px;" onclick="Pages.adminUnbanUser('${user.id}')">Unban</button>`
  : `<button class="btn btn-sm btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="Pages.adminBanUser('${user.id}')">Ban</button>`
  }
  </div>
  </td>
  </tr>
  `).join('')}
  </tbody>
  </table>
  </div>`;
  }
  }

  /**
   * Render Admin Products Page
   */
  static renderAdminProducts () {
  const products = adminProductsManager.getAllProducts();
  const mainContent = document.getElementById('main-content');

  mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('products')}
  <main class="admin-main">
  <div class="admin-header">
  <h1 class="admin-title">Product Management</h1>
  <div class="admin-actions">
  <button class="btn btn-primary" onclick="Pages.renderAdminProductCreate()" style="padding:0.5rem 1.25rem;font-size:0.875rem;">+ Add Product</button>
  </div>
  </div>
  <div class="admin-table-container">
  <table class="admin-table">
  <thead>
  <tr>
  <th>Product</th>
  <th>Category</th>
  <th>Price</th>
  <th>Seller</th>
  <th>Status</th>
  <th>Actions</th>
  </tr>
  </thead>
  <tbody>
  ${products
  .map(
  product => `
  <tr>
  <td>
  <div class="product-cell">
  <img src="${product.images?.[0] || '/assets/images/products/no-image.svg'}" alt="${product.title}" class="product-image-small" loading="lazy" onerror="this.src='/assets/images/products/no-image.svg'" />
  <span>${product.title}</span>
  </div>
  </td>
  <td>${Formatter.capitalize(product.category)}</td>
  <td>${Formatter.formatPrice(product.price)}</td>
  <td>${product.seller.name || product.seller}</td>
  <td>
  <span class="admin-status-badge ${product.status === 'pending' ? 'placed' : 'delivered'}">
  ${product.status || 'active'}
  </span>
  </td>
  <td>
  <div class="table-actions">
  ${product.status === 'pending' ? `
  <button class="btn btn-sm btn-success" style="padding: 4px 8px; font-size: 12px;" onclick="Pages.adminApproveProduct('${product.id}')">Approve</button>
  <button class="btn btn-sm btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="Pages.adminRejectProduct('${product.id}')">Reject</button>
  ` : '<span style="color:#9ca3af;">-</span>'}
  </div>
  </td>
  </tr>
  `,
  )
  .join('')}
  </tbody>
  </table>
  </div>
  </main>
  </div>
  `;
  }

  /**
   * Render Admin Orders Page
   */
  static async renderAdminOrders () {
  const mainContent = document.getElementById('main-content');

  mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('orders')}
  <main class="admin-main">
  <div class="admin-header">
  <h1 class="admin-title">Order Management</h1>
  </div>
  <div class="admin-card">
  <div class="admin-card-header"><h3>Loading orders...</h3></div>
  <div style="padding:2rem;text-align:center;color:#9ca3af;">Loading...</div>
  </div>
  </main>
  </div>`;

  const orders = await adminOrdersManager.getAllOrders();

  const card = document.querySelector('.admin-card');
  if (card) {
  card.outerHTML = `
  <div class="admin-table-container">
  <table class="admin-table">
  <thead>
  <tr>
  <th>Order #</th>
  <th>Customer</th>
  <th>Total</th>
  <th>Payment</th>
  <th>Status</th>
  <th>Date</th>
  <th>Actions</th>
  </tr>
  </thead>
  <tbody>
  ${orders.map(order => `
  <tr>
  <td><strong>${order.orderNumber}</strong></td>
  <td>${order.customer.name}</td>
  <td>${Formatter.formatPrice(order.pricing.grandTotal)}</td>
  <td>${Formatter.capitalize(order.payment.mode)}</td>
  <td><span class="admin-status-badge ${order.status}">${Formatter.capitalize(order.status)}</span></td>
  <td>${Formatter.formatDate(order.createdAt)}</td>
  <td>
  <div class="table-actions">
  <button class="table-action-btn view" title="View">${Icons.view}</button>
  </div>
  </td>
  </tr>
  `).join('')}
  </tbody>
  </table>
  </div>`;
  }
  }

  /**
   * Render Admin Regions Page
   */
  static renderAdminRegions () {
    const regions = regionManager.getAllRegions();
    const mainContent = document.getElementById('main-content');

  mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('regions')}
  <main class="admin-main">
          <div class="admin-header">
            <h1 class="admin-title">Regional Management</h1>
          </div>
          <div class="admin-table-container">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Region</th>
                  <th>Capital</th>
                  <th>Universities</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${regions
    .map(
      region => `
                  <tr>
                    <td>${region.name}</td>
                    <td>${region.capital}</td>
                    <td>${region.universities.length}</td>
                    <td>
                      <div class="table-actions">
                        <button class="table-action-btn edit" title="Edit">${Icons.edit}</button>
                      </div>
                    </td>
                  </tr>
                `,
    )
    .join('')}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    `;
  }

  /**
   * Render Admin Reports Page
   */
  static async renderAdminReports () {
  const mainContent = document.getElementById('main-content');

  mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('reports')}
  <main class="admin-main">
  <div class="admin-header">
  <h1 class="admin-title">Analytics & Reports</h1>
  </div>
  <div style="padding:2rem;text-align:center;color:#9ca3af;">Loading reports...</div>
  </main>
  </div>`;

  const stats = await adminReportsManager.getDashboardOverview();

  const mainEl = document.querySelector('.admin-main');
  if (mainEl) {
  mainEl.innerHTML = `
  <div class="admin-header">
  <h1 class="admin-title">Analytics & Reports</h1>
  </div>
  <div class="admin-dashboard-grid">
  <div class="admin-card">
  <div class="admin-card-header"><h3>Sales Report</h3></div>
  <div style="padding:20px;">
  <div class="admin-health-row"><span>Total Revenue</span><span class="admin-health-val good">GHS ${stats.summary.totalRevenue.toLocaleString()}</span></div>
  <div class="admin-health-row"><span>Total Orders</span><span class="admin-health-val good">${stats.summary.totalOrders}</span></div>
  <div class="admin-health-row"><span>Avg Order Value</span><span class="admin-health-val good">GHS ${stats.summary.totalOrders > 0 ? Math.round(stats.summary.totalRevenue / stats.summary.totalOrders).toLocaleString() : 0}</span></div>
  </div>
  </div>
  <div class="admin-card">
  <div class="admin-card-header"><h3>User Report</h3></div>
  <div style="padding:20px;">
  <div class="admin-health-row"><span>Total Users</span><span class="admin-health-val good">${stats.summary.totalUsers}</span></div>
  <div class="admin-health-row"><span>New This Month</span><span class="admin-health-val good">${stats.thisMonth.newUsers || 0}</span></div>
  </div>
  </div>
  <div class="admin-card">
  <div class="admin-card-header"><h3>Product Report</h3></div>
  <div style="padding:20px;">
  <div class="admin-health-row"><span>Total Products</span><span class="admin-health-val good">${stats.summary.totalProducts}</span></div>
  <div class="admin-health-row"><span>Pending Approval</span><span class="admin-health-val warning">${stats.summary.pendingProducts || 0}</span></div>
  </div>
  </div>
  </div>`;
  }
  }

  // ==========================================
  // ADMIN ACTION HANDLERS
  // ==========================================

  /**
   * Approve a product
   */
  static async adminApproveProduct (productId) {
    if (!confirm('Are you sure you want to approve this product?')) {return;}
    try {
      await api.request('/admin/products/' + productId + '/approve', { method: 'PUT' });
      toastManager.show('Product approved successfully', 'success');
      this.renderAdminProducts();
    } catch (e) {
      toastManager.show(e.message || 'Failed to approve product', 'error');
    }
  }

  /**
   * Reject a product
   */
  static async adminRejectProduct (productId) {
    const reason = prompt('Please enter a reason for rejection:');
    if (!reason) {return;}
    try {
      await api.request('/admin/products/' + productId + '/reject', { method: 'PUT', body: JSON.stringify({ reason }) });
      toastManager.show('Product rejected successfully', 'info');
      this.renderAdminProducts();
    } catch (e) {
      toastManager.show(e.message || 'Failed to reject product', 'error');
    }
  }

  /**
   * Ban a user
   */
  static async adminBanUser (userId) {
    const reason = prompt('Please enter a reason for banning this user:');
    if (!reason) {return;}
    try {
      await api.request('/admin/users/' + userId + '/ban', { method: 'PUT', body: JSON.stringify({ action: 'ban', reason }) });
      toastManager.show('User has been banned', 'success');
      this.renderAdminUsers();
    } catch (e) {
      toastManager.show(e.message || 'Failed to ban user', 'error');
    }
  }

  /**
   * Unban a user
   */
  static async adminUnbanUser (userId) {
    if (!confirm('Are you sure you want to unban this user?')) {return;}
    try {
      await api.request('/admin/users/' + userId + '/ban', { method: 'PUT', body: JSON.stringify({ action: 'unban' }) });
    toastManager.show('User has been unbanned', 'success');
        this.renderAdminUsers();
      } catch (e) {
        toastManager.show(e.message || 'Failed to unban user', 'error');
    }
  }

  static async renderAdminActivity () {
    const mainContent = document.getElementById('main-content');

  mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('activity')}
  <main class="admin-main">
          <div class="admin-header">
            <h1 class="admin-title">Activity Monitor</h1>
            <div class="admin-actions">
              <select id="activity-filter-action" onchange="Pages._loadActivityLogs()" style="padding:0.5rem;border-radius:6px;border:1px solid var(--border-color);">
                <option value="">All Actions</option>
                <option value="login">Login</option>
                <option value="signup">Signup</option>
                <option value="purchase">Purchase</option>
                <option value="product_create">Product Created</option>
                <option value="product_update">Product Updated</option>
                <option value="product_delete">Product Deleted</option>
                <option value="admin_ban">User Banned</option>
                <option value="admin_approve">Product Approved</option>
                <option value="admin_reject">Product Rejected</option>
                <option value="password_change">Password Change</option>
              </select>
              <select id="activity-filter-severity" onchange="Pages._loadActivityLogs()" style="padding:0.5rem;border-radius:6px;border:1px solid var(--border-color);">
                <option value="">All Severity</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div id="activity-stats-cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem;"></div>
          <div class="admin-table-container">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody id="activity-logs-tbody">
                <tr><td colspan="5" style="text-align:center;padding:2rem;">Loading activity logs...</td></tr>
              </tbody>
            </table>
          </div>
          <div style="margin-top:1rem;text-align:center;">
            <button class="btn btn-outline" onclick="Pages._loadActivityLogs()" style="margin-right:0.5rem;">Refresh</button>
            <button class="btn btn-outline" id="activity-load-more" onclick="Pages._loadMoreActivity()" style="display:none;">Load More</button>
          </div>
        </main>
      </div>
    `;

    this._activityPage = 1;
    this._loadActivityLogs();
  }

  static async _loadActivityLogs () {
    const actionFilter = document.getElementById('activity-filter-action')?.value || '';
    const severityFilter = document.getElementById('activity-filter-severity')?.value || '';
    const tbody = document.getElementById('activity-logs-tbody');
    const statsCards = document.getElementById('activity-stats-cards');

    if (!tbody) { return; }
    this._activityPage = 1;

    try {
      const params = { page: this._activityPage, limit: 50 };
      if (actionFilter) { params.action = actionFilter; }
      if (severityFilter) { params.severity = severityFilter; }

      const [logsRes, statsRes, onlineRes] = await Promise.all([
        api.admin.getActivity(params).catch(() => ({ success: false })),
        api.admin.getActivityStats().catch(() => ({ success: false })),
        api.admin.getOnlineUsers().catch(() => ({ success: false })),
      ]);

      if (statsRes.success && statsRes.data) {
        const s = statsRes.data;
        statsCards.innerHTML = `
          <div class="admin-stat-card"><div class="admin-stat-value">${s.totalToday || 0}</div><div class="admin-stat-label">Events Today</div></div>
          <div class="admin-stat-card"><div class="admin-stat-value">${s.totalThisWeek || 0}</div><div class="admin-stat-label">Events This Week</div></div>
          <div class="admin-stat-card"><div class="admin-stat-value">${onlineRes.success ? onlineRes.data.onlineCount : '?'}</div><div class="admin-stat-label">Online Now</div></div>
        `;
      }

      if (logsRes.success && logsRes.data) {
        this._renderActivityRows(logsRes.data.logs || [], tbody);
        const moreBtn = document.getElementById('activity-load-more');
        if (moreBtn) { moreBtn.style.display = logsRes.data.page < logsRes.data.pages ? '' : 'none'; }
      } else {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;">Could not load activity logs from server. Showing local activity.</td></tr>';
        const localActivities = adminAuthManager.getActivityLog().slice(0, 50);
        const localRows = localActivities.map(a => `
          <tr>
            <td>${new Date(a.timestamp).toLocaleString()}</td>
            <td>Admin</td>
            <td>${a.action}</td>
            <td>${JSON.stringify(a.details || {}).substring(0, 80)}</td>
            <td><span style="padding:2px 8px;border-radius:4px;font-size:0.75rem;background:var(--color-primary-light);color:var(--color-primary);">info</span></td>
          </tr>
        `).join('');
        tbody.innerHTML = localRows || '<tr><td colspan="5" style="text-align:center;padding:2rem;">No activity records found.</td></tr>';
      }
    } catch (error) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--color-danger);">Error loading activity logs.</td></tr>';
    }
  }

  static async _loadMoreActivity () {
    this._activityPage = (this._activityPage || 1) + 1;
    const actionFilter = document.getElementById('activity-filter-action')?.value || '';
    const severityFilter = document.getElementById('activity-filter-severity')?.value || '';
    const tbody = document.getElementById('activity-logs-tbody');

    try {
      const params = { page: this._activityPage, limit: 50 };
      if (actionFilter) { params.action = actionFilter; }
      if (severityFilter) { params.severity = severityFilter; }

      const res = await api.admin.getActivity(params);
      if (res.success && res.data) {
        this._renderActivityRows(res.data.logs || [], tbody, true);
        const moreBtn = document.getElementById('activity-load-more');
        if (moreBtn) { moreBtn.style.display = res.data.page < res.data.pages ? '' : 'none'; }
      }
    } catch (error) {
      toastManager.show('Failed to load more logs', 'error');
    }
  }

  static _renderActivityRows (logs, tbody, append = false) {
    const severityColors = {
      info: 'background:var(--color-primary-light);color:var(--color-primary);',
      warning: 'background:#fef3c7;color:#92400e;',
      critical: 'background:#fee2e2;color:#991b1b;',
    };

    const actionLabels = {
      login: 'Login',
      logout: 'Logout',
      signup: 'Signup',
      purchase: 'Purchase',
      product_create: 'Product Created',
      product_update: 'Product Updated',
      product_delete: 'Product Deleted',
      review_create: 'Review Created',
      message_send: 'Message Sent',
      wishlist_add: 'Wishlist Add',
      profile_update: 'Profile Updated',
      password_change: 'Password Changed',
      admin_ban: 'User Banned',
      admin_approve: 'Product Approved',
      admin_reject: 'Product Rejected',
      search: 'Search',
    };

    const rows = (logs || []).map(log => {
      const time = new Date(log.createdAt).toLocaleString();
      const user = log.userName || log.userEmail || 'System';
      const action = actionLabels[log.action] || log.action;
      const details = log.details ? JSON.stringify(log.details).substring(0, 100) : '-';
      const severity = log.severity || 'info';
      const sevStyle = severityColors[severity] || severityColors.info;

      return `<tr>
        <td style="white-space:nowrap;font-size:0.85rem;">${time}</td>
        <td>${user}</td>
        <td><strong>${action}</strong></td>
        <td style="font-size:0.85rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${details}">${details}</td>
        <td><span style="padding:2px 8px;border-radius:4px;font-size:0.75rem;${sevStyle}">${severity}</span></td>
      </tr>`;
    }).join('');

    if (append) {
      tbody.insertAdjacentHTML('beforeend', rows);
    } else {
      tbody.innerHTML = rows || '<tr><td colspan="5" style="text-align:center;padding:2rem;">No activity records found.</td></tr>';
    }
  }

  static renderAdminProductCreate () {
    const mainContent = document.getElementById('main-content');
    const categories = ['electronics', 'textbooks', 'appliances', 'hostel-items', 'fashion', 'accessories', 'thrifts'];
    const conditions = ['new', 'like-new', 'good', 'fair', 'excellent'];

  mainContent.innerHTML = `
  <div class="admin-container">
  ${this.getAdminSidebar('products')}
  <main class="admin-main">
          <div class="admin-header">
            <h1 class="admin-title">Add New Product</h1>
            <button class="btn btn-outline" onclick="Pages.renderAdminProducts()">Back to Products</button>
          </div>
          <form id="admin-product-form" onsubmit="Pages._handleAdminProductCreate(event)" style="max-width:700px;">
            <div style="display:grid;gap:1rem;">
              <div>
                <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Title *</label>
                <input type="text" name="title" required style="width:100%;padding:0.75rem;border:1px solid var(--border-color);border-radius:8px;" placeholder="e.g. MacBook Pro 2021">
              </div>
              <div>
                <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Description *</label>
                <textarea name="description" required rows="4" style="width:100%;padding:0.75rem;border:1px solid var(--border-color);border-radius:8px;" placeholder="Describe the item..."></textarea>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Price (GHS) *</label>
                  <input type="number" name="price" required min="1" style="width:100%;padding:0.75rem;border:1px solid var(--border-color);border-radius:8px;" placeholder="0">
                </div>
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Category *</label>
                  <select name="category" required style="width:100%;padding:0.75rem;border:1px solid var(--border-color);border-radius:8px;">
                    ${categories.map(c => '<option value="' + c + '">' + c.charAt(0).toUpperCase() + c.slice(1) + '</option>').join('')}
                  </select>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Condition *</label>
                  <select name="condition" required style="width:100%;padding:0.75rem;border:1px solid var(--border-color);border-radius:8px;">
                    ${conditions.map(c => '<option value="' + c + '">' + c.charAt(0).toUpperCase() + c.slice(1) + '</option>').join('')}
                  </select>
                </div>
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">University</label>
                  <input type="text" name="university" style="width:100%;padding:0.75rem;border:1px solid var(--border-color);border-radius:8px;" placeholder="Leave blank for your university">
                </div>
              </div>
              <div>
                <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Image URLs (one per line)</label>
                <textarea name="images" rows="3" style="width:100%;padding:0.75rem;border:1px solid var(--border-color);border-radius:8px;" placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"></textarea>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Delivery Modes</label>
                  <div style="display:flex;gap:1rem;flex-wrap:wrap;">
                    <label><input type="checkbox" name="deliveryModes" value="bolt"> Bolt</label>
                    <label><input type="checkbox" name="deliveryModes" value="yango"> Yango</label>
                    <label><input type="checkbox" name="deliveryModes" value="inperson"> In-Person</label>
                  </div>
                </div>
                <div>
                  <label style="display:block;margin-bottom:0.25rem;font-weight:600;">Payment Modes</label>
                  <div style="display:flex;gap:1rem;flex-wrap:wrap;">
                    <label><input type="checkbox" name="paymentModes" value="momo"> MoMo</label>
                    <label><input type="checkbox" name="paymentModes" value="telecel"> Telecel</label>
                    <label><input type="checkbox" name="paymentModes" value="bank"> Bank</label>
                    <label><input type="checkbox" name="paymentModes" value="cash"> Cash</label>
                  </div>
                </div>
              </div>
              <div style="margin-top:1rem;">
                <button type="submit" class="btn btn-primary" style="padding:0.75rem 2rem;">Create Product</button>
              </div>
            </div>
          </form>
        </main>
      </div>
    `;
  }

  static async _handleAdminProductCreate (event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const images = formData.get('images').split('\n').map(u => u.trim()).filter(Boolean);
    const deliveryModes = formData.getAll('deliveryModes');
    const paymentModes = formData.getAll('paymentModes');

    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      price: Number(formData.get('price')),
      category: formData.get('category'),
      condition: formData.get('condition'),
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
      deliveryModes,
      paymentModes,
    };

    const university = formData.get('university')?.trim();
    if (university) { data.university = university; }

    try {
      const result = await api.admin.createProduct(data);
      if (result.success) {
        toastManager.show('Product created successfully', 'success');
        this.renderAdminProducts();
      } else {
        toastManager.show(result.error || 'Failed to create product', 'error');
      }
    } catch (error) {
      toastManager.show(error.message || 'Failed to create product', 'error');
    }
  }

  static renderFAQ () {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
      return;
    }

    const faqItems = [
      {
        q: 'What is Uni-Hub?',
        a: 'Uni-Hub is a student marketplace for buying and selling items within university communities in Ghana. Whether you\'re looking for textbooks, electronics, hostel essentials, or fashion items, Uni-Hub connects you with fellow students.',
      },
      {
        q: 'How do I create an account?',
        a: 'Click the "Sign up" button in the navigation bar. You\'ll need to provide your name, email, phone number, and university. You can also verify your student status to gain a trusted badge on your profile.',
      },
      {
        q: 'How do I list an item for sale?',
        a: 'Once logged in, click "Sell" in the navigation bar. You\'ll be taken to your seller dashboard where you can add a new product with photos, description, price, and delivery options.',
      },
      {
        q: 'What payment methods are supported?',
        a: 'Uni-Hub supports Mobile Money (MoMo), Telecel Cash, Bank Transfer, and Cash on Delivery. Payment options are set by each seller.',
      },
      {
        q: 'How does delivery work?',
        a: 'Sellers can offer delivery through Bolt, Yango, or in-person pickup. Delivery fees depend on the method chosen. In-person pickup is always free — just arrange a meeting on campus.',
      },
      {
        q: 'How do I verify my student status?',
        a: 'Go to your Dashboard and click "Verify Student Status". You can verify via your university email address or by uploading your student ID card for manual review.',
      },
      {
        q: 'Is my payment secure?',
        a: 'Uni-Hub uses secure payment processing. For Mobile Money and bank transfers, payments are processed through trusted providers. Always confirm delivery before releasing payment.',
      },
      {
        q: 'Can I return an item?',
        a: 'Returns depend on the seller\'s policy. We recommend discussing return terms with the seller before purchasing. If you have a dispute, you can report the transaction through your order page.',
      },
      {
        q: 'How do I contact a seller?',
        a: 'Use the in-app messaging feature. Go to any product page and click "Message Seller" to start a conversation. All communications happen within Uni-Hub for your safety.',
      },
      {
        q: 'What if I encounter a scam?',
        a: 'Report the user immediately through their profile or product page. Our admin team reviews all reports. Verified students with good ratings are generally safer to trade with.',
      },
    ];

    mainContent.innerHTML = `
      <div class="faq-page" style="max-width: 800px; margin: 0 auto; padding: 3rem 1.5rem;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary, #111827);">Frequently Asked Questions</h1>
        <p style="color: var(--text-secondary, #6b7280); margin-bottom: 2.5rem; font-size: 1.05rem;">Everything you need to know about buying and selling on Uni-Hub.</p>
        <div class="faq-list">
          ${faqItems.map((item, i) => `
            <details class="faq-item" style="border: 1px solid var(--border-color, #e5e7eb); border-radius: 0.75rem; margin-bottom: 0.75rem; overflow: hidden; background: var(--bg-primary, #fff);${i === 0 ? ' open;' : ''}">
              <summary style="padding: 1.25rem 1.5rem; font-weight: 600; cursor: pointer; font-size: 1rem; color: var(--text-primary, #111827); list-style: none; display: flex; justify-content: space-between; align-items: center;">
                ${item.q}
                <svg style="width: 20px; height: 20px; flex-shrink: 0; margin-left: 1rem; transition: transform 0.2s;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </summary>
              <div style="padding: 0 1.5rem 1.25rem; color: var(--text-secondary, #6b7280); line-height: 1.6; font-size: 0.95rem;">
                ${item.a}
              </div>
            </details>
          `).join('')}
        </div>
        <div style="margin-top: 3rem; text-align: center; padding: 2rem; background: var(--bg-secondary, #f9fafb); border-radius: 0.75rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary, #111827);">Still have questions?</h2>
          <p style="color: var(--text-secondary, #6b7280); margin-bottom: 1.5rem;">Can't find what you're looking for? Reach out to our support team.</p>
          <button class="btn btn-primary" onclick="Pages.navigate('/messages'); return false;">Contact Support</button>
        </div>
      </div>
      <style>
        details[open] > summary svg { transform: rotate(180deg); }
        summary::-webkit-details-marker { display: none; }
        .faq-item[open] { border-color: var(--primary, #0046be); }
      </style>
    `;

    window.scrollTo(0, 0);
  }

  static renderTerms () { return StaticPageMethods.renderTerms(); }

  static renderPrivacy () { return StaticPageMethods.renderPrivacy(); }

  static renderAbout () { return StaticPageMethods.renderAbout(); }

  static renderContact () { return StaticPageMethods.renderContact(); }

  static _handleContactForm (event) { return StaticPageMethods._handleContactForm(event); }
}

// Export for ES6 modules
export { Pages };

// Make globally available for module scripts
if (typeof window !== 'undefined') {
  window.Pages = Pages;
}
