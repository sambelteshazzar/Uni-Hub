/**
 * LandingPage - Landing page with university selection
 * Modern dark theme design
 */
import { BasePage } from './BasePage.js';

export class LandingPage extends BasePage {
  /**
   * Render the landing page
   */
  async render() {
    this.hideOriginalNavFooter();

    const mainContent = this.getMainContent();
    let config = { universities: [], categories: [] };

    try {
      const api = (window as any).api;
      config = await api.loadJSON('data/config.json');
    } catch (error) {
      console.error('Error loading config:', error);
    }

    const selectedUniversity = (window as any).StorageManager.get(
      (window as any).STORAGE_KEYS.SELECTED_UNIVERSITY
    );

    mainContent.innerHTML = this.getStyles() + this.getTemplate(config, selectedUniversity);
    this.attachEventListeners();
  }

  /**
   * Get inline styles for the landing page
   */
  private getStyles(): string {
    return `
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
  }

  /**
   * Get the HTML template
   */
  private getTemplate(config: any, selectedUniversity: string | null): string {
    const Pages = (window as any).Pages;

    return `
      <div class="modern-landing">
        <!-- Top Notification Bar -->
        <div class="top-notification-bar" style="background: linear-gradient(90deg, rgba(99,102,241,0.2), rgba(79,70,229,0.2)); border-bottom: 1px solid rgba(99,102,241,0.3); padding: 0.75rem 1rem; text-align: center;">
          <div style="max-width: 80rem; margin: 0 auto; display: flex; align-items: center; justify-content: center; gap: 0.75rem;">
            <span style="color: #e0e7ff; font-size: 0.875rem; font-weight: 500;">
              🎉 New: <strong>Free delivery</strong> for first-time buyers! &nbsp;&nbsp;|&nbsp;&nbsp;
              <a href="#" onclick="${Pages ? 'Pages.renderRegister()' : ''}; return false;" style="color: #6366f1; text-decoration: underline; text-underline-offset: 2px;">Sign up now</a>
            </span>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="modern-nav">
          <div class="modern-nav-inner glass-card" style="border-radius: 9999px;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div class="bg-indigo" style="padding: 0.375rem; border-radius: 0.5rem;">
                <span style="font-size: 1.25rem;">🎓</span>
              </div>
              <span style="font-weight: 500; font-size: 1.125rem; color: white; letter-spacing: -0.02em;">Uni-Hub</span>
            </div>

            <div style="display: none; md: display: flex; align-items: center; gap: 2rem; font-size: 0.875rem; font-weight: 500; color: #a3a3a3;">
              <a href="#browse" style="transition: color 0.2s;">Browse</a>
              <a href="#universities" style="transition: color 0.2s;">Universities</a>
              <a href="#sell" style="transition: color 0.2s;">Sell</a>
              <a href="#faq" style="transition: color 0.2s;">FAQ</a>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem;">
              <button onclick="${Pages ? 'Pages.renderLogin()' : ''}" style="font-size: 0.875rem; font-weight: 500; color: #a3a3a3; background: none; border: none; cursor: pointer; transition: color 0.2s;">Log in</button>
              <button onclick="${Pages ? 'Pages.renderRegister()' : ''}" class="bg-indigo" style="padding: 0.625rem 1.25rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; color: black; border: none; cursor: pointer;">
                Sign Up
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
                  Browse Items
                </button>
                <button onclick="${Pages ? 'Pages.renderRegister()' : ''}" class="btn-modern-secondary">
                  Start Selling
                </button>
              </div>
            </div>

            <div class="hero-visual-col hero-visual">
              <div class="hero-visual" style="position: relative; height: 600px; display: block;">
                <div style="display: grid; grid-template-columns: repeat(12, 1fr); grid-template-rows: repeat(6, 1fr); gap: 1rem; height: 100%;">
                  <div style="grid-column: span 5; grid-row: span 6; border-radius: 2.5rem; overflow: hidden; position: relative;">
                    <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop" alt="Electronics" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s;">
                    <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);"></div>
                    <div style="position: absolute; bottom: 1.5rem; left: 1.5rem; color: white;">
                      <p style="font-size: 0.75rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Electronics</p>
                      <h3 style="font-size: 1.25rem; font-weight: 500;">Laptops & Phones</h3>
                    </div>
                  </div>
                  <div style="grid-column: span 7; grid-row: span 3; border-radius: 2.5rem; overflow: hidden; position: relative;">
                    <img src="https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop" alt="Textbooks" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s;">
                  </div>
                  <div style="grid-column: span 4; grid-row: span 3; border-radius: 2.5rem; overflow: hidden; position: relative;">
                    <img src="https://images.unsplash.com/photo-1555041761-63a74ad3efde?w=600&auto=format&fit=crop" alt="Hostel" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s;">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Universities Section -->
        <section id="universities" class="universities-section">
          <div style="max-width: 80rem; margin: 0 auto;">
            <div class="section-header">
              <span class="section-label">Select Your Campus</span>
              <h2 class="section-title" style="color: white;">Browse by University</h2>
            </div>

