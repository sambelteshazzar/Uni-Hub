/* eslint-disable no-unused-vars */
// ============================================
// UNIVERSITIES PAGE — public list, picker, onboarding
// Three renderers live here:
//   - renderUniversities:     public info page at /#/universities
//   - renderUniversityPicker: reusable component for signup & onboarding
//   - renderOnboarding:       picker wrapped for /#/onboarding
// All use the same CSS variables as the rest of the app; no inline colors.
// ============================================

const UniversitiesPage = {
  // Cache universities per page load so we don't re-hit the API.
  _cache: null,

  async _loadActive (force) {
    if (this._cache && !force) {return this._cache;}
    const resp = await api.request('/auth/universities');
    const list = resp?.data?.universities || [];
    this._cache = list;
    return list;
  },

  // -------- public info page --------
  async renderUniversities () {
    const main = document.getElementById('main-content');
    if (!main) {return;}

    // Hide admin chrome on this public page.
    const navbar = document.getElementById('navbar');
    if (navbar) {navbar.style.display = '';}

    main.innerHTML = `
      <div class="auth-container" style="max-width: 1100px; margin: 3rem auto; padding: 0 1.5rem;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 style="font-size: 2rem; font-weight: 700; margin: 0 0 0.5rem;">Universities on JERTS CART</h1>
          <p style="color: var(--neutral-600); margin: 0;">
            Browse all universities. Pick one during signup to join its campus marketplace.
          </p>
        </div>
        <div id="universities-grid">
          <p style="text-align: center; color: var(--neutral-500);">Loading universities…</p>
        </div>
      </div>
    `;

    let list = [];
    try {
      list = await UniversitiesPage._loadActive();
    } catch (err) {
      console.warn('universities: failed to load', err);
    }

    const grid = main.querySelector('#universities-grid');
    if (!grid) {return;}

    if (!list.length) {
      grid.innerHTML = `
        <p style="text-align: center; color: var(--neutral-500); padding: 2rem;">
          No universities are available right now. Please check back soon.
        </p>
      `;
      return;
    }

    grid.innerHTML = list.map(u => UniversitiesPage._renderInfoCard(u)).join('');
  },

  _renderInfoCard (u) {
    const esc = UniversitiesPage._esc;
    return `
      <div class="adm-card" style="margin-bottom: 1rem; padding: 1.25rem 1.5rem;">
        <div style="display: flex; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <h3 style="margin: 0 0 0.25rem; font-size: 1.15rem; font-weight: 600;">
              ${esc(u.name)}
            </h3>
            <p style="margin: 0; color: var(--neutral-600); font-size: 0.9rem;">
              ${esc(u.campus || '')}${u.region ? ' · ' + esc(u.region) : ''}
            </p>
          </div>
          <span style="background: var(--success); color: white; font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.6rem; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;">
            Active
          </span>
        </div>
      </div>
    `;
  },

  // -------- reusable picker --------
  // Renders a list of active universities as selectable cards. Returns
  // when the user picks via the onSelect callback. Pure DOM, no fetch.
  async renderPicker (container, { onSelect, selectedId = null, compact = false } = {}) {
    const esc = UniversitiesPage._esc;
    let list = [];
    try {
      list = await UniversitiesPage._loadActive();
    } catch (err) {
      container.innerHTML = `
        <div class="adm-form-error">Couldn't load universities. Please try again.</div>
      `;
      return;
    }

    if (!list.length) {
      container.innerHTML = `
        <div class="adm-form-error">
          No active universities right now. Please check back soon.
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(u => UniversitiesPage._renderPickerCard(u, { selectedId, compact, esc })).join('');

    // Delegate click-to-select on the card body (and a keyboard handler
    // for accessibility — Enter on a focused card selects it).
    container.addEventListener('click', (e) => {
      const card = e.target.closest('[data-uni-id]');
      if (!card) {return;}
      const id = card.getAttribute('data-uni-id');
      UniversitiesPage._markSelected(container, id);
      if (typeof onSelect === 'function') {onSelect(id);}
    });
    container.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') {return;}
      const card = e.target.closest('[data-uni-id]');
      if (!card) {return;}
      e.preventDefault();
      const id = card.getAttribute('data-uni-id');
      UniversitiesPage._markSelected(container, id);
      if (typeof onSelect === 'function') {onSelect(id);}
    });
  },

  _renderPickerCard (u, { selectedId, compact, esc }) {
    const isSelected = selectedId === u.id;
    const padding = compact ? '0.85rem 1rem' : '1rem 1.25rem';
    const border = isSelected
      ? '2px solid var(--primary)'
      : '1px solid var(--border-color, #e5e7eb)';
    const bg = isSelected ? 'var(--bg-secondary, #f9fafb)' : 'var(--bg-primary, #fff)';
    return `
      <div
        role="button"
        tabindex="0"
        aria-pressed="${isSelected ? 'true' : 'false'}"
        data-uni-id="${esc(u.id)}"
        style="
          display: flex; align-items: center; gap: 0.75rem;
          padding: ${padding};
          margin-bottom: 0.5rem;
          background: ${bg};
          border: ${border};
          border-radius: 8px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        "
        onmouseover="this.style.borderColor='var(--primary)'"
        onmouseout="if(this.getAttribute('aria-pressed')!=='true'){this.style.borderColor='var(--border-color, #e5e7eb)'};"
      >
        <div style="
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid ${isSelected ? 'var(--primary)' : 'var(--neutral-300, #d1d5db)'};
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        ">
          ${isSelected ? `<div style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary);"></div>` : ''}
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: var(--text-primary, #111827);">${esc(u.name)}</div>
          <div style="font-size: 0.85rem; color: var(--neutral-600);">${esc(u.campus || '')}${u.region ? ' · ' + esc(u.region) : ''}</div>
        </div>
      </div>
    `;
  },

  _markSelected (container, id) {
    container.querySelectorAll('[data-uni-id]').forEach(card => {
      const isSel = card.getAttribute('data-uni-id') === id;
      card.setAttribute('aria-pressed', isSel ? 'true' : 'false');
      card.style.border = isSel
        ? '2px solid var(--primary)'
        : '1px solid var(--border-color, #e5e7eb)';
      card.style.background = isSel
        ? 'var(--bg-secondary, #f9fafb)'
        : 'var(--bg-primary, #fff)';
      // Replace the radio dot
      const dot = card.querySelector('div > div');
      if (dot) {
        dot.innerHTML = isSel ? '<div style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary);"></div>' : '';
        dot.style.border = isSel
          ? '2px solid var(--primary)'
          : '2px solid var(--neutral-300, #d1d5db)';
      }
    });
  },

  // -------- onboarding wrapper --------
  // Used at /#/onboarding — renders the picker in a centered card and a
  // "Save and continue" button. On success, calls the new
  // /api/auth/me/university endpoint and routes to /#/browse.
  async renderOnboarding () {
    const main = document.getElementById('main-content');
    if (!main) {return;}

    // If somehow not logged in, send to login.
    if (typeof authManager === 'undefined' || !authManager.isLoggedIn()) {
      if (typeof Pages !== 'undefined' && Pages.renderLogin) {Pages.renderLogin();}
      return;
    }

    main.innerHTML = `
      <div class="auth-container" style="max-width: 600px; margin: 3rem auto; padding: 0 1.5rem;">
        <div class="auth-card verification-card" style="text-align: left; padding: 2.5rem 2rem;">
          <h2 style="margin: 0 0 0.5rem; font-size: 1.5rem; font-weight: 700;">Pick your university</h2>
          <p style="color: var(--neutral-600); margin: 0 0 1.5rem;">
            We need this to show you the right campus marketplace. You can change it later from your profile.
          </p>
          <div id="onboarding-picker-host"></div>
          <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: flex-end;">
            <button class="btn btn-primary" id="onboarding-save" disabled>Save and continue</button>
          </div>
        </div>
      </div>
    `;

    const host = main.querySelector('#onboarding-picker-host');
    const saveBtn = main.querySelector('#onboarding-save');
    let chosen = null;

    await UniversitiesPage.renderPicker(host, {
      onSelect: (id) => {
        chosen = id;
        if (saveBtn) {saveBtn.disabled = false;}
      },
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        if (!chosen) {return;}
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
        try {
          const resp = await api.auth.setUniversity(chosen);
          if (resp && resp.success) {
            // Refresh the in-memory user so the post-login guard doesn't
            // bounce us back to /#/onboarding.
            if (typeof authManager !== 'undefined' && authManager.setCurrentUser) {
              authManager.setCurrentUser(resp.data || resp.user);
            }
            if (typeof showToast === 'function') {showToast('University saved. Welcome to JERTS CART!', 'success');}
            if (typeof window.router !== 'undefined' && window.router.navigate) {
              window.router.navigate('/browse');
            } else {
              window.location.hash = '#/browse';
            }
            if (typeof Pages !== 'undefined' && Pages.renderBrowse) {Pages.renderBrowse();}
          } else {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save and continue';
            if (typeof showToast === 'function') {
              showToast(resp?.error || 'Could not save university.', 'error');
            }
          }
        } catch (err) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save and continue';
          if (typeof showToast === 'function') {showToast('Network error. Please try again.', 'error');}
        }
      });
    }
  },

  _esc (s) {
    const e = (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) ||
      (window.SecurityUtils && window.SecurityUtils.escapeHtml);
    return e ? e(s) : String(s);
  },
};

window.UniversitiesPage = UniversitiesPage;
