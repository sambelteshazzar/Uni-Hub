/**
 * Footer Utilities
 * Handles newsletter subscription and footer link interactions
 */

class FooterUtils {
  constructor() {
    this.init();
  }

  /**
   * Initialize footer utilities
   */
  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  /**
   * Setup footer event listeners
   */
  setup() {
    this.setupNewsletterForm();
    this.setupFooterLinks();
  }

  /**
   * Setup newsletter subscription form
   */
  setupNewsletterForm() {
    const form = document.querySelector('.footer-newsletter-form');
    if (!form) return;

    form.removeAttribute('onsubmit');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleNewsletterSubmit(form);
    });
  }

  /**
   * Handle newsletter form submission
   */
  async handleNewsletterSubmit(form) {
    const input = form.querySelector('.footer-newsletter-input');
    const email = input?.value?.trim();

    if (!email) {
      this.showFormMessage(form, 'Please enter your email address.', 'error');
      this.showNotification('Please enter your email address', 'error');
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showFormMessage(form, 'Please enter a valid email address.', 'error');
      this.showNotification('Please enter a valid email address', 'error');
      return;
    }

    const submitBtn = form.querySelector('.footer-newsletter-btn');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Subscribing...';
    }

    try {
      await this.simulateApiCall();

      input.value = '';
      this.showFormMessage(form, 'Thanks for subscribing! Check your email for confirmation.', 'success');
      this.showNotification('Thanks for subscribing! 🎉 Check your email for confirmation.', 'success');
    } catch (error) {
      this.showFormMessage(form, 'Something went wrong. Please try again.', 'error');
      this.showNotification('Something went wrong. Please try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  }

  /**
   * Simulate API call for demo purposes
   */
  simulateApiCall() {
    return new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Show notification (uses toastManager if available, otherwise alert)
   */
  showNotification(message, type = 'info') {
    if (typeof notificationManager !== 'undefined' && notificationManager[type]) {
      notificationManager[type](type === 'error' ? 'Error' : 'Success', message);
    } else if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show(message, type);
    } else {
      console.warn('[Footer]', message);
    }
  }

  /**
   * Show inline message below a form
   */
  showFormMessage(form, message, type = 'info') {
    let msgEl = form.querySelector('.footer-form-message');
    if (!msgEl) {
      msgEl = document.createElement('p');
      msgEl.className = 'footer-form-message';
      msgEl.style.cssText = 'margin:0.5rem 0 0;font-size:0.8rem;';
      form.appendChild(msgEl);
    }
    msgEl.textContent = message;
    msgEl.style.color = type === 'error' ? '#dc2626' : '#16a34a';
    setTimeout(() => { if (msgEl.parentNode) msgEl.remove(); }, 5000);
  }

  /**
   * Setup footer links that don't have pages yet
   */
  setupFooterLinks() {
    // Links that need "Coming Soon" message
    const comingSoonLinks = [
      { selector: 'a[href="#"]', text: 'Terms' },
      { selector: 'a[href="#"]', text: 'Privacy' },
      { selector: 'a[href="#"]', text: 'License' },
      { selector: 'a[href="#"]', text: 'About Us' },
      { selector: 'a[href="#"]', text: 'Blog' },
      { selector: 'a[href="#"]', text: 'Roadmap' },
      { selector: 'a[href="#"]', text: 'Universities' },
      { selector: 'a[href="#"]', text: 'Team' },
      { selector: 'a[href="#"]', text: 'Careers' },
      { selector: 'a[href="#"]', text: 'Partners' },
    ];

    // Find all links with href="#" and add click handlers
    const allLinks = document.querySelectorAll('a[href="#"]');
    allLinks.forEach(link => {
      // Skip if already has a click handler
      if (link.getAttribute('data-has-handler')) return;

      const linkText = link.textContent?.trim();

      // Check if this is a footer link
      const isFooterLink = link.closest('.footer') !== null;
      const isSocialLink = link.classList.contains('footer-social-link');

      if (isFooterLink && !isSocialLink) {
        link.setAttribute('data-has-handler', 'true');
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.showNotification(`${linkText} page coming soon!`, 'info');
        });
      } else if (isSocialLink) {
        const href = link.getAttribute('href');
        if (href && href !== '#' && href.startsWith('http')) {
          link.setAttribute('data-has-handler', 'true');
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        } else {
          link.setAttribute('data-has-handler', 'true');
          link.addEventListener('click', (e) => {
            e.preventDefault();
            const platform = link.getAttribute('aria-label') || 'Social';
            this.showNotification(`Follow us on ${platform} - Coming soon!`, 'info');
          });
        }
      }
    });

    // Also handle the contact link if it doesn't have a proper page
    const contactLink = document.querySelector('a[href="#contact"]');
    if (contactLink) {
      contactLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showNotification('Contact page coming soon! For now, email us at unihubsupport@gmail.com', 'info');
      });
    }
  }
}

// Create singleton instance
const footerUtils = new FooterUtils();

// Export for ES6 modules
export { FooterUtils, footerUtils };

// Make globally available
if (typeof window !== 'undefined') {
  window.footerUtils = footerUtils;
}
