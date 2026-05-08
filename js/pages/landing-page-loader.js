// ============================================
// LANDING PAGE COMPONENT LOADER
// Loads and assembles the Good Garms–adapted landing page
// ============================================

class _LandingPageLoader {
  /**
   * Fetch an HTML component file and return its content
   * @param {string} path - Relative path from project root
   * @returns {Promise<string>}
   */
  static async fetchComponent (path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        console.warn(`Failed to load component: ${path}`);
        return '';
      }
      return await response.text();
    } catch (err) {
      console.warn(`Error fetching component ${path}:`, err);
      return '';
    }
  }

  /**
   * Load all landing page components and assemble them
   * @returns {Promise<string>} Combined HTML string
   */
  static async loadAll () {
    const components = [
      'components/landing-page/hero.html',
      'components/landing-page/features.html',
      'components/landing-page/product-carousel.html',
      'components/landing-page/testimonials.html',
      'components/landing-page/category-grid.html',
      'components/landing-page/how-it-works.html',
      'components/landing-page/articles.html',
      'components/landing-page/faq.html',
      'components/landing-page/newsletter.html',
    ];

    const sections = await Promise.all(components.map(path => this.fetchComponent(path)));
    return sections.filter(Boolean).join('\n');
  }

  /**
   * Attach interactive behaviors to the landing page
   * - FAQ accordion toggle
   * - Testimonial carousel
   * - Newsletter form handler
   */
  static attachBehaviors () {
    // FAQ accordion
    const faqButtons = document.querySelectorAll('.lp-faq-question');
    faqButtons.forEach(button => {
      button.addEventListener('click', () => {
        const answer = document.getElementById(button.getAttribute('aria-controls'));
        const isExpanded = button.getAttribute('aria-expanded') === 'true';

        // Close all other answers
        faqButtons.forEach(otherBtn => {
          if (otherBtn !== button) {
            const otherAnswer = document.getElementById(otherBtn.getAttribute('aria-controls'));
            otherBtn.setAttribute('aria-expanded', 'false');
            if (otherAnswer) {
              otherAnswer.hidden = true;
            }
          }
        });

        // Toggle current
        button.setAttribute('aria-expanded', !isExpanded);
        if (answer) {
          answer.hidden = isExpanded;
        }
      });
    });

    // Testimonial carousel
    this.initTestimonialCarousel();

    // Newsletter form
    const form = document.getElementById('newsletter-form');
    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const input = form.querySelector('.lp-newsletter-input');
        const email = input?.value?.trim();

        if (!email || !this.isValidEmail(email)) {
          Toast.warning('Please enter a valid email address.');
          return;
        }

        // In production, this would POST to your mailing list API
        // Newsletter signup logged
        input.value = '';
        Toast.success('Thanks for signing up!');
      });
    }
  }

  /**
   * Initialize the testimonial carousel with nav and dots
   */
  static initTestimonialCarousel () {
    const track = document.querySelector('.lp-testimonials-track');
    if (!track) {
      return;
    }

    const testimonials = track.querySelectorAll('.lp-testimonial');
    if (testimonials.length === 0) {
      return;
    }

    const prevBtn = document.querySelector('.lp-testimonial-nav--prev');
    const nextBtn = document.querySelector('.lp-testimonial-nav--next');
    const dots = document.querySelectorAll('.lp-testimonial-dot');

    let currentIndex = 0;

    const showTestimonial = index => {
      if (index < 0 || index >= testimonials.length) {
        return;
      }
      currentIndex = index;

      testimonials.forEach((t, i) => {
        t.hidden = i !== index;
      });

      dots.forEach((dot, i) => {
        dot.classList.toggle('lp-testimonial-dot--active', i === index);
        dot.setAttribute('aria-pressed', i === index ? 'true' : 'false');
        dot.setAttribute('aria-label', `Show testimonial ${i + 1} of ${testimonials.length}`);
      });

      if (prevBtn) {
        prevBtn.hidden = testimonials.length <= 1 || index === 0;
      }
      if (nextBtn) {
        nextBtn.hidden = testimonials.length <= 1 || index === testimonials.length - 1;
      }
    };

    if (prevBtn) {
      prevBtn.addEventListener('click', () => showTestimonial(currentIndex - 1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => showTestimonial(currentIndex + 1));
    }
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => showTestimonial(i));
    });

    // Initialize first state
    showTestimonial(0);
  }

  /**
   * Simple email validation
   */
  static isValidEmail (email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
