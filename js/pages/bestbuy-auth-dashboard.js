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
    Toast.success('Welcome back, ' + (result.user.fullName || email) + '!');
    window.location.hash = '#/browse';
    Pages.renderBrowse();
  } else if (result.isOffline) {
    Toast.info('You are in offline mode. Browse with demo data.');
    window.location.hash = '#/browse';
    Pages.renderBrowse();
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
    '<input type="tel" id="reg-phone" name="phone" class="bb-form-input" placeholder="+233 50 123 4567" required />' +
    '</div>' +
    '<div class="bb-form-group">' +
    '<label for="reg-university" class="bb-form-label">University <span class="required-star">*</span></label>' +
    '<select id="reg-university" name="university" class="bb-form-input" required>' +
    '<option value="" disabled selected>Select your university</option>' +
    uniOptions +
    '</select>' +
    '</div>' +
    '<div class="bb-form-group">' +
    '<label class="bb-checkbox-label">' +
    '<input type="checkbox" id="reg-terms" name="terms" required />' +
    '<span>I agree to the <a href="#" style="color: #93c5fd; text-decoration: underline;">Terms of Service</a> and <a href="#" style="color: #93c5fd; text-decoration: underline;">Privacy Policy</a></span>' +
    '</label>' +
    '</div>' +
    '<button type="submit" class="bb-submit-btn">Create Account</button>' +
    '</form>' +
    '<div class="bb-auth-footer">' +
    '<p style="margin: 0; font-size: 0.85rem; color: #a1a1aa;">Already have an account? <a href="#" onclick="Pages.renderLogin(); return false;" style="color: #93c5fd; text-decoration: none; font-weight: 500; transition: color 0.2s;" onmouseover="this.style.color=\'#fff\'" onmouseout="this.style.color=\'#93c5fd\'">Sign in</a></p>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>';

  window.scrollTo({ top: 0 });

  // Typewriter animation for Register page
  (function initTypewriter () {
    const phrases = [
      'Join Uni-Hub',
      'Your Campus Marketplace',
      'Buy & Sell with Students',
      'Create Your Account',
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
    if (!textEl || !cursorEl) { return; }

    function type () {
      const currentPhrase = phrases[phraseIndex];
      if (isPaused) {
        setTimeout(function () { isPaused = false; isDeleting = true; type(); }, pauseDuration);
        return;
      }
      if (isDeleting) {
        charIndex--;
        textEl.textContent = currentPhrase.substring(0, charIndex);
        if (charIndex <= 0) { isDeleting = false; phraseIndex = (phraseIndex + 1) % phrases.length; setTimeout(type, 300); }
        else { setTimeout(type, deleteSpeed); }
      } else {
        charIndex++;
        textEl.textContent = currentPhrase.substring(0, charIndex);
        if (charIndex >= currentPhrase.length) { isPaused = true; setTimeout(type, pauseDuration); }
        else { setTimeout(type, speed); }
      }
    }
    type();
  })();
};

Pages.handleRegisterBB = async function (event) {
  event.preventDefault();
  const firstName = document.getElementById('reg-firstName').value;
  const lastName = document.getElementById('reg-lastName').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const phone = document.getElementById('reg-phone').value;
  const university = document.getElementById('reg-university').value;

  const result = await authManager.register({
    firstName,
    lastName,
    email,
    password,
    phone,
    university,
  });

  if (result.success) {
    Pages.updateNavbar();
    Toast.success('Account created! Welcome, ' + firstName + '!');
    window.location.hash = '#/browse';
    Pages.renderBrowse();
  } else if (result.isOffline) {
    Toast.info('Registered in offline mode. You can now browse with demo data.');
    window.location.hash = '#/browse';
    Pages.renderBrowse();
  } else {
    Toast.error('Registration failed: ' + result.error);
  }
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
}, 50); // Check every 50ms
})();
