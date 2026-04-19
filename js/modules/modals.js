/* exported modalManager */
// ============================================
// MODALS MODULE - Modal/Dialog Management
// ============================================

class ModalManager {
  constructor () {
    this.activeModals = [];
    this.modalContainer = null;
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

    // Trigger animation
    setTimeout(() => {
      modalElement.classList.add('active');
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

    const container = document.createElement('div');
    container.className = `modal-container modal-${modal.size}`;

    // Header
    if (modal.title) {
      const header = document.createElement('div');
      header.className = 'modal-header';
      header.innerHTML = `
        <h3>${modal.title}</h3>
        ${modal.closable ? '<button class="modal-close" onclick="modalManager.close(\'' + modal.id + '\')">×</button>' : ''}
      `;
      container.appendChild(header);
    }

    // Body
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.innerHTML = modal.content;
    container.appendChild(body);

    // Footer (if provided)
    if (modal.footer) {
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      footer.innerHTML = modal.footer;
      container.appendChild(footer);
    }

    overlay.appendChild(container);

    // Close on overlay click
    if (modal.closable) {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) {
          this.close(modal.id);
        }
      });
    }

    // Close on ESC key
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
    return `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    return this.open({
      type: 'alert',
      title: title,
      content: `
        <div class="modal-confirm">
          <div class="modal-confirm-icon">${icons[type] || icons.info}</div>
          <p>${message}</p>
        </div>
      `,
      footer: `
        <button class="btn btn-primary" onclick="modalManager.closeAndCallback('${this.activeModals[this.activeModals.length - 1]?.id}', true)">
          OK
        </button>
      `,
      onClose: () => {
        if (onConfirm) {
          onConfirm(false);
        }
      },
    });
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

    const modalId = this.open({
      type: 'confirm',
      title: title,
      content: `
        <div class="modal-confirm">
          <p>${message}</p>
        </div>
      `,
      footer: `
        <button class="btn btn-outline" onclick="modalManager.close('${modalId}')">
          ${cancelText}
        </button>
        <button class="btn btn-primary" onclick="modalManager.closeAndCallback('${modalId}', true)">
          ${confirmText}
        </button>
      `,
      onClose: () => {
        if (onCancel) {
          onCancel();
        }
      },
    });

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

    const content = `
      <div class="condition-selector">
        ${conditions
    .map(
      c => `
          <div class="condition-option ${currentValue === c.id ? 'selected' : ''}" 
               onclick="modalManager.selectCondition('${c.id}', '${modalId}')">
            <input type="radio" name="condition" value="${c.id}" ${currentValue === c.id ? 'checked' : ''} />
            <div class="condition-icon">${c.icon}</div>
            <div class="condition-info">
              <h4>${c.name}</h4>
              <p>${c.description}</p>
            </div>
          </div>
        `,
    )
    .join('')}
      </div>
    `;

    const modalId = this.open({
      type: 'condition-selector',
      title: 'Select Item Condition',
      content: content,
      footer: `
        <button class="btn btn-outline" onclick="modalManager.close('${modalId}')">Cancel</button>
        <button class="btn btn-primary" onclick="modalManager.confirmCondition('${modalId}')">Select</button>
      `,
    });

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
    this.open({
      type: 'image',
      size: 'xl',
      content: `
        <div class="image-modal-content">
          <img src="${imageUrl}" alt="${alt}" />
        </div>
      `,
      footer: `
        <button class="btn btn-outline" onclick="modalManager.close('${this.activeModals[this.activeModals.length - 1]?.id}')">
          Close
        </button>
      `,
    });
  }

  /**
   * Show quick view modal for product
   * @param {Object} product - Product object
   */
  showProductQuickView (product) {
    const content = `
      <div class="product-quick-view">
        <div class="quick-view-image">
          <img src="${product.images[0]}" alt="${product.title}" />
        </div>
        <div class="quick-view-details">
          <h3>${product.title}</h3>
          <div class="quick-view-price">${Formatter.formatPrice(product.price)}</div>
          <div class="quick-view-condition">
            <span class="condition-badge ${product.condition}">
              ${Formatter.getConditionBadge(product.condition)}
            </span>
          </div>
          <p class="quick-view-description">${Formatter.truncate(product.description, 150)}</p>
          <div class="quick-view-seller">
            <strong>Seller:</strong> ${product.seller.name} (${product.seller.rating}⭐)
          </div>
        </div>
      </div>
    `;

    this.open({
      type: 'quick-view',
      size: 'lg',
      title: 'Quick View',
      content: content,
      footer: `
        <button class="btn btn-outline" onclick="modalManager.close('${this.activeModals[this.activeModals.length - 1]?.id}')">
          Close
        </button>
        <button class="btn btn-primary" onclick="Pages.renderProductDetail('${product.id}'); modalManager.close('${this.activeModals[this.activeModals.length - 1]?.id}')">
          View Full Details
        </button>
      `,
    });
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
const _modalManager = new ModalManager();
