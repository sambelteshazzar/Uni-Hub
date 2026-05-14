// Landing Page Methods

const LandingPageMethods = {
    hideOriginalNavFooter () {
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
  },

    showOriginalNavFooter () {
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
    Pages.updateNavbar();
  },

    async renderLanding () {
      // Hide original navbar and footer
      Pages.hideOriginalNavFooter();

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
            background-image: radial-gradient(circle at 15% 50%, rgba(0, 70, 190, 0.08), transparent 25%),
                              radial-gradient(circle at 85% 30%, rgba(0, 70, 190, 0.05), transparent 25%);
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
            border-color: rgba(0, 70, 190, 0.2);
          }
          .text-indigo { color: #0046be; }
          .bg-indigo { background-color: #0046be; }
          .gradient-indigo { background: linear-gradient(135deg, #0046be, #003399); }
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
            background: linear-gradient(135deg, #0046be, #a5a6a6);
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
            background: linear-gradient(135deg, #0046be, #003399);
            color: white;
            border: none;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 0 20px rgba(0,70,190,0.3);
          }
          .btn-modern-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 30px rgba(0,70,190,0.5);
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
            border-color: #0046be;
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
            color: #60a5fa;
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
            border-color: rgba(0,70,190,0.2);
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
            background: rgba(0,70,190,0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            font-weight: 700;
            color: #0046be;
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
            background: rgba(0,70,190,0.1);
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
            color: #0046be;
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
            border: 2px solid rgba(0,70,190,0.3);
            border-radius: 50%;
            border-top-color: #0046be;
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
          <div class="top-notification-bar" style="background: linear-gradient(90deg, rgba(0,70,190,0.2), rgba(0,51,153,0.2)); border-bottom: 1px solid rgba(0,70,190,0.3); padding: 0.75rem 1rem; text-align: center;">
            <div style="max-width: 80rem; margin: 0 auto; display: flex; align-items: center; justify-content: center; gap: 0.75rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #93c5fd;">
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
                <a href="#/register" onclick="return false;" style="color: #0046be; text-decoration: underline; text-underline-offset: 2px;">Sign up now</a>
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
<a href="#/browse" style="transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#a3a3a3'">Browse</a>
<a href="#/browse" style="transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#a3a3a3'">Universities</a>
<a href="#/sell" style="transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#a3a3a3'">Sell</a>
<a href="#/faq" style="transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#a3a3a3'">FAQ</a>
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
                    <div style="display: flex; align-items: center; gap: 0.25rem; color: #0046be;">
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
                      <span style="width: 0.5rem; height: 0.5rem; border-radius: 50%; background: #60a5fa;"></span>
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
                      <button onclick="document.querySelector('#universities').scrollIntoView({behavior: 'smooth'}); return false;" class="bg-indigo" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 4rem; height: 4rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px -5px rgba(0,70,190,0.4); transition: transform 0.3s;" onmouseover="this.style.transform='translate(-50%, -50%) scale(1.1)'" onmouseout="this.style.transform='translate(-50%, -50%)'">
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
                    <div style="width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background: rgba(0,70,190,0.1); display: flex; align-items: center; justify-content: center; color: #0046be;">
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
                    <span style="font-size: 0.875rem; font-weight: 600; color: #0046be;">GHS 2,100</span>
                  </div>
                  <div style="margin-top: 0.75rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 500; padding: 0.25rem 0.5rem; border-radius: 0.25rem; background: rgba(0,70,190,0.1); color: #93c5fd; width: fit-content;">
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
                <a href="#/browse" style="font-size: 0.875rem; color: #a3a3a3; transition: color 0.2s; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#a3a3a3'">
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
<div onclick="${uni.active !== false ? `Pages.selectUniversity('${uni.id}'); return false;` : `Pages.showUniversityComingSoon('${uni.name}'); return false;`}" class="university-card-modern" style="position:relative;${uni.active === false ? 'opacity:0.7;cursor:default;' : ''}">
<img src="https://images.unsplash.com/photo-${['1541339907198-e08756dedf3f', '1592280771190-3e2e4d571952', '1523050854058-8df90110c9f1', '1562774053-701939374585', '1509062522246-3755977927d7'][i]}?w=800&auto=format&fit=crop" alt="${uni.name}">
<div class="university-card-overlay"></div>
${uni.active === false ? '<div style="position:absolute;top:0.75rem;right:0.75rem;background:rgba(234,179,8,0.9);color:#000;font-size:0.7rem;font-weight:600;padding:0.25rem 0.5rem;border-radius:0.375rem;text-transform:uppercase;letter-spacing:0.05em;z-index:2;">Coming Soon</div>' : ''}
<div class="university-card-content">
<h3 class="university-card-name">${uni.name}</h3>
<p class="university-card-meta">${Icons.locationPin} ${uni.campus}${uni.active !== false ? ` • ${100 + i * 50}+ items` : ''}</p>
</div>
</div>
`,
)
.join('')}
              
                <div onclick="Pages.renderBrowse(); return false;" class="university-card-modern glass-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2rem; transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'">
                  <div style="width: 4rem; height: 4rem; border-radius: 50%; background: rgba(0,70,190,0.1); display: flex; align-items: center; justify-content: center; color: #0046be; margin-bottom: 1rem; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
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
                <button class="category-tab active" data-category="all" onclick="Pages.filterCategoryTab('all', this)" style="padding: 0.625rem 1.25rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; background: rgba(0,70,190,0.2); color: #93c5fd; border: 1px solid rgba(0,70,190,0.3); cursor: pointer; transition: all 0.2s;">All</button>
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
                    <div class="category-icon-wrapper" style="background: linear-gradient(135deg, ${cat.id === 'textbooks' ? 'rgba(59,130,246,0.4), rgba(0,70,190,0.4)' : cat.id === 'electronics' ? 'rgba(168,85,247,0.4), rgba(236,72,153,0.4)' : cat.id === 'hostel-items' ? 'rgba(16,185,129,0.4), rgba(20,184,166,0.4)' : 'rgba(249,115,22,0.4), rgba(239,68,68,0.4)'});">
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
                  <span style="color: #0046be; font-weight: 600;">Uni-Hub</span> is a global university marketplace app that connects students to easily buy and sell essential academic items. It provides a convenient platform where students can access school-related needs such as textbooks, electronics, accommodation listings, and other campus essentials, all within their university community and beyond.
                </p>

                <p style="color: #a3a3a3; font-size: 1.125rem; line-height: 1.8; padding: 1.5rem; background: rgba(0,70,190,0.05); border-left: 3px solid #0046be; border-radius: 0 0.5rem 0.5rem 0;">
                  <span style="color: white; font-weight: 600;">Our Mission:</span> At Uni-Hub, our mission is to make student essentials affordable and accessible, ensuring that every student can get what they need without financial stress.
                </p>
              </div>

              <!-- Key Stats -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin-top: 4rem; padding-top: 3rem; border-top: 1px solid rgba(255,255,255,0.05);">
                <div style="text-align: center;">
                  <div style="font-size: 2.5rem; font-weight: 700; color: #0046be; margin-bottom: 0.5rem;">7+</div>
                  <div style="color: #737373; font-size: 0.875rem;">Universities Connected</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 2.5rem; font-weight: 700; color: #0046be; margin-bottom: 0.5rem;">2,000+</div>
                  <div style="color: #737373; font-size: 0.875rem;">Verified Students</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 2.5rem; font-weight: 700; color: #0046be; margin-bottom: 0.5rem;">5,000+</div>
                  <div style="color: #737373; font-size: 0.875rem;">Items Listed</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 2.5rem; font-weight: 700; color: #0046be; margin-bottom: 0.5rem;">GHS 500K+</div>
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
                  <div class="feature-icon-wrapper" style="background: linear-gradient(135deg, rgba(0,70,190,0.4), rgba(59,130,246,0.4));">
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
                <button onclick="Pages.renderRegister(); return false;" style="height: 3.5rem; padding: 0 2rem; border-radius: 1rem; font-weight: 500; color: white; border: 1px solid #404040; background: transparent; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 0.5rem;" onmouseover="this.style.borderColor='#0046be'; this.style.background='rgba(30,30,30,0.8)'">
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
                  <div class="footer-brand-icon" style="background: rgba(0,70,190,0.2);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: #0046be;">
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
<li><a href="#/browse">Browse Items</a></li>
<li><a href="#/browse">Universities</a></li>
<li><a href="#/sell">Start Selling</a></li>
<li><a href="#/faq">FAQ</a></li>
                </ul>
              </div>
            
              <div>
                <h4 class="footer-column-title">Support</h4>
                <ul class="footer-links">
                  <li><a href="mailto:support@uni-hub.local">Contact Us</a></li>
<li><a href="#/faq">Help Center</a></li>
<li><a href="#/faq">Safety Tips</a></li>
<li><a href="#/about">Student Verification</a></li>
                </ul>
              </div>
            
              <div>
                <h4 class="footer-column-title">Legal</h4>
                <ul class="footer-links">
<li><a href="#/privacy">Privacy Policy</a></li>
<li><a href="#/terms">Terms of Service</a></li>
<li><a href="#/about">Community Guidelines</a></li>
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
    },

    selectUniversity (universityId) {
    StorageManager.set(STORAGE_KEYS.SELECTED_UNIVERSITY, universityId);
    Pages.renderStudentVerification();
  },

  showUniversityComingSoon (universityName) {
    if (typeof Toast !== 'undefined') {
      Toast.info(`${universityName} is coming soon! We're currently available at Accra Technical University (ATU).`);
    } else {
      alert(`${universityName} is coming soon! We're currently available at Accra Technical University (ATU).`);
    }
  },

    filterCategoryTab (category, button) {
    // Update tab buttons
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.style.background = 'transparent';
      tab.style.color = '#a3a3a3';
      tab.style.borderColor = 'rgba(63,63,70,1)';
    });

    // Update clicked button
    button.style.background = 'rgba(0,70,190,0.2)';
    button.style.color = '#93c5fd';
    button.style.borderColor = 'rgba(0,70,190,0.3)';

    // Navigate to browse with category filter
    if (category === 'all') {
      Pages.renderBrowse();
    } else {
      Pages.renderBrowse({ category: category });
    }
  },
};

window.LandingPageMethods = LandingPageMethods;
