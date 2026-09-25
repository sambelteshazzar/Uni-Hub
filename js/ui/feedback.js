// UI kit — feedback (pill filters, empty states, error page) (extracted from pages.js AdminUI).
import { escapeValue, safeUrlValue } from '../utils/escape.js';

const _pageEsc = escapeValue;
const _pageSafeUrl = safeUrlValue;

// ---- Pill group (flat filter tabs) ----
// tabs = [{ key, label }]; activeKey is the highlighted one.
// groupClass optional — pass 'adm-pill-group--inverse' to make active dark.
// dataAttr optional — defaults to 'data-adm-pill'.
export function pillGroup(tabs, activeKey, groupClass, dataAttr) {
  const data = dataAttr || 'data-adm-pill';
  const pills = tabs
    .map(t => {
      const active = t.key === activeKey ? ' is-active' : '';
      return `<button type="button" class="adm-pill${active}" ${data}="${_pageEsc(t.key)}">${_pageEsc(t.label)}</button>`;
    })
    .join('');
  return `<div class="adm-pill-group${groupClass ? ' ' + groupClass : ''}">${pills}</div>`;
}

// ---- Empty state (page-level, outside a table) ----
export function emptyState({ icon, title, body, actions }) {
  return `
    <div class="adm-empty">
      <div class="adm-empty-icon" aria-hidden="true">${icon || ''}</div>
      <h2 class="adm-empty-title">${_pageEsc(title)}</h2>
      <p class="adm-empty-body">${_pageEsc(body || '')}</p>
      ${actions ? `<div class="adm-empty-actions">${actions}</div>` : ''}
    </div>
  `;
}

// ---- Standard pill group wiring ----
// groupEl: the .adm-pill-group element.
// onChange: (key) => void. Key is read from the pill's data attribute —
// may be data-adm-pill (default) or a custom attr (data-verif-filter,
// data-payout-filter, data-activity-filter, …).
export function wirePillGroup(groupEl, onChange) {
  if (!groupEl) {
    return;
  }
  groupEl.addEventListener('click', e => {
    const pill = e.target.closest('.adm-pill');
    if (!pill || !groupEl.contains(pill)) {
      return;
    }
    groupEl.querySelectorAll('.adm-pill').forEach(p => p.classList.remove('is-active'));
    pill.classList.add('is-active');
    // pillGroup() sets exactly one data-* key per pill — use it.
    const key = Object.values(pill.dataset)[0];
    onChange?.(key);
  });
}

// ---- Shared error / 404 / 500 / 403 / logout page (split brand layout) ----
// Reuses the adm-auth split layout from the login page for visual
// consistency. The side panel is the same brand panel; the right
// side shows the error message + primary action.
export function renderErrorPage({ code, title, body, primaryAction }) {
  const primary = primaryAction
    ? `<a href="${_pageEsc(primaryAction.href)}" class="adm-btn adm-btn--primary">${_pageEsc(primaryAction.label)}</a>`
    : '';
  return `
    <div class="adm-auth">
      <aside class="adm-auth-side">
        <div class="adm-auth-brand">
          <div class="adm-auth-brand-mark">J</div>
          <div class="adm-auth-brand-name">JERTS CART</div>
        </div>
        <div class="adm-auth-side-content">
          <h1 class="adm-auth-tagline">Something's <span class="adm-auth-tagline-accent">off</span>.</h1>
          <p class="adm-auth-description">The page you were looking for isn't here. It may have moved, been renamed, or never existed. Use the action below to get back on track.</p>
        </div>
        <div class="adm-auth-meta">© JERTS CART · Error ${_pageEsc(code || '404')}</div>
      </aside>
      <main class="adm-auth-form">
        <div class="adm-auth-form-inner">
          <h2 style="font-size:48px;font-weight:700;color:var(--neutral-900);margin:0 0 8px;letter-spacing:-0.02em;line-height:1;">${_pageEsc(code || '404')}</h2>
          <h3 class="adm-auth-form-title">${_pageEsc(title || 'Page not found')}</h3>
          <p class="adm-auth-form-sub">${_pageEsc(body || 'The page you are looking for does not exist or has been moved.')}</p>
          <div style="margin-top:24px;display:flex;gap:8px;flex-wrap:wrap;">
            ${primary}
            <a href="#/" class="adm-btn">Go to marketplace</a>
          </div>
        </div>
      </main>
    </div>
  `;
}
