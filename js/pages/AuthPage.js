/**
 * AuthPage - Login and Registration pages
 */
import { BasePage } from './BasePage.js';

export class AuthPage extends BasePage {
  /**
   * Render login page
   */
  renderLogin () {
    this.showOriginalNavFooter();

    const mainContent = this.getMainContent();
    mainContent.innerHTML = this.getLoginTemplate();
  }

  /**
   * Render registration page
   */
  renderRegister () {
    this.showOriginalNavFooter();

    const mainContent = this.getMainContent();
    mainContent.innerHTML = this.getRegisterTemplate();
  }

  /**
   * Get login template
   */
  getLoginTemplate () {
    const Pages = window.Pages;

    return `
      <style>
        .auth-container {
          min-height: calc(100vh - 300px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), transparent);
        }
        .auth-card-modern {
          width: 100%;
          max-width: 28rem;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 1.5rem;
          padding: 2.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
        }
        .auth-card-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .auth-icon-wrapper {
          width: 4rem;
          height: 4rem;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(79, 70, 229, 0.1));
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .auth-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }
        .auth-subtitle {
          font-size: 0.875rem;
          color: #737373;
        }
        .form-group-modern {
          margin-bottom: 1rem;
        }
        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #262626;
          margin-bottom: 0.5rem;
        }
        .form-input {
          display: flex;
          height: 2.75rem;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #d4d4d4;
          background: #fafafa;
          padding: 0 0.75rem;
          font-size: 0.875rem;
          color: #1a1a1a;
          transition: all 0.2s;
        }
        .form-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
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
          color: #737373;
          transition: color 0.2s;
        }
        .password-toggle-btn:hover {
          color: #262626;
        }
        .form-check-modern {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 1rem 0;
        }
        .form-check-modern input[type="checkbox"] {
          accent-color: #6366f1;
        }
        .form-check-modern label {
          font-size: 0.875rem;
          color: #525252;
          cursor: pointer;
        }
        .auth-link {
          color: #6366f1;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .auth-link:hover {
          color: #4f46e5;
        }
        .submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 2.75rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
          cursor: pointer;
        }
        .submit-btn-primary {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border: none;
        }
        .submit-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
        }
        .auth-footer-links {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e5e5;
        }
        .auth-footer-links p {
          font-size: 0.875rem;
          color: #737373;
        }
      </style>

      <div class="auth-container">
        <div class="auth-card-modern">
          <div class="auth-card-header">
            <div class="auth-icon-wrapper">
              <span style="font-size: 1.5rem;">👋</span>
            </div>
            <h1 class="auth-title">Welcome back</h1>
            <p class="auth-subtitle">Sign in to your Uni-Hub account</p>
          </div>

          <form id="login-form" onsubmit="${Pages ? 'Pages.handleLogin(event)' : ''}">
            <div class="form-group-modern">
              <label for="login-email" class="form-label">Email</label>
              <input type="email" id="login-email" name="email" class="form-input" placeholder="name@example.com" required />
            </div>

            <div class="form-group-modern">
              <label for="login-password" class="form-label">Password</label>
              <div class="password-input-wrapper">
                <input type="password" id="login-password" name="password" class="form-input" placeholder="Enter your password" required />
                <button type="button" class="password-toggle-btn" onclick="${Pages ? 'Pages.togglePassword(\'login-password\', this)' : ''}">
                  <span>👁️</span>
                </button>
              </div>
            </div>

            <div class="form-check-modern">
              <input type="checkbox" id="remember" name="remember" />
              <label for="remember">Remember me</label>
            </div>

            <button type="submit" class="submit-btn submit-btn-primary">Sign In</button>
          </form>

          <div class="auth-footer-links">
            <p>
              Don't have an account?
              <a onclick="${Pages ? 'Pages.renderRegister()' : ''}; return false;" class="auth-link">Sign up</a>
            </p>
            <p style="margin-top: 0.75rem;">
              <a onclick="${Pages ? 'Pages.renderForgotPassword()' : ''}; return false;" class="auth-link">Forgot password?</a>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get registration template
   */
  getRegisterTemplate () {
    const Pages = window.Pages;

    return `
      <style>
        .auth-container {
          min-height: calc(100vh - 300px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), transparent);
        }
        .auth-card-modern {
          width: 100%;
          max-width: 28rem;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 1.5rem;
          padding: 2.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
        }
        .auth-card-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .auth-icon-wrapper {
          width: 4rem;
          height: 4rem;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(79, 70, 229, 0.1));
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .auth-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }
        .auth-subtitle {
          font-size: 0.875rem;
          color: #737373;
        }
        .form-group-modern {
          margin-bottom: 1rem;
        }
        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #262626;
          margin-bottom: 0.5rem;
        }
        .form-input {
          display: flex;
          height: 2.75rem;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #d4d4d4;
          background: #fafafa;
          padding: 0 0.75rem;
          font-size: 0.875rem;
          color: #1a1a1a;
          transition: all 0.2s;
        }
        .form-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
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
          color: #737373;
          transition: color 0.2s;
        }
        .password-toggle-btn:hover {
          color: #262626;
        }
        .form-check-modern {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 1rem 0;
        }
        .form-check-modern input[type="checkbox"] {
          accent-color: #6366f1;
        }
        .form-check-modern label {
          font-size: 0.875rem;
          color: #525252;
          cursor: pointer;
        }
        .auth-link {
          color: #6366f1;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .auth-link:hover {
          color: #4f46e5;
        }
        .submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 2.75rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
          cursor: pointer;
        }
        .submit-btn-primary {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border: none;
        }
        .submit-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
        }
        .auth-footer-links {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e5e5;
        }
        .auth-footer-links p {
          font-size: 0.875rem;
          color: #737373;
        }
      </style>

      <div class="auth-container">
        <div class="auth-card-modern">
          <div class="auth-card-header">
            <div class="auth-icon-wrapper">
              <span style="font-size: 1.5rem;">🎓</span>
            </div>
            <h1 class="auth-title">Create an account</h1>
            <p class="auth-subtitle">Enter your details to get started with Uni-Hub</p>
          </div>

          <form id="register-form" onsubmit="${Pages ? 'Pages.handleRegister(event)' : ''}">
            <div class="form-group-modern">
              <label for="fullName" class="form-label">Full Name</label>
              <input type="text" id="fullName" name="fullName" class="form-input" placeholder="John Doe" required />
            </div>

            <div class="form-group-modern">
              <label for="email" class="form-label">Email</label>
              <input type="email" id="email" name="email" class="form-input" placeholder="name@example.com" required />
            </div>

            <div class="form-group-modern">
              <label for="phone" class="form-label">Phone Number</label>
              <input type="tel" id="phone" name="phone" class="form-input" placeholder="+233 50 123 4567" required />
            </div>

            <div class="form-group-modern">
              <label for="password" class="form-label">Password</label>
              <div class="password-input-wrapper">
                <input type="password" id="password" name="password" class="form-input" placeholder="Enter your password" required />
                <button type="button" class="password-toggle-btn" onclick="${Pages ? 'Pages.togglePassword(\'password\', this)' : ''}">
                  <span>👁️</span>
                </button>
              </div>
            </div>

            <div class="form-group-modern">
              <label for="confirmPassword" class="form-label">Confirm Password</label>
              <div class="password-input-wrapper">
                <input type="password" id="confirmPassword" name="confirmPassword" class="form-input" placeholder="Confirm your password" required />
                <button type="button" class="password-toggle-btn" onclick="${Pages ? 'Pages.togglePassword(\'confirmPassword\', this)' : ''}">
                  <span>👁️</span>
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
              <a onclick="${Pages ? 'Pages.renderLogin()' : ''}; return false;" class="auth-link">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Toggle password visibility
   * @param {string} inputId - Password input ID
   * @param {HTMLElement} button - Toggle button
   */
  static togglePassword (inputId, button) {
    const input = document.getElementById(inputId);
    const eyeIcon = button.querySelector('span');

    if (input && eyeIcon) {
      if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.textContent = '🙈';
      } else {
        input.type = 'password';
        eyeIcon.textContent = '👁️';
      }
    }
  }
}

export default AuthPage;
