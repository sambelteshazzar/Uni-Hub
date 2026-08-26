const StaticPageMethods = {

  renderTerms () {
    const mainContent = document.getElementById('main-content');
    Pages.showOriginalNavFooter();
    mainContent.innerHTML = `
      <div class="container" style="padding: 3rem 1rem; max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">Terms of Service</h1>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">Version ${POLICIES.VERSION} · Last updated: ${POLICIES.LAST_UPDATED}</p>

        ${(POLICIES.terms || [])
    .map(s => `
        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">${s.heading}</h2>
          <div style="line-height: 1.7; color: var(--text-secondary);">${s.body}</div>
        </section>`)
    .join('')}
      </div>
    `;
    window.scrollTo(0, 0);
  },

  renderPrivacy () {
    const mainContent = document.getElementById('main-content');
    Pages.showOriginalNavFooter();
    mainContent.innerHTML = `
      <div class="container" style="padding: 3rem 1rem; max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">Privacy Policy</h1>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">Version ${POLICIES.VERSION} · Last updated: ${POLICIES.LAST_UPDATED}</p>

        ${(POLICIES.privacy || [])
    .map(s => `
        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">${s.heading}</h2>
          <div style="line-height: 1.7; color: var(--text-secondary);">${s.body}</div>
        </section>`)
    .join('')}
      </div>
    `;
    window.scrollTo(0, 0);
  },

  renderAbout () {
    const mainContent = document.getElementById('main-content');
    Pages.showOriginalNavFooter();
    mainContent.innerHTML = `
      <div class="container" style="padding: 3rem 1rem; max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">About JERTS CART</h1>
        <p style="font-size: 1.125rem; line-height: 1.7; color: var(--text-secondary); margin-bottom: 2rem;">JERTS CART is Ghana's premier student marketplace, built by students for students. We connect buyers and sellers within university communities, making it easy and safe to trade textbooks, electronics, hostel essentials, and more.</p>

        <section style="margin-bottom: 2.5rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Our Mission</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">To create a trusted, affordable marketplace for Ghanaian university students, reducing the cost of campus life by enabling peer-to-peer commerce within verified university communities.</p>
        </section>

        <section style="margin-bottom: 2.5rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">What We Offer</h2>
          <ul style="line-height: 1.9; color: var(--text-secondary); padding-left: 1.5rem;">
            <li><strong>Verified Students Only</strong> &mdash; Every user is verified as a real student at a Ghanaian university</li>
            <li><strong>Secure Transactions</strong> &mdash; Multiple payment options including MoMo, bank transfer, and cash</li>
            <li><strong>University-Specific</strong> &mdash; Browse and sell within your own campus community</li>
            <li><strong>Real-Time Messaging</strong> &mdash; Communicate directly with buyers and sellers</li>
            <li><strong>Delivery Options</strong> &mdash; Flexible delivery including Bolt, Yango, and in-person pickup</li>
          </ul>
        </section>

        <section style="margin-bottom: 2.5rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Universities We Serve</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">JERTS CART serves students across all major Ghanaian universities including University of Ghana (Legon), KNUST, University of Cape Coast, UDS, UPSA, Ashesi University, and many more across all 16 regions of Ghana.</p>
        </section>

        <section style="margin-bottom: 2.5rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Our Team</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">JERTS CART was founded by Ghanaian university students who experienced firsthand the challenges of finding affordable textbooks, electronics, and hostel items. We understand the student hustle and built this platform to make campus life easier and more affordable.</p>
        </section>
      </div>
    `;
    window.scrollTo(0, 0);
  },

  renderContact () {
    const mainContent = document.getElementById('main-content');
    Pages.showOriginalNavFooter();
    mainContent.innerHTML = `
      <div class="container" style="padding: 3rem 1rem; max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">Contact Us</h1>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">Have a question or feedback? We would love to hear from you.</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2.5rem;">
          <div style="padding: 1.5rem; border: 1px solid var(--border, #e5e7eb); border-radius: 0.75rem;">
            <h3 style="font-weight: 600; margin-bottom: 0.5rem;">Email</h3>
            <p style="color: var(--text-secondary);"><a href="mailto:unihubsupport@gmail.com">unihubsupport@gmail.com</a></p>
          </div>
          <div style="padding: 1.5rem; border: 1px solid var(--border, #e5e7eb); border-radius: 0.75rem;">
            <h3 style="font-weight: 600; margin-bottom: 0.5rem;">Phone</h3>
            <p style="color: var(--text-secondary);">+233 50 123 4567</p>
          </div>
          <div style="padding: 1.5rem; border: 1px solid var(--border, #e5e7eb); border-radius: 0.75rem;">
            <h3 style="font-weight: 600; margin-bottom: 0.5rem;">Location</h3>
            <p style="color: var(--text-secondary);">Accra, Ghana</p>
          </div>
          <div style="padding: 1.5rem; border: 1px solid var(--border, #e5e7eb); border-radius: 0.75rem;">
            <h3 style="font-weight: 600; margin-bottom: 0.5rem;">Hours</h3>
            <p style="color: var(--text-secondary);">Mon-Fri: 8am - 6pm GMT</p>
          </div>
        </div>

        <form onsubmit="StaticPageMethods._handleContactForm(event)" style="padding: 2rem; border: 1px solid var(--border, #e5e7eb); border-radius: 0.75rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1.5rem;">Send us a message</h2>
          <div class="form-group">
            <label for="contact-name">Name</label>
            <input type="text" id="contact-name" required placeholder="Your full name" />
          </div>
          <div class="form-group">
            <label for="contact-email">Email</label>
            <input type="email" id="contact-email" required placeholder="you@university.edu.gh" />
          </div>
          <div class="form-group">
            <label for="contact-subject">Subject</label>
            <select id="contact-subject" required>
              <option value="">Select a topic</option>
              <option value="general">General Inquiry</option>
              <option value="account">Account Issue</option>
              <option value="transaction">Transaction Problem</option>
              <option value="report">Report a User</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>
          <div class="form-group">
            <label for="contact-message">Message</label>
            <textarea id="contact-message" rows="5" required placeholder="Tell us how we can help..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%;">Send Message</button>
        </form>
      </div>
    `;
    window.scrollTo(0, 0);
  },

  _handleContactForm (event) {
    event.preventDefault();
    if (typeof toastManager !== 'undefined') {
      showToast('Message sent! We will get back to you within 24 hours.', 'success');
    }
  },
};

window.StaticPageMethods = StaticPageMethods;
