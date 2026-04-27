// ============================================
// BEST BUY LANDING PAGE RENDERER
// Replaces the default renderLanding with Best Buy-style layout
// ============================================

(function () {
  // eslint-disable-next-line no-console
  console.log('🔧 bestbuy-landing.js module loaded');

  // Define the Best Buy landing page renderer function
  const renderBestBuyLanding = async function () {
    // eslint-disable-next-line no-console
    console.log('🎨 Best Buy renderLanding called');
    // DON'T hide navbar - we need the Sign In/Sign Up buttons visible
    // Just show the footer since we have our own landing content

    const mainContent = document.getElementById('main-content');
    let config = { universities: [], categories: [] };

    try {
      config = await window.api.loadJSON('data/config.json');
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
          const _img = images[i % images.length];
          return (
            '<div class="bb-category-card" onclick="Pages.selectUniversity(\'' +
            uni.id +
            '\'); return false;">' +
            '<div class="bb-category-icon"><svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg></div>' +
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
      textbooks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M4 6h16"/><path d="M4 10h16"/></svg>',
      electronics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
      dorm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>',
      clothing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>',
      sports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M2 12h20"/><path d="M4.93 4.93l14.14 14.14"/><path d="M19.07 4.93L4.93 19.07"/></svg>',
      furniture: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0z"/><path d="M5 18v2"/><path d="M19 18v2"/></svg>',
      other: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    };
      categoriesHTML = config.categories
        .map(function (cat) {
          const icon = icons[cat.id] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
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
      '<section class="bb-hero" style="min-height: 85vh; display: flex; align-items: center; padding: 6rem 2rem 4rem; position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(0, 70, 190, 0.92), rgba(0, 51, 153, 0.95)), url(\'/assets/images/hero-students.jpg\') center/cover no-repeat;">' +
      '<div style="position: absolute; top: -50%; right: -10%; width: 600px; height: 600px; background: rgba(255, 206, 0, 0.1); border-radius: 50%; filter: blur(100px); pointer-events: none;"></div>' +
      '<div class="bb-hero-container" style="max-width: 80rem; margin: 0 auto; width: 100%; position: relative; z-index: 10;">' +
      '<div style="display: grid; grid-template-columns: 1fr; gap: 3rem; align-items: center;">' +
      '<!-- Left Content -->' +
      '<div>' +
      '<div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.875rem; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); border-radius: 9999px; margin-bottom: 1.5rem;">' +
      '<span style="position: relative; display: flex; width: 8px; height: 8px;">' +
      '<span style="position: absolute; inset: 0; border-radius: 50%; background: #ffce00; animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;"></span>' +
      '<span style="position: relative; display: block; width: 8px; height: 8px; border-radius: 50%; background: #ffce00;"></span>' +
      '</span>' +
      '<span style="font-size: 0.875rem; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em;">Global University Marketplace</span>' +
      '</div>' +
      '<h1 id="hero-animated-text" style="font-size: clamp(2.5rem, 6vw, 4rem); font-weight: 800; color: #ffffff; line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 1.5rem;">' +
      'Buy & sell with <span style="color: #ffce00;">students like you.</span>' +
      '</h1>' +
      '<p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255,255,255,0.9); max-width: 42rem; margin-bottom: 2rem;">' +
      'Uni-Hub is a global university marketplace app that connects students to easily buy and sell essential academic items. Textbooks, electronics, accommodation listings, and other campus essentials — all within your university community and beyond.' +
      '</p>' +
      '<div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 3rem;">' +
      '<button onclick="Pages.renderBrowse(); return false;" style="display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem 2rem; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #ffce00; color: #1a1a1a; border: none; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background=\'#e6b800\'; this.style.transform=\'translateY(-2px)\'; this.style.boxShadow=\'0 8px 20px rgba(255, 206, 0, 0.3)\'" onmouseout="this.style.background=\'#ffce00\'; this.style.transform=\'translateY(0)\'; this.style.boxShadow=\'none\'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="display:inline-block;vertical-align:middle;margin-right:0.25rem;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Browse Items</button>' +
      '<button onclick="Pages.renderRegister(); return false;" style="display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem 2rem; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: transparent; color: #ffffff; border: 2px solid rgba(255,255,255,0.3); border-radius: 0.5rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor=\'#ffffff\'; this.style.background=\'rgba(255,255,255,0.1)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.3)\'; this.style.background=\'transparent\'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="display:inline-block;vertical-align:middle;margin-right:0.25rem;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> Start Selling</button>' +
      '</div>' +
      '<div style="display: flex; flex-wrap: wrap; gap: 2.5rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.15);">' +
      '<div style="text-align: left;"><div style="font-size: 1.75rem; font-weight: 800; color: #ffce00; margin-bottom: 0.25rem;">7+</div><div style="color: rgba(255,255,255,0.7); font-size: 0.875rem;">Universities</div></div>' +
      '<div style="text-align: left;"><div style="font-size: 1.75rem; font-weight: 800; color: #ffce00; margin-bottom: 0.25rem;">2,000+</div><div style="color: rgba(255,255,255,0.7); font-size: 0.875rem;">Verified Students</div></div>' +
      '<div style="text-align: left;"><div style="font-size: 1.75rem; font-weight: 800; color: #ffce00; margin-bottom: 0.25rem;">5,000+</div><div style="color: rgba(255,255,255,0.7); font-size: 0.875rem;">Items Listed</div></div>' +
      '<div style="text-align: left;"><div style="font-size: 1.75rem; font-weight: 800; color: #ffce00; margin-bottom: 0.25rem;">GH₵500K+</div><div style="color: rgba(255,255,255,0.7); font-size: 0.875rem;">In Sales</div></div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '<!-- Mission Statement Section -->' +
      '<section style="padding: 5rem 2rem; background: #f8f9fa; border-top: 1px solid #e5e7eb;">' +
      '<div style="max-width: 56rem; margin: 0 auto;">' +
      '<div style="text-align: center; margin-bottom: 2rem;">' +
      '<h2 style="font-size: 1.875rem; font-weight: 800; color: #1a1a1a; margin-bottom: 0.5rem;">Our Mission</h2>' +
      '<p style="color: #6b7280; font-size: 1rem;">Making student essentials affordable and accessible</p>' +
      '</div>' +
      '<div style="padding: 2rem; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 0.75rem; border-left: 4px solid #0046be;">' +
      '<p style="color: #374151; font-size: 1.125rem; line-height: 1.8;">' +
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
        '<a href="#/browse?category=textbooks" class="bb-category-card"><div class="bb-category-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M4 6h16"/><path d="M4 10h16"/></svg></div><p class="bb-category-name">Textbooks</p><p class="bb-category-count">120+ items</p></a>' +
          '<a href="#/browse?category=electronics" class="bb-category-card"><div class="bb-category-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div><p class="bb-category-name">Electronics</p><p class="bb-category-count">85+ items</p></a>' +
          '<a href="#/browse?category=dorm" class="bb-category-card"><div class="bb-category-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg></div><p class="bb-category-name">Dorm &amp; Room</p><p class="bb-category-count">95+ items</p></a>' +
          '<a href="#/browse?category=furniture" class="bb-category-card"><div class="bb-category-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0z"/><path d="M5 18v2"/><path d="M19 18v2"/></svg></div><p class="bb-category-name">Furniture</p><p class="bb-category-count">45+ items</p></a>' +
          '<a href="#/browse?category=clothing" class="bb-category-card"><div class="bb-category-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg></div><p class="bb-category-name">Clothing</p><p class="bb-category-count">60+ items</p></a>' +
          '<a href="#/browse?category=sports" class="bb-category-card"><div class="bb-category-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M2 12h20"/><path d="M4.93 4.93l14.14 14.14"/><path d="M19.07 4.93L4.93 19.07"/></svg></div><p class="bb-category-name">Sports</p><p class="bb-category-count">35+ items</p></a>') +
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
        '<div class="bb-category-card" onclick="Pages.renderBrowse(); return false;"><div class="bb-category-icon"><svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg></div><p class="bb-category-name">University of Ghana</p><p class="bb-category-count">350+ items</p></div>' +
          '<div class="bb-category-card" onclick="Pages.renderBrowse(); return false;"><div class="bb-category-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6"/><path d="M10 9h4"/><path d="M10 13h4"/></svg></div><p class="bb-category-name">KNUST</p><p class="bb-category-count">220+ items</p></div>' +
          '<div class="bb-category-card" onclick="Pages.renderBrowse(); return false;"><div class="bb-category-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div><p class="bb-category-name">University of Cape Coast</p><p class="bb-category-count">180+ items</p></div>' +
          '<div class="bb-category-card" onclick="Pages.renderBrowse(); return false;"><div class="bb-category-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6"/><path d="M10 9h4"/><path d="M10 13h4"/></svg></div><p class="bb-category-name">Ashesi University</p><p class="bb-category-count">95+ items</p></div>') +
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
      '<button onclick="Pages.renderRegister(); return false;" class="bb-btn bb-btn-primary" style="background: #ffce00; color: #1a1a1a;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="display:inline-block;vertical-align:middle;margin-right:0.25rem;"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg> Create Free Account</button>' +
      '<button onclick="Pages.renderBrowse(); return false;" class="bb-btn bb-btn-outline"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="display:inline-block;vertical-align:middle;margin-right:0.25rem;"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Browse Items</button>' +
      '</div>' +
      '</div>' +
'</div>' +
'</section>' +
'</div>';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Initialize text animation after render
    setTimeout(function() {
      initTextAnimation();
    }, 100);
  };

  // Try to immediately override Pages.renderLanding
  // eslint-disable-next-line no-console
  console.log('📋 Checking if Pages is available...');
  if (typeof window.Pages !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('✅ Pages found immediately, overriding renderLanding');
    // eslint-disable-next-line no-console
    console.log('Original renderLanding:', typeof window.Pages.renderLanding);
    window.Pages.renderLanding = renderBestBuyLanding;
    console.log('✅ Best Buy landing page renderer loaded (immediate)');
    console.log('New renderLanding:', typeof window.Pages.renderLanding);
    // Signal that best buy landing is ready
    window._bestBuyLandingReady = true;
    window.dispatchEvent(new CustomEvent('module-loaded', { detail: 'BestBuyLandingReady' }));
  } else {
    console.log('⏳ Pages not found, waiting...');
    // Fallback: wait for Pages to be available
    const waitForPages = setInterval(function () {
      if (typeof window.Pages !== 'undefined') {
        clearInterval(waitForPages);
        console.log('✅ Pages found after waiting, overriding renderLanding');
        window.Pages.renderLanding = renderBestBuyLanding;
        console.log('✅ Best Buy landing page renderer loaded (deferred)');
        // Signal that best buy landing is ready
        window._bestBuyLandingReady = true;
        window.dispatchEvent(new CustomEvent('module-loaded', { detail: 'BestBuyLandingReady' }));
      }
    }, 50); // Check every 50ms
  }
})();

/**
 * Scale-In Text Animation
 * Animates each character with a spring effect
 */
function initTextAnimation() {
  console.log('🔍 initTextAnimation called');

  const heroText = document.getElementById('hero-animated-text');
  if (!heroText) {
    console.error('❌ Hero text element not found');
    return;
  }

  console.log('✅ Hero text found:', heroText.textContent);
  console.log('Current HTML:', heroText.innerHTML.substring(0, 100));

  // The exact text we want to animate
  const textBefore = 'Buy & sell with ';
  const textYellow = 'students like you.';

  let html = '';
  let delay = 0;

  // White text part
  for (let i = 0; i < textBefore.length; i++) {
    const char = textBefore[i];
    html += '<span class="hero-char" style="display:inline-block;opacity:0;transform:scale(0);transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);transition-delay:' + (delay * 0.05).toFixed(3) + 's;">' + (char === ' ' ? '&nbsp;' : char) + '</span>';
    delay++;
  }

  // Yellow text part - wrap entire thing in yellow span
  html += '<span style="color:#ffce00;">';
  for (let i = 0; i < textYellow.length; i++) {
    const char = textYellow[i];
    html += '<span class="hero-char" style="display:inline-block;opacity:0;transform:scale(0);transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);transition-delay:' + (delay * 0.05).toFixed(3) + 's;">' + (char === ' ' ? '&nbsp;' : char) + '</span>';
    delay++;
  }
  html += '</span>';

  // Replace content
  heroText.innerHTML = html;
  console.log('✅ HTML replaced');

  // Trigger animations after a brief delay
  setTimeout(function() {
    const chars = heroText.querySelectorAll('.hero-char');
    console.log('🎬 Animating', chars.length, 'characters');
    chars.forEach(function(char) {
      char.style.opacity = '1';
      char.style.transform = 'scale(1)';
    });
  }, 50);
}
