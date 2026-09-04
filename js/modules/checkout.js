const _cartManager = typeof cartManager !== 'undefined' ? cartManager : null;
const _api = typeof api !== 'undefined' ? api : null;
const _StorageManager = typeof StorageManager !== 'undefined' ? StorageManager : null;
const _STORAGE_KEYS = typeof STORAGE_KEYS !== 'undefined' ? STORAGE_KEYS : null;
const _STORAGE_KEY_PREFIX =
  typeof STORAGE_KEY_PREFIX !== 'undefined' ? STORAGE_KEY_PREFIX : 'unihub_';
const _ORDER_STATUS =
  typeof ORDER_STATUS !== 'undefined'
    ? ORDER_STATUS
    : {
        PLACED: 'placed',
        CONFIRMED: 'confirmed',
        IN_TRANSIT: 'in_transit',
        DELIVERED: 'delivered',
        CANCELLED: 'cancelled',
      };
const _DELIVERY_MODES =
  typeof DELIVERY_MODES !== 'undefined'
    ? DELIVERY_MODES
    : { BOLT: 'bolt', YANGO: 'yango', IN_PERSON: 'in_person' };
const _PAYMENT_MODES =
  typeof PAYMENT_MODES !== 'undefined'
    ? PAYMENT_MODES
    : { CASH: 'cash', MOMO: 'momo', TELECEL: 'telecel', BANK: 'bank' };
const _Validator =
  typeof Validator !== 'undefined'
    ? Validator
    : {
        isValidPhone: p => /^[\d\s+()-]{7,15}$/.test(p),
      };

class CheckoutFlow {
  constructor() {
    this.STEPS = [
      { id: 'shipping', label: 'Shipping', number: 1 },
      { id: 'payment', label: 'Payment', number: 2 },
      { id: 'review', label: 'Review', number: 3 },
      { id: 'confirmation', label: 'Confirmation', number: 4 },
    ];
    this.currentStep = 0;
    this.completedSteps = new Set();
    this.shippingData = {};
    this.paymentData = {};
    this.orderResult = null;
    this.errors = {};
    this.isSubmitting = false;
  }

  init() {
    this.currentStep = 0;
    this.completedSteps = new Set();
    this.shippingData = {};
    this.paymentData = {};
    this.orderResult = null;
    this.errors = {};
    this.isSubmitting = false;
    this._prefillFromSession();
    this.render();
  }

  _prefillFromSession() {
    try {
      const session =
        _StorageManager.get(_STORAGE_KEYS.CURRENT_USER, true) ||
        _StorageManager.get(_STORAGE_KEYS.SESSION, true);
      const user = session?.user || session;
      if (user) {
        this.shippingData.fullName = user.fullName || user.name || '';
        this.shippingData.phone = user.phone || '';
        this.shippingData.university = user.university || '';
        this.shippingData.address = user.address || '';
      }
    } catch (e) {
      console.warn('checkout: loadUserDetails failed:', e);
    }
  }

  render() {
    const container = document.getElementById('checkout-flow-container');
    if (!container) {
      return;
    }
    container.innerHTML = this._buildHTML();
    this._bindEvents();
    this._updateProgress();
    this._showCurrentPanel();
  }

  _buildHTML() {
    return `
      <div class="checkout-flow">
        ${this._buildProgress()}
        <div class="checkout-panels">
          ${this._buildShippingPanel()}
          ${this._buildPaymentPanel()}
          ${this._buildReviewPanel()}
          ${this._buildConfirmationPanel()}
        </div>
      </div>
      <div class="checkout-submit-overlay" id="checkout-submit-overlay">
        <div class="checkout-submit-modal">
          <div class="checkout-submit-spinner"></div>
          <h3>Processing Order...</h3>
          <p>Please wait while we process your order.</p>
        </div>
      </div>
    `;
  }

