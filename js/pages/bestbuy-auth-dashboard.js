// ============================================
// BEST BUY AUTH & DASHBOARD RENDERERS
// Replaces the default renderLogin, renderRegister, renderDashboard with Best Buy-style pages
// ============================================

(function () {
  // Wait for Pages to be available
  const waitForPages = setInterval(function () {
    if (typeof Pages === 'undefined') {
      return; // Not ready yet
    }
    clearInterval(waitForPages);

    // Store originals
    const _originalRenderLogin = Pages.renderLogin;
    const _originalRenderRegister = Pages.renderRegister;
    const _originalRenderDashboard = Pages.renderDashboard;

    // ============================================
    // LOGIN - Best Buy Style
    // ============================================
    Pages.renderLogin = function () {
      Pages.showOriginalNavFooter();

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
      '<img src="/favicon.png" alt="Uni-Hub" width="40" height="40" style="border-radius: 8px;" />' +
      '</div>' +
      '<h2 class="bb-auth-brand-title"><span id="bb-typewriter-text"></span><span class="bb-typewriter-cursor" id="bb-typewriter-cursor"></span></h2>' +
      '<p class="bb-auth-brand-desc">Sign in to your account to access your university marketplace. Buy, sell, and connect with fellow students.</p>' +
      '</div>' +
      '</div>' +
      '<div class="bb-auth-form-section">' +
      '<div class="bb-auth-form-container">' +
      '<div class="bb-auth-logo">' +
      '<img src="/favicon.png" alt="Uni-Hub" width="36" height="36" style="border-radius: 6px;" />' +
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
      '<input type="checkbox" id="remember-me" name="rememberMe" />' +
      '<label for="remember-me">Remember me</label>' +
      '</div>' +
      '<button type="submit" class="bb-submit-btn">Sign In</button>' +
      '</form>' +
      '<div class="bb-auth-footer">' +
      '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">' +
      '<a href="#" onclick="Pages.renderForgotPassword(); return false;" style="color: #93c5fd; text-decoration: none; font-size: 0.85rem; font-weight: 500; transition: color 0.2s;" onmouseover="this.style.color=\'#fff\'" onmouseout="this.style.color=\'#93c5fd\'">Forgot Password?</a>' +
      '<p style="margin: 0; font-size: 0.85rem; color: #a1a1aa;">Don\'t have an account? <a href="#" onclick="Pages.renderRegister(); return false;" style="color: #93c5fd; text-decoration: none; font-weight: 500; transition: color 0.2s;" onmouseover="this.style.color=\'#fff\'" onmouseout="this.style.color=\'#93c5fd\'">Create an account</a></p>' +
      '</div>' +
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
    // Redirect to landing page after login
    Pages.renderLanding();
  } else {
    Toast.error('Login failed: ' + result.error);
  }
};

    // ============================================
    // REGISTER - Best Buy Style
    // ============================================
    Pages.renderRegister = async function () {
      Pages.showOriginalNavFooter();

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
      '<img src="/favicon.png" alt="Uni-Hub" width="40" height="40" style="border-radius: 8px;" />' +
      '</div>' +
      '<h2 class="bb-auth-brand-title"><span id="bb-typewriter-text"></span><span class="bb-typewriter-cursor" id="bb-typewriter-cursor"></span></h2>' +
      '<p class="bb-auth-brand-desc">Create your free account and start buying and selling with verified students at your university.</p>' +
      '</div>' +
      '</div>' +
      '<div class="bb-auth-form-section">' +
      '<div class="bb-auth-form-container">' +
      '<div class="bb-auth-logo">' +
      '<img src="/favicon.png" alt="Uni-Hub" width="36" height="36" style="border-radius: 6px;" />' +
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
'<div class="bb-form-group">' +
'<label for="reg-phone" class="bb-form-label">Phone Number <span class="required-star">*</span></label>' +
'<div style="display: flex; gap: 8px;">' +
'<input type="tel" id="reg-phone" name="phone" class="bb-form-input" placeholder="+233 50 123 4567" required style="flex: 1;" />' +
'<button type="button" id="send-otp-btn-bb" class="bb-submit-btn" style="white-space: nowrap; padding: 10px 16px; font-size: 13px; min-width: auto; margin: 0;" onclick="Pages.sendOtp(\'reg-phone\', \'send-otp-btn-bb\', \'otp-section-bb\')">Send Code</button>' +
'</div>' +
'<div id="otp-section-bb" style="display: none; margin-top: 12px;">' +
'<label for="otp-code-bb" class="bb-form-label">Verification Code</label>' +
'<div style="display: flex; gap: 8px;">' +
'<input type="text" id="otp-code-bb" placeholder="Enter 6-digit code" class="bb-form-input" maxlength="6" style="flex: 1;" />' +
'<button type="button" id="verify-otp-btn-bb" class="bb-submit-btn" style="white-space: nowrap; padding: 10px 16px; font-size: 13px; min-width: auto; margin: 0;" onclick="Pages.verifyOtpAndProceed(\'reg-phone\', \'otp-code-bb\', \'verify-otp-btn-bb\', \'otp-section-bb\', \'phone-verified-msg-bb\')">Verify</button>' +
'</div>' +
'<div id="otp-timer-bb" style="font-size: 12px; color: #6b7280; margin-top: 4px;"></div>' +
'<div id="phone-verified-msg-bb" style="display: none; color: #10b981; font-size: 13px; margin-top: 6px; font-weight: 600;">&#10003; Phone number verified</div>' +
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
  const verifiedMsg = document.getElementById('phone-verified-msg-bb');
  if (!verifiedMsg || verifiedMsg.style.display === 'none') {
    Toast.error('Please verify your phone number with OTP before creating an account.');
    return;
  }
  const firstName = document.getElementById('reg-firstName').value;
  const lastName = document.getElementById('reg-lastName').value;
  const email = document.getElementById('reg-email').value;
  const phone = document.getElementById('reg-phone').value;
  const password = document.getElementById('reg-password').value;
  const university = document.getElementById('reg-university').value;
  const fullName = firstName + ' ' + lastName;

  const userData = {
    fullName: fullName,
    email: email,
    phone: phone,
    password: password,
    university: university,
  };

  const result = await authManager.register(userData);
  if (result.success) {
    Pages.updateNavbar();
    Pages.updateCartBadge();
    Pages.renderLanding();
  } else {
    Toast.error('Registration failed: ' + result.error);
  }
};

  // ============================================
  // DASHBOARD - Best Buy Style
  // ============================================
  Pages.renderDashboard = async function () {
    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    const currentUser = session?.user || null;
    if (!currentUser) {
      Toast.warning('Please login to view your dashboard.');
      Pages.renderLogin();
      return;
    }

      Pages.showOriginalNavFooter();

      const orders = await checkoutManager.getUserOrders(currentUser.id || '');
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
      const recentOrders = Array.isArray(orders) ? orders.slice(0, 5) : [];

  const safeFullName = (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) ? SecurityUtils.escapeHtml(currentUser.fullName) : currentUser.fullName;
    const safeEmail = (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) ? SecurityUtils.escapeHtml(currentUser.email) : currentUser.email;
    const safePhone = (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) ? SecurityUtils.escapeHtml(currentUser.phone || '') : (currentUser.phone || '');
    const safeUniversity = (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) ? SecurityUtils.escapeHtml(currentUser.university || '') : (currentUser.university || '');
    const safeFirstName = safeFullName.split(' ')[0];

    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML =
    '<div class="bb-dashboard">' +
    '<div class="bb-dashboard-header">' +
    '<div class="bb-dashboard-header-inner">' +
    '<h1 class="bb-dashboard-title">My Account</h1>' +
    '<div class="bb-dashboard-user">' +
    '<div class="bb-dashboard-info">' +
    '<div class="bb-dashboard-user-name">' +
    safeFullName +
    '</div>' +
    '<div class="bb-dashboard-user-email">' +
    safeEmail +
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
    '<div class="bb-dashboard-nav-item"><button class="bb-dashboard-nav-link active" data-tab="overview" onclick="Pages.switchDashboardTabBB(\'overview\')"><span class="bb-dashboard-nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg></span>Overview</button></div>' +
    '<div class="bb-dashboard-nav-item"><button class="bb-dashboard-nav-link" data-tab="orders" onclick="Pages.switchDashboardTabBB(\'orders\')"><span class="bb-dashboard-nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></span>Orders' +
    (orders.length > 0
    ? '<span class="bb-dashboard-nav-badge">' + orders.length + '</span>'
    : '') +
    '</button></div>' +
    '<div class="bb-dashboard-nav-item"><button class="bb-dashboard-nav-link" data-tab="wishlist" onclick="Pages.switchDashboardTabBB(\'wishlist\')"><span class="bb-dashboard-nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></span>Wishlist' +
    (wishlist.length > 0
    ? '<span class="bb-dashboard-nav-badge">' + wishlist.length + '</span>'
    : '') +
    '</button></div>' +
    '<div class="bb-dashboard-nav-item"><button class="bb-dashboard-nav-link" data-tab="cart" onclick="Pages.switchDashboardTabBB(\'cart\')"><span class="bb-dashboard-nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg></span>Cart' +
    (cartCount > 0 ? '<span class="bb-dashboard-nav-badge">' + cartCount + '</span>' : '') +
    '</button></div>' +
    '<div class="bb-dashboard-nav-item"><button class="bb-dashboard-nav-link" data-tab="profile" onclick="Pages.switchDashboardTabBB(\'profile\')"><span class="bb-dashboard-nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>Profile</button></div>' +
    '<div class="bb-dashboard-nav-item"><button class="bb-dashboard-nav-link" data-tab="settings" onclick="Pages.switchDashboardTabBB(\'settings\')"><span class="bb-dashboard-nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></span>Settings</button></div>' +
    '</nav>' +
    '<main class="bb-dashboard-main">' +
    // OVERVIEW PANEL
    '<div class="bb-panel active" id="bb-panel-overview">' +
    '<div class="bb-panel-header">' +
    '<h2 class="bb-panel-title">Welcome back, ' +
    safeFirstName +
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
    (safeUniversity ? safeUniversity.toUpperCase() : 'N/A') +
    '</div><div class="bb-stat-label">University</div></div>' +
    '</div>' +
    '<h3 style="font-size:var(--text-lg);font-weight:700;color:#1a1a1a;margin-bottom:var(--space-md);">Recent Orders</h3>' +
    '<div class="bb-orders-list">' +
    (recentOrders.length > 0
    ? recentOrders
    .map(function (order) {
    var safeOrderNumber = (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) ? SecurityUtils.escapeHtml(order.orderNumber) : order.orderNumber;
    return (
    '<div class="bb-order-card">' +
    '<div class="bb-order-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></div>' +
    '<div class="bb-order-info"><div class="bb-order-number">Order #' +
    safeOrderNumber +
    '</div><div class="bb-order-details">' +
    order.items.length +
    ' item(s) \u2022 ' +
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
    : '<div class="bb-empty"><div class="bb-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></div><h3 class="bb-empty-title">No orders yet</h3><p class="bb-empty-desc">Start shopping to see your orders here!</p></div>') +
    '</div>' +
    '<div class="bb-quick-actions">' +
    '<a href="#/browse" class="bb-quick-action" onclick="Pages.renderBrowse(); return false;"><span class="bb-quick-action-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span><span class="bb-quick-action-label">Browse Items</span></a>' +
    
    '<a href="#/cart" class="bb-quick-action" onclick="Pages.renderCart(); return false;"><span class="bb-quick-action-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg></span><span class="bb-quick-action-label">View Cart</span></a>' +
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
    var safeOrderNumber = (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) ? SecurityUtils.escapeHtml(order.orderNumber) : order.orderNumber;
    return (
    '<div class="bb-order-card">' +
    '<div class="bb-order-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></div>' +
    '<div class="bb-order-info"><div class="bb-order-number">Order #' +
    safeOrderNumber +
    '</div><div class="bb-order-details">' +
    order.items.length +
    ' item(s) \u2022 ' +
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
    : '<div class="bb-empty"><div class="bb-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg></div><h3 class="bb-empty-title">No orders yet</h3><p class="bb-empty-desc">Browse products and make your first purchase!</p></div>') +
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
    var safeId = (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) ? SecurityUtils.escapeHtml(product.id) : product.id;
    var safeTitle = (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) ? SecurityUtils.escapeHtml(product.title) : product.title;
    var safeImage = product.images && product.images[0] ? ((typeof SecurityUtils !== 'undefined' && SecurityUtils.sanitizeUrl) ? (SecurityUtils.sanitizeUrl(product.images[0]) || '') : product.images[0]) : '';
    return (
    '<div class="bb-wishlist-card" onclick="Pages.renderProductDetail(\'' +
    safeId.replace(/'/g, "\\'") +
    '\')">' +
    '<img src="' +
    safeImage +
    '" alt="' +
    safeTitle +
    '" class="bb-wishlist-image" />' +
    '<div class="bb-wishlist-info">' +
    '<h4 class="bb-wishlist-title">' +
    safeTitle +
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
    : '<div class="bb-empty"><div class="bb-empty-icon">' + Icons.heartOutline + '</div><h3 class="bb-empty-title">Your wishlist is empty</h3><p class="bb-empty-desc">Save items you love to find them later!</p></div>') +
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
    var safeItemTitle = (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) ? SecurityUtils.escapeHtml(item.product.title) : item.product.title;
    return (
    '<div class="bb-order-card">' +
    '<div class="bb-order-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg></div>' +
    '<div class="bb-order-info"><div class="bb-order-number">' +
    safeItemTitle +
    '</div><div class="bb-order-details">Qty: ' +
    item.quantity +
    ' \u00d7 ' +
    item.product.price.toLocaleString() +
    ' GHS</div></div>' +
    '</div>'
    );
    })
    .join('') +
    '</div>' +
    '<div style="margin-top:1.5rem;display:flex;gap:var(--space-md);">' +
    '<button onclick="cartManager.clear(); Pages.renderDashboard();" style="padding:var(--space-md) var(--space-xl);border:1px solid #d4d4d4;border-radius:var(--radius-md);background:#fff;font-size:var(--text-sm);font-weight:600;cursor:pointer;">Clear Cart</button>' +
    '<button onclick="event.preventDefault(); Pages.handleProceedToCheckout();" style="padding:var(--space-md) var(--space-xl);background:#0046be;color:#fff;border:none;border-radius:var(--radius-md);font-size:var(--text-sm);font-weight:700;cursor:pointer;">Proceed to Checkout \u2192</button>' +
    '</div>'
    : '<div class="bb-empty"><div class="bb-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg></div><h3 class="bb-empty-title">Your cart is empty</h3><p class="bb-empty-desc">Add items to get started!</p></div>') +
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
    safeFullName +
    '" required /></div>' +
    '<div class="bb-form-group"><label class="bb-form-label">Email</label><input type="email" id="email" name="email" class="bb-form-input" value="' +
    safeEmail +
    '" required /></div>' +
    '<div class="bb-form-group"><label class="bb-form-label">Phone</label><input type="tel" id="phone" name="phone" class="bb-form-input" value="' +
    safePhone +
    '" /></div>' +
    '<div class="bb-form-group"><label class="bb-form-label">University</label><input type="text" class="bb-form-input" value="' +
    (safeUniversity || 'Not set') +
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
    (currentUser.isVerified ? 'Verified' : 'Pending Verification') +
    '" disabled /></div>' +
    '<div class="bb-form-group"><label class="bb-form-label">Role</label><input type="text" class="bb-form-input" value="' +
    (currentUser.role
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
    : 'Buyer') +
    '" disabled /></div>' +
    '<div style="margin-top:var(--space-xl);">' +
    '<button onclick="Pages.handleLogout();" style="width:100%;height:48px;padding:0 var(--space-xl);border:1px solid #d4d4d4;border-radius:var(--radius-md);background:#fff;font-size:var(--text-sm);font-weight:600;cursor:pointer;color:#1a1a1a;">' + Icons.logout + ' Log Out</button>' +
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
  // Use authManager for authentication check (not STORAGE_KEYS)
  const isLoggedIn = typeof authManager !== 'undefined' && authManager.isLoggedIn();
  const authBtns = document.getElementById('navbar-auth-buttons');
  const userMenu = document.getElementById('navbar-user-menu');
  const drawerAuth = document.getElementById('navbar-drawer-auth');
  const drawerUser = document.getElementById('navbar-drawer-user');

  if (isLoggedIn) {
    if (authBtns) authBtns.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';
    if (drawerAuth) drawerAuth.style.display = 'none';
    if (drawerUser) drawerUser.style.display = 'block';
  } else {
    if (authBtns) authBtns.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
    if (drawerAuth) drawerAuth.style.display = 'block';
    if (drawerUser) drawerUser.style.display = 'none';
  }
    };

    console.log('✓ Best Buy auth & dashboard renderers loaded');

  Pages.sendOtp = async function (phoneInputId, btnId, otpSectionId) {
    if (typeof AuthPageMethods !== 'undefined' && AuthPageMethods.sendOtp) {
      return AuthPageMethods.sendOtp(phoneInputId, btnId, otpSectionId);
    }
  };
  Pages.verifyOtpAndProceed = async function (phoneInputId, codeInputId, btnId, otpSectionId, verifiedMsgId) {
    if (typeof AuthPageMethods !== 'undefined' && AuthPageMethods.verifyOtpAndProceed) {
      return AuthPageMethods.verifyOtpAndProceed(phoneInputId, codeInputId, btnId, otpSectionId, verifiedMsgId);
    }
  };
  }, 50); // Check every 50ms
})();
