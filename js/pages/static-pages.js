const StaticPageMethods = {

  renderTerms () {
    const mainContent = document.getElementById('main-content');
    Pages.showOriginalNavFooter();
    mainContent.innerHTML = `
      <div class="container" style="padding: 3rem 1rem; max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">Terms of Service</h1>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">Last updated: April 2026</p>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">1. Acceptance of Terms</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">By accessing and using Uni-Hub, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform. Uni-Hub is a student marketplace platform that connects buyers and sellers within university communities in Ghana.</p>
        </section>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">2. User Accounts</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">You must be a registered student at a Ghanaian university to use Uni-Hub. You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information during registration and verify your student status. Uni-Hub reserves the right to suspend accounts that violate these terms.</p>
        </section>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">3. Buying and Selling</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">All listings must be for legal products and services. Sellers are responsible for accurate product descriptions and fair pricing. Buyers should inspect products before completing transactions. Uni-Hub facilitates connections but is not a party to any transaction between users. Both buyers and sellers must honour completed transactions.</p>
        </section>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">4. Prohibited Items</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">The following items are prohibited: illegal substances, weapons, counterfeit goods, stolen items, and any items that violate Ghanaian law. Listings violating these rules will be removed and the seller's account may be suspended.</p>
        </section>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">5. Payments and Refunds</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">Payments are processed through our supported payment methods (MTN MoMo, Telecel Cash, Bank Transfer, Cash on Delivery). Refund policies vary by seller and are subject to our dispute resolution process. Uni-Hub is not liable for payment disputes between users.</p>
        </section>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">6. Limitation of Liability</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">Uni-Hub provides the platform &ldquo;as is&rdquo; and is not responsible for the quality, safety, or legality of items listed, the accuracy of listings, or the ability of sellers to sell or buyers to pay. We are not liable for any damages arising from your use of the platform.</p>
        </section>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">7. Contact</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">For questions about these Terms, please visit our <a href="#/contact" style="color: var(--primary);">contact page</a>.</p>
        </section>
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
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">Last updated: April 2026</p>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">1. Information We Collect</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">We collect information you provide directly: name, email, phone number, university, and student verification details. We also collect usage data including search queries, browsing history, and device information to improve your experience.</p>
        </section>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">2. How We Use Your Information</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">Your information is used to: provide and improve our services, verify your student status, facilitate transactions, send order confirmations and notifications, provide customer support, and ensure platform safety and security.</p>
        </section>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">3. Data Sharing</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">We do not sell your personal data. We may share information with: other users as needed for transactions (e.g., seller sees buyer delivery address), payment processors to complete transactions, and law enforcement when required by Ghanaian law.</p>
        </section>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">4. Data Security</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">We implement industry-standard security measures including encryption, secure authentication, and CSRF protection. However, no method of electronic transmission is 100% secure, and we cannot guarantee absolute security.</p>
        </section>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">5. Your Rights</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">You may: access and update your profile information, delete your account, opt out of non-essential communications, and request a copy of your data. To exercise these rights, visit your dashboard settings or contact us.</p>
        </section>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">6. Cookies</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">We use essential cookies to maintain your session and authentication state. Analytics cookies help us understand platform usage. You can disable non-essential cookies in your browser settings.</p>
        </section>

        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">7. Contact</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">For privacy-related inquiries, please visit our <a href="#/contact" style="color: var(--primary);">contact page</a>.</p>
        </section>
      </div>
    `;
    window.scrollTo(0, 0);
  },

  renderAbout () {
    const mainContent = document.getElementById('main-content');
    Pages.showOriginalNavFooter();
    mainContent.innerHTML = `
      <div class="container" style="padding: 3rem 1rem; max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">About Uni-Hub</h1>
        <p style="font-size: 1.125rem; line-height: 1.7; color: var(--text-secondary); margin-bottom: 2rem;">Uni-Hub is Ghana's premier student marketplace, built by students for students. We connect buyers and sellers within university communities, making it easy and safe to trade textbooks, electronics, hostel essentials, and more.</p>

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
          <p style="line-height: 1.7; color: var(--text-secondary);">Uni-Hub serves students across all major Ghanaian universities including University of Ghana (Legon), KNUST, University of Cape Coast, UDS, UPSA, Ashesi University, and many more across all 16 regions of Ghana.</p>
        </section>

        <section style="margin-bottom: 2.5rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Our Team</h2>
          <p style="line-height: 1.7; color: var(--text-secondary);">Uni-Hub was founded by Ghanaian university students who experienced firsthand the challenges of finding affordable textbooks, electronics, and hostel items. We understand the student hustle and built this platform to make campus life easier and more affordable.</p>
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
            <p style="color: var(--text-secondary);">support@unihub.com.gh</p>
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
      toastManager.show('Message sent! We will get back to you within 24 hours.', 'success');
    }
  },
};

window.StaticPageMethods = StaticPageMethods;