  _buildProgress() {
    const progressPercent =
      this.currentStep > 0 ? (this.currentStep / (this.STEPS.length - 1)) * 100 : 0;
    return `
      <div class="checkout-progress">
        <div class="checkout-progress-track"></div>
        <div class="checkout-progress-fill" style="width: ${progressPercent}%"></div>
        ${this.STEPS.map((step, i) => {
          let cls = 'checkout-step-indicator';
          if (i === this.currentStep) {
            cls += ' active';
          } else if (this.completedSteps.has(i)) {
            cls += ' completed';
          } else if (i > this.currentStep) {
            cls += ' disabled';
          }
          return `
            <button class="${cls}" data-step="${i}">
              <div class="checkout-step-number"><span>${step.number}</span></div>
              <div class="checkout-step-label">${step.label}</div>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  _buildShippingPanel() {
    const d = this.shippingData;
    const e = this.errors;
    return `
      <div class="checkout-panel" data-panel="shipping">
        <div class="checkout-panel-header">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <div>
            <div class="checkout-panel-title">Shipping Information</div>
            <div class="checkout-panel-subtitle">Where should we deliver your order?</div>
          </div>
        </div>
        <div class="checkout-section">
          <div class="checkout-form">
            <div class="checkout-form-grid">
              <div class="form-group">
                <label for="ship-fullName" class="required">Full Name</label>
                <input type="text" id="ship-fullName" class="form-control ${e.fullName ? 'error' : ''}" value="${this._esc(d.fullName || '')}" placeholder="Enter your full name" />
                ${e.fullName ? `<span class="form-error">${e.fullName}</span>` : '<span class="form-error"></span>'}
              </div>
              <div class="form-group">
                <label for="ship-phone" class="required">Phone Number</label>
                <input type="tel" id="ship-phone" class="form-control ${e.phone ? 'error' : ''}" value="${this._esc(d.phone || '')}" placeholder="+233 XX XXX XXXX" />
                ${e.phone ? `<span class="form-error">${e.phone}</span>` : '<span class="form-error"></span>'}
                <span class="form-hint">Ghana format: +233 XX XXX XXXX</span>
              </div>
              <div class="form-group">
                <label for="ship-university" class="required">University</label>
                <input type="text" id="ship-university" class="form-control ${e.university ? 'error' : ''}" value="${this._esc(d.university || '')}" placeholder="e.g., University of Ghana, Legon" />
                ${e.university ? `<span class="form-error">${e.university}</span>` : '<span class="form-error"></span>'}
              </div>
              <div class="form-group">
                <label for="ship-deliveryMode" class="required">Delivery Method</label>
                <select id="ship-deliveryMode" class="form-control ${e.deliveryMode ? 'error' : ''}">
                  <option value="">Select delivery method</option>
                  <option value="in_person" ${d.deliveryMode === 'in_person' ? 'selected' : ''}>In-Person Pickup (Free)</option>
                  <option value="yango" ${d.deliveryMode === 'yango' ? 'selected' : ''}>Yango Delivery (GHS 12)</option>
                  <option value="bolt" ${d.deliveryMode === 'bolt' ? 'selected' : ''}>Bolt Delivery (GHS 15)</option>
                </select>
                ${e.deliveryMode ? `<span class="form-error">${e.deliveryMode}</span>` : '<span class="form-error"></span>'}
              </div>
              <div class="form-group full-width">
                <label for="ship-address" class="required">Delivery Address</label>
                <textarea id="ship-address" class="form-control ${e.address ? 'error' : ''}" placeholder="Hall name, room number, or off-campus address">${this._esc(d.address || '')}</textarea>
                ${e.address ? `<span class="form-error">${e.address}</span>` : '<span class="form-error"></span>'}
              </div>
              <div class="form-group full-width">
                <label for="ship-instructions">Delivery Instructions (Optional)</label>
                <textarea id="ship-instructions" class="form-control" placeholder="Any special instructions for delivery..." rows="3">${this._esc(d.instructions || '')}</textarea>
              </div>
            </div>
          </div>
        </div>
        ${this._buildActions(false, true)}
      </div>
    `;
  }

  _buildPaymentPanel() {
    const d = this.paymentData;
    const e = this.errors;
    const method = d.method || '';
    const momoProvider = d.momoProvider || '';
    return `
      <div class="checkout-panel" data-panel="payment">
        <div class="checkout-panel-header">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          <div>
            <div class="checkout-panel-title">Payment Method</div>
            <div class="checkout-panel-subtitle">Choose how you want to pay</div>
          </div>
        </div>
        <div class="checkout-section">
          <div class="payment-method-tabs">
            <label class="payment-method-tab ${method === 'mobile_money' ? 'active' : ''}">
              <input type="radio" name="paymentMethod" value="mobile_money" ${method === 'mobile_money' ? 'checked' : ''} />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              Mobile Money
            </label>
            <label class="payment-method-tab ${method === 'card' ? 'active' : ''}">
              <input type="radio" name="paymentMethod" value="card" ${method === 'card' ? 'checked' : ''} />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              Card Payment
            </label>
          </div>
          ${e.method ? `<span class="form-error" style="display:block;margin-bottom:var(--space-md);">${e.method}</span>` : ''}
          <div class="payment-mobile-money" style="display:${method === 'mobile_money' ? 'block' : 'none'};">
            <div class="momo-providers">
              <label class="momo-provider ${momoProvider === 'mtn' ? 'active' : ''}">
                <input type="radio" name="momoProvider" value="mtn" ${momoProvider === 'mtn' ? 'checked' : ''} />
                <div class="momo-provider-color mtn">M</div>
                <div class="momo-provider-name">MTN</div>
              </label>
              <label class="momo-provider ${momoProvider === 'vodafone' ? 'active' : ''}">
                <input type="radio" name="momoProvider" value="vodafone" ${momoProvider === 'vodafone' ? 'checked' : ''} />
                <div class="momo-provider-color vodafone">V</div>
                <div class="momo-provider-name">Vodafone</div>
              </label>
              <label class="momo-provider ${momoProvider === 'airteltigo' ? 'active' : ''}">
                <input type="radio" name="momoProvider" value="airteltigo" ${momoProvider === 'airteltigo' ? 'checked' : ''} />
                <div class="momo-provider-color airteltigo">AT</div>
                <div class="momo-provider-name">AirtelTigo</div>
              </label>
            </div>
            ${e.momoProvider ? `<span class="form-error" style="display:block;margin-bottom:var(--space-md);">${e.momoProvider}</span>` : ''}
            <div class="form-group">
              <label for="pay-momoPhone" class="required">MoMo Phone Number</label>
              <input type="tel" id="pay-momoPhone" class="form-control ${e.momoPhone ? 'error' : ''}" value="${this._esc(d.momoPhone || '')}" placeholder="+233 XX XXX XXXX" />
              ${e.momoPhone ? `<span class="form-error">${e.momoPhone}</span>` : '<span class="form-error"></span>'}
              <span class="form-hint">Enter the number linked to your mobile money account</span>
            </div>
          </div>
          <div class="payment-card" style="display:${method === 'card' ? 'block' : 'none'};">
            <div class="card-fields">
              <div class="form-group full-width">
                <label for="pay-cardNumber" class="required">Card Number</label>
                <input type="text" id="pay-cardNumber" class="form-control ${e.cardNumber ? 'error' : ''}" value="${this._esc(d.cardNumber || '')}" placeholder="1234 5678 9012 3456" maxlength="19" />
                ${e.cardNumber ? `<span class="form-error">${e.cardNumber}</span>` : '<span class="form-error"></span>'}
              </div>
              <div class="form-group">
                <label for="pay-cardExpiry" class="required">Expiry Date</label>
                <input type="text" id="pay-cardExpiry" class="form-control ${e.cardExpiry ? 'error' : ''}" value="${this._esc(d.cardExpiry || '')}" placeholder="MM/YY" maxlength="5" />
                ${e.cardExpiry ? `<span class="form-error">${e.cardExpiry}</span>` : '<span class="form-error"></span>'}
              </div>
              <div class="form-group">
                <label for="pay-cardCvv" class="required">CVV</label>
                <input type="text" id="pay-cardCvv" class="form-control ${e.cardCvv ? 'error' : ''}" value="${this._esc(d.cardCvv || '')}" placeholder="123" maxlength="4" />
                ${e.cardCvv ? `<span class="form-error">${e.cardCvv}</span>` : '<span class="form-error"></span>'}
              </div>
            </div>
          </div>
        </div>
        ${this._buildActions(true, true)}
      </div>
    `;
  }

  _buildReviewPanel() {
    const s = this.shippingData;
    const p = this.paymentData;
    const cartItems = _cartManager ? _cartManager.getItems() : [];
    const summary = _cartManager ? _cartManager.getSummary() : { subtotal: 0, grandTotal: 0 };
    const deliveryFee = this._calculateDeliveryFee(s.deliveryMode);
    const grandTotal = summary.subtotal + deliveryFee;

    let paymentLabel = 'Not selected';
    if (p.method === 'mobile_money') {
      const providerNames = { mtn: 'MTN', vodafone: 'Vodafone', airteltigo: 'AirtelTigo' };
      paymentLabel = `${providerNames[p.momoProvider] || 'Mobile Money'} - ${p.momoPhone || ''}`;
    } else if (p.method === 'card') {
      const last4 = p.cardNumber ? p.cardNumber.replace(/\s/g, '').slice(-4) : '';
      paymentLabel = `Card ending in ${last4}`;
    }

    const deliveryModeLabels = {
      in_person: 'In-Person Pickup',
      yango: 'Yango Delivery',
      bolt: 'Bolt Delivery',
    };

    return `
      <div class="checkout-panel" data-panel="review">
        <div class="checkout-panel-header">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <div>
            <div class="checkout-panel-title">Review Your Order</div>
            <div class="checkout-panel-subtitle">Please confirm all details before placing your order</div>
          </div>
        </div>
        <div class="checkout-review-grid">
          <div class="review-section">
            <div class="review-section-title">
              Shipping Details
              <button class="edit-link" data-goto="0">Edit</button>
            </div>
            <div class="review-detail-row"><span class="label">Name</span><span class="value">${this._esc(s.fullName)}</span></div>
            <div class="review-detail-row"><span class="label">Phone</span><span class="value">${this._esc(s.phone)}</span></div>
            <div class="review-detail-row"><span class="label">University</span><span class="value">${this._esc(s.university)}</span></div>
            <div class="review-detail-row"><span class="label">Delivery</span><span class="value">${deliveryModeLabels[s.deliveryMode] || s.deliveryMode}</span></div>
            <div class="review-detail-row"><span class="label">Address</span><span class="value">${this._esc(s.address)}</span></div>
            ${s.instructions ? `<div class="review-detail-row"><span class="label">Instructions</span><span class="value">${this._esc(s.instructions)}</span></div>` : ''}
          </div>
          <div class="review-section">
            <div class="review-section-title">
              Payment Details
              <button class="edit-link" data-goto="1">Edit</button>
            </div>
            <div class="review-detail-row"><span class="label">Method</span><span class="value">${p.method === 'mobile_money' ? 'Mobile Money' : 'Card'}</span></div>
            <div class="review-detail-row"><span class="label">Details</span><span class="value">${paymentLabel}</span></div>
          </div>
          <div class="review-section review-items">
            <div class="review-section-title">Order Items (${cartItems.length})</div>
            <div class="review-items-list">
              ${cartItems
                .map(item => {
                  const itemPrice =
                    (item.product.price + (item.variant ? item.variant.price || 0 : 0)) *
                    item.quantity;
                  return `
                  <div class="review-item">
                    <div class="review-item-image">
                      <img src="${item.product.images?.[0] || ''}" alt="${this._esc(item.product.title)}" onerror="this.src='';this.onerror=null;" />
                    </div>
                    <div class="review-item-details">
                      <div class="review-item-title">${this._esc(item.product.title)}</div>
                      ${item.variant ? `<div class="review-item-variant">${item.variant.label}: ${item.variant.value}${item.variant.price > 0 ? ` (+GHS ${item.variant.price})` : ''}</div>` : ''}
                      <div class="review-item-qty">Qty: ${item.quantity}</div>
                    </div>
                    <div class="review-item-price">GHS ${itemPrice.toFixed(2)}</div>
                  </div>
                `;
                })
                .join('')}
            </div>
          </div>
          <div class="review-totals">
            <div class="review-totals-row"><span class="label">Subtotal</span><span class="value">GHS ${summary.subtotal.toFixed(2)}</span></div>
            <div class="review-totals-row"><span class="label">Delivery Fee</span><span class="value">${deliveryFee === 0 ? 'Free' : `GHS ${deliveryFee.toFixed(2)}`}</span></div>
            <div class="review-totals-row grand-total"><span class="label">Total</span><span class="value">GHS ${grandTotal.toFixed(2)}</span></div>
          </div>
        </div>
        ${this._buildActions(true, false, true)}
      </div>
    `;
  }

  _buildConfirmationPanel() {
    const order = this.orderResult;
    if (!order) {
      return '<div class="checkout-panel" data-panel="confirmation"></div>';
    }

    const deliveryFee =
      order.pricing?.deliveryFee || this._calculateDeliveryFee(this.shippingData.deliveryMode);
    const estDelivery =
      this.shippingData.deliveryMode === 'in_person' ? 'Ready for pickup' : '1-3 business days';
    const deliveryModeLabels = {
      in_person: 'In-Person Pickup',
      yango: 'Yango Delivery',
      bolt: 'Bolt Delivery',
    };

    return `
      <div class="checkout-panel" data-panel="confirmation">
        <div class="checkout-confirmation">
          <div class="checkout-success-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" style="stroke-dasharray: 50; animation: checkoutSuccessCheck 0.6s ease 0.3s forwards; stroke-dashoffset: 50;"/></svg>
          </div>
          <h1>Order Placed Successfully!</h1>
          <p class="subtitle">Thank you for your purchase</p>
<div class="checkout-order-number-box">
      <div class="checkout-order-number-label">Order Number</div>
      <div class="checkout-order-number">${order.orderNumber || order.id || ''}</div>
    </div>
    ${
      order.trackingNumber
        ? `<div class="checkout-order-number-box" style="margin-top:0.75rem;">
      <div class="checkout-order-number-label">Tracking Number</div>
      <div class="checkout-order-number" style="color:#0046be;font-family:monospace;letter-spacing:0.05em;">${order.trackingNumber}</div>
    </div>`
        : ''
    }
          <div class="checkout-estimated-delivery">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <div>
              <div class="delivery-label">Estimated Delivery</div>
              <div class="delivery-value">${estDelivery}</div>
            </div>
          </div>
          <div class="checkout-confirmation-details">
            <h3>Order Summary</h3>
            <div class="checkout-confirmation-row"><span class="label">Delivery Method</span><span class="value">${deliveryModeLabels[this.shippingData.deliveryMode] || this.shippingData.deliveryMode}</span></div>
            <div class="checkout-confirmation-row"><span class="label">Delivery Address</span><span class="value">${this._esc(this.shippingData.address)}</span></div>
            <div class="checkout-confirmation-row"><span class="label">Payment</span><span class="value">${this.paymentData.method === 'mobile_money' ? 'Mobile Money' : 'Card'}</span></div>
            <div class="checkout-confirmation-row"><span class="label">Delivery Fee</span><span class="value">${deliveryFee === 0 ? 'Free' : `GHS ${deliveryFee.toFixed(2)}`}</span></div>
            <div class="checkout-confirmation-row total"><span class="label">Total</span><span class="value">GHS ${(order.pricing?.grandTotal || 0).toFixed(2)}</span></div>
          </div>
          <div class="checkout-confirmation-actions">
            <button class="btn btn-primary" onclick="if(typeof Pages!=='undefined')Pages.renderBrowse()">Continue Shopping</button>
            <button class="btn btn-secondary" onclick="if(typeof Pages!=='undefined')Pages.renderOrders()">View My Orders</button>
          </div>
        </div>
      </div>
    `;
  }

  _buildActions(showBack, showNext, isPlaceOrder = false) {
    return `
      <div class="checkout-actions">
        ${showBack ? '<button class="btn btn-secondary" id="checkout-btn-back">Back</button>' : '<div></div>'}
        <div class="checkout-actions-right">
          ${
            isPlaceOrder
              ? '<button class="btn btn-primary btn-lg" id="checkout-btn-place-order">Place Order</button>'
              : '<button class="btn btn-primary" id="checkout-btn-next">Continue</button>'
          }
        </div>
      </div>
    `;
  }

  _bindEvents() {
    const flow = document.querySelector('.checkout-flow');
    if (!flow) {
      return;
    }

    flow.addEventListener('click', e => {
      const stepBtn = e.target.closest('.checkout-step-indicator');
      if (stepBtn && !stepBtn.classList.contains('disabled')) {
        const stepIdx = parseInt(stepBtn.dataset.step, 10);
        if (this.completedSteps.has(stepIdx) || stepIdx <= this.currentStep) {
          this.goToStep(stepIdx);
        }
      }

      if (e.target.closest('#checkout-btn-next')) {
        e.preventDefault();
        this.nextStep();
      }

      if (e.target.closest('#checkout-btn-back')) {
        e.preventDefault();
        this.prevStep();
      }

      if (e.target.closest('#checkout-btn-place-order')) {
        e.preventDefault();
        this.submitOrder();
      }

      const editLink = e.target.closest('.edit-link[data-goto]');
      if (editLink) {
        e.preventDefault();
        this.goToStep(parseInt(editLink.dataset.goto, 10));
      }

      const paymentTab = e.target.closest('.payment-method-tab');
      if (paymentTab) {
        const radio = paymentTab.querySelector('input[type="radio"]');
        if (radio) {
          this.paymentData.method = radio.value;
          this._updatePaymentTabs();
        }
      }

      const momoProv = e.target.closest('.momo-provider');
      if (momoProv) {
        const radio = momoProv.querySelector('input[type="radio"]');
        if (radio) {
          this.paymentData.momoProvider = radio.value;
          this._updateMomoProviders();
        }
      }
    });

    flow.addEventListener('input', e => {
      const el = e.target;
      if (el.id === 'ship-fullName') {
        this.shippingData.fullName = el.value;
      }
      if (el.id === 'ship-phone') {
        this.shippingData.phone = el.value;
      }
      if (el.id === 'ship-university') {
        this.shippingData.university = el.value;
      }
      if (el.id === 'ship-address') {
        this.shippingData.address = el.value;
      }
      if (el.id === 'ship-instructions') {
        this.shippingData.instructions = el.value;
      }
      if (el.id === 'ship-deliveryMode') {
        this.shippingData.deliveryMode = el.value;
      }
      if (el.id === 'pay-momoPhone') {
        this.paymentData.momoPhone = el.value;
      }
      if (el.id === 'pay-cardNumber') {
        let val = el.value.replace(/\D/g, '').substring(0, 16);
        val = val.replace(/(.{4})/g, '$1 ').trim();
        el.value = val;
        this.paymentData.cardNumber = val;
      }
      if (el.id === 'pay-cardExpiry') {
        let val = el.value.replace(/\D/g, '').substring(0, 4);
        if (val.length >= 3) {
          val = val.substring(0, 2) + '/' + val.substring(2);
        }
        el.value = val;
        this.paymentData.cardExpiry = val;
      }
      if (el.id === 'pay-cardCvv') {
        el.value = el.value.replace(/\D/g, '').substring(0, 4);
        this.paymentData.cardCvv = el.value;
      }
      this._clearFieldError(el.id);
    });

    flow.addEventListener('change', e => {
      const el = e.target;
      if (el.id === 'ship-deliveryMode') {
        this.shippingData.deliveryMode = el.value;
      }
    });
  }

  _clearFieldError(fieldId) {
    const errorMap = {
      'ship-fullName': 'fullName',
      'ship-phone': 'phone',
      'ship-university': 'university',
      'ship-address': 'address',
      'ship-deliveryMode': 'deliveryMode',
      'pay-momoPhone': 'momoPhone',
      'pay-cardNumber': 'cardNumber',
      'pay-cardExpiry': 'cardExpiry',
      'pay-cardCvv': 'cardCvv',
    };
    const key = errorMap[fieldId];
    if (key && this.errors[key]) {
      delete this.errors[key];
      const input = document.getElementById(fieldId);
      if (input) {
        input.classList.remove('error');
      }
      const errorEl = input?.parentElement?.querySelector('.form-error');
      if (errorEl) {
        errorEl.textContent = '';
      }
    }
  }

  _updatePaymentTabs() {
    document.querySelectorAll('.payment-method-tab').forEach(tab => {
      const radio = tab.querySelector('input[type="radio"]');
      tab.classList.toggle('active', radio && radio.value === this.paymentData.method);
    });
    const momoSection = document.querySelector('.payment-mobile-money');
    const cardSection = document.querySelector('.payment-card');
    if (momoSection) {
      momoSection.style.display = this.paymentData.method === 'mobile_money' ? 'block' : 'none';
    }
    if (cardSection) {
      cardSection.style.display = this.paymentData.method === 'card' ? 'block' : 'none';
    }
  }

  _updateMomoProviders() {
    document.querySelectorAll('.momo-provider').forEach(prov => {
      const radio = prov.querySelector('input[type="radio"]');
      prov.classList.toggle('active', radio && radio.value === this.paymentData.momoProvider);
    });
  }

  _updateProgress() {
    const fill = document.querySelector('.checkout-progress-fill');
    if (fill) {
      const pct = this.currentStep > 0 ? (this.currentStep / (this.STEPS.length - 1)) * 100 : 0;
      fill.style.width = `${pct}%`;
    }
    document.querySelectorAll('.checkout-step-indicator').forEach((btn, i) => {
      btn.classList.remove('active', 'completed', 'disabled');
      if (i === this.currentStep) {
        btn.classList.add('active');
      } else if (this.completedSteps.has(i)) {
        btn.classList.add('completed');
      } else if (i > this.currentStep) {
        btn.classList.add('disabled');
      }
    });
  }

  _showCurrentPanel() {
    document.querySelectorAll('.checkout-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    const activePanel = document.querySelector(
      `.checkout-panel[data-panel="${this.STEPS[this.currentStep].id}"]`
    );
    if (activePanel) {
      activePanel.classList.add('active');
    }
  }

  _validateShipping() {
    this.errors = {};
    const d = this.shippingData;

    if (!d.fullName || d.fullName.trim().length < 2) {
      this.errors.fullName = 'Full name is required';
    }

    if (!d.phone || d.phone.trim() === '') {
      this.errors.phone = 'Phone number is required';
    } else if (!this._isValidGhanaPhone(d.phone)) {
      this.errors.phone = 'Enter a valid Ghana phone number (+233 XX XXX XXXX)';
    }

    if (!d.university || d.university.trim() === '') {
      this.errors.university = 'University is required';
    }

    if (!d.deliveryMode) {
      this.errors.deliveryMode = 'Please select a delivery method';
    }

    if (!d.address || d.address.trim() === '') {
      this.errors.address = 'Delivery address is required';
    }

    return Object.keys(this.errors).length === 0;
  }

  _validatePayment() {
    this.errors = {};
    const d = this.paymentData;

    if (!d.method) {
      this.errors.method = 'Please select a payment method';
      return false;
    }

    if (d.method === 'mobile_money') {
      if (!d.momoProvider) {
        this.errors.momoProvider = 'Please select a mobile money provider';
      }
      if (!d.momoPhone || d.momoPhone.trim() === '') {
        this.errors.momoPhone = 'MoMo phone number is required';
      } else if (!this._isValidGhanaPhone(d.momoPhone)) {
        this.errors.momoPhone = 'Enter a valid Ghana phone number (+233 XX XXX XXXX)';
      }
    }

    if (d.method === 'card') {
      if (!d.cardNumber || d.cardNumber.replace(/\s/g, '').length < 13) {
        this.errors.cardNumber = 'Enter a valid card number';
      }
      if (!d.cardExpiry || !/^\d{2}\/\d{2}$/.test(d.cardExpiry)) {
        this.errors.cardExpiry = 'Enter expiry as MM/YY';
      } else {
        const parts = d.cardExpiry.split('/').map(Number);
        const mm = parts[0];
        const yy = parts[1];
        if (mm < 1 || mm > 12) {
          this.errors.cardExpiry = 'Invalid month';
        } else {
          const now = new Date();
          const expDate = new Date(2000 + yy, mm);
          if (expDate < now) {
            this.errors.cardExpiry = 'Card has expired';
          }
        }
      }
      if (!d.cardCvv || d.cardCvv.length < 3) {
        this.errors.cardCvv = 'Enter a valid CVV';
      }
    }

    return Object.keys(this.errors).length === 0;
  }

  _isValidGhanaPhone(phone) {
    const cleaned = phone.replace(/[\s()-]/g, '');
    return /^(\+233|0)\d{9}$/.test(cleaned);
  }

  _calculateDeliveryFee(mode) {
    const fees = { bolt: 15, yango: 12, in_person: 0 };
    return fees[mode] ?? 0;
  }

  nextStep() {
    let valid = false;
    if (this.currentStep === 0) {
      valid = this._validateShipping();
    } else if (this.currentStep === 1) {
      valid = this._validatePayment();
    } else if (this.currentStep === 2) {
      return;
    } else {
      valid = true;
    }

    if (!valid) {
      this.render();
      return;
    }

    this.completedSteps.add(this.currentStep);
    this.currentStep = Math.min(this.currentStep + 1, this.STEPS.length - 1);
    this.errors = {};
    this.render();
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.errors = {};
      this.render();
    }
  }