            <div class="universities-grid">
              ${config.universities.slice(0, 5).map((uni: any, i: number) => `
                <div onclick="${Pages ? `Pages.selectUniversity('${uni.id}')` : ''}; return false;" class="university-card-modern">
                  <img src="https://images.unsplash.com/photo-${['1541339907198-e08756dedf3f', '1592280771952', '1523050854058', '1562774053', '1509062522246'][i]}?w=800&auto=format&fit=crop" alt="${uni.name}">
                  <div class="university-card-overlay"></div>
                  <div class="university-card-content">
                    <h3 class="university-card-name">${uni.name}</h3>
                    <p class="university-card-meta">📍 ${uni.campus} • ${100 + i * 50}+ items</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </section>

        <!-- Categories Section -->
        <section id="browse" class="categories-section">
          <div style="max-width: 80rem; margin: 0 auto; text-align: center;">
            <span class="section-label">Shop by Category</span>
            <h2 class="section-title" style="color: white; margin-bottom: 1rem;">Find What You Need</h2>

            <div class="categories-grid">
              ${config.categories.slice(0, 4).map((cat: any) => `
                <div onclick="${Pages ? `Pages.renderBrowse({category: '${cat.id}'})` : ''}" class="category-card-modern glass-card glass-card-hover">
                  <div class="category-icon-wrapper" style="background: linear-gradient(135deg, rgba(99,102,241,0.4), rgba(59,130,246,0.4));">
                    ${cat.icon}
                  </div>
                  <h3 class="category-name">${cat.name}</h3>
                  <p class="category-description">${cat.description}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </section>

        <!-- Features Section -->
        <section class="features-section">
          <div style="max-width: 80rem; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 4rem;">
              <h2 class="section-title" style="color: white; margin-bottom: 1rem;">Why Choose Uni-Hub?</h2>
              <p style="color: #737373; max-width: 32rem; margin: 0 auto; font-weight: 300;">Built by students, for students.</p>
            </div>

            <div class="features-grid">
              <div class="feature-card-modern glass-card glass-card-hover">
                <div class="feature-icon-wrapper" style="background: linear-gradient(135deg, rgba(99,102,241,0.4), rgba(59,130,246,0.4));">
                  <span style="font-size: 1.5rem;">🛡️</span>
                </div>
                <h3 class="feature-title">Verified Students Only</h3>
                <p class="feature-description">Every user is verified with their university email or student ID. Trade safely within your campus community.</p>
              </div>

              <div class="feature-card-modern glass-card glass-card-hover">
                <div class="feature-icon-wrapper" style="background: linear-gradient(135deg, rgba(16,185,129,0.4), rgba(20,184,166,0.4));">
                  <span style="font-size: 1.5rem;">🚚</span>
                </div>
                <h3 class="feature-title">Fast Campus Delivery</h3>
                <p class="feature-description">Choose from Bolt, Yango, or meet in person. Get your items delivered within hours, not days.</p>
              </div>

              <div class="feature-card-modern glass-card glass-card-hover">
                <div class="feature-icon-wrapper" style="background: linear-gradient(135deg, rgba(249,115,22,0.4), rgba(239,68,68,0.4));">
                  <span style="font-size: 1.5rem;">💳</span>
                </div>
                <h3 class="feature-title">Multiple Payment Options</h3>
                <p class="feature-description">Pay with MoMo, Telecel Cash, or cash on delivery. Flexible payment methods for every student.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- How It Works -->
        <section class="how-it-works-section">
          <div style="max-width: 80rem; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 3rem;">
              <h2 class="section-title" style="color: white;">How It Works</h2>
            </div>

            <div class="steps-grid">
              <div class="step-item">
                <div class="step-number">1</div>
                <h3 class="step-title">Create Account</h3>
                <p class="step-description">Sign up with your university email or student ID for verification.</p>
              </div>
              <div class="step-item">
                <div class="step-number">2</div>
                <h3 class="step-title">Browse or List</h3>
                <p class="step-description">Browse items from students at your university or list your own items.</p>
              </div>
              <div class="step-item">
                <div class="step-number">3</div>
                <h3 class="step-title">Connect & Trade</h3>
                <p class="step-description">Chat with buyers/sellers and arrange delivery or pickup.</p>
              </div>
              <div class="step-item">
                <div class="step-number">4</div>
                <h3 class="step-title">Rate & Review</h3>
                <p class="step-description">After the transaction, rate your experience to build trust.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- CTA Section -->
        <section class="cta-section">
          <div class="cta-glow"></div>
          <div class="cta-content">
            <h2 class="cta-title" style="color: white;">Ready to Start Trading?</h2>
            <p class="cta-description">Join thousands of students already using Uni-Hub to buy and sell items on campus.</p>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
              <button onclick="${Pages ? 'Pages.renderRegister()' : ''}" class="btn-modern-primary">
                Create Free Account
              </button>
              <button onclick="${Pages ? 'Pages.renderBrowse()' : ''}" class="btn-modern-secondary">
                Browse Items
              </button>
            </div>
          </div>
        </section>

        <!-- Footer -->
        <footer class="modern-footer">
          <div class="footer-grid">
            <div>
              <div class="footer-brand">
                <div class="footer-brand-icon" style="background: #6366f1; color: white; display: flex; align-items: center; justify-content: center;">
                  <span>🎓</span>
                </div>
                <span class="footer-brand-name">Uni-Hub</span>
              </div>
              <p class="footer-description">Connecting students to buy and sell items within their university community.</p>
            </div>
            <div>
              <h4 style="font-size: 0.875rem; font-weight: 500; color: white; margin-bottom: 1.5rem;">Quick Links</h4>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 1rem;"><a href="#browse" style="color: #737373; text-decoration: none; font-size: 0.875rem;">Browse Products</a></li>
                <li style="margin-bottom: 1rem;"><a href="#sell" style="color: #737373; text-decoration: none; font-size: 0.875rem;">Start Selling</a></li>
                <li style="margin-bottom: 1rem;"><a href="#faq" style="color: #737373; text-decoration: none; font-size: 0.875rem;">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 style="font-size: 0.875rem; font-weight: 500; color: white; margin-bottom: 1.5rem;">Support</h4>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 1rem;"><span style="color: #737373; font-size: 0.875rem;">Email: support@uni-hub.local</span></li>
                <li style="margin-bottom: 1rem;"><span style="color: #737373; font-size: 0.875rem;">Phone: +233 50 123 4567</span></li>
              </ul>
            </div>
          </div>
          <div class="footer-bottom">
            <p class="footer-copyright">&copy; 2026 Uni-Hub. All rights reserved.</p>
            <div class="footer-status">
              <span class="status-dot" style="width: 0.375rem; height: 0.375rem; border-radius: 50%; background: #22c55e; display: inline-block;"></span>
              <span style="font-size: 0.75rem; font-weight: 500; color: #525252;">All systems operational</span>
            </div>
          </div>
        </footer>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Event listeners are mostly inline in the template
    // Additional listeners can be added here
  }

  /**
   * Select university and navigate to browse
   * @param {string} universityId
   */
  selectUniversity(universityId: string): void {
    const StorageManager = (window as any).StorageManager;
    const STORAGE_KEYS = (window as any).STORAGE_KEYS;

    StorageManager.set(STORAGE_KEYS.SELECTED_UNIVERSITY, universityId);
    const Pages = (window as any).Pages;
    if (Pages) {
      Pages.renderBrowse();
    }
  }

  /**
   * Filter by category tab
   * @param {string} category
   * @param {HTMLElement} button
   */
  filterCategoryTab(category: string, button: HTMLElement): void {
    // Update active state
    document.querySelectorAll('.category-tab').forEach((tab) => {
      tab.classList.remove('active');
      tab.style.background = 'transparent';
      tab.style.color = '#a3a3a3';
      tab.style.borderColor = 'rgba(63,63,70,1)';
    });

    button.classList.add('active');
    button.style.background = 'rgba(99,102,241,0.2)';
    button.style.color = '#a5b4fc';
    button.style.borderColor = 'rgba(99,102,241,0.3)';

    // Navigate to browse with filter
    const Pages = (window as any).Pages;
    if (Pages && category !== 'all') {
      Pages.renderBrowse({ category });
    } else if (Pages) {
      Pages.renderBrowse();
    }
  }
}

export default LandingPage;
