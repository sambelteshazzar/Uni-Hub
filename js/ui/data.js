// UI kit — data-display primitives (extracted from pages.js AdminUI).
import { escapeValue, safeUrlValue } from '../utils/escape.js';

const _pageEsc = escapeValue;
const _pageSafeUrl = safeUrlValue;

let _rowMenusBound = false;

// ---- Stat card (one stat) ----
export function statCard({ label, value, delta, deltaKind }) {
  const deltaClass = deltaKind ? `adm-stat-delta--${deltaKind}` : 'adm-stat-delta--muted';
  return `
    <div class="adm-stat">
      <div class="adm-stat-label">${_pageEsc(label)}</div>
      <div class="adm-stat-value">${value}</div>
      ${delta ? `<div class="adm-stat-delta ${deltaClass}">${_pageEsc(delta)}</div>` : ''}
    </div>
  `;
}

// ---- Stat grid (wraps stat cards) ----
export function statGrid(cards) {
  return `<section class="adm-stats">${cards.join('')}</section>`;
}

// ---- Card surface (with optional header) ----
export function card(titleHtml, bodyHtml, headerActionsHtml) {
  return `
    <section class="adm-card">
      ${
        titleHtml
          ? `
        <header class="adm-card-header">
          <div>${titleHtml}</div>
          ${headerActionsHtml ? `<div>${headerActionsHtml}</div>` : ''}
        </header>
      `
          : ''
      }
      <div class="adm-table-wrap">${bodyHtml}</div>
    </section>
  `;
}

// ---- Table from column defs + rows ----
// columns: [{ label, render(row) -> string }]; render emits raw HTML.
// rows: array of objects. emptyHtml is shown when rows is empty.
export function table({ columns, rows, emptyHtml, footerHtml, rowAttr }) {
  const thead = `<thead><tr>${columns.map(c => `<th class="adm-th">${_pageEsc(c.label)}</th>`).join('')}</tr></thead>`;
  const tbody =
    rows.length === 0
      ? emptyHtml ||
        `<tr><td class="adm-td" colspan="${columns.length}"><div class="adm-empty"><div class="adm-empty-title">No records</div></div></td></tr>`
      : rows
          .map(row => {
            const attrs = rowAttr ? rowAttr(row) : '';
            return `<tr${attrs}>${columns.map(c => `<td class="adm-td">${c.render(row)}</td>`).join('')}</tr>`;
          })
          .join('');
  return `<table class="adm-table">${thead}<tbody>${tbody}</tbody></table>${footerHtml || ''}`;
}

