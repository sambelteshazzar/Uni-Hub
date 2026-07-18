// ============================================
// BEST BUY AUTH & DASHBOARD RENDERERS
// Canonical login, register, forgot/reset password, verification pages
// ============================================

(function () {
  var waitForPages = setInterval(function () {
    if (typeof Pages === 'undefined') return;
    clearInterval(waitForPages);

    // ============================================
    // SHARED: social button SVGs & offline handler
    // ============================================
    var isOffline = function () {
      return (typeof api !== 'undefined' && api.isStaticDeploy);
    };

var socialBtnStyle =
    '<style>' +
    '.bb-social-divider { position: relative; margin: 1.25rem 0; text-align: center; }' +
    '.bb-social-divider::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; border-top: 1px solid var(--border-light); }' +
    '.bb-social-divider span { position: relative; background: var(--bg-primary); padding: 0 0.75rem; font-size: 0.75rem; color: var(--neutral-600); text-transform: uppercase; letter-spacing: 0.05em; }' +
    '.bb-google-btn { display: flex; align-items: center; justify-content: center; gap: 0.625rem; width: 100%; height: 44px; border: 1px solid var(--border-medium); border-radius: 0.375rem; background: var(--bg-primary); cursor: pointer; transition: all 0.15s ease; font-size: 0.875rem; font-weight: 600; color: var(--neutral-900); margin-bottom: 1.25rem; }' +
    '.bb-google-btn:hover { border-color: var(--primary); background: var(--bg-secondary); }' +
    '.bb-google-btn:active { background: var(--primary-light); }' +
    '</style>';

  var googleSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width:1.25rem;height:1.25rem;">' +
    '<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>' +
    '<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>' +
    '<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>' +
    '<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>' +
    '</svg>';

  var socialBtnsHTML = function (label) {
    return socialBtnStyle +
    '<div class="bb-social-divider"><span>Or continue with</span></div>' +
    '<button type="button" class="bb-google-btn" title="' + label + ' with Google" onclick="Pages.handleSocialLogin(\'google\')">' + googleSVG + ' <span>' + label + ' with Google</span></button>';
  };

    // ============================================
    // SHARED: typewriter animation
    // ============================================
    var runTypewriter = function (phrases) {
      var speed = 80;
      var deleteSpeed = 40;
      var pauseDuration = 2000;
      var phraseIndex = 0;
      var charIndex = 0;
      var isDeleting = false;
      var isPaused = false;
      var textEl = document.getElementById('bb-typewriter-text');
      var cursorEl = document.getElementById('bb-typewriter-cursor');
      if (!textEl || !cursorEl) return;

      function type() {
        var currentPhrase = phrases[phraseIndex];
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
    };

    // ============================================
    // PASSWORD TOGGLE
    // ============================================
    Pages.togglePassword = function (inputId, btn) {
      var input = document.getElementById(inputId);
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
      } else {
        input.type = 'password';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      }
    };

    // ============================================
    // SOCIAL LOGIN HANDLER
    // ============================================
  Pages.handleSocialLogin = function (provider) {
    if (isOffline()) {
      showToast('Google Sign-In is not available in offline mode. Please use email and password.', 'info');
      return;
    }
    if (provider !== 'google') {
      showToast('Only Google Sign-In is supported at this time.', 'info');
      return;
    }
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
      var tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: window.GOOGLE_CLIENT_ID || '',
        scope: 'openid email profile',
        callback: function (tokenResponse) {
          if (tokenResponse.access_token) {
            Pages._handleGoogleToken(tokenResponse.access_token);
          } else {
            showToast('Google Sign-In was cancelled or failed.', 'error');
          }
        },
        error_callback: function () {
          showToast('Google Sign-In failed. Please try again.', 'error');
        }
      });
      tokenClient.requestAccessToken();
    } else {
      showToast('Google Sign-In is loading. Please try again in a moment.', 'info');
    }
  };

  Pages._handleGoogleToken = async function (accessToken) {
    try {
      showToast('Signing in with Google...', 'info');
      var res = await fetch('/api/auth/google/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken })
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Google login failed');
      if (typeof authManager !== 'undefined') {
        authManager.setSession(data.user, data.token);
      }
      showToast('Signed in with Google!', 'success');
      setTimeout(function () { window.location.hash = '#browse'; }, 500);
    } catch (err) {
      showToast(err.message || 'Google Sign-In failed. Please try again.', 'error');
    }
  };

    // ============================================
    // LOGIN
    // ============================================
    Pages.renderLogin = function () {
      Pages.showOriginalNavFooter();
      var mainContent = document.getElementById('main-content');
      mainContent.innerHTML =
        '<div class="bb-auth-page">' +
        '<div class="bb-auth-branding">' +
        '<style>' +
        '@keyframes bb-cursor-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }' +
        '.bb-typewriter-cursor { display: inline-block; width: 3px; height: 1.2em; background: #ffce00; margin-left: 4px; vertical-align: text-bottom; animation: bb-cursor-blink 0.8s infinite; }' +
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
        socialBtnsHTML('Sign in') +
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
        '<a href="#" onclick="Pages.renderForgotPassword(); return false;" style="color: var(--primary); text-decoration: none; font-size: 0.85rem; font-weight: 500; transition: color 0.2s;" onmouseover="this.style.color=\'var(--primary-hover)\'" onmouseout="this.style.color=\'var(--primary)\'">Forgot Password?</a>' +
        '<p style="margin: 0; font-size: 0.85rem; color: var(--neutral-600);">Don\'t have an account? <a href="#" onclick="Pages.renderRegister(); return false;" style="color: var(--primary); text-decoration: none; font-weight: 500; transition: color 0.2s;" onmouseover="this.style.color=\'var(--primary-hover)\'" onmouseout="this.style.color=\'var(--primary)\'">Create an account</a></p>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>';

      window.scrollTo({ top: 0 });
      runTypewriter(['Welcome Back', 'Your Campus Marketplace', 'Great Deals Await You', 'Sign In & Start Shopping']);
    };

    // ============================================
    // LOGIN HANDLER
    // ============================================
    Pages.handleLoginBB = async function (event) {
      event.preventDefault();
      var email = document.getElementById('login-email').value;
      var password = document.getElementById('login-password').value;
      var result = await authManager.login(email, password);
      if (result.success) {
        Pages.updateNavbar();
        Pages.updateCartBadge();
        showToast('Welcome back, ' + (result.user.fullName || email) + '!', 'success');
        window.location.hash = '#/browse';
        Pages.renderBrowse();
      } else if (result.isOffline) {
        Pages.updateNavbar();
        Pages.updateCartBadge();
        showToast('You are in offline mode. Browse with demo data.', 'info');
        window.location.hash = '#/browse';
        Pages.renderBrowse();
      } else {
        showToast('Login failed: ' + result.error, 'error');
      }
    };

    // ============================================
    // REGISTER
    // ============================================
    Pages.renderRegister = async function () {
      Pages.showOriginalNavFooter();
      var mainContent = document.getElementById('main-content');
      var config = { universities: [] };
      try { config = await api.loadJSON('data/config.json'); } catch (e) { /* empty */ }

      var uniOptions = config.universities
        .map(function (u) { return '<option value="' + u.id + '">' + u.name + '</option>'; })
        .join('');

      mainContent.innerHTML =
        '<div class="bb-auth-page">' +
        '<div class="bb-auth-branding">' +
        '<style>' +
        '@keyframes bb-cursor-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }' +
        '.bb-typewriter-cursor { display: inline-block; width: 3px; height: 1.2em; background: #ffce00; margin-left: 4px; vertical-align: text-bottom; animation: bb-cursor-blink 0.8s infinite; }' +
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
        socialBtnsHTML('Sign up') +
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
        '<span>I agree to the <a href="#" style="color: var(--primary); text-decoration: underline;">Terms of Service</a> and <a href="#" style="color: var(--primary); text-decoration: underline;">Privacy Policy</a></span>' +
        '</label>' +
        '</div>' +
        '<button type="submit" class="bb-submit-btn">Create Account</button>' +
        '</form>' +
        '<div class="bb-auth-footer">' +
        '<p style="margin: 0; font-size: 0.85rem; color: var(--neutral-600);">Already have an account? <a href="#" onclick="Pages.renderLogin(); return false;" style="color: var(--primary); text-decoration: none; font-weight: 500; transition: color 0.2s;" onmouseover="this.style.color=\'var(--primary-hover)\'" onmouseout="this.style.color=\'var(--primary)\'">Sign in</a></p>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>';

      window.scrollTo({ top: 0 });
      runTypewriter(['Join Uni-Hub', 'Your Campus Marketplace', 'Buy & Sell with Students', 'Create Your Account']);
    };

    // ============================================
    // REGISTER HANDLER
    // ============================================
    Pages.handleRegisterBB = async function (event) {
      event.preventDefault();
      var firstName = document.getElementById('reg-firstName').value;
      var lastName = document.getElementById('reg-lastName').value;
      var email = document.getElementById('reg-email').value;
      var password = document.getElementById('reg-password').value;
      var phone = document.getElementById('reg-phone').value;
      var university = document.getElementById('reg-university').value;

      var result = await authManager.register({
        fullName: firstName + ' ' + lastName,
        email: email,
        password: password,
        phone: phone,
        university: university,
      });

      if (result.success) {
        Pages.updateNavbar();
        showToast('Account created! Welcome, ' + firstName + '!', 'success');
        window.location.hash = '#/browse';
        Pages.renderBrowse();
      } else if (result.isOffline) {
        Pages.updateNavbar();
        showToast('Registered in offline mode. You can now browse with demo data.', 'info');
        window.location.hash = '#/browse';
        Pages.renderBrowse();
      } else {
        showToast('Registration failed: ' + result.error, 'error');
      }
    };

    // ============================================
    // FORGOT PASSWORD
    // ============================================
    Pages.renderForgotPassword = function () {
      Pages.showOriginalNavFooter();
      var mainContent = document.getElementById('main-content');
      mainContent.innerHTML =
        '<div class="bb-auth-page">' +
        '<div class="bb-auth-branding">' +
        '<div class="bb-auth-brand-content">' +
        '<div class="bb-auth-brand-logo">' +
        '<img src="/favicon.png" alt="Uni-Hub" width="40" height="40" style="border-radius: 8px;" />' +
        '</div>' +
        '<h2 class="bb-auth-brand-title">Forgot Password?</h2>' +
        '<p class="bb-auth-brand-desc">No worries. Enter your email address and we\'ll send you a link to reset your password.</p>' +
        '</div>' +
        '</div>' +
        '<div class="bb-auth-form-section">' +
        '<div class="bb-auth-form-container">' +
        '<div class="bb-auth-logo">' +
        '<img src="/favicon.png" alt="Uni-Hub" width="36" height="36" style="border-radius: 6px;" />' +
        '</div>' +
        '<div class="bb-auth-form-header">' +
        '<h1 class="bb-auth-form-title">Reset Password</h1>' +
        '<p class="bb-auth-form-subtitle">Enter your email to receive a reset link</p>' +
        '</div>' +
        '<form id="forgot-form-bb" onsubmit="Pages.handleForgotPasswordBB(event)">' +
        '<div class="bb-form-group">' +
        '<label for="forgot-email" class="bb-form-label">Email Address <span class="required-star">*</span></label>' +
        '<input type="email" id="forgot-email" name="email" class="bb-form-input" placeholder="name@university.edu" required />' +
        '</div>' +
        '<button type="submit" class="bb-submit-btn">Send Reset Link</button>' +
        '</form>' +
        '<div class="bb-auth-footer">' +
        '<p style="margin: 0; font-size: 0.85rem; color: var(--neutral-600);"><a href="#" onclick="Pages.renderLogin(); return false;" style="color: var(--primary); text-decoration: none; font-weight: 500; transition: color 0.2s;" onmouseover="this.style.color=\'var(--primary-hover)\'" onmouseout="this.style.color=\'var(--primary)\'">Back to Login</a></p>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>';

      window.scrollTo({ top: 0 });
    };

    Pages.handleForgotPasswordBB = async function (event) {
      event.preventDefault();
      var email = document.getElementById('forgot-email').value;
      var submitBtn = document.querySelector('#forgot-form-bb button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        var baseURL = (typeof window !== 'undefined' && window.API_URL) || 'https://uni-hub-bnxi.onrender.com/api';
        if (typeof api !== 'undefined' && api.isStaticDeploy) {
          showToast('Password reset is not available in offline mode. Please log in with your existing credentials.', 'info');
          setTimeout(function () { Pages.renderLogin(); }, 2000);
        } else {
          var response = await fetch(baseURL + '/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email }),
          });
          var result = await response.json();
          if (result.success) {
            showToast(result.message, 'success');
            if (result.resetToken) {
              Pages.renderResetPassword(result.resetToken);
            } else {
              Pages.renderLogin();
            }
          } else {
            showToast(result.error || 'Failed to send reset link', 'error');
          }
        }
      } catch (error) {
        showToast('Running in offline mode. Please log in with your existing credentials.', 'info');
        setTimeout(function () { Pages.renderLogin(); }, 3000);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';
      }
    };

    // ============================================
    // RESET PASSWORD
    // ============================================
    Pages.renderResetPassword = function (token) {
      Pages.showOriginalNavFooter();
      token = token || '';
      var mainContent = document.getElementById('main-content');
      mainContent.innerHTML =
        '<div class="bb-auth-page">' +
        '<div class="bb-auth-branding">' +
        '<div class="bb-auth-brand-content">' +
        '<div class="bb-auth-brand-logo">' +
        '<img src="/favicon.png" alt="Uni-Hub" width="40" height="40" style="border-radius: 8px;" />' +
        '</div>' +
        '<h2 class="bb-auth-brand-title">Set New Password</h2>' +
        '<p class="bb-auth-brand-desc">Enter your new password below to regain access to your account.</p>' +
        '</div>' +
        '</div>' +
        '<div class="bb-auth-form-section">' +
        '<div class="bb-auth-form-container">' +
        '<div class="bb-auth-logo">' +
        '<img src="/favicon.png" alt="Uni-Hub" width="36" height="36" style="border-radius: 6px;" />' +
        '</div>' +
        '<div class="bb-auth-form-header">' +
        '<h1 class="bb-auth-form-title">New Password</h1>' +
        '<p class="bb-auth-form-subtitle">Choose a strong password for your account</p>' +
        '</div>' +
        '<form id="reset-form-bb" onsubmit="Pages.handleResetPasswordBB(event, \'' + token + '\')">' +
        '<div class="bb-form-group">' +
        '<label for="reset-newPassword" class="bb-form-label">New Password <span class="required-star">*</span></label>' +
        '<div class="bb-password-wrapper">' +
        '<input type="password" id="reset-newPassword" name="newPassword" class="bb-form-input" placeholder="At least 6 characters" required minlength="6" />' +
        '<button type="button" class="bb-password-toggle" onclick="Pages.togglePassword(\'reset-newPassword\', this)">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>' +
        '</button>' +
        '</div>' +
        '</div>' +
        '<div class="bb-form-group">' +
        '<label for="reset-confirmPassword" class="bb-form-label">Confirm Password <span class="required-star">*</span></label>' +
        '<div class="bb-password-wrapper">' +
        '<input type="password" id="reset-confirmPassword" name="confirmPassword" class="bb-form-input" placeholder="Re-enter your password" required minlength="6" />' +
        '<button type="button" class="bb-password-toggle" onclick="Pages.togglePassword(\'reset-confirmPassword\', this)">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>' +
        '</button>' +
        '</div>' +
        '</div>' +
        '<button type="submit" class="bb-submit-btn">Reset Password</button>' +
        '</form>' +
        '<div class="bb-auth-footer">' +
        '<p style="margin: 0; font-size: 0.85rem; color: var(--neutral-600);"><a href="#" onclick="Pages.renderLogin(); return false;" style="color: var(--primary); text-decoration: none; font-weight: 500; transition: color 0.2s;" onmouseover="this.style.color=\'var(--primary-hover)\'" onmouseout="this.style.color=\'var(--primary)\'">Back to Login</a></p>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>';

      window.scrollTo({ top: 0 });
    };

    Pages.handleResetPasswordBB = async function (event, token) {
      event.preventDefault();
      var form = document.getElementById('reset-form-bb');
      var newPassword = form.newPassword.value;
      var confirmPassword = form.confirmPassword.value;
      var submitBtn = form.querySelector('button[type="submit"]');

      if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Resetting...';

      try {
        var baseURL = (typeof window !== 'undefined' && window.API_URL) || 'https://uni-hub-bnxi.onrender.com/api';
        if (typeof api !== 'undefined' && api.isStaticDeploy) {
          showToast('Password reset is not available in offline mode. Please log in with your existing credentials.', 'info');
          setTimeout(function () { Pages.renderLogin(); }, 2000);
        } else {
          var response = await fetch(baseURL + '/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token, newPassword: newPassword }),
          });
          var result = await response.json();
          if (result.success) {
            showToast(result.message, 'success');
            setTimeout(function () { Pages.renderLogin(); }, 1500);
          } else {
            showToast(result.error || 'Failed to reset password', 'error');
          }
        }
      } catch (error) {
        showToast('Running in offline mode. Password reset is not available offline. Please log in with your existing credentials.', 'info');
        setTimeout(function () { Pages.renderLogin(); }, 3000);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset Password';
      }
    };

    // ============================================
    // STUDENT VERIFICATION (delegate to AuthPageMethods if available)
    // ============================================
    Pages.renderStudentVerification = function () {
      if (typeof AuthPageMethods !== 'undefined' && AuthPageMethods.renderStudentVerification) {
        AuthPageMethods.renderStudentVerification();
      } else {
        var mainContent = document.getElementById('main-content');
        mainContent.innerHTML =
          '<div class="bb-auth-page">' +
          '<div class="bb-auth-form-section" style="margin: 0 auto;">' +
          '<div class="bb-auth-form-container">' +
          '<div class="bb-auth-form-header">' +
          '<h1 class="bb-auth-form-title">Student Verification</h1>' +
          '<p class="bb-auth-form-subtitle">Verify your student status to unlock full marketplace access.</p>' +
          '</div>' +
          '<div style="text-align: center; padding: 2rem;">' +
          '<p style="color: var(--neutral-600);">Student verification is available after logging in. Please <a href="#" onclick="Pages.renderLogin(); return false;" style="color: var(--primary); text-decoration: underline;">sign in</a> first.</p>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '</div>';
        window.scrollTo({ top: 0 });
      }
    };

    Pages.switchVerificationTab = function (tab) {
      if (typeof AuthPageMethods !== 'undefined' && AuthPageMethods.switchVerificationTab) {
        AuthPageMethods.switchVerificationTab(tab);
      }
    };

    Pages.handleFileSelect = function (inputId, docType) {
      if (typeof AuthPageMethods !== 'undefined' && AuthPageMethods.handleFileSelect) {
        AuthPageMethods.handleFileSelect(inputId, docType);
      }
    };

    // ============================================
    // NAVBAR INTERACTIONS
    // ============================================
