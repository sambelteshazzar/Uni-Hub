/* eslint-disable no-unused-vars */
// ============================================
// AUTH PAGE METHODS
// ============================================

const _Icons = typeof Icons !== 'undefined' ? Icons : {
  graduation: '🎓',
  email: '📧',
  document: '📄',
  clipboard: '📋',
  upload: '⬆',
};

const AuthPageMethods = {
  renderStudentVerification () {
    const mainContent = document.getElementById('main-content');
    const selectedUniversity = StorageManager.get(STORAGE_KEYS.SELECTED_UNIVERSITY);
    const verification = StorageManager.get(STORAGE_KEYS.STUDENT_VERIFICATION, true);

    // Guard: if the user reached this route without picking a university
    // (e.g. via a deep link, a stale tab, or a session reset), show a
    // clear "pick a university" prompt instead of rendering a form with
    // a blank university name that would 400 on submit.
    if (!selectedUniversity) {
      mainContent.innerHTML = `
        <div class="auth-container" style="max-width: 520px; margin: 4rem auto;">
          <div class="auth-card verification-card" style="text-align: center; padding: 2.5rem 2rem;">
            <div class="verification-icon" style="font-size: 3rem;">${_Icons.graduation}</div>
            <h2 style="margin: 1rem 0 0.5rem;">Pick your university first</h2>
            <p style="color: var(--neutral-600, #6b7280);">
              You need to pick which university you're enrolled at before you can submit
              your student verification.
            </p>
            <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
              <button class="btn btn-primary" data-action="pick-uni">Choose a university</button>
              <button class="btn btn-ghost" data-action="status">Check existing status</button>
            </div>
          </div>
        </div>
      `;
      const card = mainContent.querySelector('.auth-card');
      if (card) {
        card.addEventListener('click', (e) => {
          const a = e.target.closest('[data-action]')?.getAttribute('data-action');
          if (a === 'pick-uni' && Pages.renderLanding) {
            if (typeof window.router !== 'undefined' && window.router.navigate) {
              router.navigate('/');
            } else {
              window.location.hash = '#/';
            }
            Pages.renderLanding();
          } else if (a === 'status' && Pages.renderVerificationStatus) {
            if (typeof window.router !== 'undefined' && window.router.navigate) {
              router.navigate('/verification-status');
            } else {
              window.location.hash = '#/verification-status';
            }
            Pages.renderVerificationStatus();
          }
        });
      }
      return;
    }

    // Get university name and check active status
    let universityName = 'your university';
    api
    .loadJSON('data/config.json')
    .then(config => {
      const uni = config.universities.find(u => u.id === selectedUniversity);
      if (uni) {
        if (uni.active === false) {
          StorageManager.remove(STORAGE_KEYS.SELECTED_UNIVERSITY);
          Pages.renderLanding();
        showToast(`${uni.name} is coming soon! We're currently available at Accra Technical University (ATU).`, 'info');
          return;
        }
        universityName = uni.name;
        const nameEl = mainContent.querySelector('.verification-university-name');
        if (nameEl) nameEl.textContent = universityName;
      }
    })
    .catch(() => {});

    // Check if already verified
    if (
      verification &&
      verification.isVerified &&
      verification.universityId === selectedUniversity
    ) {
      Pages.renderBrowse();
      return;
    }

    // Honest info banner (no more "instant verification" lie).
    mainContent.innerHTML = `
    <div class="auth-container">
    <div class="auth-card verification-card">
    <div class="verification-header">
    <div class="verification-icon">${_Icons.graduation}</div>
    <h2>Verify Your Student Status</h2>
    <p class="verification-subtitle">Confirm you're a student at <span class="verification-university-name">${universityName}</span></p>
    </div>

    <div class="verification-info" style="margin-bottom: 1.5rem;">
      <p><strong>${_Icons.clipboard} How this works:</strong> submit your details (and your admission letter or student ID if you have one). An admin reviews your submission and, if approved, emails you a one-time confirmation link. Click the link in the email to activate your account. Review usually takes 24-48 hours.</p>
    </div>

    <!-- Unified Verification Form -->
    <form id="verification-form" class="verification-form active" onsubmit="Pages.handleVerification(event)">
    <div class="form-group">
    <label for="v-full-name" class="required">Full Name</label>
    <input
    type="text"
    id="v-full-name"
    name="fullName"
    class="form-control"
    placeholder="As it appears on your student ID"
    autocomplete="name"
    required
    />
    </div>

    <div class="form-group">
    <label for="v-student-id" class="required">Student ID Number</label>
    <input
    type="text"
    id="v-student-id"
    name="studentId"
    class="form-control"
    placeholder="e.g., 10234567"
    required
    />
    <small class="form-hint">Your university student ID number</small>
    </div>

    <div class="form-group">
    <label for="v-personal-email" class="required">Personal Email Address</label>
    <input
    type="email"
    id="v-personal-email"
    name="personalEmail"
    class="form-control"
    placeholder="e.g., yourname@gmail.com"
    autocomplete="email"
    required
    />
    <small class="form-hint">We'll email your verification confirmation link here. Use an address you can access right now.</small>
    </div>

    <div class="form-group">
    <label for="v-university-email" class="optional">University Email (Optional)</label>
    <input
    type="email"
    id="v-university-email"
    name="universityEmail"
    class="form-control"
    placeholder="e.g., student@ug.edu.gh"
    />
    <small class="form-hint">Helps admins verify continuing students faster. Not required.</small>
    </div>

    <div class="form-group">
    <label for="v-phone" class="required">Phone Number</label>
    <input
    type="tel"
    id="v-phone"
    name="phone"
    class="form-control"
    placeholder="e.g., +233 50 123 4567"
    autocomplete="tel"
    required
    />
    <small class="form-hint">Ghana phone number for contact</small>
    </div>

    <div class="form-group">
    <label for="v-level" class="required">Current Level</label>
    <select id="v-level" name="level" class="form-control" required>
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
    <label for="v-hall" class="optional">Hall/Residence (Optional)</label>
    <input
    type="text"
    id="v-hall"
    name="hall"
    class="form-control"
    placeholder="e.g., Commonwealth Hall, Katanga"
    />
    <small class="form-hint">Your hall of residence or off-campus address</small>
    </div>

    <div class="form-group">
    <label class="optional">Upload Admission Letter or Student ID (Optional, speeds up review)</label>
    <div class="file-upload-area" onclick="document.getElementById('v-files').click()">
    <div class="upload-icon">${_Icons.upload}</div>
    <div class="upload-text">Click to upload or drag and drop</div>
    <div class="upload-hint">JPG, PNG or PDF. Max 5MB each. Multiple files allowed.</div>
    <input type="file" id="v-files" name="files" multiple accept=".jpg,.jpeg,.png,.pdf" style="display: none;" onchange="Pages.handleFileSelect(event)" />
    </div>
    <div id="file-list" class="file-list"></div>
    <small class="form-hint" style="display:block;margin-top:0.25rem;">Documents are visible only to moderators and are deleted 30 days after review.</small>
    </div>

    <div class="form-check">
    <input type="checkbox" id="v-declaration" name="declaration" required />
    <label for="v-declaration">
    I declare that I am a currently enrolled student at ${universityName} and the information provided is accurate.
    </label>
    </div>

    <div class="form-check warning-check">
    <input type="checkbox" id="v-wait-time" name="waitTime" required />
    <label for="v-wait-time">
    I understand that an admin will review my submission within 24-48 hours, and that I must click the confirmation link emailed to me to activate my account.
    </label>
    </div>

    <div class="verification-actions">
    <button type="button" class="btn btn-ghost" onclick="typeof window.router!=='undefined'&&window.router.navigate('/');Pages.renderLanding();">
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
    <li><strong>How long does review take?</strong> 24-48 hours, often faster.</li>
    <li><strong>Where do I check status?</strong> <a href="#/verification-status" data-action="status">Check your verification status</a> anytime.</li>
    <li><strong>Didn't get the email?</strong> Check spam, or contact <a href="mailto:unihubsupport@gmail.com">unihubsupport@gmail.com</a></li>
    </ul>
    </div>
    </div>
    </div>
    `;
  },

  // Legacy tab switcher kept as a no-op so any stale onclick="..." in the
  // DOM doesn't throw. Safe to remove once we're sure no cached HTML still
  // references it.
  switchVerificationTab (_tab) {
    /* intentionally empty — unified form has no tabs */
  },

  handleFileSelect (event) {
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
  },

  /**
   * Unified verification submit handler (2026-08-30). Replaces the old
   * tab-split email/document handlers. Same backend endpoint either way;
   * if files are attached, multipart is used; otherwise plain JSON.
   * The user's `email` field is the personal address we will use to send
   * the approval confirmation link; `universityEmail` (optional) is
   * collected only as a hint for the admin reviewer.
   */
  async handleVerification (event) {
    event.preventDefault();
    const form = document.getElementById('verification-form');
    if (!form) {return;}

    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    if (!api || !session?.token) {
      showToast('You must be logged in to submit verification. Please log in and try again.', 'warning');
      return;
    }

    const selectedUniversity = StorageManager.get(STORAGE_KEYS.SELECTED_UNIVERSITY);

    const data = {
      fullName: form.fullName.value.trim(),
      studentId: form.studentId.value.trim(),
      email: form.personalEmail.value.trim(),
      universityEmail: form.universityEmail.value.trim() || null,
      phone: form.phone.value.trim(),
      university: selectedUniversity,
      level: form.level.value,
      hall: form.hall.value.trim() || null,
      verificationMethod: 'document', // server-side, see controller
    };

    // Local validation
    if (!data.fullName || !data.studentId || !data.email || !data.phone || !data.level) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
      showToast('Please enter a valid personal email address.', 'warning');
      return;
    }
    if (data.universityEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.universityEmail)) {
      showToast('University email is not a valid email address — leave it blank if you do not have one.', 'warning');
      return;
    }
    if (!/^[\d\s+\-()]{7,15}$/.test(data.phone)) {
      showToast('Please enter a valid phone number.', 'warning');
      return;
    }

    const files = Array.from(form.files?.files || []);
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        showToast(`File "${file.name}" is too large. Maximum size is 5MB.`, 'warning');
        return;
      }
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';
    }

    try {
      let response;
      if (files.length > 0) {
        const fd = new FormData();
        Object.entries(data).forEach(([k, v]) => {
          if (v !== null && v !== undefined) {fd.append(k, v);}
        });
        files.forEach(f => fd.append('documents', f));
        response = await api.verification.submitDocuments(fd);
      } else {
        response = await api.verification.submit(data);
      }

      if (response && response.success) {
        // PII-minimal local cache (no phone, no documents list).
        StorageManager.set(STORAGE_KEYS.STUDENT_VERIFICATION, {
          universityId: selectedUniversity,
          verificationMethod: 'document',
          isVerified: false,
          isPending: true,
          status: 'pending',
          submittedAt: new Date().toISOString(),
        });
        showToast('Verification submitted! Taking you to your status page…', 'success', 4000);
        // Send the user to the status page, not browse. The status page
        // is where they will see "Awaiting admin review" and get a real
        // answer to "did it work?". They can also bookmark it.
        if (typeof window.router !== 'undefined' && window.router.navigate) {
          router.navigate('/verification-status');
        } else {
          window.location.hash = '#/verification-status';
        }
        return;
      }
      showToast(response?.error || 'Submission failed. Please try again.', 'error');
    } catch (err) {
      console.warn('auth-pages: verification submit error:', err);
      showToast('Cannot connect to server. Please check your internet connection and try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit for Verification →';
      }
    }
  },

  // Legacy handlers kept as thin shims so any stale inline onsubmit="..."
  // references (e.g. in cached HTML) don't throw. Real form is wired to
  // handleVerification above.
  async handleStudentVerification (event) { return Pages.handleVerification(event); },
  async handleDocumentVerification (event) { return Pages.handleVerification(event); },

  renderLogin () {
    // Don't hide navbar/footer - show as overlay on landing page
    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.className = 'auth-overlay';
    overlay.onclick = e => {
      if (e.target === overlay) {
        Pages.closeAuthOverlay();
      }
    };

    overlay.innerHTML = `
    <style>
    .auth-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
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
      background: var(--bg-primary);
      border-radius: 1.25rem;
      border: 1px solid var(--primary);
      box-shadow: var(--shadow-xl);
      animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .auth-close-btn {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: transparent;
      border: none;
      color: var(--neutral-600);
      cursor: pointer;
      padding: 0.5rem;
      transition: color 0.2s;
    }
    .auth-close-btn:hover {
      color: var(--neutral-900);
    }
    .auth-card-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .auth-icon-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.75rem;
    }
    .auth-icon-wrapper img {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.5rem;
    }
    .auth-title {
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: -0.025em;
      color: var(--neutral-900);
      margin-bottom: 0.25rem;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .auth-subtitle {
      font-size: 0.875rem;
      color: var(--neutral-600);
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
      border: var(--border-light);
      background: var(--bg-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }
    .social-btn:hover {
      background: var(--bg-tertiary);
      border-color: var(--neutral-400);
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
      border-top: 1px solid var(--neutral-200);
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
      background: var(--bg-primary);
      padding: 0 0.5rem;
      color: var(--neutral-600);
    }
    .form-group-modern {
      margin-bottom: 1rem;
    }
    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--neutral-900);
      margin-bottom: 0.5rem;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .form-input {
      display: flex;
      height: 2.75rem;
      width: 100%;
      border-radius: 0.375rem;
      border: 1px solid var(--neutral-300);
      background: var(--bg-secondary);
      padding: 0 0.75rem;
      font-size: 0.875rem;
      color: var(--neutral-900);
      transition: all 0.2s;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .form-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-light);
    }
    .form-input::placeholder {
      color: var(--neutral-500);
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
      color: var(--neutral-600);
      transition: color 0.2s;
    }
    .password-toggle-btn:hover {
      color: var(--neutral-900);
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
      background: var(--bg-tertiary);
      color: var(--neutral-900);
      border: 1px solid var(--neutral-300);
      cursor: pointer;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .submit-btn:hover {
      background: var(--neutral-200);
      border-color: var(--neutral-400);
    }
    .submit-btn-primary {
      background: var(--primary);
      color: var(--bg-primary);
      border: none;
    }
    .submit-btn-primary:hover {
      background: var(--primary-hover);
    }
    .auth-footer-links {
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--neutral-200);
    }
    .auth-footer-links p {
      font-size: 0.875rem;
      color: var(--neutral-600);
      margin-bottom: 0;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .auth-link {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
      cursor: pointer;
      display: inline-block;
    }
    .auth-link:hover {
      color: var(--primary-hover);
      text-decoration: underline;
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
    <img src="/favicon.png" alt="JERTS CART" />
    </div>
    <h1 class="auth-title">Welcome back</h1>
    <p class="auth-subtitle">Enter your credentials to sign in to JERTS CART</p>
    </div>

  <div class="social-buttons-grid">
  <button class="social-btn" title="Sign in with Google" onclick="showToast('Social login is not available in offline mode', 'error')">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem;">
  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
  </svg>
  </button>
  <button class="social-btn" title="Sign in with Apple" onclick="showToast('Social login is not available in offline mode', 'error')">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem; fill: var(--neutral-900);">
  <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"></path>
  </svg>
  </button>
  <button class="social-btn" title="Sign in with X" onclick="showToast('Social login is not available in offline mode', 'error')">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem; fill: var(--neutral-900);">
  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
  </svg>
  </button>
  </div>
  <p class="social-consent-note" style="font-size:0.72rem;color:#9ca3af;text-align:center;margin-top:0.5rem;">By continuing with Google, you agree to our Terms of Service and Privacy Policy.</p>

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

    <div style="display: flex; justify-content: flex-end; margin: -0.5rem 0 0.5rem;">
    <a onclick="Pages.renderForgotPassword(); Pages.closeAuthOverlay(); return false;"
    class="auth-link"
    style="font-size: 0.875rem; color: var(--neutral-600); transition: color 0.2s; cursor: pointer;"
    onmouseover="this.style.color='var(--primary)'"
    onmouseout="this.style.color='var(--neutral-600)'">
    Forgot password?
    </a>
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
  },

  closeAuthOverlay (immediate = false) {
    // Remove all auth overlays to be safe
    const overlays = document.querySelectorAll('#auth-overlay');
    overlays.forEach(overlay => {
      if (overlay) {
        if (immediate) {
          overlay.remove();
        } else {
          overlay.style.animation = 'fadeIn 0.2s ease-out reverse';
          setTimeout(() => overlay.remove(), 200);
        }
      }
    });
  },

  switchAuthModal (type) {
    Pages.closeAuthOverlay();
    setTimeout(() => {
      if (type === 'register') {
        Pages.renderRegister();
      } else {
        Pages.renderLogin();
      }
    }, 200);
  },

  async handleLogin (event) {
    event.preventDefault();
    const form = document.getElementById('login-form');
    const email = form.email.value;
    const password = form.password.value;

    const result = await authManager.login(email, password);

  if (result.success) {
  // Close the auth overlay immediately (no animation delay)
  Pages.closeAuthOverlay(true);
  // Update navbar to show user menu
  Pages.updateNavbar();
  Pages.updateCartBadge();

  if (typeof notificationManager !== 'undefined' && notificationManager.requestBrowserPermission) {
  notificationManager.requestBrowserPermission();
  }

  // Force redirect to browse page using multiple methods for reliability
      try {
        // Method 1: Use router if available
        if (typeof window.router !== 'undefined' && window.router.navigate) {
          router.navigate('/browse');
        }
        // Method 2: Direct hash change (always works)
        window.location.hash = '#/browse';
        // Method 3: Render directly as fallback
        setTimeout(() => {
          Pages.renderBrowse();
        }, 50);
      } catch (e) {
        console.error('Navigation error:', e);
        // Final fallback
        window.location.hash = '#/browse';
        Pages.renderBrowse();
      }
    } else {
      if (result.isOffline) {
        Pages.closeAuthOverlay(true);
        Pages.updateNavbar();
        Pages.updateCartBadge();
        Pages.updateWishlistBadge();
        notificationManager?.warning('Offline Mode', 'You are logged in with demo data. Some features may be limited.');
        window.location.hash = '#/browse';
        Pages.renderBrowse();
      } else {
        showToast('Login failed: ' + result.error, 'error');
      }
    }
  },

  renderRegister () {
    // Hide navbar and footer for auth pages - cleaner professional look
    Pages.hideOriginalNavFooter();

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
      background: var(--bg-secondary);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .auth-card-modern {
      position: relative;
      width: 100%;
      max-width: 28rem;
      padding: 1.5rem;
      background: var(--bg-primary);
      border-radius: 0.75rem;
      border: 1px solid var(--neutral-300);
      box-shadow: var(--shadow-xl);
    }
    .auth-card-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .auth-icon-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.75rem;
    }
    .auth-icon-wrapper img {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.5rem;
    }
    .auth-title {
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: -0.025em;
      color: var(--neutral-900);
      margin-bottom: 0.25rem;
    }
    .auth-subtitle {
      font-size: 0.875rem;
      color: var(--neutral-600);
    }
    .form-group-modern {
      margin-bottom: 1rem;
    }
    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--neutral-900);
      margin-bottom: 0.5rem;
    }
    .form-input {
      display: flex;
      height: 2.75rem;
      width: 100%;
      border-radius: 0.375rem;
      border: 1px solid var(--neutral-300);
      background: var(--bg-secondary);
      padding: 0 0.75rem;
      font-size: 0.875rem;
      color: var(--neutral-900);
      transition: all 0.2s;
    }
    .form-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-light);
    }
    .form-input::placeholder {
      color: var(--neutral-500);
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
      color: var(--neutral-600);
      transition: color 0.2s;
    }
    .password-toggle-btn:hover {
      color: var(--neutral-900);
    }
    .form-check-modern {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin: 1rem 0;
    }
    .form-check-modern input[type="checkbox"] {
      margin-top: 0.125rem;
      accent-color: var(--primary);
    }
    .form-check-modern label {
      font-size: 0.875rem;
      color: var(--neutral-600);
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
      background: var(--bg-tertiary);
      color: var(--neutral-900);
      border: 1px solid var(--neutral-300);
      cursor: pointer;
    }
    .submit-btn:hover {
      background: var(--neutral-200);
      border-color: var(--neutral-400);
    }
    .submit-btn-primary {
      background: var(--primary);
      color: var(--bg-primary);
      border: none;
    }
    .submit-btn-primary:hover {
      background: var(--primary-hover);
    }
    .auth-footer-links {
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--neutral-200);
    }
    .auth-footer-links p {
      font-size: 0.875rem;
      color: var(--neutral-600);
    }
    .auth-link {
      color: var(--neutral-900);
      text-decoration: underline;
      text-underline-offset: 4px;
      transition: color 0.2s;
      cursor: pointer;
    }
    .auth-link:hover {
      color: var(--primary);
    }
    </style>

    <div class="auth-page-container">
    <div class="auth-card-modern">
    <div class="auth-card-header">
    <div class="auth-icon-wrapper">
    <img src="/favicon.png" alt="JERTS CART" />
    </div>
    <h1 class="auth-title">Create an account</h1>
    <p class="auth-subtitle">Enter your details to get started with JERTS CART</p>
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
    <label for="terms">I agree to the <a href="#/terms" class="auth-link">Terms of Service</a> and <a href="#/privacy" class="auth-link">Privacy Policy</a></label>
    </div>

      <button type="submit" class="submit-btn submit-btn-primary">Create Account</button>
      </form>

      <div class="divider">
        <div class="divider-line"><span></span></div>
        <div class="divider-text"><span>Or sign up with</span></div>
      </div>

      <div class="social-buttons-grid">
      <button class="social-btn" title="Sign up with Google" onclick="showToast('Social login is not available in offline mode', 'error')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem;">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
        </svg>
      </button>
      <button class="social-btn" title="Sign up with Apple" onclick="showToast('Social login is not available in offline mode', 'error')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem; fill: var(--neutral-900);">
          <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 21.18C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"></path>
        </svg>
      </button>
      <button class="social-btn" title="Sign up with X" onclick="showToast('Social login is not available in offline mode', 'error')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem; fill: var(--neutral-900);">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
        </svg>
      </button>
      </div>
      <p class="social-consent-note" style="font-size:0.72rem;color:#9ca3af;text-align:center;margin-top:0.5rem;">By continuing with Google, you agree to our Terms of Service and Privacy Policy.</p>

      <div class="auth-footer-links">
    <p>
    Already have an account?
    <a onclick="Pages.renderLogin(); return false;" class="auth-link">Sign in</a>
    </p>
    </div>
    </div>
    </div>
    `;
  },

  async handleRegister (event) {
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
      // Server-enforced consent (spec 2026-08-23). Checkbox is required
      // client-side; this makes the agreement explicit in the API contract.
      acceptedTerms: form.terms.checked === true,
  };

  const result = await authManager.register(userData);

  if (result.success) {
        showToast(result.message, 'success');
    try {
    if (typeof window.router !== 'undefined' && window.router.navigate) {
      router.navigate('/browse');
    }
    window.location.hash = '#/browse';
    setTimeout(() => {
      Pages.renderBrowse();
    }, 50);
    } catch (e) {
    console.error('Navigation error:', e);
    window.location.hash = '#/browse';
    Pages.renderBrowse();
    }
  } else {
      showToast('Registration failed: ' + result.error, 'error');
  }
  },

  renderForgotPassword () {
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
  },

  async handleForgotPassword (event) {
    event.preventDefault();
    const form = document.getElementById('forgot-form');
    const email = form.email.value;
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const baseURL = (typeof window !== 'undefined' && window.API_URL) || 'https://uni-hub-bnxi.onrender.com/api';
      if (typeof api !== 'undefined' && api.isStaticDeploy) {
        showToast('Password reset is not available in offline mode. Please log in with your existing credentials.', 'info');
        setTimeout(() => Pages.renderLogin(), 2000);
      } else {
      const response = await fetch(`${baseURL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

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
      showToast('Running in offline mode. In offline mode, you can log in with any demo account (e.g. kwame.mensah@ug.edu.gh) using any password.', 'info');
      setTimeout(() => Pages.renderLogin(), 3000);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Reset Link';
    }
  },

  renderResetPassword (token = '') {
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
    <div class="auth-container">
    <div class="auth-card">
    <h2>Set New Password</h2>
    <form id="reset-form" onsubmit="Pages.handleResetPassword(event, '${token}')">
    <p>Enter your new password below.</p>

    <div class="form-group">
    <label for="newPassword" class="required">New Password</label>
    <input type="password" id="newPassword" name="newPassword" class="form-control" minlength="6" required />
    <small class="form-hint">Must be at least 6 characters</small>
    </div>

    <div class="form-group">
    <label for="confirmPassword" class="required">Confirm Password</label>
    <input type="password" id="confirmPassword" name="confirmPassword" class="form-control" minlength="6" required />
    </div>

    <button type="submit" class="btn btn-primary btn-block">Reset Password</button>
    </form>

    <div class="auth-links">
    <p><a href="#" onclick="Pages.renderLogin()">Back to Login</a></p>
    </div>
    </div>
    </div>
    `;
  },

  async handleResetPassword (event, token) {
    event.preventDefault();
    const form = document.getElementById('reset-form');
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Resetting...';

    try {
      const baseURL = (typeof window !== 'undefined' && window.API_URL) || 'https://uni-hub-bnxi.onrender.com/api';
      if (typeof api !== 'undefined' && api.isStaticDeploy) {
        showToast('Password reset is not available in offline mode. Please log in with your existing credentials.', 'info');
        setTimeout(() => Pages.renderLogin(), 2000);
      } else {
      const response = await fetch(`${baseURL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const result = await response.json();

      if (result.success) {
        showToast(result.message, 'success');
        setTimeout(() => Pages.renderLogin(), 1500);
      } else {
        showToast(result.error || 'Failed to reset password', 'error');
      }
      }
    } catch (error) {
      showToast('Running in offline mode. Password reset is not available offline. Please log in with your existing credentials.', 'info');
      setTimeout(() => Pages.renderLogin(), 3000);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Reset Password';
    }
  },

  /**
   * Magic-link verification confirmation (2026-08-29). The user lands here
   * after clicking the link in their approval email. We read the token
   * from the URL hash query string, call the public confirm endpoint, and
   * render success / failure UI. The token itself is not stored or logged
   * after the call returns.
   */
  async renderVerifyConfirmation () {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {return;}

    // The router has already parsed the query string into params, but the
    // token contains characters that router.parseQueryString() will have
    // HTML-escaped. Read it from the raw hash instead so we get the
    // unescaped value for the API call.
    const rawHash = String(window.location.hash || '');
    const queryStart = rawHash.indexOf('?');
    const rawQuery = queryStart >= 0 ? rawHash.slice(queryStart + 1) : '';
    const rawParams = new URLSearchParams(rawQuery);
    const token = rawParams.get('token') || '';

    const esc = (s) => {
      const e = (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) ||
        (window.SecurityUtils && window.SecurityUtils.escapeHtml);
      return e ? e(s) : String(s);
    };

    // Initial "confirming..." state — show before the network call so
    // the user gets immediate feedback.
    mainContent.innerHTML = `
      <div class="auth-container" style="max-width: 520px; margin: 4rem auto;">
        <div class="auth-card verification-card" style="text-align: center; padding: 2.5rem 2rem;">
          <div class="verification-icon" style="font-size: 3rem;">${_Icons.graduation}</div>
          <h2 id="verify-title" style="margin: 1rem 0 0.5rem;">Confirming your verification…</h2>
          <p id="verify-subtitle" style="color: var(--neutral-600, #6b7280);">Please wait while we activate your student account.</p>
          <div id="verify-spinner" style="margin: 1.5rem auto 0; width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #0046be; border-radius: 50%; animation: unihub-spin 0.9s linear infinite;"></div>
          <div id="verify-actions" style="margin-top: 1.5rem;"></div>
        </div>
      </div>
      <style>@keyframes unihub-spin { to { transform: rotate(360deg); } }</style>
    `;

    if (!token) {
      this._renderVerifyFailure(mainContent, 'Missing token',
        'This confirmation link is invalid. Please use the link from your verification email, or contact support.',
        'verify-actions');
      return;
    }

    try {
      const resp = await api.verification.confirm(token);
      if (resp && resp.success && resp.data && resp.data.isVerified) {
        // Update the local cache so the auth-aware UI (checkout gates,
        // profile badge) flips to "verified" without a hard reload.
        if (typeof StorageManager !== 'undefined' && typeof STORAGE_KEYS !== 'undefined') {
          const existing = StorageManager.get(STORAGE_KEYS.STUDENT_VERIFICATION, true) || {};
          StorageManager.set(STORAGE_KEYS.STUDENT_VERIFICATION, {
            ...existing,
            isVerified: true,
            isPending: false,
            status: 'approved',
            confirmedAt: new Date().toISOString(),
            university: resp.data.university || existing.university,
            studentId: resp.data.studentId || existing.studentId,
          });
        }
        // If the user is signed in, refresh the in-memory user so the
        // auth-aware UI updates immediately.
        if (typeof authManager !== 'undefined' && authManager.refresh) {
          try { await authManager.refresh(); } catch (_e) { /* non-fatal */ }
        }
        this._renderVerifySuccess(mainContent, resp.data);
        return;
      }
      this._renderVerifyFailure(mainContent,
        esc(resp?.error || 'Could not confirm verification'),
        'The link may have expired or already been used. If you need help, contact support and include the email your verification was sent to.',
        'verify-actions');
    } catch (err) {
      console.warn('verify: confirm call failed:', err);
      this._renderVerifyFailure(mainContent, 'Network error',
        'We could not reach the server. Please check your connection and try the link again.',
        'verify-actions');
    }
  },

  _renderVerifySuccess (mainContent, data) {
    const esc = (s) => {
      const e = (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) ||
        (window.SecurityUtils && window.SecurityUtils.escapeHtml);
      return e ? e(s) : String(s);
    };
    mainContent.innerHTML = `
      <div class="auth-container" style="max-width: 520px; margin: 4rem auto;">
        <div class="auth-card verification-card" style="text-align: center; padding: 2.5rem 2rem;">
          <div style="font-size: 3rem; color: #10b981;">✓</div>
          <h2 style="margin: 1rem 0 0.5rem;">You are verified!</h2>
          <p style="color: var(--neutral-600, #6b7280);">
            Your student account at <strong>${esc(data.university || 'your university')}</strong>
            is now active. You can buy and sell on JERTS CART.
          </p>
          <div id="verify-actions" style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" data-action="browse">Start shopping</button>
            <button class="btn btn-ghost" data-action="dashboard">Go to my dashboard</button>
          </div>
        </div>
      </div>
    `;
    if (typeof showToast === 'function') {
      showToast('Verification confirmed — welcome to JERTS CART!', 'success');
    }
    const root = mainContent.querySelector('#verify-actions');
    if (root) {
      root.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.getAttribute('data-action');
        if (action === 'browse' && typeof Pages !== 'undefined' && Pages.renderBrowse) {
          // Update the URL hash so back button / bookmark / reload
          // work as the user expects.
          if (typeof window.router !== 'undefined' && window.router.navigate) {
            window.router.navigate('/browse');
          } else {
            window.location.hash = '#/browse';
          }
          Pages.renderBrowse();
        } else if (action === 'dashboard' && typeof Pages !== 'undefined' && Pages.renderDashboard) {
          if (typeof window.router !== 'undefined' && window.router.navigate) {
            window.router.navigate('/dashboard');
          } else {
            window.location.hash = '#/dashboard';
          }
          Pages.renderDashboard();
        }
      });
    }
  },

  _renderVerifyFailure (mainContent, title, body, actionsContainerId) {
    const esc = (s) => {
      const e = (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) ||
        (window.SecurityUtils && window.SecurityUtils.escapeHtml);
      return e ? e(s) : String(s);
    };
    const titleEl = mainContent.querySelector('#verify-title');
    const subtitleEl = mainContent.querySelector('#verify-subtitle');
    const spinnerEl = mainContent.querySelector('#verify-spinner');
    if (titleEl) {titleEl.textContent = esc(title);}
    if (subtitleEl) {subtitleEl.textContent = '';}
    if (spinnerEl) {spinnerEl.remove();}
    const actionsRoot = mainContent.querySelector(`#${actionsContainerId}`);
    if (actionsRoot) {
      actionsRoot.innerHTML = `
        <p style="color: var(--neutral-700, #374151);">${esc(body)}</p>
        <div style="display: flex; gap: 0.75rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap;">
          <button class="btn btn-ghost" data-action="home">Go to home</button>
        </div>
      `;
      actionsRoot.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.getAttribute('data-action');
        if (action === 'home' && typeof Pages !== 'undefined' && Pages.renderLanding) {
          if (typeof window.router !== 'undefined' && window.router.navigate) {
            window.router.navigate('/');
          } else {
            window.location.hash = '#/';
          }
          Pages.renderLanding();
        }
      });
    }
  },

  /**
   * My verification status (2026-08-30). The user lands here from the
   * dashboard or a "Check status" link. Reads from /api/verification/me
   * and shows one of four clear states with appropriate next-action
   * buttons. No PII in the local cache is read.
   */
  async renderVerificationStatus () {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {return;}

    const esc = (s) => {
      const e = (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) ||
        (window.SecurityUtils && window.SecurityUtils.escapeHtml);
      return e ? e(s) : String(s);
    };

    // Loading shell — same spinner as the confirm page.
    mainContent.innerHTML = `
      <div class="auth-container" style="max-width: 560px; margin: 3rem auto;">
        <div class="auth-card" style="text-align: center; padding: 2.5rem 2rem;">
          <div style="font-size: 2.5rem;">${_Icons.graduation}</div>
          <h2 style="margin: 1rem 0 0.5rem;">Checking your verification status…</h2>
          <div style="margin: 1.5rem auto 0; width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #0046be; border-radius: 50%; animation: unihub-spin 0.9s linear infinite;"></div>
        </div>
      </div>
      <style>@keyframes unihub-spin { to { transform: rotate(360deg); } }</style>
    `;

    if (typeof api === 'undefined' || api.isStaticDeploy) {
      this._renderStatusNotConnected(mainContent, esc);
      return;
    }

    const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
    if (!session || !session.token) {
      // Not logged in — show a sign-in CTA.
      this._renderStatusNotLoggedIn(mainContent, esc);
      return;
    }

    try {
      // We don't have a dedicated client wrapper, so call the API
      // directly through the existing auth-aware request helper.
      const resp = await api.request('/verification/me');
      if (!resp || !resp.success) {
        this._renderStatusError(mainContent, esc, resp?.error || 'Could not load your verification status.');
        return;
      }
      const data = resp.data || {};
      const status = data.status || 'not_submitted';
      if (status === 'approved' || data.isVerified) {
        this._renderStatusApproved(mainContent, esc, data);
      } else if (status === 'approved_pending_user') {
        this._renderStatusAwaitingConfirmation(mainContent, esc, data);
      } else if (status === 'pending') {
        this._renderStatusPending(mainContent, esc, data);
      } else if (status === 'rejected') {
        this._renderStatusRejected(mainContent, esc, data);
      } else {
        this._renderStatusNotSubmitted(mainContent, esc);
      }
    } catch (err) {
      console.warn('verify-status: fetch failed:', err);
      this._renderStatusError(mainContent, esc, 'Network error. Please try again.');
    }
  },

  _renderStatusApproved (root, esc, data) {
    root.innerHTML = `
      <div class="auth-container" style="max-width: 560px; margin: 3rem auto;">
        <div class="auth-card" style="text-align: center; padding: 2.5rem 2rem;">
          <div style="font-size: 3rem; color: #10b981;">✓</div>
          <h2 style="margin: 1rem 0 0.5rem;">You're verified!</h2>
          <p style="color: var(--neutral-600, #6b7280);">
            Your student account at <strong>${esc(data.university || 'your university')}</strong> is active.
            You can buy and sell on Uni-Hub.
          </p>
          ${data.confirmedAt ? `<p style="font-size: 0.85rem; color: var(--neutral-500, #9ca3af);">Confirmed on ${esc(new Date(data.confirmedAt).toLocaleString())}</p>` : ''}
          <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" data-action="browse">Start shopping</button>
            <button class="btn btn-ghost" data-action="dashboard">Go to my dashboard</button>
          </div>
        </div>
      </div>
    `;
    root.querySelector('#main-content') || root;
    const card = root.querySelector('.auth-card');
    if (card) {
      card.addEventListener('click', (e) => {
        const a = e.target.closest('[data-action]')?.getAttribute('data-action');
        if (a === 'browse' && Pages.renderBrowse) {
          if (typeof window.router !== 'undefined' && window.router.navigate) {
            window.router.navigate('/browse');
          } else {
            window.location.hash = '#/browse';
          }
          Pages.renderBrowse();
        } else if (a === 'dashboard' && Pages.renderDashboard) {
          if (typeof window.router !== 'undefined' && window.router.navigate) {
            window.router.navigate('/dashboard');
          } else {
            window.location.hash = '#/dashboard';
          }
          Pages.renderDashboard();
        }
      });
    }
  },

  _renderStatusAwaitingConfirmation (root, esc, data) {
    root.innerHTML = `
      <div class="auth-container" style="max-width: 560px; margin: 3rem auto;">
        <div class="auth-card" style="text-align: center; padding: 2.5rem 2rem;">
          <div style="font-size: 2.5rem; color: #3b82f6;">✉</div>
          <h2 style="margin: 1rem 0 0.5rem;">Almost there — check your email</h2>
          <p style="color: var(--neutral-600, #6b7280);">
            An admin has approved your verification at <strong>${esc(data.university || 'your university')}</strong>.
            We sent a one-time confirmation link to your personal email. Click the link to activate your account.
          </p>
          <p style="font-size: 0.85rem; color: var(--neutral-500, #9ca3af);">The link expires in 24 hours and can only be used once.</p>
          <div style="margin-top: 1.5rem; font-size: 0.9rem; color: var(--neutral-700, #374151); text-align: left; background: #f3f4f6; padding: 1rem; border-radius: 8px;">
            <strong>Didn't get the email?</strong>
            <ul style="margin: 0.5rem 0 0 1.25rem; padding: 0;">
              <li>Check your spam / junk folder</li>
              <li>Make sure you submitted a working personal email</li>
              <li>Wait 5 minutes — it can take a moment to arrive</li>
            </ul>
          </div>
          <div style="margin-top: 1.5rem;">
            <button class="btn btn-ghost" data-action="home">Back to home</button>
          </div>
        </div>
      </div>
    `;
    const card = root.querySelector('.auth-card');
    if (card) {
      card.addEventListener('click', (e) => {
        const a = e.target.closest('[data-action]')?.getAttribute('data-action');
        if (a === 'home' && Pages.renderLanding) {
          if (typeof window.router !== 'undefined' && window.router.navigate) {
            window.router.navigate('/');
          } else {
            window.location.hash = '#/';
          }
          Pages.renderLanding();
        }
      });
    }
  },

  _renderStatusPending (root, esc, data) {
    root.innerHTML = `
      <div class="auth-container" style="max-width: 560px; margin: 3rem auto;">
        <div class="auth-card" style="text-align: center; padding: 2.5rem 2rem;">
          <div style="font-size: 2.5rem; color: #f59e0b;">⏳</div>
          <h2 style="margin: 1rem 0 0.5rem;">Awaiting admin review</h2>
          <p style="color: var(--neutral-600, #6b7280);">
            Your verification submission is in the queue. An admin will review it within 24-48 hours.
          </p>
          ${data.submittedAt ? `<p style="font-size: 0.85rem; color: var(--neutral-500, #9ca3af);">Submitted on ${esc(new Date(data.submittedAt).toLocaleString())}</p>` : ''}
          <p style="font-size: 0.85rem; color: var(--neutral-500, #9ca3af); margin-top: 1rem;">
            Once approved, we'll email you a one-time confirmation link. Click it to activate your account.
          </p>
          <div style="margin-top: 1.5rem;">
            <button class="btn btn-ghost" data-action="home">Back to home</button>
          </div>
        </div>
      </div>
    `;
    const card = root.querySelector('.auth-card');
    if (card) {
      card.addEventListener('click', (e) => {
        const a = e.target.closest('[data-action]')?.getAttribute('data-action');
        if (a === 'home' && Pages.renderLanding) {
          if (typeof window.router !== 'undefined' && window.router.navigate) {
            window.router.navigate('/');
          } else {
            window.location.hash = '#/';
          }
          Pages.renderLanding();
        }
      });
    }
  },

  _renderStatusRejected (root, esc, data) {
    root.innerHTML = `
      <div class="auth-container" style="max-width: 560px; margin: 3rem auto;">
        <div class="auth-card" style="text-align: center; padding: 2.5rem 2rem;">
          <div style="font-size: 2.5rem; color: #ef4444;">✕</div>
          <h2 style="margin: 1rem 0 0.5rem;">Verification was not approved</h2>
          ${data.reviewNotes ? `<p style="background: #fef2f2; border: 1px solid #fecaca; padding: 0.75rem 1rem; border-radius: 8px; color: #991b1b;">${esc(data.reviewNotes)}</p>` : ''}
          <p style="color: var(--neutral-600, #6b7280);">
            You can submit a new verification with corrected details.
          </p>
          <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" data-action="resubmit">Submit again</button>
            <button class="btn btn-ghost" data-action="home">Back to home</button>
          </div>
        </div>
      </div>
    `;
    const card = root.querySelector('.auth-card');
    if (card) {
      card.addEventListener('click', (e) => {
        const a = e.target.closest('[data-action]')?.getAttribute('data-action');
        if (a === 'resubmit' && Pages.renderStudentVerification) {Pages.renderStudentVerification();}
        else if (a === 'home' && Pages.renderLanding) {
          if (typeof window.router !== 'undefined' && window.router.navigate) {
            window.router.navigate('/');
          } else {
            window.location.hash = '#/';
          }
          Pages.renderLanding();
        }
      });
    }
  },

  _renderStatusNotSubmitted (root, esc) {
    root.innerHTML = `
      <div class="auth-container" style="max-width: 560px; margin: 3rem auto;">
        <div class="auth-card" style="text-align: center; padding: 2.5rem 2rem;">
          <div style="font-size: 2.5rem;">${_Icons.graduation}</div>
          <h2 style="margin: 1rem 0 0.5rem;">You haven't submitted verification yet</h2>
          <p style="color: var(--neutral-600, #6b7280);">
            Submit your student details to start buying and selling on Uni-Hub.
          </p>
          <div style="margin-top: 1.5rem;">
            <button class="btn btn-primary" data-action="verify">Start verification</button>
          </div>
        </div>
      </div>
    `;
    const card = root.querySelector('.auth-card');
    if (card) {
      card.addEventListener('click', (e) => {
        const a = e.target.closest('[data-action]')?.getAttribute('data-action');
        if (a === 'verify' && Pages.renderStudentVerification) {Pages.renderStudentVerification();}
      });
    }
  },

  _renderStatusNotLoggedIn (root, esc) {
    root.innerHTML = `
      <div class="auth-container" style="max-width: 560px; margin: 3rem auto;">
        <div class="auth-card" style="text-align: center; padding: 2.5rem 2rem;">
          <h2 style="margin: 1rem 0 0.5rem;">Please log in to check your status</h2>
          <p style="color: var(--neutral-600, #6b7280);">We need to know who you are before we can show your verification status.</p>
          <div style="margin-top: 1.5rem;">
            <button class="btn btn-primary" data-action="login">Log in</button>
          </div>
        </div>
      </div>
    `;
    const card = root.querySelector('.auth-card');
    if (card) {
      card.addEventListener('click', (e) => {
        const a = e.target.closest('[data-action]')?.getAttribute('data-action');
        if (a === 'login' && Pages.renderLogin) {Pages.renderLogin();}
      });
    }
  },

  _renderStatusNotConnected (root, esc) {
    root.innerHTML = `
      <div class="auth-container" style="max-width: 560px; margin: 3rem auto;">
        <div class="auth-card" style="text-align: center; padding: 2.5rem 2rem;">
          <h2 style="margin: 1rem 0 0.5rem;">Offline mode</h2>
          <p style="color: var(--neutral-600, #6b7280);">Running in offline mode. Verification status is not available offline.</p>
        </div>
      </div>
    `;
  },

  _renderStatusError (root, esc, message) {
    root.innerHTML = `
      <div class="auth-container" style="max-width: 560px; margin: 3rem auto;">
        <div class="auth-card" style="text-align: center; padding: 2.5rem 2rem;">
          <div style="font-size: 2.5rem; color: #ef4444;">!</div>
          <h2 style="margin: 1rem 0 0.5rem;">Couldn't load your status</h2>
          <p style="color: var(--neutral-600, #6b7280);">${esc(message)}</p>
          <div style="margin-top: 1.5rem;">
            <button class="btn btn-primary" data-action="retry">Try again</button>
          </div>
        </div>
      </div>
    `;
    const card = root.querySelector('.auth-card');
    if (card) {
      card.addEventListener('click', (e) => {
        const a = e.target.closest('[data-action]')?.getAttribute('data-action');
        if (a === 'retry' && Pages.renderVerificationStatus) {Pages.renderVerificationStatus();}
      });
    }
  },
};

window.AuthPageMethods = AuthPageMethods;

// Attach all AuthPageMethods onto the global `Pages` class so inline
// `onclick="Pages.foo()"` and router handlers like
// `router.register('/x', () => this.foo())` resolve to the right `this`.
// CRITICAL: must `.bind(AuthPageMethods)` — the method bodies use
// `this._renderX()` style helpers, and without a bind, `this` is the
// `Pages` class instance (no helpers) and the call throws
// "this._renderStatusNotLoggedIn is not a function".
(function attachAuthPageMethods () {
  const waitForPages = setInterval(function () {
    if (typeof Pages === 'undefined') {
      return;
    }
    clearInterval(waitForPages);
    const bind = (k) => { Pages[k] = AuthPageMethods[k].bind(AuthPageMethods); };
    [
      'handleRegister',
      'handleLogin',
      'handleForgotPassword',
      'handleResetPassword',
      'closeAuthOverlay',
      'switchAuthModal',
      'handleVerification',
      'renderVerifyConfirmation',
      'renderVerificationStatus',
    ].forEach(bind);
  }, 50);
})();
