// ============================================
// BEST BUY AUTH & DASHBOARD RENDERERS
// Replaces the default renderLogin, renderRegister, renderDashboard with Best Buy-style pages
// ============================================

(function () {
  // Store originals
  const originalRenderLogin = Pages.renderLogin;
  const originalRenderRegister = Pages.renderRegister;
  const originalRenderDashboard = Pages.renderDashboard;

  // ============================================
  // LOGIN - Best Buy Style
  // ============================================
  Pages.renderLogin = function () {
    this.showOriginalNavFooter();

    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML =
      '<div class="bb-auth-page">' +
      '<div class="bb-auth-branding">' +
      '<style>' +
      '@keyframes bb-cursor-blink {' +
      '0%, 100% { opacity: 1; }' +
      '50% { opacity: 0; }' +
      '}' +
      '.bb-typewriter-cursor {' +
      'display: inline-block;' +
      'width: 3px;' +
      'height: 1.2em;' +
      'background: #ffce00;' +
      'margin-left: 4px;' +
      'vertical-align: text-bottom;' +
      'animation: bb-cursor-blink 0.8s infinite;' +
      '}' +
      '</style>' +
      '<div class="bb-auth-brand-content">' +
      '<div class="bb-auth-brand-logo">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="180" height="45">' +
      '<rect x="2" y="8" width="36" height="28" rx="6" fill="rgba(255,255,255,0.2)"/>' +
      '<path d="M20 12 L6 20 L20 28 L34 20 Z" fill="#ffce00"/>' +
      '<circle cx="20" cy="12" r="3" fill="#ffce00"/>' +
      '<line x1="34" y1="20" x2="34" y2="30" stroke="#ffce00" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="34" cy="31" r="1.5" fill="#ffce00"/>' +
      '<text x="46" y="33" font-family="system-ui,sans-serif" font-weight="800" font-size="22" fill="#ffffff" letter-spacing="-0.5">UNI<tspan fill="#ffce00">-</tspan>HUB</text>' +
      '</svg>' +
      '</div>' +
      '<h2 class="bb-auth-brand-title"><span id="bb-typewriter-text"></span><span class="bb-typewriter-cursor" id="bb-typewriter-cursor"></span></h2>' +
      '<p class="bb-auth-brand-desc">Sign in to your account to access your university marketplace. Buy, sell, and connect with fellow students.</p>' +
      '</div>' +
      '</div>' +
      '<div class="bb-auth-form-section">' +
      '<div class="bb-auth-form-container">' +
      '<div class="bb-auth-logo">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="160" height="40">' +
      '<rect x="2" y="8" width="36" height="28" rx="6" fill="#0046be"/>' +
      '<path d="M20 12 L6 20 L20 28 L34 20 Z" fill="#ffce00"/>' +
      '<circle cx="20" cy="12" r="3" fill="#ffce00"/>' +
      '<line x1="34" y1="20" x2="34" y2="30" stroke="#ffce00" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="34" cy="31" r="1.5" fill="#ffce00"/>' +
      '<text x="46" y="33" font-family="system-ui,sans-serif" font-weight="800" font-size="22" fill="currentColor" letter-spacing="-0.5">UNI<tspan fill="#0046be">-</tspan>HUB</text>' +
      '</svg>' +
      '</div>' +
      '<div class="bb-auth-form-header">' +
      '<h1 class="bb-auth-form-title">Sign In</h1>' +
      '<p class="bb-auth-form-subtitle">Enter your email and password to continue</p>' +
      '</div>' +
      '<form id="login-form-bb" onsubmit="Pages.handleLoginBB(event)">' +
      '<div class="bb-form-group">' +
      '<label for="login-email" class="bb-form-label">Email Address <span class="required-star">*</span></label>' +
      '<input type="email" id="login-email" name="email" class="bb-form-input" placeholder="name@university.edu" required />' +
      '</div>' +
      '<div class="bb-form-group">' +
      '<label for="login-password" class="bb-form-label">Password <span class="required-star">*</span></label>' +
      '<div class="bb-password-wrapper">' +
      '<input type="password" id="login-password" name="password" class="bb-form-input" placeholder="Enter your password" required />' +
      '<button type="button" class="bb-password-toggle" onclick="Pages.togglePassword(\'login-password\', this)">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>' +
      '</button>' +
      '</div>' +
      '</div>' +
      '<div class="bb-remember-me">' +
      '<input type="checkbox" id="remember-me" />' +
      '<label for="remember-me">Remember me</label>' +
      '</div>' +
      '<button type="submit" class="bb-submit-btn">Sign In</button>' +
      '</form>' +
      '<div class="bb-auth-footer">' +
      '<p>Don\'t have an account? <a href="#" onclick="Pages.renderRegister(); return false;">Create an account</a></p>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';

    window.scrollTo({ top: 0 });

    // Typewriter animation for Sign In page
    (function initTypewriter () {
      const phrases = [
        'Welcome Back',
        'Your Campus Marketplace',
        'Great Deals Await You',
        'Sign In & Start Shopping',
      ];
      const speed = 80;
      const deleteSpeed = 40;
      const pauseDuration = 2000;
      let phraseIndex = 0;
      let charIndex = 0;
      let isDeleting = false;
      let isPaused = false;
      const textEl = document.getElementById('bb-typewriter-text');
      const cursorEl = document.getElementById('bb-typewriter-cursor');
      if (!textEl || !cursorEl) {
        return;
      }

      function type () {
        const currentPhrase = phrases[phraseIndex];

        if (isPaused) {
          setTimeout(function () {
            isPaused = false;
            isDeleting = true;
            type();
          }, pauseDuration);
          return;
        }

        if (isDeleting) {
          charIndex--;
          textEl.textContent = currentPhrase.substring(0, charIndex);
          if (charIndex <= 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            setTimeout(type, 300);
          } else {
            setTimeout(type, deleteSpeed);
          }
        } else {
          charIndex++;
          textEl.textContent = currentPhrase.substring(0, charIndex);
          if (charIndex >= currentPhrase.length) {
            isPaused = true;
            setTimeout(type, pauseDuration);
          } else {
            setTimeout(type, speed);
          }
        }
      }

      type();
    })();
  };

  Pages.handleLoginBB = async function (event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const result = await authManager.login(email, password);
    if (result.success) {
      Pages.updateNavbar();
      Pages.updateCartBadge();
      Pages.renderDashboard();
    } else {
      alert('Login failed: ' + result.error);
    }
  };

  // ============================================
  // REGISTER - Best Buy Style
  // ============================================
  Pages.renderRegister = async function () {
    this.showOriginalNavFooter();

    const mainContent = document.getElementById('main-content');
    let config = { universities: [] };
    try {
      config = await api.loadJSON('data/config.json');
    } catch (e) {
      console.error('Error loading config:', e);
    }

    const uniOptions = config.universities
      .map(function (u) {
        return '<option value="' + u.id + '">' + u.name + '</option>';
      })
      .join('');

    mainContent.innerHTML =
      '<div class="bb-auth-page">' +
      '<div class="bb-auth-branding">' +
      '<style>' +
      '@keyframes bb-cursor-blink {' +
      '0%, 100% { opacity: 1; }' +
      '50% { opacity: 0; }' +
      '}' +
      '.bb-typewriter-cursor {' +
      'display: inline-block;' +
      'width: 3px;' +
      'height: 1.2em;' +
      'background: #ffce00;' +
      'margin-left: 4px;' +
      'vertical-align: text-bottom;' +
      'animation: bb-cursor-blink 0.8s infinite;' +
      '}' +
      '</style>' +
      '<div class="bb-auth-brand-content">' +
      '<div class="bb-auth-brand-logo">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="180" height="45">' +
      '<rect x="2" y="8" width="36" height="28" rx="6" fill="rgba(255,255,255,0.2)"/>' +
      '<path d="M20 12 L6 20 L20 28 L34 20 Z" fill="#ffce00"/>' +
      '<circle cx="20" cy="12" r="3" fill="#ffce00"/>' +
      '<line x1="34" y1="20" x2="34" y2="30" stroke="#ffce00" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="34" cy="31" r="1.5" fill="#ffce00"/>' +
      '<text x="46" y="33" font-family="system-ui,sans-serif" font-weight="800" font-size="22" fill="#ffffff" letter-spacing="-0.5">UNI<tspan fill="#ffce00">-</tspan>HUB</text>' +
      '</svg>' +
      '</div>' +
      '<h2 class="bb-auth-brand-title"><span id="bb-typewriter-text"></span><span class="bb-typewriter-cursor" id="bb-typewriter-cursor"></span></h2>' +
      '<p class="bb-auth-brand-desc">Create your free account and start buying and selling with verified students at your university.</p>' +
      '</div>' +
      '</div>' +
      '<div class="bb-auth-form-section">' +
      '<div class="bb-auth-form-container">' +
      '<div class="bb-auth-logo">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="160" height="40">' +
      '<rect x="2" y="8" width="36" height="28" rx="6" fill="#0046be"/>' +
      '<path d="M20 12 L6 20 L20 28 L34 20 Z" fill="#ffce00"/>' +
      '<circle cx="20" cy="12" r="3" fill="#ffce00"/>' +
      '<line x1="34" y1="20" x2="34" y2="30" stroke="#ffce00" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="34" cy="31" r="1.5" fill="#ffce00"/>' +
      '<text x="46" y="33" font-family="system-ui,sans-serif" font-weight="800" font-size="22" fill="currentColor" letter-spacing="-0.5">UNI<tspan fill="#0046be">-</tspan>HUB</text>' +
      '</svg>' +
      '</div>' +
      '<div class="bb-auth-form-header">' +
      '<h1 class="bb-auth-form-title">Create Account</h1>' +
      '<p class="bb-auth-form-subtitle">Fill in your details to get started</p>' +
      '</div>' +
      '<form id="register-form-bb" onsubmit="Pages.handleRegisterBB(event)">' +
      '<div class="bb-name-row">' +
      '<div class="bb-form-group">' +
      '<label for="reg-firstName" class="bb-form-label">First Name <span class="required-star">*</span></label>' +
      '<input type="text" id="reg-firstName" name="firstName" class="bb-form-input" placeholder="John" required />' +
      '</div>' +
      '<div class="bb-form-group">' +
      '<label for="reg-lastName" class="bb-form-label">Last Name <span class="required-star">*</span></label>' +
      '<input type="text" id="reg-lastName" name="lastName" class="bb-form-input" placeholder="Doe" required />' +
      '</div>' +
      '</div>' +
      '<div class="bb-form-group">' +
      '<label for="reg-email" class="bb-form-label">Email Address <span class="required-star">*</span></label>' +
      '<input type="email" id="reg-email" name="email" class="bb-form-input" placeholder="name@university.edu" required />' +
      '</div>' +
      '<div class="bb-form-group">' +
      '<label for="reg-password" class="bb-form-label">Password <span class="required-star">*</span></label>' +
      '<div class="bb-password-wrapper">' +
      '<input type="password" id="reg-password" name="password" class="bb-form-input" placeholder="At least 8 characters" required minlength="8" />' +
      '<button type="button" class="bb-password-toggle" onclick="Pages.togglePassword(\'reg-password\', this)">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>' +
      '</button>' +
      '</div>' +
      '</div>' +
      '<div class="bb-university-select">' +
      '<label for="reg-university" class="bb-form-label">University <span class="required-star">*</span></label>' +
      '<select id="reg-university" name="university" class="bb-form-input" required>' +
      '<option value="">Select your university</option>' +
      uniOptions +
      '</select>' +
      '</div>' +
      '<div class="bb-remember-me" style="margin-top: var(--space-sm);">' +
      '<input type="checkbox" id="agree-terms" required />' +
      '<label for="agree-terms">I agree to the <a href="#" style="color: #0046be;">Terms of Service</a> and <a href="#" style="color: #0046be;">Privacy Policy</a></label>' +
      '</div>' +
      '<button type="submit" class="bb-submit-btn">Create Account</button>' +
      '</form>' +
      '<div class="bb-auth-footer">' +
      '<p>Already have an account? <a href="#" onclick="Pages.renderLogin(); return false;">Sign in</a></p>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>';

    window.scrollTo({ top: 0 });

    // Typewriter animation - mimics the React framer-motion version
    (function initTypewriter () {
      const phrases = [
        'Join Uni-Hub Today',
        'Buy & Sell on Campus',
        'Verified Students Only',
        'Save Up to 70%',
      ];
      const speed = 80;
      const deleteSpeed = 40;
      const pauseDuration = 2000;
      let phraseIndex = 0;
      let charIndex = 0;
      let isDeleting = false;
      let isPaused = false;
      const textEl = document.getElementById('bb-typewriter-text');
      const cursorEl = document.getElementById('bb-typewriter-cursor');
      if (!textEl || !cursorEl) {
        return;
      }

      function type () {
        const currentPhrase = phrases[phraseIndex];

        if (isPaused) {
          setTimeout(function () {
            isPaused = false;
            isDeleting = true;
            type();
          }, pauseDuration);
          return;
        }

        if (isDeleting) {
          charIndex--;
          textEl.textContent = currentPhrase.substring(0, charIndex);
          if (charIndex <= 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            setTimeout(type, 300);
          } else {
            setTimeout(type, deleteSpeed);
          }
        } else {
          charIndex++;
          textEl.textContent = currentPhrase.substring(0, charIndex);
          if (charIndex >= currentPhrase.length) {
            isPaused = true;
            setTimeout(type, pauseDuration);
          } else {
            setTimeout(type, speed);
          }
        }
      }

      // Start the animation
      type();
    })();
  };

  Pages.handleRegisterBB = async function (event) {
    event.preventDefault();
    const firstName = document.getElementById('reg-firstName').value;
    const lastName = document.getElementById('reg-lastName').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const university = document.getElementById('reg-university').value;
    const fullName = firstName + ' ' + lastName;
    const result = await authManager.register(fullName, email, password, university);
    if (result.success) {
      Pages.updateNavbar();
      Pages.updateCartBadge();
      Pages.renderDashboard();
    } else {
      alert('Registration failed: ' + result.error);
    }
  };

  // ============================================
  // DASHBOARD - Best Buy Style
  // ============================================
  Pages.renderDashboard = function () {
    const currentUser = StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);
    if (!currentUser) {
      alert('Please login to view your dashboard.');
      this.renderLogin();
      return;
    }

    this.showOriginalNavFooter();

    const orders = checkoutManager.getUserOrders(currentUser.id || '');
    const wishlist = productsManager.getWishlist();
    const cartCount = cartManager.getCount();
    const initials = currentUser.fullName
      .split(' ')
      .map(function (n) {
        return n[0];
      })
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const recentOrders = orders.slice(0, 5);

    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML =
      '<div class="bb-dashboard">' +
      '<div class="bb-dashboard-header">' +
      '<div class="bb-dashboard-header-inner">' +
      '<h1 class="bb-dashboard-title">My Account</h1>' +
      '<div class="bb-dashboard-user">' +
      '<div class="bb-dashboard-info">' +
      '<div class="bb-dashboard-user-name">' +
      currentUser.fullName +
      '</div>' +
      '<div class="bb-dashboard-user-email">' +
      currentUser.email +
      '</div>' +
      '</div>' +
      '<div class="bb-dashboard-avatar">' +
      initials +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="bb-dashboard-layout">' +
      '<nav class="bb-dashboard-nav">' +
      '<div class="bb-dashboard-nav-item"><button class="bb-dashboard-nav-link active" data-tab="overview" onclick="Pages.switchDashboardTabBB(\'overview\')"><span class="bb-dashboard-nav-icon">📊</span>Overview</button></div>' +
      '<div class="bb-dashboard-nav-item"><button class="bb-dashboard-nav-link" data-tab="orders" onclick="Pages.switchDashboardTabBB(\'orders\')"><span class="bb-dashboard-nav-icon">📦</span>Orders' +
      (orders.length > 0
        ? '<span class="bb-dashboard-nav-badge">' + orders.length + '</span>'
        : '') +
      '</button></div>' +
      '<div class="bb-dashboard-nav-item"><button class="bb-dashboard-nav-link" data-tab="wishlist" onclick="Pages.switchDashboardTabBB(\'wishlist\')"><span class="bb-dashboard-nav-icon">❤️</span>Wishlist' +
      (wishlist.length > 0
        ? '<span class="bb-dashboard-nav-badge">' + wishlist.length + '</span>'
        : '') +
      '</button></div>' +
      '<div class="bb-dashboard-nav-item"><button class="bb-dashboard-nav-link" data-tab="cart" onclick="Pages.switchDashboardTabBB(\'cart\')"><span class="bb-dashboard-nav-icon">🛒</span>Cart' +
      (cartCount > 0 ? '<span class="bb-dashboard-nav-badge">' + cartCount + '</span>' : '') +
      '</button></div>' +
      '<div class="bb-dashboard-nav-item"><button class="bb-dashboard-nav-link" data-tab="profile" onclick="Pages.switchDashboardTabBB(\'profile\')"><span class="bb-dashboard-nav-icon">👤</span>Profile</button></div>' +
      '<div class="bb-dashboard-nav-item"><button class="bb-dashboard-nav-link" data-tab="settings" onclick="Pages.switchDashboardTabBB(\'settings\')"><span class="bb-dashboard-nav-icon">⚙️</span>Settings</button></div>' +
      '</nav>' +
      '<main class="bb-dashboard-main">' +
      // OVERVIEW PANEL
      '<div class="bb-panel active" id="bb-panel-overview">' +
      '<div class="bb-panel-header">' +
      '<h2 class="bb-panel-title">Welcome back, ' +
      currentUser.fullName.split(' ')[0] +
      '!</h2>' +
      '<p class="bb-panel-subtitle">Here\'s what\'s happening with your account today.</p>' +
      '</div>' +
      '<div class="bb-stats-row">' +
      '<div class="bb-stat-card"><div class="bb-stat-value">' +
      orders.length +
      '</div><div class="bb-stat-label">Total Orders</div></div>' +
      '<div class="bb-stat-card"><div class="bb-stat-value">' +
      wishlist.length +
      '</div><div class="bb-stat-label">Wishlist Items</div></div>' +
      '<div class="bb-stat-card"><div class="bb-stat-value">' +
      cartCount +
      '</div><div class="bb-stat-label">Cart Items</div></div>' +
      '<div class="bb-stat-card"><div class="bb-stat-value" style="font-size:1rem;">' +
      (currentUser.university ? currentUser.university.toUpperCase() : 'N/A') +
      '</div><div class="bb-stat-label">University</div></div>' +
      '</div>' +
      '<h3 style="font-size:var(--text-lg);font-weight:700;color:#1a1a1a;margin-bottom:var(--space-md);">Recent Orders</h3>' +
      '<div class="bb-orders-list">' +
      (recentOrders.length > 0
        ? recentOrders
          .map(function (order) {
            return (
              '<div class="bb-order-card">' +
                '<div class="bb-order-icon">📦</div>' +
                '<div class="bb-order-info"><div class="bb-order-number">Order #' +
                order.orderNumber +
                '</div><div class="bb-order-details">' +
                order.items.length +
                ' item(s) • ' +
                Formatter.formatPrice(order.pricing.grandTotal) +
                '</div></div>' +
                '<div class="bb-order-amount">' +
                Formatter.formatTimeAgo(order.createdAt) +
                '</div>' +
                '<span class="bb-order-status ' +
                (order.status ? order.status.toLowerCase() : 'placed') +
                '">' +
                (order.status
                  ? order.status.charAt(0).toUpperCase() + order.status.slice(1)
                  : 'Placed') +
                '</span>' +
                '</div>'
            );
          })
          .join('')
        : '<div class="bb-empty"><div class="bb-empty-icon">📦</div><h3 class="bb-empty-title">No orders yet</h3><p class="bb-empty-desc">Start shopping to see your orders here!</p></div>') +
      '</div>' +
      '<div class="bb-quick-actions">' +
      '<a href="#/browse" class="bb-quick-action" onclick="Pages.renderBrowse(); return false;"><span class="bb-quick-action-icon">🔍</span><span class="bb-quick-action-label">Browse Items</span></a>' +
      '<a href="#/sell" class="bb-quick-action" onclick="Pages.renderSell(); return false;"><span class="bb-quick-action-icon">💰</span><span class="bb-quick-action-label">Start Selling</span></a>' +
      '<a href="#/cart" class="bb-quick-action" onclick="Pages.renderCart(); return false;"><span class="bb-quick-action-icon">🛒</span><span class="bb-quick-action-label">View Cart</span></a>' +
      '</div>' +
      '</div>' +
      // ORDERS PANEL
      '<div class="bb-panel" id="bb-panel-orders">' +
      '<div class="bb-panel-header">' +
      '<h2 class="bb-panel-title">My Orders</h2>' +
      '<p class="bb-panel-subtitle">Track and manage all your orders.</p>' +
      '</div>' +
      '<div class="bb-orders-list">' +
      (orders.length > 0
        ? orders
          .map(function (order) {
            return (
              '<div class="bb-order-card">' +
                '<div class="bb-order-icon">📦</div>' +
                '<div class="bb-order-info"><div class="bb-order-number">Order #' +
                order.orderNumber +
                '</div><div class="bb-order-details">' +
                order.items.length +
                ' item(s) • ' +
                Formatter.formatPrice(order.pricing.grandTotal) +
                '</div></div>' +
                '<div class="bb-order-amount">' +
                Formatter.formatTimeAgo(order.createdAt) +
                '</div>' +
                '<span class="bb-order-status ' +
                (order.status ? order.status.toLowerCase() : 'placed') +
                '">' +
                (order.status
                  ? order.status.charAt(0).toUpperCase() + order.status.slice(1)
                  : 'Placed') +
                '</span>' +
                '</div>'
            );
          })
          .join('')
        : '<div class="bb-empty"><div class="bb-empty-icon">🛒</div><h3 class="bb-empty-title">No orders yet</h3><p class="bb-empty-desc">Browse products and make your first purchase!</p></div>') +
      '</div>' +
      '</div>' +
      // WISHLIST PANEL
      '<div class="bb-panel" id="bb-panel-wishlist">' +
      '<div class="bb-panel-header">' +
      '<h2 class="bb-panel-title">My Wishlist</h2>' +
      '<p class="bb-panel-subtitle">Items you\'ve saved for later.</p>' +
      '</div>' +
      (wishlist.length > 0
        ? '<div class="bb-wishlist-grid">' +
          wishlist
            .map(function (product) {
              return (
                '<div class="bb-wishlist-card" onclick="Pages.renderProductDetail(\'' +
                product.id +
                '\')">' +
                '<img src="' +
                product.images[0] +
                '" alt="' +
                product.title +
                '" class="bb-wishlist-image" />' +
                '<div class="bb-wishlist-info">' +
                '<h4 class="bb-wishlist-title">' +
                product.title +
                '</h4>' +
                '<div class="bb-wishlist-price">' +
                product.price.toLocaleString() +
                ' GHS</div>' +
                '</div>' +
                '</div>'
              );
            })
            .join('') +
          '</div>'
        : '<div class="bb-empty"><div class="bb-empty-icon">🤍</div><h3 class="bb-empty-title">Your wishlist is empty</h3><p class="bb-empty-desc">Save items you love to find them later!</p></div>') +
      '</div>' +
      // CART PANEL
      '<div class="bb-panel" id="bb-panel-cart">' +
      '<div class="bb-panel-header">' +
      '<h2 class="bb-panel-title">Shopping Cart</h2>' +
      '<p class="bb-panel-subtitle">Review items before checkout.</p>' +
      '</div>' +
      (cartCount > 0
        ? '<div class="bb-orders-list">' +
          cartManager
            .getItems()
            .map(function (item) {
              return (
                '<div class="bb-order-card">' +
                '<div class="bb-order-icon">🛒</div>' +
                '<div class="bb-order-info"><div class="bb-order-number">' +
                item.product.title +
                '</div><div class="bb-order-details">Qty: ' +
                item.quantity +
                ' × ' +
                item.product.price.toLocaleString() +
                ' GHS</div></div>' +
                '</div>'
              );
            })
            .join('') +
          '</div>' +
          '<div style="margin-top:1.5rem;display:flex;gap:var(--space-md);">' +
          '<button onclick="cartManager.clear(); Pages.renderDashboard();" style="padding:var(--space-md) var(--space-xl);border:1px solid #d4d4d4;border-radius:var(--radius-md);background:#fff;font-size:var(--text-sm);font-weight:600;cursor:pointer;">Clear Cart</button>' +
          '<button onclick="Pages.renderCheckout();" style="padding:var(--space-md) var(--space-xl);background:#0046be;color:#fff;border:none;border-radius:var(--radius-md);font-size:var(--text-sm);font-weight:700;cursor:pointer;">Proceed to Checkout →</button>' +
          '</div>'
        : '<div class="bb-empty"><div class="bb-empty-icon">🛒</div><h3 class="bb-empty-title">Your cart is empty</h3><p class="bb-empty-desc">Add items to get started!</p></div>') +
      '</div>' +
      // PROFILE PANEL
      '<div class="bb-panel" id="bb-panel-profile">' +
      '<div class="bb-panel-header">' +
      '<h2 class="bb-panel-title">Edit Profile</h2>' +
      '<p class="bb-panel-subtitle">Update your personal information.</p>' +
      '</div>' +
      '<div class="bb-profile-form">' +
      '<form id="profile-form-bb" onsubmit="Pages.handleProfileUpdate(event)">' +
      '<div class="bb-form-group"><label class="bb-form-label">Full Name</label><input type="text" id="fullName" name="fullName" class="bb-form-input" value="' +
      currentUser.fullName +
      '" required /></div>' +
      '<div class="bb-form-group"><label class="bb-form-label">Email</label><input type="email" id="email" name="email" class="bb-form-input" value="' +
      currentUser.email +
      '" required /></div>' +
      '<div class="bb-form-group"><label class="bb-form-label">Phone</label><input type="tel" id="phone" name="phone" class="bb-form-input" value="' +
      (currentUser.phone || '') +
      '" /></div>' +
      '<div class="bb-form-group"><label class="bb-form-label">University</label><input type="text" class="bb-form-input" value="' +
      (currentUser.university || 'Not set') +
      '" disabled /></div>' +
      '<button type="submit" class="bb-save-btn">Save Changes</button>' +
      '</form>' +
      '</div>' +
      '</div>' +
      // SETTINGS PANEL
      '<div class="bb-panel" id="bb-panel-settings">' +
      '<div class="bb-panel-header">' +
      '<h2 class="bb-panel-title">Settings</h2>' +
      '<p class="bb-panel-subtitle">Manage your account preferences.</p>' +
      '</div>' +
      '<div class="bb-profile-form">' +
      '<div class="bb-form-group"><label class="bb-form-label">Account Status</label><input type="text" class="bb-form-input" value="' +
      (currentUser.isVerified ? '✓ Verified' : '⏳ Pending Verification') +
      '" disabled /></div>' +
      '<div class="bb-form-group"><label class="bb-form-label">Role</label><input type="text" class="bb-form-input" value="' +
      (currentUser.role
        ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
        : 'Buyer') +
      '" disabled /></div>' +
      '<div style="margin-top:var(--space-xl);">' +
      '<button onclick="Pages.renderLogin(); Pages.handleLogout();" style="width:100%;height:48px;padding:0 var(--space-xl);border:1px solid #d4d4d4;border-radius:var(--radius-md);background:#fff;font-size:var(--text-sm);font-weight:600;cursor:pointer;color:#1a1a1a;">🚪 Log Out</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</main>' +
      '</div>' +
      '</div>';

    window.scrollTo({ top: 0 });
  };

  // Best Buy dashboard tab switcher
  Pages.switchDashboardTabBB = function (tabId) {
    document.querySelectorAll('.bb-dashboard-nav-link').forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    document.querySelectorAll('.bb-panel').forEach(function (panel) {
      panel.classList.toggle('active', panel.id === 'bb-panel-' + tabId);
    });
  };

  // ============================================
  // NAVBAR INTERACTIONS
  // ============================================

  // Toggle expandable search bar
  Pages.toggleSearch = function () {
    const searchBar = document.getElementById('navbar-search');
    if (searchBar) {
      searchBar.classList.toggle('active');
      if (searchBar.classList.contains('active')) {
        const input = document.getElementById('navbar-search-input');
        if (input) {
          setTimeout(function () {
            input.focus();
          }, 100);
        }
      }
    }
  };

  // Handle search submission
  Pages.handleSearch = function () {
    const input = document.getElementById('navbar-search-input');
    if (input && input.value.trim()) {
      window.location.hash = '/browse?q=' + encodeURIComponent(input.value.trim());
      Pages.toggleSearch();
    }
  };

  // Enter key on search input
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'navbar-search-input') {
      Pages.handleSearch();
    }
    if (e.key === 'Escape') {
      const searchBar = document.getElementById('navbar-search');
      if (searchBar && searchBar.classList.contains('active')) {
        Pages.toggleSearch();
      }
      Pages.closeMobileMenu();
    }
  });

  // Toggle mobile menu drawer
  Pages.toggleMobileMenu = function () {
    const drawer = document.getElementById('navbar-drawer');
    const overlay = document.getElementById('navbar-overlay');
    if (drawer && overlay) {
      drawer.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  // Close mobile menu drawer
  Pages.closeMobileMenu = function () {
    const drawer = document.getElementById('navbar-drawer');
    const overlay = document.getElementById('navbar-overlay');
    if (drawer && overlay) {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  };

  // Override updateNavbar to also update mobile drawer
  const originalUpdateNavbar = Pages.updateNavbar;
  Pages.updateNavbar = function () {
    if (originalUpdateNavbar) {
      originalUpdateNavbar.call(this);
    }
    const currentUser = StorageManager.get(STORAGE_KEYS.CURRENT_USER, true);
    const authBtns = document.getElementById('navbar-auth-buttons');
    const userMenu = document.getElementById('navbar-user-menu');
    const drawerAuth = document.getElementById('navbar-drawer-auth');
    const drawerUser = document.getElementById('navbar-drawer-user');

    if (currentUser) {
      if (authBtns) {
        authBtns.style.display = 'none';
      }
      if (userMenu) {
        userMenu.style.display = 'flex';
      }
      if (drawerAuth) {
        drawerAuth.style.display = 'none';
      }
      if (drawerUser) {
        drawerUser.style.display = 'block';
      }
    } else {
      if (authBtns) {
        authBtns.style.display = 'flex';
      }
      if (userMenu) {
        userMenu.style.display = 'none';
      }
      if (drawerAuth) {
        drawerAuth.style.display = 'block';
      }
      if (drawerUser) {
        drawerUser.style.display = 'none';
      }
    }
  };

  console.log('✅ Best Buy auth & dashboard renderers loaded');
})();
