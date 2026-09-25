const Toast = {
  _container: null,

  _getContainer() {
    if (!this._container || !document.body.contains(this._container)) {
      this._container = document.querySelector('.uni-toast-container');
      if (!this._container) {
        this._container = document.createElement('div');
        this._container.className = 'uni-toast-container';
        document.body.appendChild(this._container);
      }
    }
    return this._container;
  },

  show(message, type = 'info', duration = 4000) {
    const container = this._getContainer();
    const icons = {
      success: '\u2713',
      error: '\u2717',
      warning: '\u26A0',
      info: '\u2139',
    };

    const item = document.createElement('div');
    item.className = `uni-toast-item uni-toast-${type}`;
    item.innerHTML = `
      <span class="uni-toast-icon">${icons[type] || icons.info}</span>
      <span class="uni-toast-message">${message}</span>
      <button class="uni-toast-close" data-action="toast-close">&times;</button>
    `;

    container.appendChild(item);
    requestAnimationFrame(() => item.classList.add('visible'));

    setTimeout(() => {
      item.classList.remove('visible');
      setTimeout(() => item.remove(), 300);
    }, duration);
  },

  success(message) {
    this.show(message, 'success');
  },
  error(message) {
    this.show(message, 'error');
  },
  warning(message) {
    this.show(message, 'warning');
  },
  info(message) {
    this.show(message, 'info');
  },
};

window.Toast = Toast;

export { Toast };

// ---------------------------------------------------------------------------
// Delegated event wiring for the migrated inline handler (Task 15).
//
// The former `onclick="this.parentElement.remove()"` is now
// `data-action="toast-close"`; the click listener below dispatches against
// TOAST_ACTIONS only, walking the event's composed path innermost-first so a
// click fires on every ancestor carrying an action (inline semantics), with
// `e.cancelBubble` honored to stop the walk when an action propagates a stop.
// Per-action try/catch records the first error, keeps walking, then rethrows
// so the window error surface still sees it.
//
// TODO: security review / CSP — registry names are prefixed `toast-` so they
// can never collide with data-action values consumed by the other document
// listeners (page-*, browse-*, auth-* registries; nav / toggle-dark / logout
// in layout.js).
// ---------------------------------------------------------------------------
let _toastDelegatesInstalled = false;
const TOAST_ACTIONS = {
  'toast-close': el => el.parentElement.remove(),
};

const _toastActionRegistries = {
  click: [TOAST_ACTIONS, 'action'],
};

const _installToastDelegates = () => {
  if (_toastDelegatesInstalled) {
    return;
  }
  _toastDelegatesInstalled = true;
  const run = e => {
    const registry = _toastActionRegistries[e.type];
    if (!registry) {
      return;
    }
    const map = registry[0];
    const key = registry[1];
    // Fixed dispatch path: matches inline-handler semantics when an action
    // re-renders (removes) part of the tree mid-dispatch.
    const path = e.composedPath();
    let firstError = null;
    for (const node of path) {
      if (!node || node.nodeType !== 1) {
        continue;
      }
      const name = node.dataset[key];
      if (!name) {
        continue;
      }
      const action = map[name];
      if (!action) {
        continue;
      }
      try {
        action(node, e);
      } catch (err) {
        // Inline handlers were independent listeners: one throwing never
        // silenced the others. Record the first error, keep walking, then
        // rethrow so the window error surface (Sentry) still sees it.
        if (firstError === null) {
          firstError = err;
        }
      }
      if (e.cancelBubble) {
        break;
      }
    }
    if (firstError !== null) {
      throw firstError;
    }
  };
  document.addEventListener('click', e => run(e));
};
_installToastDelegates();
