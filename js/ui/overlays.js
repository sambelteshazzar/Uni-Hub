// UI kit — overlays (modals, dialogs, toast) (extracted from pages.js AdminUI).
import { escapeValue, safeUrlValue } from '../utils/escape.js';

const _pageEsc = escapeValue;
const _pageSafeUrl = safeUrlValue;

// ---- Modal (open + delegated listener; returns the overlay element) ----
// Caller appends to document.body and wires the delegated handler
// (see wireModal for the standard pattern).
export function modalHtml({ id, title, sub, body, footer, size }) {
  const sizeClass = size ? ` adm-modal--${size}` : '';
  return `
    <div id="${id}" class="adm-modal-backdrop" role="dialog" aria-modal="true">
      <div class="adm-modal${sizeClass}">
        <div class="adm-modal-header">
          <div>
            <h2 class="adm-modal-title">${_pageEsc(title)}</h2>
            ${sub ? `<p class="adm-modal-sub">${_pageEsc(sub)}</p>` : ''}
          </div>
          <button type="button" class="adm-modal-close" data-adm-modal-close aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="adm-modal-body">${body}</div>
        <div class="adm-modal-actions">${footer || ''}</div>
      </div>
    </div>
  `;
}

// ---- Standard modal wiring: close on backdrop, close button, Esc ----
// handlers = { onClose: () => void, onAction: (key) => void }
// Buttons inside .adm-modal-actions with data-adm-modal-action=KEY
// are routed to handlers.onAction.
export function wireModal(overlay, handlers) {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      handlers.onClose?.();
      return;
    }
    const closeBtn = e.target.closest('[data-adm-modal-close]');
    if (closeBtn) {
      handlers.onClose?.();
      return;
    }
    const actionBtn = e.target.closest('[data-adm-modal-action]');
    if (actionBtn) {
      handlers.onAction?.(actionBtn.dataset.admModalAction, actionBtn);
    }
  });
  const escHandler = e => {
    if (e.key === 'Escape') {
      handlers.onClose?.();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// ---- Promise-based confirm dialog (replaces window.confirm) ----
export function confirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
}) {
  return new Promise(resolve => {
    const existing = document.getElementById('adm-confirm-dialog');
    if (existing) {
      existing.remove();
    }
    const wrap = document.createElement('div');
    wrap.innerHTML = modalHtml({
      id: 'adm-confirm-dialog',
      title,
      body: `<p class="adm-modal-confirm-msg">${_pageEsc(message || '')}</p>`,
      footer: `
        <button type="button" class="adm-btn" data-adm-modal-action="cancel">${_pageEsc(
          cancelLabel
        )}</button>
        <button type="button" class="adm-btn ${
          danger ? 'adm-btn--danger' : 'adm-btn--primary'
        }" data-adm-modal-action="confirm">${_pageEsc(confirmLabel)}</button>
      `,
    });
    const overlay = wrap.firstElementChild;
    document.body.appendChild(overlay);
    const close = result => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(result);
    };
    const onKey = e => {
      if (e.key === 'Escape') {
        close(false);
      }
    };
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.closest('[data-adm-modal-close]')) {
        close(false);
        return;
      }
      const actionBtn = e.target.closest('[data-adm-modal-action]');
      if (actionBtn) {
        close(actionBtn.dataset.admModalAction === 'confirm');
      }
    });
    document.addEventListener('keydown', onKey);
    const confirmBtn = overlay.querySelector('[data-adm-modal-action="confirm"]');
    if (confirmBtn) {
      confirmBtn.focus();
    }
  });
}

// ---- Promise-based prompt dialog (replaces window.prompt) ----
// Resolves with the trimmed non-empty value, or null on cancel.
export function promptDialog({
  title,
  message,
  placeholder = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  maxlength = 300,
}) {
  return new Promise(resolve => {
    const existing = document.getElementById('adm-prompt-dialog');
    if (existing) {
      existing.remove();
    }
    const wrap = document.createElement('div');
    wrap.innerHTML = modalHtml({
      id: 'adm-prompt-dialog',
      title,
      body: `
        ${message ? `<p class="adm-modal-confirm-msg">${_pageEsc(message)}</p>` : ''}
        <textarea id="adm-prompt-input" class="adm-modal-field" rows="3" maxlength="${
          Number(maxlength) || 300
        }" placeholder="${_pageEsc(placeholder)}"></textarea>
        <p class="adm-modal-error" role="alert" id="adm-prompt-error"></p>
      `,
      footer: `
        <button type="button" class="adm-btn" data-adm-modal-action="cancel">${_pageEsc(
          cancelLabel
        )}</button>
        <button type="button" class="adm-btn adm-btn--danger" data-adm-modal-action="confirm">${_pageEsc(
          confirmLabel
        )}</button>
      `,
    });
    const overlay = wrap.firstElementChild;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#adm-prompt-input');
    const errorEl = overlay.querySelector('#adm-prompt-error');
    const close = value => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(value);
    };
    const onKey = e => {
      if (e.key === 'Escape') {
        close(null);
      }
    };
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.closest('[data-adm-modal-close]')) {
        close(null);
        return;
      }
      const actionBtn = e.target.closest('[data-adm-modal-action]');
      if (actionBtn) {
        if (actionBtn.dataset.admModalAction !== 'confirm') {
          close(null);
          return;
        }
        const value = input ? input.value.trim() : '';
        if (!value) {
          if (errorEl) {
            errorEl.textContent = 'Please enter a value.';
          }
          if (input) {
            input.focus();
          }
          return;
        }
        close(value);
      }
    });
    document.addEventListener('keydown', onKey);
    if (input) {
      input.focus();
    }
  });
}

// ---- Toast (light) ----
export function toast(message, kind) {
  let host = document.getElementById('adm-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'adm-toast-host';
    host.className = 'adm-toast-host';
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.className = 'adm-toast' + (kind ? ` adm-toast--${kind}` : '');
  t.textContent = message;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('is-visible'));
  setTimeout(() => {
    t.classList.remove('is-visible');
    setTimeout(() => t.remove(), 200);
  }, 2400);
}