// ---- Table skeleton (loading shimmer) ----
// columns: column count to fake; rows: skeleton row count.
export function tableSkeleton({ columns = 5, rows = 6 } = {}) {
  const safeCols = Math.max(1, columns);
  const ths = Array.from(
    { length: safeCols },
    () => '<th class="adm-th"><span class="adm-skel adm-skel--th"></span></th>'
  ).join('');
  const trs = Array.from(
    { length: rows },
    () =>
      `<tr>${Array.from(
        { length: safeCols },
        () => '<td class="adm-td"><span class="adm-skel"></span></td>'
      ).join('')}</tr>`
  ).join('');
  return `<table class="adm-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

// ---- Numbered pagination footer ----
// Buttons carry data-adm-page="N" — wire page-level delegation on
// click of [data-adm-page] (skip when disabled).
export function paginationFooter({ total, page, pageSize }) {
  const count = total || 0;
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const cur = Math.min(Math.max(1, page), pages);
  if (count === 0) {
    return `
    <div class="adm-pagination">
      <span class="adm-pagination-info">Showing 0 of 0</span>
    </div>`;
  }
  const start = (cur - 1) * pageSize + 1;
  const end = Math.min(cur * pageSize, count);
  const info = `<span class="adm-pagination-info">Showing ${start}&ndash;${end} of ${count}</span>`;
  if (pages <= 1) {
    return `
    <div class="adm-pagination">
      ${info}
    </div>`;
  }
  const nums = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i += 1) {
      nums.push(i);
    }
  } else {
    nums.push(1);
    const from = Math.max(2, cur - 2);
    const to = Math.min(pages - 1, cur + 2);
    if (from > 2) {
      nums.push('…');
    }
    for (let i = from; i <= to; i += 1) {
      nums.push(i);
    }
    if (to < pages - 1) {
      nums.push('…');
    }
    nums.push(pages);
  }
  const buttons = nums
    .map(n => {
      if (n === '…') {
        return '<span class="adm-pagination-ellipsis">&hellip;</span>';
      }
      const active = n === cur ? ' is-active' : '';
      const current = n === cur ? ' aria-current="page"' : '';
      return `<button type="button" class="adm-btn adm-btn--sm adm-page-num${active}" data-adm-page="${n}"${current}>${n}</button>`;
    })
    .join('');
  return `
    <div class="adm-pagination">
      ${info}
      <div class="adm-pagination-actions">
        <button type="button" class="adm-btn adm-btn--sm" data-adm-page="${cur - 1}"${
          cur <= 1 ? ' disabled' : ''
        }>Previous</button>
        ${buttons}
        <button type="button" class="adm-btn adm-btn--sm" data-adm-page="${cur + 1}"${
          cur >= pages ? ' disabled' : ''
        }>Next</button>
      </div>
    </div>`;
}

// ---- Row action menu (single ⋯ trigger per row) ----
// items = [{ label, danger?, data }] where data is a map of data-*
// attributes (e.g. { 'product-action': 'delete', 'product-id': id })
// so existing page-level [data-*-action] delegation keeps working.
export function rowMenu(items) {
  _bindRowMenus();
  const menuItems = items
    .map(it => {
      const data = Object.entries(it.data || {})
        .map(([k, v]) => `data-${_pageEsc(k)}="${_pageEsc(v)}"`)
        .join(' ');
      return `<button type="button" role="menuitem" class="adm-rowmenu-item${
        it.danger ? ' adm-rowmenu-item--danger' : ''
      }" ${data}>${_pageEsc(it.label)}</button>`;
    })
    .join('');
  return `
    <div class="adm-rowmenu" data-rowmenu>
      <button type="button" class="adm-btn adm-btn--sm adm-rowmenu-trigger" data-rowmenu-trigger aria-haspopup="menu" aria-expanded="false" aria-label="Row actions">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
      </button>
      <div class="adm-rowmenu-pop" role="menu" hidden>${menuItems}</div>
    </div>
  `;
}

// Global trigger / outside-click / Escape handling — installed once.
// The pop uses position:fixed (set here from the trigger rect) so it
// escapes .adm-table-wrap overflow clipping on first/last rows.
export function _bindRowMenus() {
  if (_rowMenusBound) {
    return;
  }
  _rowMenusBound = true;
  const closeAll = () => {
    document.querySelectorAll('.adm-rowmenu-pop.is-open').forEach(pop => {
      pop.classList.remove('is-open');
      pop.hidden = true;
      const trig = pop.parentElement && pop.parentElement.querySelector('[data-rowmenu-trigger]');
      if (trig) {
        trig.setAttribute('aria-expanded', 'false');
      }
    });
    window.removeEventListener('scroll', closeAll, true);
  };
  const open = trigger => {
    const wrap = trigger.closest('[data-rowmenu]');
    const pop = wrap && wrap.querySelector('.adm-rowmenu-pop');
    if (!pop) {
      return;
    }
    pop.hidden = false;
    pop.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    const r = trigger.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    let top = r.bottom + 4;
    let left = r.right - pr.width;
    if (top + pr.height > window.innerHeight - 8) {
      top = r.top - pr.height - 4;
    }
    if (left < 8) {
      left = 8;
    } else if (left + pr.width > window.innerWidth - 8) {
      left = window.innerWidth - pr.width - 8;
    }
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
    window.addEventListener('scroll', closeAll, true);
  };
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-rowmenu-trigger]');
    if (trigger) {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      closeAll();
      if (!isOpen) {
        open(trigger);
      }
      return;
    }
    // Any other click (menu item or outside) closes every open menu.
    closeAll();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAll();
    }
  });
}