  goToStep(index) {
    if (index >= 0 && index < this.STEPS.length) {
      if (this.completedSteps.has(index) || index <= this.currentStep) {
        this.currentStep = index;
        this.errors = {};
        this.render();
      }
    }
  }

  async submitOrder() {
    if (this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;

    const overlay = document.getElementById('checkout-submit-overlay');
    if (overlay) {
      overlay.classList.add('active');
    }

    try {
      const session =
        _StorageManager.get(_STORAGE_KEYS.CURRENT_USER, true) ||
        _StorageManager.get(_STORAGE_KEYS.SESSION, true);
      const currentUser = session?.user || session;
      if (!currentUser) {
        showToast('You must be logged in to place an order', 'warning');
        return;
      }

      // Check student verification status
      const verification = _StorageManager.get(_STORAGE_KEYS.STUDENT_VERIFICATION, true);
      const isVerified = currentUser.isVerified || (verification && verification.isVerified);
      if (!isVerified) {
        showToast(
          'You must be verified as a student to make purchases. Please complete student verification first.',
          'warning'
        );
        if (typeof Pages !== 'undefined' && Pages.renderStudentVerification) {
          Pages.renderStudentVerification();
        }
        return;
      }

      const summary = _cartManager ? _cartManager.getSummary() : { subtotal: 0 };
      const deliveryFee = this._calculateDeliveryFee(this.shippingData.deliveryMode);
      const grandTotal = summary.subtotal + deliveryFee;

      const paymentMode =
        this.paymentData.method === 'mobile_money'
          ? this.paymentData.momoProvider === 'mtn'
            ? 'momo'
            : this.paymentData.momoProvider === 'vodafone'
              ? 'telecel'
              : 'momo'
          : 'bank';

      const orderData = {
        deliveryMode: this.shippingData.deliveryMode,
        deliveryAddress: this.shippingData.address,
        deliveryInstructions: this.shippingData.instructions || '',
        paymentMode: paymentMode,
        phone: this.shippingData.phone,
      };

      let order = null;

      if (_api) {
        try {
          orderData.items = _cartManager.getItems().map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            variant: item.variant || null,
          }));
          // Replay protection: same key reused across retries of this
          // submission attempt so a flaky network cannot duplicate orders.
          orderData.idempotencyKey = this._getIdempotencyKey();
          const response = await _api.orders.create(orderData);
          if (response.success) {
            order = response.data;
          } else if (
            response.code === 'VERIFICATION_REQUIRED' ||
            response.error === 'Student verification required'
          ) {
            showToast(
              'You must be verified as a student to make purchases. Please complete student verification first.',
              'warning'
            );
            if (typeof Pages !== 'undefined' && Pages.renderStudentVerification) {
              setTimeout(() => Pages.renderStudentVerification(), 1500);
            }
            return;
          }
        } catch (e) {
          if (
            e?.response?.data?.code === 'VERIFICATION_REQUIRED' ||
            e?.response?.data?.error === 'Student verification required'
          ) {
            showToast(
              'You must be verified as a student to make purchases. Please complete student verification first.',
              'warning'
            );
            if (typeof Pages !== 'undefined' && Pages.renderStudentVerification) {
              setTimeout(() => Pages.renderStudentVerification(), 1500);
            }
            return;
          }
        }
      }

