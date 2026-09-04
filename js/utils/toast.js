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
      <button class="uni-toast-close" onclick="this.parentElement.remove()">&times;</button>
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
