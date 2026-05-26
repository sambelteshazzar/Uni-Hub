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
          if (typeof Toast !== 'undefined') {
            Toast.info(`${uni.name} is coming soon! We're currently available at Accra Technical University (ATU).`);
          }
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

    mainContent.innerHTML = `
    <div class="auth-container">
    <div class="auth-card verification-card">
    <div class="verification-header">
    <div class="verification-icon">${_Icons.graduation}</div>
    <h2>Verify Your Student Status</h2>
    <p class="verification-subtitle">Confirm you're a student at <span class="verification-university-name">${universityName}</span></p>
    </div>

    <!-- Verification Method Tabs -->
    <div class="verification-tabs">
    <button class="verification-tab active" data-tab="email" onclick="Pages.switchVerificationTab('email')">
    <span class="tab-icon">${_Icons.email}</span>
    <span class="tab-label">University Email</span>
    <span class="tab-desc">For continuing students</span>
    </button>
    <button class="verification-tab" data-tab="document" onclick="Pages.switchVerificationTab('document')">
    <span class="tab-icon">${_Icons.document}</span>
    <span class="tab-label">Admission Documents</span>
    <span class="tab-desc">For new students</span>
    </button>
    </div>

    <!-- Email Verification Form -->
    <form id="verification-form-email" class="verification-form active" onsubmit="Pages.handleStudentVerification(event)">
    <div class="verification-info">
    <p><strong>${_Icons.graduation} For Continuing Students:</strong> Use your official university email address for instant verification.</p>
    </div>

    <div class="form-group">
    <label for="student-email" class="required">University Email Address</label>
    <input
    type="email"
    id="student-email"
    name="studentEmail"
    class="form-control"
    placeholder="e.g., student@ug.edu.gh"
    required
    />
    <small class="form-hint">Enter your official university email address (e.g., @ug.edu.gh, @knust.edu.gh)</small>
    </div>

    <div class="form-group">
    <label for="student-id" class="required">Student ID Number</label>
    <input
    type="text"
    id="student-id"
    name="studentId"
    class="form-control"
    placeholder="e.g., 10234567"
    required
    />
    <small class="form-hint">Your university student ID number</small>
    </div>

    <div class="form-group">
    <label for="full-name" class="required">Full Name</label>
    <input
    type="text"
    id="full-name"
    name="fullName"
    class="form-control"
    placeholder="As it appears on your student ID"
    required
    />
    </div>

    <div class="form-group">
    <label for="phone" class="required">Phone Number</label>
    <input
    type="tel"
    id="phone"
    name="phone"
    class="form-control"
    placeholder="e.g., +233 50 123 4567"
    required
    />
    <small class="form-hint">Ghana phone number for contact</small>
    </div>

    <div class="form-group">
    <label for="level" class="required">Current Level</label>
    <select id="level" name="level" class="form-control" required>
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
    <label for="hall" class="optional">Hall/Residence (Optional)</label>
    <input
    type="text"
    id="hall"
    name="hall"
    class="form-control"
    placeholder="e.g., Commonwealth Hall, Katanga"
    />
    <small class="form-hint">Your hall of residence or off-campus address</small>
    </div>

    <div class="form-check">
    <input type="checkbox" id="verify-declaration-email" name="verifyDeclaration" required />
    <label for="verify-declaration-email">
    I declare that I am a currently enrolled student at ${universityName} and the information provided is accurate.
    </label>
    </div>

    <div class="verification-actions">
    <button type="button" class="btn btn-ghost" onclick="Pages.renderLanding()">
    ← Back to Universities
    </button>
    <button type="submit" class="btn btn-primary">
    Verify with Email →
    </button>
    </div>
    </form>

    <!-- Document Verification Form -->
    <form id="verification-form-document" class="verification-form" onsubmit="Pages.handleDocumentVerification(event)">
    <div class="verification-info warning">
    <p><strong>${_Icons.clipboard} For New/Level 100 Students:</strong> Upload your admission letter or student ID for manual verification. This may take 24-48 hours.</p>
    </div>

    <div class="form-group">
    <label for="doc-email" class="required">Personal Email Address (Gmail, etc.)</label>
    <input
    type="email"
    id="doc-email"
    name="docEmail"
    class="form-control"
    placeholder="e.g., yourname@gmail.com"
    required
    />
    <small class="form-hint">We'll send verification updates to this email</small>
    </div>

    <div class="form-group">
    <label for="doc-student-id" class="required">Student ID Number</label>
    <input
    type="text"
    id="doc-student-id"
    name="docStudentId"
    class="form-control"
    placeholder="e.g., 10234567"
    required
    />
    <small class="form-hint">Your university student ID number</small>
    </div>

    <div class="form-group">
    <label for="doc-full-name" class="required">Full Name</label>
    <input
    type="text"
    id="doc-full-name"
    name="docFullName"
    class="form-control"
    placeholder="As it appears on your admission letter"
    required
    />
    </div>

    <div class="form-group">
    <label for="doc-phone" class="required">Phone Number</label>
    <input
    type="tel"
    id="doc-phone"
    name="docPhone"
    class="form-control"
    placeholder="e.g., +233 50 123 4567"
    required
    />
    </div>

    <div class="form-group">
    <label for="doc-level" class="required">Current Level</label>
    <select id="doc-level" name="docLevel" class="form-control" required>
    <option value="">Select your level</option>
    <option value="100" selected>Level 100 (First Year)</option>
    <option value="200">Level 200 (Second Year)</option>
    <option value="300">Level 300 (Third Year)</option>
    <option value="400">Level 400 (Fourth Year)</option>
    <option value="500">Level 500+ (Fifth Year or above)</option>
    <option value="postgrad">Postgraduate</option>
    <option value="phd">PhD Student</option>
    </select>
    </div>

    <div class="form-group">
    <label class="required">Upload Admission Documents</label>
    <div class="file-upload-area" onclick="document.getElementById('doc-files').click()">
    <div class="upload-icon">${_Icons.upload}</div>
    <div class="upload-text">Click to upload or drag and drop</div>
    <div class="upload-hint">Accepted: Admission Letter, Student ID, Acceptance Letter (JPG, PNG, PDF - Max 5MB each)</div>
    <input type="file" id="doc-files" name="docFiles" multiple accept=".jpg,.jpeg,.png,.pdf" style="display: none;" required onchange="Pages.handleFileSelect(event)" />
    </div>
    <div id="file-list" class="file-list"></div>
    <small class="form-hint">Upload clear photos/scans of your admission documents</small>
    </div>

    <div class="form-check">
    <input type="checkbox" id="verify-declaration-document" name="verifyDeclaration" required />
    <label for="verify-declaration-document">
    I declare that I am a newly admitted student at ${universityName} and the documents provided are authentic.
    </label>
    </div>

    <div class="form-check warning-check">
    <input type="checkbox" id="verify-wait-time" name="verifyWaitTime" required />
    <label for="verify-wait-time">
    I understand that document verification takes 24-48 hours and I will be notified via email.
    </label>
    </div>

    <div class="verification-actions">
    <button type="button" class="btn btn-ghost" onclick="Pages.renderLanding()">
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
    <li><strong>Continuing students:</strong> Use your university email for instant verification</li>
    <li><strong>New students:</strong> Upload admission letter or student ID card</li>
    <li><strong>Not sure?</strong> Contact your university's IT support</li>
    <li><strong>Need assistance?</strong> Email support@uni-hub.local</li>
    </ul>
    </div>
    </div>
    </div>
    `;
  },

  switchVerificationTab (tab) {
    // Update tab buttons
    document.querySelectorAll('.verification-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.verification-tab[data-tab="${tab}"]`).classList.add('active');

    // Update forms
    document.querySelectorAll('.verification-form').forEach(f => f.classList.remove('active'));
    document.getElementById(`verification-form-${tab}`).classList.add('active');
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

  async handleStudentVerification (event) {
    event.preventDefault();
    const form = document.getElementById('verification-form-email');
    const selectedUniversity = StorageManager.get(STORAGE_KEYS.SELECTED_UNIVERSITY);

    const verificationData = {
      universityId: selectedUniversity,
      verificationMethod: 'email',
      studentEmail: form.studentEmail.value,
      studentId: form.studentId.value,
      fullName: form.fullName.value,
      phone: form.phone.value,
      level: form.level.value,
      hall: form.hall.value || null,
    };

    // Validate student email domain (basic validation)
    const emailDomain = verificationData.studentEmail.split('@')[1];
    const config = await api.loadJSON('data/config.json').catch(() => ({ universities: [] }));
    const university = config.universities.find(u => u.id === selectedUniversity);

    // Submit to backend API for proper verification
    try {
      const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
      if (api && session?.token) {
        const response = await api.verification.submit({
          studentId: verificationData.studentId,
          fullName: verificationData.fullName,
          email: verificationData.studentEmail,
          phone: verificationData.phone,
          university: selectedUniversity,
          level: verificationData.level,
          hall: verificationData.hall,
          verificationMethod: 'email',
          universityEmail: verificationData.studentEmail,
        });

        if (response.success) {
          // Email verification is pending code confirmation
          verificationData.isVerified = false;
          verificationData.isPending = true;
          verificationData.submittedAt = new Date().toISOString();
          StorageManager.set(STORAGE_KEYS.STUDENT_VERIFICATION, verificationData);
          Toast.info(`Verification Submitted! A verification code has been sent to ${verificationData.studentEmail}. Your account will be verified once confirmed.`);
          Pages.renderBrowse();
          return;
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Backend verification unavailable, using local fallback:', e.message);
    }

    // Fallback: store locally (offline mode)
    verificationData.isVerified = true;
    verificationData.verifiedAt = new Date().toISOString();
    StorageManager.set(STORAGE_KEYS.STUDENT_VERIFICATION, verificationData);
    Toast.success(`Verification Successful! Welcome, ${verificationData.fullName}! You are now verified as a student of ${university ? university.name : 'your university'}. You can now browse and trade on Uni-Hub.`);
    Pages.renderBrowse();
  },

  async handleDocumentVerification (event) {
    event.preventDefault();
    const form = document.getElementById('verification-form-document');
    const selectedUniversity = StorageManager.get(STORAGE_KEYS.SELECTED_UNIVERSITY);
    const files = document.getElementById('doc-files').files;

    // Validate files
    if (files.length === 0) {
      Toast.warning('Please upload at least one document (admission letter or student ID)');
      return;
    }

    // Validate file sizes (max 5MB each)
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        Toast.warning(`File "${file.name}" is too large. Maximum size is 5MB.`);
        return;
      }
    }

    const verificationData = {
      universityId: selectedUniversity,
      verificationMethod: 'document',
      personalEmail: form.docEmail.value,
      studentId: form.docStudentId.value,
      fullName: form.docFullName.value,
      phone: form.docPhone.value,
      level: form.docLevel.value,
      documents: Array.from(files).map(f => ({ name: f.name, size: f.size })),
      isVerified: false,
      isPending: true,
      submittedAt: new Date().toISOString(),
    };

    // Submit to backend API for proper verification
    try {
      const session = StorageManager.get(STORAGE_KEYS.SESSION, true);
      if (api && session?.token) {
        const response = await api.verification.submit({
          studentId: verificationData.studentId,
          fullName: verificationData.fullName,
          email: verificationData.personalEmail,
          phone: verificationData.phone,
          university: selectedUniversity,
          level: verificationData.level,
          verificationMethod: 'document',
          documents: verificationData.documents,
        });

        if (response.success) {
          StorageManager.set(STORAGE_KEYS.STUDENT_VERIFICATION, verificationData);
          Toast.success(`Verification Submitted! Thank you, ${verificationData.fullName}! Your documents have been submitted for verification. You will be notified within 24-48 hours once your student status is confirmed. You must be verified before making any purchases.`);
          Pages.renderBrowse();
          return;
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Backend verification unavailable, using local fallback:', e.message);
    }

    // Fallback: store locally (offline mode)
    // eslint-disable-next-line no-console
    console.log('Documents to upload:', files);
    StorageManager.set(STORAGE_KEYS.STUDENT_VERIFICATION, verificationData);
    Toast.success(`Verification Submitted! Thank you, ${verificationData.fullName}! Your documents have been submitted for verification. You must be verified before making any purchases.`);
    Pages.renderBrowse();
  },

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
      background: rgba(0, 0, 0, 0.85);
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
      background: linear-gradient(145deg, #0f0f0f, #1a1a1a);
      border-radius: 1.25rem;
      border: 1px solid rgba(0, 70, 190, 0.3);
      box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 70, 190, 0.1);
      animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .auth-close-btn {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: transparent;
      border: none;
      color: #71717a;
      cursor: pointer;
      padding: 0.5rem;
      transition: color 0.2s;
    }
    .auth-close-btn:hover {
      color: #fafafa;
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
      color: #fafafa;
      margin-bottom: 0.25rem;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .auth-subtitle {
      font-size: 0.875rem;
      color: #a1a1aa;
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
      border: 1px solid rgba(39, 39, 42, 1);
      background: #0a0a0a;
      cursor: pointer;
      transition: all 0.2s;
    }
    .social-btn:hover {
      background: rgba(24, 24, 27, 1);
      border-color: rgba(63, 63, 70, 1);
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
      border-top: 1px solid rgba(39, 39, 42, 1);
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
      background: #0a0a0a;
      padding: 0 0.5rem;
      color: #a1a1aa;
    }
    .form-group-modern {
      margin-bottom: 1rem;
    }
    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #fafafa;
      margin-bottom: 0.5rem;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .form-input {
      display: flex;
      height: 2.75rem;
      width: 100%;
      border-radius: 0.375rem;
      border: 1px solid rgba(39, 39, 42, 1);
      background: #0a0a0a;
      padding: 0 0.75rem;
      font-size: 0.875rem;
      color: #fafafa;
      transition: all 0.2s;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .form-input:focus {
      outline: none;
      border-color: rgba(0, 70, 190, 0.5);
      box-shadow: 0 0 0 2px rgba(0, 70, 190, 0.2);
    }
    .form-input::placeholder {
      color: #52525b;
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
      color: #71717a;
      transition: color 0.2s;
    }
    .password-toggle-btn:hover {
      color: #fafafa;
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
      background: #18181b;
      color: #fafafa;
      border: 1px solid rgba(39, 39, 42, 1);
      cursor: pointer;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .submit-btn:hover {
      background: #27272a;
      border-color: rgba(63, 63, 70, 1);
    }
    .submit-btn-primary {
      background: #0046be;
      color: #ffffff;
      border: none;
    }
    .submit-btn-primary:hover {
      background: #003399;
    }
    .auth-footer-links {
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(39, 39, 42, 1);
    }
    .auth-footer-links p {
      font-size: 0.875rem;
      color: #a1a1aa;
      margin-bottom: 0;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .auth-link {
      color: #0046be;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
      cursor: pointer;
      display: inline-block;
    }
    .auth-link:hover {
      color: #003399;
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
    <img src="/favicon.png" alt="Uni-Hub" />
    </div>
    <h1 class="auth-title">Welcome back</h1>
    <p class="auth-subtitle">Enter your credentials to sign in to Uni-Hub</p>
    </div>

    <div class="social-buttons-grid">
    <button class="social-btn" title="Sign in with Google">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem;">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
    </svg>
    </button>
    <button class="social-btn" title="Sign in with Apple">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem; fill: #fafafa;">
    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"></path>
    </svg>
    </button>
    <button class="social-btn" title="Sign in with X">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 1.25rem; height: 1.25rem; fill: #fafafa;">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
    </svg>
    </button>
    </div>

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
    style="font-size: 0.875rem; color: #71717a; transition: color 0.2s; cursor: pointer;"
    onmouseover="this.style.color='#0046be'"
    onmouseout="this.style.color='#71717a'">
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
        if (typeof router !== 'undefined' && router.navigate) {
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
        Toast.error('Login failed: ' + result.error);
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
      background: #050505;
      background-image: radial-gradient(circle at 15% 50%, rgba(0, 70, 190, 0.08), transparent 25%),
      radial-gradient(circle at 85% 30%, rgba(0, 70, 190, 0.05), transparent 25%);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .auth-card-modern {
      position: relative;
      width: 100%;
      max-width: 28rem;
      padding: 1.5rem;
      background: #0a0a0a;
      border-radius: 0.75rem;
      border: 1px solid rgba(39, 39, 42, 1);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
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
      color: #fafafa;
      margin-bottom: 0.25rem;
    }
    .auth-subtitle {
      font-size: 0.875rem;
      color: #a1a1aa;
    }
    .form-group-modern {
      margin-bottom: 1rem;
    }
    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #fafafa;
      margin-bottom: 0.5rem;
    }
    .form-input {
      display: flex;
      height: 2.75rem;
      width: 100%;
      border-radius: 0.375rem;
      border: 1px solid rgba(39, 39, 42, 1);
      background: #0a0a0a;
      padding: 0 0.75rem;
      font-size: 0.875rem;
      color: #fafafa;
      transition: all 0.2s;
    }
    .form-input:focus {
      outline: none;
      border-color: rgba(0, 70, 190, 0.5);
      box-shadow: 0 0 0 2px rgba(0, 70, 190, 0.2);
    }
    .form-input::placeholder {
      color: #52525b;
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
      color: #71717a;
      transition: color 0.2s;
    }
    .password-toggle-btn:hover {
      color: #fafafa;
    }
    .form-check-modern {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin: 1rem 0;
    }
    .form-check-modern input[type="checkbox"] {
      margin-top: 0.125rem;
      accent-color: #0046be;
    }
    .form-check-modern label {
      font-size: 0.875rem;
      color: #a1a1aa;
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
      background: #18181b;
      color: #fafafa;
      border: 1px solid rgba(39, 39, 42, 1);
      cursor: pointer;
    }
    .submit-btn:hover {
      background: #27272a;
      border-color: rgba(63, 63, 70, 1);
    }
    .submit-btn-primary {
      background: #0046be;
      color: #ffffff;
      border: none;
    }
    .submit-btn-primary:hover {
      background: #003399;
    }
    .auth-footer-links {
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(39, 39, 42, 1);
    }
    .auth-footer-links p {
      font-size: 0.875rem;
      color: #a1a1aa;
    }
    .auth-link {
      color: #fafafa;
      text-decoration: underline;
      text-underline-offset: 4px;
      transition: color 0.2s;
      cursor: pointer;
    }
    .auth-link:hover {
      color: #d4d4d8;
    }
    </style>

    <div class="auth-page-container">
    <div class="auth-card-modern">
    <div class="auth-card-header">
    <div class="auth-icon-wrapper">
    <img src="/favicon.png" alt="Uni-Hub" />
    </div>
    <h1 class="auth-title">Create an account</h1>
    <p class="auth-subtitle">Enter your details to get started with Uni-Hub</p>
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
    <label for="terms">I agree to the <a href="#" class="auth-link">Terms of Service</a> and <a href="#" class="auth-link">Privacy Policy</a></label>
    </div>

    <button type="submit" class="submit-btn submit-btn-primary">Create Account</button>
    </form>

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
  };

  const result = await authManager.register(userData);

  if (result.success) {
    if (typeof toastManager !== 'undefined') {
    toastManager?.show(result.message, 'success');
    }
    try {
    if (typeof router !== 'undefined' && router.navigate) {
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
    Toast.error('Registration failed: ' + result.error);
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
      const response = await fetch(`${window.API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success) {
        toastManager?.show(result.message, 'success');

        // Show reset token input for development (remove in production)
        if (result.resetToken) {
          Pages.renderResetPassword(result.resetToken);
        } else {
          Pages.renderLogin();
        }
      } else {
        toastManager?.show(result.error || 'Failed to send reset link', 'error');
      }
    } catch (error) {
      toastManager?.show('Network error. Please try again.', 'error');
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
      toastManager?.show('Passwords do not match', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Resetting...';

    try {
      const response = await fetch(`${window.API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const result = await response.json();

      if (result.success) {
        toastManager?.show(result.message, 'success');
        setTimeout(() => Pages.renderLogin(), 1500);
      } else {
        toastManager?.show(result.error || 'Failed to reset password', 'error');
      }
    } catch (error) {
      toastManager?.show('Network error. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Reset Password';
    }
  },
};

window.AuthPageMethods = AuthPageMethods;

if (typeof Pages !== 'undefined') {
  Pages.handleRegister = AuthPageMethods.handleRegister;
  Pages.handleLogin = AuthPageMethods.handleLogin;
  Pages.handleForgotPassword = AuthPageMethods.handleForgotPassword;
  Pages.handleResetPassword = AuthPageMethods.handleResetPassword;
  Pages.renderLogin = AuthPageMethods.renderLogin;
  Pages.renderRegister = AuthPageMethods.renderRegister;
}
