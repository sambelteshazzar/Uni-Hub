/* exported modalManager */
// ============================================
// MODALS MODULE - Modal/Dialog Management
// ============================================

class ModalManager {
  constructor () {
    this.activeModals = [];
    this.modalContainer = null;
    this._previousFocusElement = null;
    this._trapHandlers = new Map();
  }

  /**
   * Initialize modal container
   */
  init () {
    if (!this.modalContainer) {
      this.modalContainer = document.createElement('div');
      this.modalContainer.className = 'modal-container-global';
      document.body.appendChild(this.modalContainer);
    }
  }

  /**
   * Open a modal
   * @param {Object} options - Modal options
   */
  open (options) {
    this.init();

    const modal = {
      id: this.generateId(),
      type: options.type || 'default',
      title: options.title || '',
      content: options.content || '',
      size: options.size || 'md',
      closable: options.closable !== false,
      onClose: options.onClose || null,
    };

    const modalElement = this.createModalElement(modal);
    this.modalContainer.appendChild(modalElement);
    this.activeModals.push(modal);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Save previously focused element
    this._previousFocusElement = document.activeElement;

    // Trigger animation
    setTimeout(() => {
      modalElement.classList.add('active');

      // Focus first focusable element inside modal
      const focusable = modalElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      }

      // Set up focus trap
      const trapHandler = e => {
        if (e.key !== 'Tab') return;

        const focusableEls = modalElement.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableEls.length === 0) return;

        const firstEl = focusableEls[0];
        const lastEl = focusableEls[focusableEls.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      };

      document.addEventListener('keydown', trapHandler);
      this._trapHandlers.set(modal.id, trapHandler);
    }, 10);

