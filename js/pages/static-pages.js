import { escapeValue } from '../utils/escape.js';

// ---- Contact / support portal (spec 2026-09-24) ----

const SUPPORT_CATEGORIES = [
  ['order', 'Order & delivery'],
  ['payment', 'Payment issue'],
  ['verification', 'Student verification'],
  ['product', 'Product listing'],
  ['account', 'Account problem'],
  ['other', 'Something else'],
];

const SUPPORT_STATUS_LABEL = { open: 'Open', pending: 'Pending', resolved: 'Resolved' };

// Lazy-bound like _pageEsc in pages.js: SecurityUtils (js/utils/security.js)
// may not be loaded, so the helper falls back to string conversion instead of
// crashing the render (backend sanitizeXss already encodes on write ingress).
const escSupport = escapeValue;

function supportWhen(iso) {
  if (!iso) {
    return '';
  }
  try {
    if (typeof Formatter !== 'undefined' && Formatter.formatTimeAgo) {
      return Formatter.formatTimeAgo(iso);
    }
  } catch (err) {
    console.warn('support: time formatting failed');
  }
  return String(iso);
}

const StaticPageMethods = {
  renderTerms() {
    const mainContent = document.getElementById('main-content');
    Pages.showOriginalNavFooter();
    mainContent.innerHTML = `
      <div class="container" style="padding: 3rem 1rem; max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">Terms of Service</h1>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">Version ${POLICIES.VERSION} · Last updated: ${POLICIES.LAST_UPDATED}</p>

        ${(POLICIES.terms || [])
          .map(
            s => `
        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">${s.heading}</h2>
          <div style="line-height: 1.7; color: var(--text-secondary);">${s.body}</div>
        </section>`
          )
          .join('')}
      </div>
    `;
    window.scrollTo(0, 0);
  },

  renderPrivacy() {
    const mainContent = document.getElementById('main-content');
    Pages.showOriginalNavFooter();
    mainContent.innerHTML = `
      <div class="container" style="padding: 3rem 1rem; max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">Privacy Policy</h1>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">Version ${POLICIES.VERSION} · Last updated: ${POLICIES.LAST_UPDATED}</p>

        ${(POLICIES.privacy || [])
          .map(
            s => `
        <section style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">${s.heading}</h2>
          <div style="line-height: 1.7; color: var(--text-secondary);">${s.body}</div>
        </section>`
          )
          .join('')}
      </div>
    `;
    window.scrollTo(0, 0);
  },

  renderAbout() {
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

  async renderContact() {
    const mainContent = document.getElementById('main-content');
    Pages.showOriginalNavFooter();
    const signedIn =
      typeof authManager !== 'undefined' && authManager.isLoggedIn && authManager.isLoggedIn();

    mainContent.innerHTML = `
      <div class="container" style="padding: 3rem 1rem; max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">Contact support</h1>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">Questions about an order, payment or your student verification — we usually reply within 24 hours.</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2.5rem;">
          <div style="padding: 1.5rem; border: 1px solid var(--border, #e5e7eb); border-radius: 0.75rem;">
            <h3 style="font-weight: 600; margin-bottom: 0.5rem;">Email</h3>
            <p style="color: var(--text-secondary);"><a href="mailto:support@jertscart.com">support@jertscart.com</a></p>
          </div>
          <div style="padding: 1.5rem; border: 1px solid var(--border, #e5e7eb); border-radius: 0.75rem;">
            <h3 style="font-weight: 600; margin-bottom: 0.5rem;">Quick answers</h3>
            <p style="color: var(--text-secondary);"><a href="#/faq">Browse the FAQ</a> — most order and payment questions are answered there.</p>
          </div>
        </div>

        <div id="contact-portal"></div>
      </div>
      <style>
        .sup-ticket { border: 1px solid var(--border, #e5e7eb); border-radius: 0.75rem; margin-bottom: 0.75rem; background: var(--bg-primary, #fff); }
        .sup-ticket-head { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; width: 100%; padding: 1rem; background: none; border: 0; cursor: pointer; text-align: left; font: inherit; }
        .sup-ticket-subject { font-weight: 600; flex: 1 1 auto; }
        .sup-ticket-time { color: var(--text-secondary, #6b7280); font-size: 0.85rem; }
        .sup-badges { display: inline-flex; gap: 0.4rem; }
        .sup-badge { font-size: 0.75rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 999px; }
        .sup-badge--open { background: rgba(0, 70, 190, 0.1); color: #0046be; }
        .sup-badge--pending { background: rgba(217, 119, 6, 0.12); color: #b45309; }
        .sup-badge--resolved { background: rgba(5, 150, 105, 0.12); color: #047857; }
        .sup-badge--order, .sup-badge--payment, .sup-badge--verification,
        .sup-badge--product, .sup-badge--account, .sup-badge--other {
          background: var(--bg-secondary, #f3f4f6); color: var(--text-secondary, #374151);
        }
        .sup-thread { padding: 0 1rem; border-top: 1px solid var(--border, #e5e7eb); }
        .sup-msg { padding: 0.75rem 0; border-bottom: 1px dashed var(--border, #e5e7eb); }
        .sup-msg--admin .sup-msg-meta { color: #0046be; font-weight: 600; }
        .sup-msg-meta { font-size: 0.8rem; color: var(--text-secondary, #6b7280); margin-bottom: 0.25rem; }
        .sup-msg-body { white-space: pre-wrap; color: var(--text-primary, #111827); }
        .sup-reply-row { display: flex; gap: 0.75rem; margin: 0.75rem 0 1rem; align-items: flex-start; }
        .sup-reply-row textarea { flex: 1; }
        .sup-empty { color: var(--text-secondary, #6b7280); padding: 1rem 0; }
        .support-new-form { border: 1px solid var(--border, #e5e7eb); border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 2rem; }
        .contact-signin { border: 1px solid var(--border, #e5e7eb); border-radius: 0.75rem; padding: 2rem; text-align: center; }
      </style>
    `;

    const portal = document.getElementById('contact-portal');
    if (!signedIn) {
      portal.innerHTML = `
        <div class="contact-signin">
          <h2 style="margin-bottom: 0.5rem;">Need a hand?</h2>
          <p style="color: var(--text-secondary); margin-bottom: 1.25rem;">Sign in to contact support — open tickets, track replies and get help with your orders.</p>
          <a class="btn btn-primary" href="#/login">Sign in to contact support</a>
        </div>`;
      window.scrollTo(0, 0);
      return;
    }

    portal.innerHTML = `
      <form id="support-new-form" class="support-new-form" novalidate>
        <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1.25rem;">Open a new ticket</h2>
        <div class="form-group">
          <label for="support-category">Category</label>
          <select id="support-category" required>
            ${SUPPORT_CATEGORIES.map(
              ([value, label]) => `<option value="${value}">${escSupport(label)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="support-subject">Subject</label>
          <input type="text" id="support-subject" maxlength="200" required placeholder="Brief summary" />
        </div>
        <div class="form-group">
          <label for="support-body">Message</label>
          <textarea id="support-body" rows="5" maxlength="5000" required placeholder="Tell us what happened..."></textarea>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Send ticket</button>
      </form>
      <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Your tickets</h2>
      <div id="contact-tickets"><p class="sup-empty">Loading…</p></div>
    `;

    // TODO: security review / CSP — event delegation on a stable parent;
    // no inline handlers, no user data interpolated into attributes.
    portal.addEventListener('submit', event => StaticPageMethods._supportSubmit(event, portal));
    portal.addEventListener('click', event => StaticPageMethods._supportClick(event));

    StaticPageMethods._refreshContactTickets(portal);
    window.scrollTo(0, 0);
  },

  async _refreshContactTickets(portal) {
    const list = portal.querySelector('#contact-tickets');
    if (!list) {
      return;
    }
    try {
      const resp = await api.support.listTickets();
      const tickets = (resp && resp.data && resp.data.tickets) || [];
      if (!tickets.length) {
        list.innerHTML = '<p class="sup-empty">No tickets yet — open one above.</p>';
        return;
      }
      list.innerHTML = tickets.map(ticket => StaticPageMethods._supportTicketRow(ticket)).join('');
    } catch (err) {
      console.warn('support: ticket list failed');
      list.innerHTML = '<p class="sup-empty">Could not load your tickets. Please try again.</p>';
    }
  },

  _supportTicketRow(ticket) {
    const id = ticket._id || ticket.id;
    return `
      <div class="sup-ticket" data-ticket-id="${escSupport(id)}">
        <button type="button" class="sup-ticket-head" data-action="toggle-thread" aria-expanded="false">
          <span class="sup-ticket-subject">${escSupport(ticket.subject)}</span>
          <span class="sup-badges">${StaticPageMethods._supportBadgesHtml(ticket)}</span>
          <span class="sup-ticket-time">${escSupport(supportWhen(ticket.updatedAt))}</span>
        </button>
        <div class="sup-thread" hidden></div>
      </div>`;
  },

  _supportBadgesHtml(ticket) {
    const cat = SUPPORT_CATEGORIES.find(([value]) => value === ticket.category);
    const status = SUPPORT_STATUS_LABEL[ticket.status] ? ticket.status : 'open';
    return `
      <span class="sup-badge sup-badge--${escSupport(ticket.category)}">${escSupport(cat ? cat[1] : ticket.category)}</span>
      <span class="sup-badge sup-badge--${status}">${escSupport(SUPPORT_STATUS_LABEL[status] || status)}</span>`;
  },

  _supportRowBadges(row, ticket) {
    const badges = row.querySelector('.sup-badges');
    if (badges) {
      badges.innerHTML = StaticPageMethods._supportBadgesHtml(ticket);
    }
  },

  async _supportClick(event) {
    const toggle = event.target.closest('[data-action="toggle-thread"]');
    if (!toggle) {
      return;
    }
    const row = toggle.closest('.sup-ticket');
    const thread = row && row.querySelector('.sup-thread');
    if (!row || !thread) {
      return;
    }
    const opening = thread.hasAttribute('hidden');
    if (!opening) {
      thread.setAttribute('hidden', '');
      toggle.setAttribute('aria-expanded', 'false');
      return;
    }
    thread.removeAttribute('hidden');
    toggle.setAttribute('aria-expanded', 'true');
    if (thread.dataset.loaded === 'true') {
      return;
    }
    thread.innerHTML = '<p class="sup-empty">Loading replies…</p>';
    const id = row.getAttribute('data-ticket-id');
    try {
      const resp = await api.support.getTicket(id);
      const data = (resp && resp.data) || {};
      thread.innerHTML =
        StaticPageMethods._supportThreadHtml(data.replies || []) +
        StaticPageMethods._supportReplyForm(id);
      thread.dataset.loaded = 'true';
    } catch (err) {
      console.warn('support: thread load failed');
      thread.innerHTML = '<p class="sup-empty">Could not load replies.</p>';
    }
  },

  _supportThreadHtml(replies) {
    if (!replies.length) {
      return '<p class="sup-empty">No replies yet.</p>';
    }
    return replies
      .map(reply => {
        const admin = reply.authorRole === 'admin';
        return `
        <div class="sup-msg${admin ? ' sup-msg--admin' : ''}">
          <div class="sup-msg-meta">${admin ? 'Support team' : 'You'} · ${escSupport(supportWhen(reply.createdAt))}</div>
          <div class="sup-msg-body">${escSupport(reply.body)}</div>
        </div>`;
      })
      .join('');
  },

  _supportReplyForm(ticketId) {
    return `
      <form class="sup-reply-row" data-reply-form="${escSupport(ticketId)}">
        <textarea rows="2" maxlength="5000" required placeholder="Write a reply..." aria-label="Reply message"></textarea>
        <button type="submit" class="btn btn-primary">Send reply</button>
      </form>`;
  },

  async _supportSubmit(event, portal) {
    const form = event.target;
    if (form.matches('#support-new-form')) {
      event.preventDefault();
      const category = form.querySelector('#support-category').value;
      const subject = form.querySelector('#support-subject').value.trim();
      const message = form.querySelector('#support-body').value.trim();
      if (!subject || !message) {
        showToast('Please add a subject and a message.', 'warning');
        return;
      }
      const button = form.querySelector('button[type="submit"]');
      if (button) {
        button.disabled = true;
      }
      try {
        await api.support.createTicket({ category, subject, message });
        showToast('Ticket sent — our team will reply here.', 'success');
        form.reset();
        await StaticPageMethods._refreshContactTickets(portal);
      } catch (err) {
        // api.request already surfaced a generic error toast.
        console.warn('support: create ticket failed');
      } finally {
        if (button) {
          button.disabled = false;
        }
      }
      return;
    }

    if (form.matches('[data-reply-form]')) {
      event.preventDefault();
      const ticketId = form.getAttribute('data-reply-form');
      const textarea = form.querySelector('textarea');
      const message = textarea ? textarea.value.trim() : '';
      if (!message) {
        showToast('Write a message first.', 'warning');
        return;
      }
      const button = form.querySelector('button[type="submit"]');
      if (button) {
        button.disabled = true;
      }
      try {
        await api.support.reply(ticketId, message);
        showToast('Reply sent.', 'success');
        const detail = await api.support.getTicket(ticketId);
        const data = (detail && detail.data) || {};
        const row = form.closest('.sup-ticket');
        const thread = row && row.querySelector('.sup-thread');
        if (thread) {
          thread.innerHTML =
            StaticPageMethods._supportThreadHtml(data.replies || []) +
            StaticPageMethods._supportReplyForm(ticketId);
          thread.dataset.loaded = 'true';
        }
        // A user reply reopens resolved/pending threads — refresh the badge.
        if (row && data.ticket) {
          StaticPageMethods._supportRowBadges(row, data.ticket);
        }
      } catch (err) {
        console.warn('support: reply failed');
      } finally {
        if (button) {
          button.disabled = false;
        }
      }
    }
  },
};

window.StaticPageMethods = StaticPageMethods;
