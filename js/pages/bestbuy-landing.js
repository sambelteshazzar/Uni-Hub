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
      universitiesHTML = config.universities.map(function (uni, i) {
        const images = [
          '1541339907198-e08756dedf3f',
          '1592280771190-3e2e4d571952',
          '1523050854058-8df90110c9f1',
          '1562774053-701939374585',
          '1509062522246-3755977927d7'
        ];
        const img = images[i % images.length];
        return '<div class="bb-category-card" onclick="Pages.selectUniversity(\'' + uni.id + '\'); return false;">' +
          '<div class="bb-category-icon">🎓</div>' +
          '<p class="bb-category-name">' + uni.name + '</p>' +
          '<p class="bb-category-count">' + (100 + i * 50) + '+ items</p>' +
          '</div>';
      }).join('');
    }

    // Build categories HTML
    let categoriesHTML = '';
    if (config.categories && config.categories.length > 0) {
      const icons = { textbooks: '📚', electronics: '💻', dorm: '🏠', clothing: '👕', sports: '⚽', furniture: '🪑', other: '📦' };
      categoriesHTML = config.categories.map(function (cat) {
        const icon = icons[cat.id] || '📦';
        return '<a href="#/browse?category=' + cat.id + '" class="bb-category-card">' +
          '<div class="bb-category-icon">' + icon + '</div>' +
          '<p class="bb-category-name">' + cat.name + '</p>' +
          '<p class="bb-category-count">' + (cat.count || '50+') + ' items</p>' +
          '</a>';
      }).join('');
    }

    mainContent.innerHTML =
      '<div class="bb-landing">' +
      '<!-- Hero Promotional Banner Section -->' +
      '<section class="bb-hero">' +
        '<div class="bb-hero-container">' +
          '<!-- Main Large Promotional Banner -->' +
          '<div class="bb-hero-main-banner">' +
            '<div class="bb-hero-banner-bg"></div>' +
            '<div class="bb-hero-banner-content">' +
              '<div class="bb-hero-banner-tag">' +
                '<span class="bb-tag-deal">🔥 DEAL OF THE WEEK</span>' +
              '</div>' +
              '<h1 class="bb-hero-banner-title">' +
                'Save Up to <span class="bb-highlight">70%</span> on<br>Textbooks &amp; Electronics' +
              '</h1>' +
              '<p class="bb-hero-banner-desc">Verified students at your university are selling everything you need for the semester — at a fraction of retail prices.</p>' +
              '<div class="bb-hero-banner-actions">' +
                '<button onclick="Pages.renderBrowse(); return false;" class="bb-btn bb-btn-primary">🛒 Shop Deals Now</button>' +
                '<button onclick="Pages.renderSell(); return false;" class="bb-btn bb-btn-outline">💰 Start Selling</button>' +
              '</div>' +
              '<div class="bb-hero-banner-stats">' +
                '<div class="bb-banner-stat"><span class="bb-banner-stat-value">2,500+</span><span class="bb-banner-stat-label">Active Listings</span></div>' +
                '<div class="bb-banner-stat"><span class="bb-banner-stat-value">7</span><span class="bb-banner-stat-label">Universities</span></div>' +
                '<div class="bb-banner-stat"><span class="bb-banner-stat-value">GH₵45</span><span class="bb-banner-stat-label">Avg. Savings</span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<!-- Side Promotional Cards -->' +
          '<div class="bb-hero-side-cards">' +
            '<div class="bb-hero-side-card bb-side-card-electronics" onclick="Pages.renderBrowse(); return false;">' +
              '<div class="bb-side-card-badge">TRENDING</div>' +
              '<div class="bb-side-card-content">' +
                '<h3 class="bb-side-card-title">Laptops &amp; Electronics</h3>' +
                '<p class="bb-side-card-price">From <strong>GH₵29</strong></p>' +
                '<p class="bb-side-card-savings">Save up to 65% off retail</p>' +
              '</div>' +
              '<div class="bb-side-card-arrow">→</div>' +
            '</div>' +
            '<div class="bb-hero-side-card bb-side-card-textbooks" onclick="Pages.renderBrowse(); return false;">' +
              '<div class="bb-side-card-badge bb-side-card-badge-blue">NEW ARRIVALS</div>' +
              '<div class="bb-side-card-content">' +
                '<h3 class="bb-side-card-title">Spring Semester Textbooks</h3>' +
                '<p class="bb-side-card-price">From <strong>GH₵15</strong></p>' +
                '<p class="bb-side-card-savings">85+ titles available</p>' +
              '</div>' +
              '<div class="bb-side-card-arrow">→</div>' +
            '</div>' +
            '<div class="bb-hero-side-card bb-side-card-dorm" onclick="Pages.renderBrowse(); return false;">' +
              '<div class="bb-side-card-badge bb-side-card-badge-green">CLEARANCE</div>' +
              '<div class="bb-side-card-content">' +
                '<h3 class="bb-side-card-title">Dorm &amp; Room Essentials</h3>' +
                '<p class="bb-side-card-price">From <strong>GH₵5</strong></p>' +
                '<p class="bb-side-card-savings">Furniture, decor &amp; more</p>' +
              '</div>' +
              '<div class="bb-side-card-arrow">→</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<!-- Deal of the Day Bar -->' +
      '<section class="bb-deal-bar">' +
        '<div class="bb-deal-bar-container">' +
          '<div class="bb-deal-bar-text">' +
            '<span class="bb-deal-bar-icon">⚡</span>' +
            '<div>' +
              '<p class="bb-deal-bar-title">Deal of the Day</p>' +
              '<p class="bb-deal-bar-subtitle">Save big on textbooks, laptops &amp; more — today only!</p>' +
            '</div>' +
          '</div>' +
          '<button onclick="Pages.renderBrowse(); return false;" class="bb-deal-bar-btn">Shop All Deals</button>' +
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
              '<a href="#/browse?category=sports" class="bb-category-card"><div class="bb-category-icon">⚽</div><p class="bb-category-name">Sports</p><p class="bb-category-count">35+ items</p></a>'
            ) +
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
              '<div class="bb-category-card" onclick="Pages.renderBrowse(); return false;"><div class="bb-category-icon">🏫</div><p class="bb-category-name">Ashesi University</p><p class="bb-category-count">95+ items</p></div>'
            ) +
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
