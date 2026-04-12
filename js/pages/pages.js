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
    router.register('/browse', () => this.renderBrowseProducts());
    router.register('/cart', () => this.renderCart());
    router.register('/checkout', () => this.renderCheckout());
    router.register('/sell', () => this.renderSellerDashboard());
    router.register('/dashboard', () => this.renderDashboard());
    router.register('/profile', () => this.renderProfile());
    router.register('/orders', () => this.renderOrders());
    console.log('✓ Main routes registered');
    
    // Product detail
    router.register('/product/:id', (params) => this.renderProductDetail(params.id));
    
    // Admin
    router.register('/admin', () => this.renderAdminDashboard());
    router.register('/admin/products', () => this.renderAdminProducts());
    router.register('/admin/users', () => this.renderAdminUsers());
    router.register('/admin/orders', () => this.renderAdminOrders());
    router.register('/admin/reports', () => this.renderAdminReports());
    console.log('✓ All routes registered successfully');
  }

  /**
   * Hide original navbar and footer for landing page
   */
  static hideOriginalNavFooter () {
    const navbar = document.getElementById('navbar-container');
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
    const navbar = document.getElementById('navbar-container');
    const footer = document.getElementById('footer');
    if (navbar && navbar.getAttribute('data-hidden') === 'true') {
      navbar.style.display = 'block';
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
              🎉 New: <strong>Free delivery</strong> for first-time buyers at University of Ghana! &nbsp;&nbsp;|&nbsp;&nbsp; 
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
                    <p class="university-card-meta">📍 ${uni.campus} • ${100 + i * 50}+ items</p>
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
              <button class="category-tab" data-category="textbooks" onclick="Pages.filterCategoryTab('textbooks', this)" style="padding: 0.625rem 1.25rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; background: transparent; color: #a3a3a3; border: 1px solid rgba(63,63,70,1); cursor: pointer; transition: all 0.2s;">📚 Textbooks</button>
              <button class="category-tab" data-category="electronics" onclick="Pages.filterCategoryTab('electronics', this)" style="padding: 0.625rem 1.25rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; background: transparent; color: #a3a3a3; border: 1px solid rgba(63,63,70,1); cursor: pointer; transition: all 0.2s;">💻 Electronics</button>
              <button class="category-tab" data-category="hostel-items" onclick="Pages.filterCategoryTab('hostel-items', this)" style="padding: 0.625rem 1.25rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; background: transparent; color: #a3a3a3; border: 1px solid rgba(63,63,70,1); cursor: pointer; transition: all 0.2s;">🏠 Hostel</button>
              <button class="category-tab" data-category="fashion" onclick="Pages.filterCategoryTab('fashion', this)" style="padding: 0.625rem 1.25rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; background: transparent; color: #a3a3a3; border: 1px solid rgba(63,63,70,1); cursor: pointer; transition: all 0.2s;">👕 Fashion</button>
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
            <div class="verification-icon">🎓</div>
            <h2>Verify Your Student Status</h2>
            <p class="verification-subtitle">Confirm you're a student at <span class="verification-university-name">${universityName}</span></p>
          </div>

          <!-- Verification Method Tabs -->
          <div class="verification-tabs">
            <button class="verification-tab active" data-tab="email" onclick="Pages.switchVerificationTab('email')">
              <span class="tab-icon">📧</span>
              <span class="tab-label">University Email</span>
              <span class="tab-desc">For continuing students</span>
            </button>
            <button class="verification-tab" data-tab="document" onclick="Pages.switchVerificationTab('document')">
              <span class="tab-icon">📄</span>
              <span class="tab-label">Admission Documents</span>
              <span class="tab-desc">For new students</span>
            </button>
          </div>

          <!-- Email Verification Form -->
          <form id="verification-form-email" class="verification-form active" onsubmit="Pages.handleStudentVerification(event)">
            <div class="verification-info">
              <p><strong>🎓 For Continuing Students:</strong> Use your official university email address for instant verification.</p>
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
              <p><strong>📋 For New/Level 100 Students:</strong> Upload your admission letter or student ID for manual verification. This may take 24-48 hours.</p>
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
                <div class="upload-icon">📤</div>
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
          padding: 0.5rem;
          background: rgba(24, 24, 27, 1);
          border-radius: 0.5rem;
          border: 1px solid rgba(39, 39, 42, 1);
          margin-bottom: 0.75rem;
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
        }
        .auth-link:hover {
          color: #818cf8;
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
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #a1a1aa;">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
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
   */
  static closeAuthOverlay () {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) {
      overlay.style.animation = 'fadeIn 0.2s ease-out reverse';
      setTimeout(() => overlay.remove(), 200);
    }
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

    if (result.success) {
      // Close the auth overlay
      this.closeAuthOverlay();
      // Update navbar to show user menu
      this.updateNavbar();
      this.updateCartBadge();
      // Navigate to browse page
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
          padding: 0.5rem;
          background: rgba(24, 24, 27, 1);
          border-radius: 0.5rem;
          border: 1px solid rgba(39, 39, 42, 1);
          margin-bottom: 0.75rem;
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
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #a1a1aa;">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <line x1="19" x2="19" y1="8" y2="14"></line>
                <line x1="22" x2="16" y1="11" y2="11"></line>
              </svg>
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
      alert(result.message);
      this.renderBrowse();
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
    alert('Password reset link has been sent to your email!');
    this.renderLogin();
  }

  /**
   * Render Browse Products Page - Modern Professional Design
   */
  static async renderBrowse (filters = {}) {
    // Show original navbar and footer for non-landing pages
    this.showOriginalNavFooter();

    await productsManager.init();

    if (filters.category) {
      productsManager.filter({ category: filters.category });
    }

    const mainContent = document.getElementById('main-content');
    const selectedUniversity = StorageManager.get(STORAGE_KEYS.SELECTED_UNIVERSITY);
    productsManager.filter({ university: selectedUniversity });

    const paginatedData = productsManager.getPaginated(1);
    const totalProducts = paginatedData.total || paginatedData.products.length;

    mainContent.innerHTML =
      '<div class="bb-browse-page">' +
      '<!-- Breadcrumb -->' +
      '<div class="bb-breadcrumb-bar">' +
      '<div class="bb-breadcrumb-container">' +
      '<a href="#/" class="bb-breadcrumb-link" onclick="Pages.renderLanding(); return false;">Home</a>' +
      '<span class="bb-breadcrumb-separator">›</span>' +
      '<span class="bb-breadcrumb-current">Top Deals</span>' +
      '</div>' +
      '</div>' +
      '<!-- Header Banner -->' +
      '<div class="bb-browse-header">' +
      '<div class="bb-browse-header-inner">' +
      '<h1 class="bb-browse-title">Top Deals</h1>' +
      '<p class="bb-browse-subtitle">Save big on items from students at your university</p>' +
      '</div>' +
      '</div>' +
      '<!-- Toolbar -->' +
      '<div class="bb-browse-toolbar">' +
      '<div class="bb-browse-toolbar-inner">' +
      '<div class="bb-browse-search">' +
      '<input type="text" id="bb-search-input" class="bb-browse-search-input" placeholder="Search deals..." onkeyup="Pages.applyBrowseFilters()" />' +
      '<button class="bb-browse-search-btn" onclick="Pages.applyBrowseFilters()">🔍</button>' +
      '</div>' +
      '<div class="bb-browse-results">Showing <strong>' +
      totalProducts +
      '</strong> deals</div>' +
      '<div class="bb-browse-sort">' +
      '<span class="bb-browse-sort-label">Sort by:</span>' +
      '<select id="bb-sort-select" onchange="Pages.applySortOrder()">' +
      '<option value="newest">Best Selling</option>' +
      '<option value="price-low">Price: Low to High</option>' +
      '<option value="price-high">Price: High to Low</option>' +
      '<option value="rating">Customer Rating</option>' +
      '<option value="savings">Biggest Savings</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<!-- Layout: Sidebar + Grid -->' +
      '<div class="bb-browse-layout">' +
      '<!-- Filter Sidebar -->' +
      '<aside class="bb-browse-filters">' +
      '<!-- Category Filter -->' +
      '<div class="bb-filter-group">' +
      '<h3 class="bb-filter-title">Category</h3>' +
      '<div class="bb-filter-option"><input type="checkbox" id="bb-cat-all" checked onchange="Pages.applyBrowseFilters()" /><label for="bb-cat-all">All Categories</label></div>' +
      '<div class="bb-filter-option"><input type="checkbox" id="bb-cat-textbooks" value="textbooks" onchange="Pages.applyBrowseFilters()" /><label for="bb-cat-textbooks">Textbooks</label><span class="bb-filter-count">120</span></div>' +
      '<div class="bb-filter-option"><input type="checkbox" id="bb-cat-electronics" value="electronics" onchange="Pages.applyBrowseFilters()" /><label for="bb-cat-electronics">Electronics</label><span class="bb-filter-count">85</span></div>' +
      '<div class="bb-filter-option"><input type="checkbox" id="bb-cat-dorm" value="dorm" onchange="Pages.applyBrowseFilters()" /><label for="bb-cat-dorm">Dorm & Room</label><span class="bb-filter-count">95</span></div>' +
      '<div class="bb-filter-option"><input type="checkbox" id="bb-cat-furniture" value="furniture" onchange="Pages.applyBrowseFilters()" /><label for="bb-cat-furniture">Furniture</label><span class="bb-filter-count">45</span></div>' +
      '<div class="bb-filter-option"><input type="checkbox" id="bb-cat-clothing" value="clothing" onchange="Pages.applyBrowseFilters()" /><label for="bb-cat-clothing">Clothing</label><span class="bb-filter-count">60</span></div>' +
      '<div class="bb-filter-option"><input type="checkbox" id="bb-cat-sports" value="sports" onchange="Pages.applyBrowseFilters()" /><label for="bb-cat-sports">Sports</label><span class="bb-filter-count">35</span></div>' +
      '</div>' +
      '<!-- Condition Filter -->' +
      '<div class="bb-filter-group">' +
      '<h3 class="bb-filter-title">Condition</h3>' +
      '<div class="bb-filter-option"><input type="checkbox" id="bb-cond-new" value="new" onchange="Pages.applyBrowseFilters()" /><label for="bb-cond-new">New</label></div>' +
      '<div class="bb-filter-option"><input type="checkbox" id="bb-cond-excellent" value="excellent" onchange="Pages.applyBrowseFilters()" /><label for="bb-cond-excellent">Excellent</label></div>' +
      '<div class="bb-filter-option"><input type="checkbox" id="bb-cond-good" value="good" onchange="Pages.applyBrowseFilters()" /><label for="bb-cond-good">Good</label></div>' +
      '<div class="bb-filter-option"><input type="checkbox" id="bb-cond-fair" value="fair" onchange="Pages.applyBrowseFilters()" /><label for="bb-cond-fair">Fair</label></div>' +
      '</div>' +
      '<!-- Price Range -->' +
      '<div class="bb-filter-group">' +
      '<h3 class="bb-filter-title">Price</h3>' +
      '<div class="bb-price-range">' +
      '<input type="range" id="bb-price-range" class="bb-price-slider" min="0" max="5000" value="5000" oninput="document.getElementById(\'bb-price-val\').textContent=this.value; Pages.applyBrowseFilters()" />' +
      '<div class="bb-price-values"><span>GHS 0</span><span>Up to <strong>GHS <span id="bb-price-val">5000</span></strong></span></div>' +
      '</div>' +
      '</div>' +
      '<!-- Rating Filter -->' +
      '<div class="bb-filter-group">' +
      '<h3 class="bb-filter-title">Customer Rating</h3>' +
      '<div class="bb-filter-rating"><input type="radio" name="bb-rating" id="bb-rate-4" value="4" onchange="Pages.applyBrowseFilters()" /><span class="bb-filter-stars">★★★★☆</span><span class="bb-filter-rating-label">& up</span></div>' +
      '<div class="bb-filter-rating"><input type="radio" name="bb-rating" id="bb-rate-3" value="3" onchange="Pages.applyBrowseFilters()" /><span class="bb-filter-stars">★★★☆☆</span><span class="bb-filter-rating-label">& up</span></div>' +
      '<div class="bb-filter-rating"><input type="radio" name="bb-rating" id="bb-rate-all" value="" checked onchange="Pages.applyBrowseFilters()" /><span class="bb-filter-rating-label">All Ratings</span></div>' +
      '</div>' +
      '<button class="bb-clear-filters" onclick="Pages.resetBrowseFilters()">✕ Clear All Filters</button>' +
      '</aside>' +
      '<!-- Product Grid -->' +
      '<main class="bb-browse-main">' +
      '<div class="bb-browse-grid" id="bb-browse-grid">' +
      (paginatedData.products.length > 0
        ? paginatedData.products
          .map(function (product) {
            return Pages.renderBBProductCard(product);
          })
          .join('')
        : '<div class="bb-browse-empty"><div class="bb-browse-empty-icon">🔍</div><h3>No deals found</h3><p>Try adjusting your filters or search terms.</p></div>') +
      '</div>' +
      '<!-- Pagination -->' +
      (paginatedData.pages > 1
        ? '<div class="bb-browse-pagination">' +
          Array.from({ length: paginatedData.pages }, function (_, i) {
            return (
              '<button class="bb-page-btn ' +
              (i + 1 === paginatedData.currentPage ? 'active' : '') +
              '" onclick="Pages.goToBrowsePage(' +
              (i + 1) +
              ')">' +
              (i + 1) +
              '</button>'
            );
          }).join('') +
          '</div>'
        : '') +
      '</main>' +
      '</div>' +
      '</div>';
  }

  /**
   * Render Product Card - Modern Professional Design
   */
  static renderProductCard (product) {
    const isInWishlist = productsManager.isInWishlist(product.id);
    const initials = product.seller.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const conditionLabel = product.condition.charAt(0).toUpperCase() + product.condition.slice(1);
    const categoryLabel =
      product.category.charAt(0).toUpperCase() + product.category.slice(1).replace('-', ' ');

    return `
      <div class="store-product-card" onclick="Pages.renderProductDetail('${product.id}')">
        <!-- Image -->
        <div class="store-product-image">
          <img src="${product.images[0]}" alt="${product.title}" loading="lazy" />
          <span class="store-condition-badge ${product.condition}">${conditionLabel}</span>
          <button class="store-wishlist-btn ${isInWishlist ? 'active' : ''}"
                  onclick="Pages.toggleWishlist(event, '${product.id}')"
                  title="${isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}">
            ${isInWishlist ? '❤️' : '🤍'}
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
            </div>
            <div class="store-seller-rating">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              ${product.seller.rating || '4.5'}
            </div>
          </div>
        </div>

        <!-- Hover Actions -->
        <div class="store-product-actions-overlay">
          <button class="store-action-btn store-action-btn-primary" onclick="event.stopPropagation(); cartManager.add(${JSON.stringify(product).replace(/"/g, '&quot;')}); Pages.updateCartBadge();">🛒 Add to Cart</button>
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
    const initials = product.seller.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const conditionLabel = product.condition.charAt(0).toUpperCase() + product.condition.slice(1);
    const categoryLabel =
      product.category.charAt(0).toUpperCase() + product.category.slice(1).replace('-', ' ');
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
      (isInWishlist ? '❤️' : '🤍') +
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
      '<span class="bb-browse-rating-stars">★★★★☆</span>' +
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
      '); Pages.updateCartBadge();">🛒 Add to Cart</button>' +
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
    } else {
      productsManager.addToWishlist(productId);
    }

    // Re-render browse
    this.renderBrowse();
  }

  /**
   * Apply Browse Filters
   */
  static applyBrowseFilters () {
    const category = document.getElementById('category-filter').value;
    const searchQuery = document.getElementById('search-input').value;
    const priceMax = document.getElementById('price-range').value;
    document.getElementById('price-value').textContent = priceMax;

    const conditions = [];
    if (document.getElementById('fair-check').checked) {
      conditions.push('fair');
    }
    if (document.getElementById('good-check').checked) {
      conditions.push('good');
    }
    if (document.getElementById('excellent-check').checked) {
      conditions.push('excellent');
    }

    productsManager.filter({
      category: category || null,
      searchQuery: searchQuery,
      priceRange: { min: 0, max: parseInt(priceMax) },
    });

    // Re-apply condition filter if needed
    if (conditions.length > 0) {
      productsManager.filteredProducts = productsManager.filteredProducts.filter(p =>
        conditions.includes(p.condition),
      );
    }

    this.renderBrowseProducts();
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
    this.renderBrowseProducts();
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

    const mainContent = document.getElementById('main-content');
    const isInWishlist = productsManager.isInWishlist(productId);
    const initials = product.seller.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const conditionLabel = product.condition.charAt(0).toUpperCase() + product.condition.slice(1);
    const categoryLabel =
      product.category.charAt(0).toUpperCase() + product.category.slice(1).replace('-', ' ');

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
            <img src="${product.images[0]}" alt="${product.title}" class="pd-main-image" />
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

            <!-- Action Buttons -->
            <div class="pd-actions">
              <button class="pd-btn pd-btn-primary" onclick="cartManager.add(${JSON.stringify(product).replace(/"/g, '&quot;')}); Pages.updateCartBadge(); if(typeof toastManager!=='undefined') toastManager.success('Added to cart','Product added successfully');">
                🛒 Add to Cart
              </button>
              <div class="pd-secondary-actions">
                <button class="pd-btn pd-btn-outline ${isInWishlist ? 'active' : ''}" onclick="Pages.toggleWishlistDetail('${productId}')">
                  ${isInWishlist ? '❤️ Saved' : '🤍 Save'}
                </button>
                <button class="pd-btn pd-btn-outline" onclick="Pages.shareProduct('${productId}')">📤 Share</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Toggle Wishlist in Detail View
   */
  static toggleWishlistDetail (productId) {
    if (productsManager.isInWishlist(productId)) {
      productsManager.removeFromWishlist(productId);
      notificationManager.info('Removed from Wishlist', 'Product removed from your wishlist');
    } else {
      productsManager.addToWishlist(productId);
      notificationManager.success('Added to Wishlist', 'Product saved to your wishlist');
    }

    this.renderProductDetail(productId);
  }

  /**
   * Write Review for Product
   */
  static writeReview (productId) {
    const currentUser = StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);
    if (!currentUser) {
      alert('Please login to write a review');
      this.renderLogin();
      return;
    }

    const product = productsManager.getById(productId);
    const reviewText = prompt(`Write a review for "${product.title}":`);

    if (reviewText && reviewText.trim()) {
      notificationManager.success('Review Submitted', 'Thank you for your review!');
      // In production, this would save the review to the backend
    }
  }

  /**
   * Share Product
   */
  static shareProduct (productId) {
    const product = productsManager.getById(productId);
    const shareUrl = window.location.href.split('#')[0] + `#product/${productId}`;

    // Try to use Web Share API if available
    if (navigator.share) {
      navigator
        .share({
          title: product.title,
          text: `Check out this item on Uni-Hub: ${product.title}`,
          url: shareUrl,
        })
        .catch(error => {
          // eslint-disable-next-line no-console
          console.log('Share cancelled', error);
        });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          notificationManager.success('Link Copied', 'Product link copied to clipboard');
        })
        .catch(() => {
          prompt('Copy this link:', shareUrl);
        });
    }
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
            <div class="empty-cart-icon">🛒</div>
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
                  <img src="${item.product.images[0]}" alt="${item.product.title}" />
                </div>
                
                <div class="cart-item-details">
                  <h4 class="cart-item-title">${item.product.title}</h4>
                  <p class="cart-item-seller">Sold by ${item.product.seller.name}</p>
                  <div class="cart-item-price">${Formatter.formatPrice(item.product.price)}</div>
                </div>
                
                <div class="cart-item-quantity">
                  <button class="quantity-btn" onclick="Pages.decrementCartQuantity('${item.product.id}')">−</button>
                  <span class="quantity-display">${item.quantity}</span>
                  <button class="quantity-btn" onclick="Pages.incrementCartQuantity('${item.product.id}')">+</button>
                </div>
                
                <div class="cart-item-actions">
                  <div class="cart-item-total">${Formatter.formatPrice(item.product.price * item.quantity)}</div>
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
            
            <button class="btn btn-primary checkout-btn" onclick="Pages.renderCheckout()">
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
   * Render Checkout Page
   */
  static renderCheckout () {
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
    const currentUser = StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);
    if (!currentUser) {
      alert('Please login to complete your order.');
      this.renderLogin();
      return;
    }

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
                <h3>🚚 Delivery Method</h3>
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
                <h3>📍 Delivery Address</h3>
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
                <h3>💳 Payment Method</h3>
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
                      <div class="order-item-quantity">Qty: ${item.quantity}</div>
                      <div class="order-item-price">${Formatter.formatPrice(item.product.price * item.quantity)}</div>
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
          notificationManager.success(
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
        <div class="confirmation-icon">✅</div>
        
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
    const currentUser = StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);

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
            <div class="empty-cart-icon">📦</div>
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
                    <img src="${item.image}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: var(--radius-md);" />
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
                <button class="btn btn-outline btn-sm" onclick="Pages.viewOrderDetails('${order.id}')">
                  View Details
                </button>
              </div>
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
   * View order details
   */
  static viewOrderDetails (orderId) {
    const order = checkoutManager.getOrderById(orderId);
    if (order) {
      this.renderOrderConfirmation(order);
    }
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
   * Update navbar based on authentication state
   */
  static updateNavbar () {
    const authButtons = document.getElementById('navbar-auth-buttons');
    const userMenu = document.getElementById('navbar-user-menu');
    const currentUser = StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);

    if (currentUser && authButtons && userMenu) {
      authButtons.style.display = 'none';
      userMenu.style.display = 'flex';
      userMenu.style.gap = 'var(--space-sm)';
    } else if (authButtons && userMenu) {
      authButtons.style.display = 'flex';
      authButtons.style.gap = 'var(--space-sm)';
      userMenu.style.display = 'none';
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

    if (wishlistProducts.length === 0) {
      mainContent.innerHTML = `
        <div class="container" style="padding: 3rem 1rem; text-align: center;">
          <div class="empty-cart">
            <div class="empty-cart-icon">🤍</div>
            <h3>Your wishlist is empty</h3>
            <p>Save your favorite items to see them here.</p>
            <button class="btn btn-primary" onclick="Pages.renderBrowse()">Browse Products</button>
          </div>
        </div>
      `;
      return;
    }

    mainContent.innerHTML = `
      <div class="container" style="padding: 2rem 1rem;">
        <h1 style="margin-bottom: 1.5rem;">My Wishlist</h1>
        <div class="products-grid">
          ${wishlistProducts.map(product => this.renderProductCard(product)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render User Dashboard - Vertical Tabs Modern Design
   */
  static renderDashboard () {
    const currentUser = StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);

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
                    <div class="dv-order-icon">📦</div>
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
                    <div class="dv-empty-icon">📦</div>
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
                    <div class="dv-order-icon">📦</div>
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
                    <div class="dv-empty-icon">🛒</div>
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
                        <button class="store-wishlist-btn active" onclick="Pages.toggleWishlist(event, '${product.id}'); Pages.renderDashboard();">❤️</button>
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
                  <div class="dv-empty-icon">🤍</div>
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
                      <div class="dv-order-icon">🛒</div>
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
                  <button class="dv-btn dv-btn-primary" onclick="Pages.renderCheckout()">Proceed to Checkout →</button>
                </div>
              `
    : `
                <div class="dv-empty">
                  <div class="dv-empty-icon">🛒</div>
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
                  <button class="dv-btn dv-btn-outline" onclick="Pages.renderLogin(); Pages.handleLogout();">
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
    const currentUser = StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);

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
      notificationManager.success('Profile Updated', result.message);
    } else {
      notificationManager.error('Update Failed', result.error);
    }
  }

  /**
   * Handle Logout
   */
  static handleLogout () {
    authManager.logout();
    notificationManager.info('Logged Out', 'You have been logged out successfully.');
    this.renderLanding();
  }

  /**
   * Render Notifications Page
   */
  static renderNotifications () {
    const mainContent = document.getElementById('main-content');
    const notifications = notificationManager.getAll();

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
                    ${notificationManager.formatTime(n.createdAt)}
                  </div>
                </div>
                <button class="remove-btn" onclick="notificationManager.delete('${n.id}'); Pages.renderNotifications();">×</button>
              </div>
            `,
    )
    .join('')}
          </div>
        `
    : `
          <div class="empty-cart">
            <div class="empty-cart-icon">🔔</div>
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
    const currentUser = StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);

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
            <div class="seller-brand-icon">🏪</div>
            <div class="seller-brand-name">Seller Hub</div>
          </div>
          <ul class="seller-nav">
            <li class="seller-nav-item">
              <a href="#" class="seller-nav-link active">
                <span class="seller-nav-icon">📊</span>
                <span>Dashboard</span>
              </a>
            </li>
            <li class="seller-nav-item">
              <a href="#" class="seller-nav-link" onclick="Pages.renderAddProduct()">
                <span class="seller-nav-icon">➕</span>
                <span>Add Product</span>
              </a>
            </li>
            <li class="seller-nav-item">
              <a href="#" class="seller-nav-link" onclick="Pages.renderManageProducts()">
                <span class="seller-nav-icon">📦</span>
                <span>Manage Products</span>
              </a>
            </li>
            <li class="seller-nav-item">
              <a href="#" class="seller-nav-link" onclick="Pages.renderSellerOrders()">
                <span class="seller-nav-icon">📋</span>
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
                <div class="seller-stat-icon">📦</div>
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
    const currentUser = StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);

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
            <div class="image-upload">
              <div class="image-upload-icon">📷</div>
              <div class="image-upload-text">Click to upload images</div>
              <div class="image-upload-hint">Supports: JPG, PNG (Max 5MB)</div>
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
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" onclick="Pages.renderSellerDashboard()">Cancel</button>
            <button type="submit" class="btn btn-primary">Add Product</button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Handle Add Product
   */
  static handleAddProduct (event) {
    event.preventDefault();
    const form = event.target;

    const productData = {
      title: form.title.value,
      description: form.description.value,
      category: form.category.value,
      condition: form.condition.value,
      price: form.price.value,
      deliveryModes: ['bolt', 'yango', 'inperson'],
      paymentModes: ['momo', 'telecel', 'cash'],
    };

    const result = productsManager.addProduct(productData);

    if (result.success) {
      notificationManager.success('Product Listed', result.message);
      Pages.renderManageProducts();
    } else {
      notificationManager.error('Error', result.error);
    }
  }

  /**
   * Render Manage Products Page
   */
  static renderManageProducts () {
    const currentUser = StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);
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
                  <img src="${product.images[0]}" alt="${product.title}" />
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
            <div class="empty-cart-icon">📦</div>
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
          <div class="empty-cart-icon">📋</div>
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
            <div class="confirmation-icon">🚚</div>
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
            <div class="empty-cart-icon">📦</div>
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
        <div class="confirmation-icon">✅</div>
        <h1>Payment Successful!</h1>
        <p style="color: var(--neutral-600); margin-bottom: 2rem;">Your payment has been processed successfully.</p>
        <button class="btn btn-primary" onclick="Pages.renderBrowse()">Continue Shopping</button>
      </div>
    `;
  }

  /**
   * Render Admin Dashboard
   */
  static renderAdminDashboard () {
    const adminUser = adminAuthManager.getCurrentUser();

    if (!adminAuthManager.isLoggedIn()) {
      this.renderAdminLogin();
      return;
    }

    const mainContent = document.getElementById('main-content');
    const stats = adminReportsManager.getDashboardOverview();

    mainContent.innerHTML = `
      <div class="admin-container">
        <aside class="admin-sidebar">
          <div class="admin-brand">
            <div class="admin-brand-icon">⚙️</div>
            <div class="admin-brand-name">Admin Panel</div>
          </div>
          <nav class="admin-nav-section">
            <div class="admin-nav-title">Main</div>
            <ul class="admin-menu">
              <li class="admin-menu-item">
                <a href="#" class="admin-menu-link active">
                  <span class="admin-menu-icon">📊</span>
                  <span>Dashboard</span>
                </a>
              </li>
              <li class="admin-menu-item">
                <a href="#" class="admin-menu-link" onclick="Pages.renderAdminUsers()">
                  <span class="admin-menu-icon">👥</span>
                  <span>Users</span>
                </a>
              </li>
              <li class="admin-menu-item">
                <a href="#" class="admin-menu-link" onclick="Pages.renderAdminProducts()">
                  <span class="admin-menu-icon">📦</span>
                  <span>Products</span>
                </a>
              </li>
              <li class="admin-menu-item">
                <a href="#" class="admin-menu-link" onclick="Pages.renderAdminOrders()">
                  <span class="admin-menu-icon">📋</span>
                  <span>Orders</span>
                </a>
              </li>
              <li class="admin-menu-item">
                <a href="#" class="admin-menu-link" onclick="Pages.renderAdminReports()">
                  <span class="admin-menu-icon">📈</span>
                  <span>Reports</span>
                </a>
              </li>
            </ul>
          </nav>
        </aside>
        <main class="admin-main">
          <div class="admin-header">
            <h1 class="admin-title">Dashboard Overview</h1>
            <div class="admin-actions">
              <button class="btn btn-outline" onclick="adminAuthManager.logout(); Pages.renderLanding();">Logout</button>
            </div>
          </div>
          <div class="admin-stats">
            <div class="admin-stat-card">
              <div class="admin-stat-header">
                <div class="admin-stat-icon primary">👥</div>
              </div>
              <div class="admin-stat-value">${stats.summary.totalUsers}</div>
              <div class="admin-stat-label">Total Users</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-header">
                <div class="admin-stat-icon success">📦</div>
              </div>
              <div class="admin-stat-value">${stats.summary.totalProducts}</div>
              <div class="admin-stat-label">Total Products</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-header">
                <div class="admin-stat-icon warning">📋</div>
              </div>
              <div class="admin-stat-value">${stats.summary.totalOrders}</div>
              <div class="admin-stat-label">Total Orders</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-header">
                <div class="admin-stat-icon danger">💰</div>
              </div>
              <div class="admin-stat-value">${Formatter.formatPrice(stats.summary.totalRevenue)}</div>
              <div class="admin-stat-label">Total Revenue</div>
            </div>
          </div>
        </main>
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
      notificationManager.success('Login Successful', 'Welcome to Admin Panel');
      Pages.renderAdminDashboard();
    } else {
      notificationManager.error('Login Failed', result.error);
    }
  }

  /**
   * Render Admin Users Page
   */
  static renderAdminUsers () {
    const users = adminUsersManager.getAllUsers();
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
      <div class="admin-container">
        <aside class="admin-sidebar">
          <div class="admin-brand">
            <div class="admin-brand-icon">⚙️</div>
            <div class="admin-brand-name">Admin Panel</div>
          </div>
          <nav class="admin-nav-section">
            <ul class="admin-menu">
              <li class="admin-menu-item">
                <a href="#" class="admin-menu-link" onclick="Pages.renderAdminDashboard()">
                  <span class="admin-menu-icon">📊</span>
                  <span>Dashboard</span>
                </a>
              </li>
              <li class="admin-menu-item">
                <a href="#" class="admin-menu-link active">
                  <span class="admin-menu-icon">👥</span>
                  <span>Users</span>
                </a>
              </li>
            </ul>
          </nav>
        </aside>
        <main class="admin-main">
          <div class="admin-header">
            <h1 class="admin-title">User Management</h1>
          </div>
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
                ${users
    .map(
      user => `
                  <tr>
                    <td>
                      <div class="user-cell">
                        <div class="user-info">
                          <div class="user-name">${user.fullName}</div>
                        </div>
                      </div>
                    </td>
                    <td>${user.email}</td>
                    <td>${user.university}</td>
                    <td><span class="role-badge ${user.role}">${user.role}</span></td>
                    <td>
                      <span class="status-badge ${user.isVerified ? 'delivered' : 'placed'}">
                        ${user.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div class="table-actions">
                        <button class="table-action-btn edit" title="Edit">✏️</button>
                        <button class="table-action-btn delete" title="Delete">🗑️</button>
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
   * Render Admin Products Page
   */
  static renderAdminProducts () {
    const products = adminProductsManager.getAllProducts();
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
      <div class="admin-container">
        <aside class="admin-sidebar">
          <div class="admin-brand">
            <div class="admin-brand-icon">⚙️</div>
            <div class="admin-brand-name">Admin Panel</div>
          </div>
          <nav class="admin-nav-section">
            <ul class="admin-menu">
              <li class="admin-menu-item">
                <a href="#" class="admin-menu-link" onclick="Pages.renderAdminDashboard()">
                  <span class="admin-menu-icon">📊</span>
                  <span>Dashboard</span>
                </a>
              </li>
              <li class="admin-menu-item">
                <a href="#" class="admin-menu-link active">
                  <span class="admin-menu-icon">📦</span>
                  <span>Products</span>
                </a>
              </li>
            </ul>
          </nav>
        </aside>
        <main class="admin-main">
          <div class="admin-header">
            <h1 class="admin-title">Product Management</h1>
          </div>
          <div class="admin-table-container">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Condition</th>
                  <th>Seller</th>
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
                        <img src="${product.images[0]}" alt="${product.title}" class="product-image-small" />
                        <span>${product.title}</span>
                      </div>
                    </td>
                    <td>${Formatter.capitalize(product.category)}</td>
                    <td>${Formatter.formatPrice(product.price)}</td>
                    <td><span class="condition-badge ${product.condition}">${Formatter.capitalize(product.condition)}</span></td>
                    <td>${product.seller.name}</td>
                    <td>
                      <div class="table-actions">
                        <button class="table-action-btn view" title="View">👁️</button>
                        <button class="table-action-btn delete" title="Delete">🗑️</button>
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
  static renderAdminOrders () {
    const orders = adminOrdersManager.getAllOrders();
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
      <div class="admin-container">
        <aside class="admin-sidebar">
          <div class="admin-brand">
            <div class="admin-brand-icon">⚙️</div>
            <div class="admin-brand-name">Admin Panel</div>
          </div>
          <nav class="admin-nav-section">
            <ul class="admin-menu">
              <li class="admin-menu-item">
                <a href="#" class="admin-menu-link" onclick="Pages.renderAdminDashboard()">
                  <span class="admin-menu-icon">📊</span>
                  <span>Dashboard</span>
                </a>
              </li>
              <li class="admin-menu-item">
                <a href="#" class="admin-menu-link active">
                  <span class="admin-menu-icon">📋</span>
                  <span>Orders</span>
                </a>
              </li>
            </ul>
          </nav>
        </aside>
        <main class="admin-main">
          <div class="admin-header">
            <h1 class="admin-title">Order Management</h1>
          </div>
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
                ${orders
    .map(
      order => `
                  <tr>
                    <td>${order.orderNumber}</td>
                    <td>${order.customer.name}</td>
                    <td>${Formatter.formatPrice(order.pricing.grandTotal)}</td>
                    <td>${Formatter.capitalize(order.payment.mode)}</td>
                    <td><span class="status-badge ${order.status}">${Formatter.capitalize(order.status)}</span></td>
                    <td>${Formatter.formatDate(order.createdAt)}</td>
                    <td>
                      <div class="table-actions">
                        <button class="table-action-btn view" title="View">👁️</button>
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
   * Render Admin Regions Page
   */
  static renderAdminRegions () {
    const regions = regionManager.getAllRegions();
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
      <div class="admin-container">
        <aside class="admin-sidebar">
          <div class="admin-brand">
            <div class="admin-brand-icon">⚙️</div>
            <div class="admin-brand-name">Admin Panel</div>
          </div>
          <nav class="admin-nav-section">
            <ul class="admin-menu">
              <li class="admin-menu-item">
                <a href="#" class="admin-menu-link" onclick="Pages.renderAdminDashboard()">
                  <span class="admin-menu-icon">📊</span>
                  <span>Dashboard</span>
                </a>
              </li>
              <li class="admin-menu-item">
                <a href="#" class="admin-menu-link active">
                  <span class="admin-menu-icon">🌍</span>
                  <span>Regions</span>
                </a>
              </li>
            </ul>
          </nav>
        </aside>
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
                        <button class="table-action-btn edit" title="Edit">✏️</button>
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
  static renderAdminReports () {
    const stats = adminReportsManager.getDashboardOverview();
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
      <div class="admin-container">
        <aside class="admin-sidebar">
          <div class="admin-brand">
            <div class="admin-brand-icon">⚙️</div>
            <div class="admin-brand-name">Admin Panel</div>
          </div>
          <nav class="admin-nav-section">
            <ul class="admin-menu">
              <li class="admin-menu-item">
                <a href="#" class="admin-menu-link" onclick="Pages.renderAdminDashboard()">
                  <span class="admin-menu-icon">📊</span>
                  <span>Dashboard</span>
                </a>
              </li>
              <li class="admin-menu-item">
                <a href="#" class="admin-menu-link active">
                  <span class="admin-menu-icon">📈</span>
                  <span>Reports</span>
                </a>
              </li>
            </ul>
          </nav>
        </aside>
        <main class="admin-main">
          <div class="admin-header">
            <h1 class="admin-title">Analytics & Reports</h1>
          </div>
          <div class="reports-grid">
            <div class="report-card">
              <div class="report-card-header">
                <h3 class="report-card-title">Sales Report</h3>
              </div>
              <div class="report-card-body">
                <div class="report-chart">
                  📊 Sales Chart Placeholder
                </div>
                <div style="margin-top: 1rem;">
                  <div class="detail-row">
                    <span>Total Revenue</span>
                    <span>${Formatter.formatPrice(stats.summary.totalRevenue)}</span>
                  </div>
                  <div class="detail-row">
                    <span>Total Orders</span>
                    <span>${stats.summary.totalOrders}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="report-card">
              <div class="report-card-header">
                <h3 class="report-card-title">User Report</h3>
              </div>
              <div class="report-card-body">
                <div class="report-chart">
                  👥 User Chart Placeholder
                </div>
                <div style="margin-top: 1rem;">
                  <div class="detail-row">
                    <span>Total Users</span>
                    <span>${stats.summary.totalUsers}</span>
                  </div>
                  <div class="detail-row">
                    <span>New This Month</span>
                    <span>${stats.thisMonth.newUsers || 0}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="report-card">
              <div class="report-card-header">
                <h3 class="report-card-title">Product Report</h3>
              </div>
              <div class="report-card-body">
                <div class="report-chart">
                  📦 Product Chart Placeholder
                </div>
                <div style="margin-top: 1rem;">
                  <div class="detail-row">
                    <span>Total Products</span>
                    <span>${stats.summary.totalProducts}</span>
                  </div>
                  <div class="detail-row">
                    <span>Avg Price</span>
                    <span>${Formatter.formatPrice(stats.summary.totalRevenue / stats.summary.totalProducts || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;
  }
}