      if (!order) {
        order = {
          id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          orderNumber: this._generateOrderNumber(),
          trackingNumber: this._generateTrackingNumber(),
          userId: currentUser.id,
          customer: {
            name: this.shippingData.fullName,
            email: currentUser.email,
            phone: this.shippingData.phone,
            university: this.shippingData.university,
          },
          items: _cartManager.getItems().map(item => ({
            productId: item.product.id,
            title: item.product.title,
            price: item.product.price + (item.variant ? item.variant.price || 0 : 0),
            quantity: item.quantity,
            seller: item.product.seller,
            image: item.product.images?.[0],
            variant: item.variant || null,
          })),
          pricing: {
            subtotal: summary.subtotal,
            deliveryFee: deliveryFee,
            grandTotal: grandTotal,
            currency: 'GHS',
          },
          delivery: {
            mode: this.shippingData.deliveryMode,
            address: this.shippingData.address,
            instructions: this.shippingData.instructions || '',
          },
          payment: {
            mode: paymentMode,
            status: 'pending',
          },
          status: 'placed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this._saveOrderLocal(order);
      }

      if (_cartManager) {
        _cartManager.clear();
      }
      this._orderRequestId = null; // fresh key for the next order

      this.orderResult = order;
      this.completedSteps.add(2);
      this.currentStep = 3;
      this.render();

      if (typeof notificationManager !== 'undefined' && notificationManager) {
        notificationManager.success(
          'Order Confirmed',
          `Your order #${order.orderNumber || order.id} has been placed!`
        );
      }
    } catch (error) {
      showToast('An error occurred while placing your order. Please try again.', 'error');
    } finally {
      this.isSubmitting = false;
      if (overlay) {
        overlay.classList.remove('active');
      }
    }
  }

  _generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `UH-${year}${month}${day}-${random}`;
  }

  _generateTrackingNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const alpha = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `UHT-${year}${month}${day}-${alpha}`;
  }

  // Idempotency key for order creation. Generated once per submission
  // intent and reused across retries of the SAME attempt; cleared after a
  // successful placement so the next order gets a fresh key.
  _getIdempotencyKey() {
    if (!this._orderRequestId) {
      if (typeof CryptoUtil !== 'undefined' && CryptoUtil.generateSecureToken) {
        this._orderRequestId = CryptoUtil.generateSecureToken(16);
      } else {
        this._orderRequestId =
          'chk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12) + '-fallback';
      }
    }
    return this._orderRequestId;
  }

  _saveOrderLocal(order) {
    try {
      const key = `${_STORAGE_KEY_PREFIX}orders`;
      const orders = _StorageManager.get(key, true) || [];
      orders.unshift(order);
      _StorageManager.set(key, orders);
    } catch (e) {
      console.warn('checkout: saveOrderLocal failed:', e);
    }
  }

  _esc(str) {
    if (!str) {
      return '';
    }
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

class CheckoutManager {
  constructor() {
    this.ORDER_STORAGE_KEY = `${_STORAGE_KEY_PREFIX}orders`;
    this.useBackend = true;
    this.DELIVERY_FEES = this._getDeliveryFees();
    this.checkoutFlow = null;
  }

  _getDeliveryFees() {
    if (typeof DELIVERY_MODES === 'undefined') {
      return { bolt: 15, yango: 12, inperson: 0 };
    }
    return {
      [DELIVERY_MODES.BOLT]: 15,
      [DELIVERY_MODES.YANGO]: 12,
      [DELIVERY_MODES.IN_PERSON]: 0,
    };
  }

  initCheckoutFlow() {
    this.checkoutFlow = new CheckoutFlow();
    this.checkoutFlow.init();
    return this.checkoutFlow;
  }

  async createOrder(checkoutData) {
    const cartValidation = _cartManager.validate();
    if (!cartValidation.valid) {
      return { success: false, error: cartValidation.message };
    }

    const dataValidation = this.validateCheckoutData(checkoutData);
    if (!dataValidation.valid) {
      return { success: false, error: dataValidation.message };
    }

    const session = _StorageManager.get(_STORAGE_KEYS.CURRENT_USER, true);
    const currentUser = session?.user || null;
    if (!currentUser) {
      return { success: false, error: 'You must be logged in to place an order' };
    }

    if (this.useBackend) {
      try {
        const orderData = {
          items: _cartManager.getItems().map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            variant: item.variant || null,
          })),
          deliveryMode: checkoutData.deliveryMode,
          deliveryAddress: checkoutData.deliveryAddress,
          deliveryInstructions: checkoutData.deliveryInstructions,
          paymentMode: checkoutData.paymentMode,
          phone: checkoutData.phone || currentUser.phone,
        };
        // Pass the applied coupon code (if any) to the backend so the
        // server-side order creation can validate + apply it and bump
        // used_count. Empty string clears any prior code.
        if (checkoutData.couponCode) {
          orderData.couponCode = checkoutData.couponCode;
        }
        orderData.idempotencyKey = this._getIdempotencyKey();

        const response = await _api.orders.create(orderData);

        if (response.success) {
          _cartManager.clear();
          this._orderRequestId = null;
          return { success: true, message: 'Order placed successfully!', order: response.data };
        }
      } catch (error) {
        console.warn('checkout: placeOrder API failed, falling back to local:', error);
      }
    }

    const cartSummary = _cartManager.getSummary();
    const deliveryFee = this.calculateDeliveryFee(checkoutData.deliveryMode, cartSummary.subtotal);
    const grandTotal = cartSummary.subtotal + deliveryFee;

    const order = {
      id: this.generateOrderId(),
      orderNumber: this.generateOrderNumber(),
      trackingNumber: this.generateTrackingNumber(),
      userId: currentUser.id,
      customer: {
        name: currentUser.fullName,
        email: currentUser.email,
        phone: checkoutData.phone || currentUser.phone,
        university: currentUser.university,
      },
      items: _cartManager.getItems().map(item => ({
        productId: item.product.id,
        title: item.product.title,
        price: item.product.price + (item.variant ? item.variant.price || 0 : 0),
        quantity: item.quantity,
        seller: item.product.seller,
        image: item.product.images[0],
        variant: item.variant || null,
      })),
      pricing: {
        subtotal: cartSummary.subtotal,
        deliveryFee: deliveryFee,
        grandTotal: grandTotal,
        currency: 'GHS',
      },
      delivery: {
        mode: checkoutData.deliveryMode,
        address: checkoutData.deliveryAddress,
        instructions: checkoutData.deliveryInstructions,
      },
      payment: {
        mode: checkoutData.paymentMode,
        status: 'pending',
      },
      status: _ORDER_STATUS.PLACED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveOrder(order);
    _cartManager.clear();

    return { success: true, message: 'Order placed successfully!', order: order };
  }

  validateCheckoutData(data) {
    if (!data.deliveryMode) {
      return { valid: false, message: 'Please select a delivery method' };
    }
    if (!data.paymentMode) {
      return { valid: false, message: 'Please select a payment method' };
    }
    if (!data.deliveryAddress || data.deliveryAddress.trim() === '') {
      return { valid: false, message: 'Please enter a delivery address' };
    }
    if (data.phone && !_Validator.isValidPhone(data.phone)) {
      return { valid: false, message: 'Please enter a valid phone number' };
    }
    return { valid: true, message: 'Checkout data is valid' };
  }

  calculateDeliveryFee(mode, _subtotal) {
    return this.DELIVERY_FEES[mode] ?? this.DELIVERY_FEES[_DELIVERY_MODES.IN_PERSON] ?? 0;
  }

  generateOrderId() {
    return `order_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `UH-${year}${month}${day}-${random}`;
  }

  generateTrackingNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const alpha = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `UHT-${year}${month}${day}-${alpha}`;
  }

  saveOrder(order) {
    const orders = this.getAllOrders();
    orders.unshift(order);
    _StorageManager.set(this.ORDER_STORAGE_KEY, orders);
  }

  async getAllOrders() {
    if (this.useBackend) {
      try {
        const response = await _api.orders.getMyOrders();
        if (response.success) {
          return response.data.orders || response.data || [];
        }
      } catch (error) {
        console.warn('checkout: getOrders API failed, using local:', error);
      }
    }
    const orders = _StorageManager.get(this.ORDER_STORAGE_KEY, true);
    return orders || [];
  }

  async getUserOrders(userId) {
    const orders = await this.getAllOrders();
    return orders.filter(order => order.userId === userId);
  }

  async getOrderById(orderId) {
    const orders = await this.getAllOrders();
    return orders.find(order => order.id === orderId) || null;
  }

  async updateOrderStatus(orderId, status) {
    const orders = await this.getAllOrders();
    const orderIndex = orders.findIndex(order => order.id === orderId);
    if (orderIndex === -1) {
      return { success: false, message: 'Order not found' };
    }
    orders[orderIndex].status = status;
    orders[orderIndex].updatedAt = new Date().toISOString();
    _StorageManager.set(this.ORDER_STORAGE_KEY, orders);
    return { success: true, message: 'Order status updated', order: orders[orderIndex] };
  }

  getStatusOptions() {
    return [
      { value: _ORDER_STATUS.PLACED, label: 'Order Placed', color: '#0046be' },
      { value: _ORDER_STATUS.CONFIRMED, label: 'Confirmed', color: '#10b981' },
      { value: _ORDER_STATUS.IN_TRANSIT, label: 'In Transit', color: '#f59e0b' },
      { value: _ORDER_STATUS.DELIVERED, label: 'Delivered', color: '#10b981' },
      { value: _ORDER_STATUS.CANCELLED, label: 'Cancelled', color: '#ef4444' },
    ];
  }

  getDeliveryModeOptions() {
    return [
      {
        value: _DELIVERY_MODES.IN_PERSON,
        label: 'In-Person Pickup',
        fee: this.DELIVERY_FEES[_DELIVERY_MODES.IN_PERSON] ?? 0,
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8a2 2 0 012-2h14a2 2 0 012 2v13"/><path d="M9 21V12h6v9"/><path d="M1 21h22"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
      },
      {
        value: _DELIVERY_MODES.YANGO,
        label: 'Yango Delivery',
        fee: this.DELIVERY_FEES[_DELIVERY_MODES.YANGO] ?? 12,
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 002 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
      },
      {
        value: _DELIVERY_MODES.BOLT,
        label: 'Bolt Delivery',
        fee: this.DELIVERY_FEES[_DELIVERY_MODES.BOLT] ?? 15,
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1"/><path d="M12 17V5"/><path d="M5 17a2 2 0 104 0"/><path d="M15 17a2 2 0 104 0"/></svg>',
      },
    ];
  }

  getPaymentModeOptions() {
    return [
      {
        value: _PAYMENT_MODES.MOMO,
        label: 'MTN Mobile Money',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
      },
      {
        value: _PAYMENT_MODES.TELECEL,
        label: 'Telecel Cash',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 6h.01"/><path d="M8 10h8"/><path d="M8 14h8"/><path d="M8 18h4"/></svg>',
      },
      {
        value: _PAYMENT_MODES.BANK,
        label: 'Bank Transfer',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M12 3l9 7H3l9-7z"/><path d="M5 10v11"/><path d="M10 10v11"/><path d="M14 10v11"/><path d="M19 10v11"/></svg>',
      },
    ];
  }

  async processPayment(orderId, paymentMode) {
    const order = await this.getOrderById(orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (paymentMode === _PAYMENT_MODES.CASH) {
      this.updateOrderStatus(orderId, _ORDER_STATUS.CONFIRMED);
      if (typeof deliveryManager !== 'undefined') {
        deliveryManager.createDelivery(order, order.delivery.mode, {
          address: order.delivery.address,
          instructions: order.delivery.instructions,
        });
      }
      return {
        success: true,
        message: 'Cash payment confirmed - Pay on delivery',
        transactionId: `cash_${Date.now()}`,
      };
    }

    // Use real payment manager for MoMo, Telecel, Bank
    if (typeof paymentManager !== 'undefined') {
      try {
        const paymentResult = await paymentManager.initializePayment(order, paymentMode);
        if (paymentResult.success) {
          // Payment initiated successfully - user will complete on Paystack
          // The webhook will handle verification asynchronously
          return {
            success: true,
            message: paymentResult.message,
            reference: paymentResult.reference,
            trans: paymentResult.trans,
          };
        } else {
          return { success: false, error: paymentResult.error };
        }
      } catch (error) {
        console.error('Payment initialization error:', error);
        return { success: false, error: error.message || 'Payment initialization failed' };
      }
    }

    // Fallback for offline mode
    return new Promise(resolve => {
      setTimeout(() => {
        const paymentSuccess = Math.random() > 0.1;
        if (paymentSuccess) {
          this.updateOrderStatus(orderId, _ORDER_STATUS.CONFIRMED);
          if (typeof deliveryManager !== 'undefined') {
            deliveryManager.createDelivery(order, order.delivery.mode, {
              address: order.delivery.address,
              instructions: order.delivery.instructions,
            });
          }
          resolve({
            success: true,
            message: 'Payment successful',
            transactionId: `txn_${Date.now()}`,
          });
        } else {
          resolve({ success: false, error: 'Payment failed. Please try again.' });
        }
      }, 2000);
    });
  }

  async cancelOrder(orderId) {
    const order = await this.getOrderById(orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }
    if (order.status === _ORDER_STATUS.DELIVERED) {
      return { success: false, error: 'Cannot cancel a delivered order' };
    }
    return this.updateOrderStatus(orderId, _ORDER_STATUS.CANCELLED);
  }
}

const checkoutManager = new CheckoutManager();

export { CheckoutFlow, CheckoutManager, checkoutManager };

if (typeof window !== 'undefined') {
  window.checkoutManager = checkoutManager;
  window.CheckoutFlow = CheckoutFlow;
}