    return modal.id;
  }

  /**
   * Create modal element
   * @param {Object} modal - Modal config
   * @returns {HTMLElement}
   */
  createModalElement (modal) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.dataset.modalId = modal.id;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    if (modal.title) {
      overlay.setAttribute('aria-label', modal.title);
    }

    const container = document.createElement('div');
    container.className = `modal-container modal-${modal.size}`;
    container.setAttribute('role', 'document');

    if (modal.title) {
      const header = document.createElement('div');
      header.className = 'modal-header';
      const titleEl = document.createElement('h3');
      titleEl.textContent = modal.title;
      header.appendChild(titleEl);

      if (modal.closable) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => this.close(modal.id));
        header.appendChild(closeBtn);
      }

      container.appendChild(header);
    }

    const body = document.createElement('div');
    body.className = 'modal-body';
    body.innerHTML = modal.content;
    container.appendChild(body);

    if (modal.footer) {
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      footer.innerHTML = modal.footer;
      container.appendChild(footer);
    }

    overlay.appendChild(container);

    if (modal.closable) {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) {
          this.close(modal.id);
        }
      });
    }

    if (modal.closable) {
      const escHandler = e => {
        if (e.key === 'Escape') {
          this.close(modal.id);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    }

    return overlay;
  }

  /**
   * Close a modal
   * @param {string} modalId - Modal ID
   */
  close (modalId) {
    const modalIndex = this.activeModals.findIndex(m => m.id === modalId);

    if (modalIndex === -1) {
      return;
    }

    const modal = this.activeModals[modalIndex];
    const overlay = this.modalContainer.querySelector(`[data-modal-id="${modalId}"]`);

    // Remove focus trap handler
    const trapHandler = this._trapHandlers.get(modalId);
    if (trapHandler) {
      document.removeEventListener('keydown', trapHandler);
      this._trapHandlers.delete(modalId);
    }

    if (overlay) {
      overlay.classList.remove('active');

      setTimeout(() => {
        overlay.remove();

        // Remove from active modals
        this.activeModals.splice(modalIndex, 1);

        // Restore body scroll if no more modals
        if (this.activeModals.length === 0) {
          document.body.style.overflow = '';
        }

        // Restore focus to previously focused element
        if (this._previousFocusElement && typeof this._previousFocusElement.focus === 'function') {
          this._previousFocusElement.focus();
          this._previousFocusElement = null;
        }

        // Call onClose callback
        if (modal.onClose) {
          modal.onClose();
        }
      }, 200);
    }
  }

  /**
   * Close all modals
   */
  closeAll () {
    this.activeModals.forEach(modal => {
      this.close(modal.id);
    });
  }

  /**
   * Generate unique ID
   * @returns {string}
   */
  generateId () {
    return `modal_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Show alert modal
   * @param {Object} options - Alert options
   */
  alert (options) {
    const { title = 'Alert', message, type = 'info', onConfirm } = options;

    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };

    const contentEl = document.createElement('div');
    contentEl.className = 'modal-confirm';
    const iconDiv = document.createElement('div');
    iconDiv.className = 'modal-confirm-icon';
    iconDiv.textContent = icons[type] || icons.info;
    const msgP = document.createElement('p');
    msgP.textContent = message;
    contentEl.appendChild(iconDiv);
    contentEl.appendChild(msgP);

    const modalId = this.open({
      type: 'alert',
      title: title,
      content: contentEl.outerHTML,
      onClose: () => {
        if (onConfirm) {
          onConfirm(false);
        }
      },
    });

    const footerEl = document.createElement('div');
    const okBtn = document.createElement('button');
    okBtn.className = 'btn btn-primary';
    okBtn.textContent = 'OK';
    okBtn.addEventListener('click', () => this.closeAndCallback(modalId, true));
    footerEl.appendChild(okBtn);

    const modalOverlay = this.modalContainer.querySelector(`[data-modal-id="${modalId}"]`);
    if (modalOverlay) {
      const container = modalOverlay.querySelector('.modal-container');
      const existingFooter = container.querySelector('.modal-footer');
      if (existingFooter) existingFooter.remove();
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      footer.appendChild(okBtn);
      container.appendChild(footer);
    }

    return modalId;
  }

  /**
   * Show confirm modal
   * @param {Object} options - Confirm options
   */
  confirm (options) {
    const {
      title = 'Confirm',
      message,
      confirmText = 'Yes',
      cancelText = 'No',
      _onConfirm,
      onCancel,
    } = options;

    const contentEl = document.createElement('div');
    contentEl.className = 'modal-confirm';
    const msgP = document.createElement('p');
    msgP.textContent = message;
    contentEl.appendChild(msgP);

    const modalId = this.open({
      type: 'confirm',
      title: title,
      content: contentEl.outerHTML,
      onClose: () => {
        if (onCancel) {
          onCancel();
        }
      },
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-outline';
    cancelBtn.textContent = cancelText;
    cancelBtn.addEventListener('click', () => this.close(modalId));

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.textContent = confirmText;
    confirmBtn.addEventListener('click', () => this.closeAndCallback(modalId, true));

    const modalOverlay = this.modalContainer.querySelector(`[data-modal-id="${modalId}"]`);
    if (modalOverlay) {
      const container = modalOverlay.querySelector('.modal-container');
      const existingFooter = container.querySelector('.modal-footer');
      if (existingFooter) existingFooter.remove();
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      footer.appendChild(cancelBtn);
      footer.appendChild(confirmBtn);
      container.appendChild(footer);
    }

    return modalId;
  }

  /**
   * Close modal and execute callback
   * @param {string} modalId - Modal ID
   * @param {boolean} confirmed - Whether confirmed
   */
  closeAndCallback (modalId, confirmed) {
    const modal = this.activeModals.find(m => m.id === modalId);
    if (modal && modal.onConfirm) {
      modal.onConfirm(confirmed);
    }
    this.close(modalId);
  }

  /**
   * Show condition selector modal
   * @param {Object} options - Options
   */
  showConditionSelector (options) {
    const { _onSelect, currentValue } = options;

    const conditions = [
      { id: 'excellent', name: 'Excellent', icon: '🟢', description: 'Like new, barely used' },
      { id: 'good', name: 'Good', icon: '🟡', description: 'Minor signs of use, works perfectly' },
      { id: 'fair', name: 'Fair', icon: '🟠', description: 'Well-used with visible wear' },
    ];

    const contentDiv = document.createElement('div');
    contentDiv.className = 'condition-selector';

    conditions.forEach(c => {
      const optionDiv = document.createElement('div');
      optionDiv.className = 'condition-option' + (currentValue === c.id ? ' selected' : '');

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'condition';
      radio.value = c.id;
      if (currentValue === c.id) radio.checked = true;

      const iconDiv = document.createElement('div');
      iconDiv.className = 'condition-icon';
      iconDiv.textContent = c.icon;

      const infoDiv = document.createElement('div');
      infoDiv.className = 'condition-info';
      const h4 = document.createElement('h4');
      h4.textContent = c.name;
      const p = document.createElement('p');
      p.textContent = c.description;
      infoDiv.appendChild(h4);
      infoDiv.appendChild(p);

      optionDiv.appendChild(radio);
      optionDiv.appendChild(iconDiv);
      optionDiv.appendChild(infoDiv);

      optionDiv.addEventListener('click', () => {
        this.selectedCondition = c.id;
        contentDiv.querySelectorAll('.condition-option').forEach(o => o.classList.remove('selected'));
        optionDiv.classList.add('selected');
        radio.checked = true;
      });

      contentDiv.appendChild(optionDiv);
    });

    const modalId = this.open({
      type: 'condition-selector',
      title: 'Select Item Condition',
      content: contentDiv.outerHTML,
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-outline';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.close(modalId));

    const selectBtn = document.createElement('button');
    selectBtn.className = 'btn btn-primary';
    selectBtn.textContent = 'Select';
    selectBtn.addEventListener('click', () => this.confirmCondition(modalId));

    const modalOverlay = this.modalContainer.querySelector(`[data-modal-id="${modalId}"]`);
    if (modalOverlay) {
      const container = modalOverlay.querySelector('.modal-container');
      const existingFooter = container.querySelector('.modal-footer');
      if (existingFooter) existingFooter.remove();
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      footer.appendChild(cancelBtn);
      footer.appendChild(selectBtn);
      container.appendChild(footer);
    }

    this.selectedCondition = currentValue;
  }

  /**
   * Select condition option
   * @param {string} conditionId - Condition ID
   * @param {string} modalId - Modal ID
   */
  selectCondition (conditionId, modalId) {
    this.selectedCondition = conditionId;

    // Update visual selection
    const modal = this.modalContainer.querySelector(`[data-modal-id="${modalId}"]`);
    modal.querySelectorAll('.condition-option').forEach(option => {
      option.classList.remove('selected');
    });
    const selectedOption = modal
      .querySelector(`input[value="${conditionId}"]`)
      .closest('.condition-option');
    selectedOption.classList.add('selected');
  }

  /**
   * Confirm condition selection
   * @param {string} modalId - Modal ID
   */
  confirmCondition (modalId) {
    const modal = this.activeModals.find(m => m.id === modalId);
    if (modal && modal.onSelect) {
      modal.onSelect(this.selectedCondition);
    }
    this.close(modalId);
  }

  /**
   * Show image preview modal
   * @param {string} imageUrl - Image URL
   * @param {string} alt - Alt text
   */
  showImage (imageUrl, alt = '') {
    const modalId = this.open({
      type: 'image',
      size: 'xl',
      content: `
        <div class="image-modal-content">
          <img src="${SecurityUtils.escapeHtml(imageUrl)}" alt="${SecurityUtils.escapeHtml(alt)}" />
        </div>
      `,
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-outline';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => this.close(modalId));

    const modalOverlay = this.modalContainer.querySelector(`[data-modal-id="${modalId}"]`);
    if (modalOverlay) {
      const container = modalOverlay.querySelector('.modal-container');
      const existingFooter = container.querySelector('.modal-footer');
      if (existingFooter) existingFooter.remove();
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      footer.appendChild(closeBtn);
      container.appendChild(footer);
    }
  }

  /**
   * Show quick view modal for product
   * @param {Object} product - Product object
   */
  showProductQuickView (product) {
    const content = document.createElement('div');
    content.className = 'product-quick-view';

    const imageDiv = document.createElement('div');
    imageDiv.className = 'quick-view-image';
    const img = document.createElement('img');
    img.src = product.images[0];
    img.alt = product.title;
    imageDiv.appendChild(img);

    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'quick-view-details';

    const h3 = document.createElement('h3');
    h3.textContent = product.title;

    const priceDiv = document.createElement('div');
    priceDiv.className = 'quick-view-price';
    priceDiv.textContent = Formatter.formatPrice(product.price);

    const condDiv = document.createElement('div');
    condDiv.className = 'quick-view-condition';
    condDiv.innerHTML = `<span class="condition-badge ${product.condition}">${Formatter.getConditionBadge(product.condition)}</span>`;

    const descP = document.createElement('p');
    descP.className = 'quick-view-description';
    descP.textContent = Formatter.truncate(product.description, 150);

    const sellerDiv = document.createElement('div');
    sellerDiv.className = 'quick-view-seller';
    const _sName = product.seller?.fullName || product.sellerName || product.seller?.name || 'Seller';
    sellerDiv.textContent = `Seller: ${_sName} (${product.seller?.rating || product.sellerRating || 0}⭐)`;

    detailsDiv.appendChild(h3);
    detailsDiv.appendChild(priceDiv);
    detailsDiv.appendChild(condDiv);
    detailsDiv.appendChild(descP);
    detailsDiv.appendChild(sellerDiv);

    content.appendChild(imageDiv);
    content.appendChild(detailsDiv);

    const modalId = this.open({
      type: 'quick-view',
      size: 'lg',
      title: 'Quick View',
      content: content.outerHTML,
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-outline';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => this.close(modalId));

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn-primary';
    viewBtn.textContent = 'View Full Details';
    viewBtn.addEventListener('click', () => {
      Pages.renderProductDetail(product.id);
      this.close(modalId);
    });

    const modalOverlay = this.modalContainer.querySelector(`[data-modal-id="${modalId}"]`);
    if (modalOverlay) {
      const container = modalOverlay.querySelector('.modal-container');
      const existingFooter = container.querySelector('.modal-footer');
      if (existingFooter) existingFooter.remove();
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      footer.appendChild(closeBtn);
      footer.appendChild(viewBtn);
      container.appendChild(footer);
    }
  }

  /**
   * Check if modal is open
   * @returns {boolean}
   */
  isModalOpen () {
    return this.activeModals.length > 0;
  }

  /**
   * Get active modal count
   * @returns {number}
   */
  getActiveCount () {
    return this.activeModals.length;
  }
}

// Create singleton instance
const modalManager = new ModalManager();

if (typeof window !== 'undefined') {
  window.modalManager = modalManager;
}

export { ModalManager, modalManager };
