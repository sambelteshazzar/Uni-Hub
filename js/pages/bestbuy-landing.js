// ============================================
// BEST BUY LANDING PAGE RENDERER
// Replaces the default renderLanding with Best Buy-style layout
// ============================================

(function () {
  // Store original renderLanding
  const originalRenderLanding = Pages.renderLanding;

  // Override renderLanding
  Pages.renderLanding = async function () {
    // DON'T hide navbar - we need the Sign In/Sign Up buttons visible
    // Just show the footer since we have our own landing content

    const mainContent = document.getElementById('main-content');
    let config = { universities: [], categories: [] };

    try {
      config = await api.loadJSON('data/config.json');
    } catch (error) {
      console.error('Error loading config:', error);
    }

    // Build universities HTML
    let universitiesHTML = '';
    if (config.universities && config.universities.length > 0) {
      universitiesHTML = config.universities
        .map(function (uni, i) {
          const images = [
            '1541339907198-e08756dedf3f',
            '1592280771190-3e2e4d571952',
            '1523050854058-8df90110c9f1',
            '1562774053-701939374585',
            '1509062522246-3755977927d7',
          ];
          const img = images[i % images.length];
          return (
            '<div class="bb-category-card" onclick="Pages.selectUniversity(\'' +
            uni.id +
            '\'); return false;">' +
            '<div class="bb-category-icon">🎓</div>' +
            '<p class="bb-category-name">' +
            uni.name +
            '</p>' +
            '<p class="bb-category-count">' +
            (100 + i * 50) +
            '+ items</p>' +
            '</div>'
          );
        })
        .join('');
    }

    // Build categories HTML
    let categoriesHTML = '';
    if (config.categories && config.categories.length > 0) {
      const icons = {
        textbooks: '📚',
        electronics: '💻',
        dorm: '🏠',
        clothing: '👕',
        sports: '⚽',
        furniture: '🪑',
        other: '📦',
      };
      categoriesHTML = config.categories
        .map(function (cat) {
          const icon = icons[cat.id] || '📦';
          return (
            '<a href="#/browse?category=' +
            cat.id +
            '" class="bb-category-card">' +
            '<div class="bb-category-icon">' +
            icon +
            '</div>' +
            '<p class="bb-category-name">' +
            cat.name +
            '</p>' +
            '<p class="bb-category-count">' +
            (cat.count || '50+') +
            ' items</p>' +
            '</a>'
          );
        })
        .join('');
    }

    mainContent.innerHTML =
      '<div class="bb-landing">' +
      '<!-- Hero Section -->' +
      '<section class="bb-hero" style="min-height: 85vh; display: flex; align-items: center; padding: 6rem 2rem 4rem; position: relative; overflow: hidden; background: #050505;">' +
      '<div style="position: absolute; inset: 0; background: radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.1), transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.06), transparent 40%); pointer-events: none;"></div>' +
      '<div class="bb-hero-container" style="max-width: 80rem; margin: 0 auto; width: 100%; position: relative; z-index: 10;">' +
      '<div style="display: grid; grid-template-columns: 1fr; gap: 3rem; align-items: center;">' +
      '<!-- Left Content -->' +
      '<div>' +
      '<div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.875rem; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); border-radius: 9999px; margin-bottom: 1.5rem;">' +
      '<span style="position: relative; display: flex; width: 8px; height: 8px;">' +
      '<span style="position: absolute; inset: 0; border-radius: 50%; background: #6366f1; animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;"></span>' +
      '<span style="position: relative; display: block; width: 8px; height: 8px; border-radius: 50%; background: #6366f1;"></span>' +
      '</span>' +
      '<span style="font-size: 0.875rem; font-weight: 500; color: #a5b4fc; text-transform: uppercase; letter-spacing: 0.05em;">Global University Marketplace</span>' +
      '</div>' +
      '<h1 style="font-size: clamp(2.5rem, 6vw, 4rem); font-weight: 600; color: white; line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 1.5rem;">' +
      'Buy & sell with <span style="background: linear-gradient(135deg, #ffffff 0%, #6366f1 50%, #a5a6a6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">students like you.</span>' +
      '</h1>' +
      '<p style="font-size: 1.125rem; line-height: 1.8; color: #a3a3a3; max-width: 42rem; margin-bottom: 2rem;">' +
      'Uni-Hub is a global university marketplace app that connects students to easily buy and sell essential academic items. Textbooks, electronics, accommodation listings, and other campus essentials — all within your university community and beyond.' +
      '</p>' +
      '<div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 3rem;">' +
      '<button onclick="Pages.renderBrowse(); return false;" style="display: inline-flex; align-items: center; gap: 0.5rem; height: 3.5rem; padding: 0 2rem; border-radius: 1rem; font-weight: 500; font-size: 1rem; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; cursor: pointer; transition: all 0.3s; box-shadow: 0 0 25px rgba(99,102,241,0.35);" onmouseover="this.style.transform=\'translateY(-2px)\'; this.style.boxShadow=\'0 0 35px rgba(99,102,241,0.5)\'" onmouseout="this.style.transform=\'translateY(0)\'; this.style.boxShadow=\'0 0 25px rgba(99,102,241,0.35)\'">🔍 Browse Items</button>' +
      '<button onclick="Pages.renderRegister(); return false;" style="display: inline-flex; align-items: center; gap: 0.5rem; height: 3.5rem; padding: 0 2rem; border-radius: 1rem; font-weight: 500; font-size: 1rem; background: transparent; color: white; border: 1px solid #404040; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.borderColor=\'#6366f1\'; this.style.background=\'rgba(30,30,30,0.8)\'" onmouseout="this.style.borderColor=\'#404040\'; this.style.background=\'transparent\'">📝 Start Selling</button>' +
      '</div>' +
      '<div style="display: flex; flex-wrap: wrap; gap: 2.5rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.05);">' +
      '<div style="text-align: left;"><div style="font-size: 1.75rem; font-weight: 700; color: #6366f1; margin-bottom: 0.25rem;">7+</div><div style="color: #737373; font-size: 0.875rem;">Universities</div></div>' +
      '<div style="text-align: left;"><div style="font-size: 1.75rem; font-weight: 700; color: #6366f1; margin-bottom: 0.25rem;">2,000+</div><div style="color: #737373; font-size: 0.875rem;">Verified Students</div></div>' +
      '<div style="text-align: left;"><div style="font-size: 1.75rem; font-weight: 700; color: #6366f1; margin-bottom: 0.25rem;">5,000+</div><div style="color: #737373; font-size: 0.875rem;">Items Listed</div></div>' +
      '<div style="text-align: left;"><div style="font-size: 1.75rem; font-weight: 700; color: #6366f1; margin-bottom: 0.25rem;">GH₵500K+</div><div style="color: #737373; font-size: 0.875rem;">In Sales</div></div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '<!-- Mission Statement Section -->' +
      '<section style="padding: 5rem 2rem; background: #080808; border-top: 1px solid rgba(255,255,255,0.05);">' +
      '<div style="max-width: 56rem; margin: 0 auto;">' +
      '<div style="text-align: center; margin-bottom: 2rem;">' +
      '<h2 style="font-size: 1.875rem; font-weight: 600; color: white; margin-bottom: 0.5rem;">Our Mission</h2>' +
      '<p style="color: #737373; font-size: 1rem;">Making student essentials affordable and accessible</p>' +
      '</div>' +
      '<div style="padding: 2rem; background: rgba(99,102,241,0.04); border: 1px solid rgba(99,102,241,0.1); border-radius: 1rem; border-left: 4px solid #6366f1;">' +
      '<p style="color: #d4d4d8; font-size: 1.125rem; line-height: 1.8;">' +
      'At Uni-Hub, our mission is to make student essentials affordable and accessible, ensuring that every student can get what they need without financial stress.' +
      '</p>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '<!-- Shop by Category -->' +
      '<section class="bb-categories" id="browse">' +
      '<div class="bb-container">' +
      '<div class="bb-section-header">' +
      '<h2 class="bb-section-title">Shop by Category</h2>' +
      '<p class="bb-section-subtitle">Find exactly what you need for campus life</p>' +
      '</div>' +
      '<div class="bb-categories-grid">' +
      (categoriesHTML ||
        '<a href="#/browse?category=textbooks" class="bb-category-card"><div class="bb-category-icon">📚</div><p class="bb-category-name">Textbooks</p><p class="bb-category-count">120+ items</p></a>' +
          '<a href="#/browse?category=electronics" class="bb-category-card"><div class="bb-category-icon">💻</div><p class="bb-category-name">Electronics</p><p class="bb-category-count">85+ items</p></a>' +
          '<a href="#/browse?category=dorm" class="bb-category-card"><div class="bb-category-icon">🏠</div><p class="bb-category-name">Dorm &amp; Room</p><p class="bb-category-count">95+ items</p></a>' +
          '<a href="#/browse?category=furniture" class="bb-category-card"><div class="bb-category-icon">🪑</div><p class="bb-category-name">Furniture</p><p class="bb-category-count">45+ items</p></a>' +
          '<a href="#/browse?category=clothing" class="bb-category-card"><div class="bb-category-icon">👕</div><p class="bb-category-name">Clothing</p><p class="bb-category-count">60+ items</p></a>' +
          '<a href="#/browse?category=sports" class="bb-category-card"><div class="bb-category-icon">⚽</div><p class="bb-category-name">Sports</p><p class="bb-category-count">35+ items</p></a>') +
      '</div>' +
      '</div>' +
      '</section>' +
      '<!-- Featured Products -->' +
      '<section class="bb-featured">' +
      '<div class="bb-container">' +
      '<div class="bb-section-header" style="display: flex; justify-content: space-between; align-items: center;">' +
      '<div>' +
      '<h2 class="bb-section-title">Top Deals Right Now</h2>' +
      '<p class="bb-section-subtitle">Hand-picked deals from students near you</p>' +
      '</div>' +
      '<a href="#/browse" onclick="Pages.renderBrowse(); return false;" style="font-size: var(--text-sm); font-weight: 600; color: #0046be; text-decoration: none;">View All →</a>' +
      '</div>' +
      '<div class="bb-carousel">' +
      '<div class="product-card">' +
      '<div class="product-card-image">' +
      '<img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop" alt="Watch">' +
      '<div class="product-card-badges"><span class="product-card-badge">Deal</span></div>' +
      '</div>' +
      '<div class="product-card-body">' +
      '<p class="product-card-category">Electronics</p>' +
      '<h3 class="product-card-title">Smart Watch - Excellent Condition</h3>' +
      '<div class="product-card-rating"><span class="product-card-rating-stars">★★★★☆</span><span class="product-card-rating-count">(24)</span></div>' +
      '<p class="product-card-price">GH₵49.99 <span class="product-card-price-original">GH₵129.99</span></p>' +
      '<p class="product-card-savings">Save GH₵80 (62% off)</p>' +
      '</div>' +
      '</div>' +
      '<div class="product-card">' +
      '<div class="product-card-image">' +
      '<img src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=400&fit=crop" alt="Books">' +
      '</div>' +
      '<div class="product-card-body">' +
      '<p class="product-card-category">Textbooks</p>' +
      '<h3 class="product-card-title">Calculus Textbook 8th Edition</h3>' +
      '<div class="product-card-rating"><span class="product-card-rating-stars">★★★★★</span><span class="product-card-rating-count">(12)</span></div>' +
      '<p class="product-card-price">GH₵35.00 <span class="product-card-price-original">GH₵89.99</span></p>' +
      '<p class="product-card-savings">Save GH₵55 (61% off)</p>' +
      '</div>' +
      '</div>' +
      '<div class="product-card">' +
      '<div class="product-card-image">' +
      '<img src="https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=400&fit=crop" alt="Desk Lamp">' +
      '<div class="product-card-badges"><span class="product-card-badge">Deal</span></div>' +
      '</div>' +
      '<div class="product-card-body">' +
      '<p class="product-card-category">Dorm &amp; Room</p>' +
      '<h3 class="product-card-title">LED Desk Lamp with USB Port</h3>' +
      '<div class="product-card-rating"><span class="product-card-rating-stars">★★★★☆</span><span class="product-card-rating-count">(8)</span></div>' +
      '<p class="product-card-price">GH₵15.00</p>' +
      '</div>' +
      '</div>' +
      '<div class="product-card">' +
      '<div class="product-card-image">' +
      '<img src="https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop" alt="Chair">' +
      '</div>' +
      '<div class="product-card-body">' +
      '<p class="product-card-category">Furniture</p>' +
      '<h3 class="product-card-title">Gaming Chair - Barely Used</h3>' +
      '<div class="product-card-rating"><span class="product-card-rating-stars">★★★★★</span><span class="product-card-rating-count">(31)</span></div>' +
      '<p class="product-card-price">GH₵75.00 <span class="product-card-price-original">GH₵199.99</span></p>' +
      '<p class="product-card-savings">Save GH₵125 (63% off)</p>' +
      '</div>' +
      '</div>' +
      '<div class="product-card">' +
      '<div class="product-card-image">' +
      '<img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop" alt="Headphones">' +
      '<div class="product-card-badges"><span class="product-card-badge">Deal</span></div>' +
      '</div>' +
      '<div class="product-card-body">' +
      '<p class="product-card-category">Electronics</p>' +
      '<h3 class="product-card-title">Wireless Headphones - Noise Cancelling</h3>' +
      '<div class="product-card-rating"><span class="product-card-rating-stars">★★★★☆</span><span class="product-card-rating-count">(45)</span></div>' +
      '<p class="product-card-price">GH₵29.99 <span class="product-card-price-original">GH₵79.99</span></p>' +
      '<p class="product-card-savings">Save GH₵50 (63% off)</p>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '<!-- University Selection -->' +
      '<section class="bb-categories" id="universities">' +
      '<div class="bb-container">' +
      '<div class="bb-section-header">' +
      '<h2 class="bb-section-title">Choose Your University</h2>' +
      '<p class="bb-section-subtitle">Browse items from verified students at your campus</p>' +
      '</div>' +
      '<div class="bb-categories-grid">' +
      (universitiesHTML ||
        '<div class="bb-category-card" onclick="Pages.renderBrowse(); return false;"><div class="bb-category-icon">🎓</div><p class="bb-category-name">University of Ghana</p><p class="bb-category-count">350+ items</p></div>' +
          '<div class="bb-category-card" onclick="Pages.renderBrowse(); return false;"><div class="bb-category-icon">🏛️</div><p class="bb-category-name">KNUST</p><p class="bb-category-count">220+ items</p></div>' +
          '<div class="bb-category-card" onclick="Pages.renderBrowse(); return false;"><div class="bb-category-icon">📖</div><p class="bb-category-name">University of Cape Coast</p><p class="bb-category-count">180+ items</p></div>' +
          '<div class="bb-category-card" onclick="Pages.renderBrowse(); return false;"><div class="bb-category-icon">🏫</div><p class="bb-category-name">Ashesi University</p><p class="bb-category-count">95+ items</p></div>') +
      '<div class="bb-category-card" onclick="Pages.renderBrowse(); return false;" style="border: 2px dashed #0046be;">' +
      '<div class="bb-category-icon" style="font-size: var(--text-2xl);">+</div>' +
      '<p class="bb-category-name" style="color: #0046be;">View All Universities</p>' +
      '<p class="bb-category-count">7 total</p>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '<!-- How It Works -->' +
      '<section class="bb-how-it-works">' +
      '<div class="bb-container">' +
      '<div class="bb-section-header" style="text-align: center;">' +
      '<h2 class="bb-section-title">How Uni-Hub Works</h2>' +
      '<p class="bb-section-subtitle">Buy and sell in 3 simple steps</p>' +
      '</div>' +
      '<div class="bb-steps-grid">' +
      '<div class="bb-step"><div class="bb-step-number">1</div><h3 class="bb-step-title">Sign Up &amp; Verify</h3><p class="bb-step-desc">Create your account with your university email and get verified as a student. Only verified students can buy and sell.</p></div>' +
      '<div class="bb-step"><div class="bb-step-number">2</div><h3 class="bb-step-title">Browse or List Items</h3><p class="bb-step-desc">Search through hundreds of items from students at your university, or list your own items for sale in minutes.</p></div>' +
      '<div class="bb-step"><div class="bb-step-number">3</div><h3 class="bb-step-title">Connect &amp; Complete</h3><p class="bb-step-desc">Message the seller or buyer directly through our secure messaging system. Meet on campus to exchange items safely.</p></div>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '<!-- CTA Section -->' +
      '<section class="bb-cta">' +
      '<div class="bb-container">' +
      '<div class="bb-cta-content">' +
      '<h2 class="bb-cta-title">Ready to Start Saving?</h2>' +
      '<p class="bb-cta-desc">Join thousands of students already buying and selling on Uni-Hub. It\'s free to sign up.</p>' +
      '<div class="bb-hero-buttons" style="justify-content: center;">' +
      '<button onclick="Pages.renderRegister(); return false;" class="bb-btn bb-btn-primary" style="background: #ffce00; color: #1a1a1a;">🎓 Create Free Account</button>' +
      '<button onclick="Pages.renderBrowse(); return false;" class="bb-btn bb-btn-outline">🛒 Browse Items</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '</div>';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  console.log('✅ Best Buy landing page renderer loaded');
})();
