/* exported adminSupportManager */
// ============================================
// ADMIN SUPPORT MODULE - Ticket queue & threads
// ============================================
// TODO: security review — ticket subjects/bodies are user-generated
// content (PII): never persist them client-side, always escape at
// render time (the Pages renderers own escaping).

class AdminSupportManager {
  constructor() {
    this._initialized = false;
    this._openCount = null;
    this._openCountAt = 0;
  }

  async init() {
    if (this._initialized) {
      return;
    }
    this._initialized = true;
  }

  // GET /admin/support/tickets — server-side filter/search/pagination.
  // Resolves to the FULL body: { data: { tickets, total, openCount, page, pageSize } }.
  list(params = {}) {
    return api.admin.supportTickets(params);
  }

  // GET /admin/support/tickets/:id — { data: { ticket, replies, userEmail } }.
  getThread(id) {
    return api.admin.supportTicket(id);
  }

  // POST /admin/support/tickets/:id/replies — { data: { reply, ticket, emailSent } }.
  reply(id, message) {
    return api.admin.replySupport(id, message);
  }

  // PUT /admin/support/tickets/:id — { data: { ticket } }.
  setStatus(id, status) {
    return api.admin.updateSupportStatus(id, status);
  }

  // Sidebar badge count with a 30s TTL. Fails soft — the badge is
  // decorative and must never break an admin page render.
  async getOpenCount(force = false) {
    const TTL_MS = 30000;
    if (!force && this._openCount !== null && Date.now() - this._openCountAt < TTL_MS) {
      return this._openCount;
    }
    try {
      const resp = await api.admin.supportTickets({ status: 'all', pageSize: 1 });
      const data = (resp && resp.data) || {};
      this._openCount = typeof data.openCount === 'number' ? data.openCount : 0;
      this._openCountAt = Date.now();
    } catch (err) {
      console.warn('support: open-count fetch failed');
    }
    return this._openCount || 0;
  }
}

const adminSupportManager = new AdminSupportManager();

window.adminSupportManager = adminSupportManager;
if (typeof dispatchEvent !== 'undefined') {
  dispatchEvent(new Event('module-loaded', { detail: 'AdminSupportManager' }));
}