Pages.toggleSearch = function () {
  var searchBar = document.querySelector('.navbar-search-always');
  if (searchBar) {
    searchBar.classList.toggle('active');
    if (searchBar.classList.contains('active')) {
      var input = document.getElementById('navbar-search-input');
      if (input) setTimeout(function () { input.focus(); }, 100);
    }
  }
};

Pages.handleSearch = function () {
  var input = document.getElementById('navbar-search-input');
  if (input && input.value.trim()) {
    window.location.hash = '/browse?q=' + encodeURIComponent(input.value.trim());
    var searchBar = document.querySelector('.navbar-search-always');
    if (searchBar && searchBar.classList.contains('active')) searchBar.classList.remove('active');
  }
};

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && e.target.id === 'navbar-search-input') Pages.handleSearch();
  if (e.key === 'Escape') {
    var searchBar = document.querySelector('.navbar-search-always');
    if (searchBar && searchBar.classList.contains('active')) searchBar.classList.remove('active');
    Pages.closeMobileMenu();
  }
});

    Pages.toggleMobileMenu = function () {
      var drawer = document.getElementById('navbar-drawer');
      var overlay = document.getElementById('navbar-overlay');
      if (drawer && overlay) {
        drawer.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    };

    Pages.closeMobileMenu = function () {
      var drawer = document.getElementById('navbar-drawer');
      var overlay = document.getElementById('navbar-overlay');
      if (drawer && overlay) {
        drawer.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
      }
    };

    // Override updateNavbar to also update mobile drawer
    var originalUpdateNavbar = Pages.updateNavbar;
    Pages.updateNavbar = function () {
      var isLoggedIn = typeof authManager !== 'undefined' && authManager.isLoggedIn();
      var authBtns = document.getElementById('navbar-auth-buttons');
      var userMenu = document.getElementById('navbar-user-menu');
      var drawerAuth = document.getElementById('navbar-drawer-auth');
      var drawerUser = document.getElementById('navbar-drawer-user');
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

    console.log('Auth & dashboard renderers loaded');
  }, 50);
})();
