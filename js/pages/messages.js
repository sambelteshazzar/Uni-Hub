/**
 * ============================================
 * Messages Page Renderer
 * Handles the complete messaging interface
 * ============================================
 */

class MessagesPage {
  constructor () {
    this.currentConversation = null;
    this.conversations = [];
    this.isLoading = false;
    this.typingTimeout = null;
    this.messageInput = null;
    this.messagesContainer = null;
  }

  /**
   * Render the complete messaging interface
   * @param {Object} options - { conversationId?, userId?, productId? }
   */
  async render (options = {}) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
      return;
    }

    // Check if user is logged in
    const token = StorageManager.get(StorageManager.keys?.authToken || 'authToken');
    if (!token) {
      if (window.Pages) {
        window.Pages.renderLogin();
      }
      return;
    }

    mainContent.innerHTML = this.getLoadingHTML();

    try {
      // Load conversations
      this.conversations = await messageManager.getConversations({ limit: 100 });

      // Build messaging UI
      mainContent.innerHTML = this.getMessagingHTML();

      // Setup event listeners
      this.setupEventListeners();

      // Load specific conversation if provided
      if (options.conversationId) {
        await this.loadConversation(options.conversationId);
      } else if (options.userId) {
        // Start new conversation
        await this.startConversation(options.userId, options.productId);
      }

      // Update unread count
      this.updateUnreadCount();

      // eslint-disable-next-line no-console
      console.log('✓ Messages page loaded');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load messages:', error);
      mainContent.innerHTML = this.getErrorHTML();
    }
  }

  /**
   * Get loading HTML
   */
  getLoadingHTML () {
    return `
      <div class="messaging-container" style="justify-content: center; align-items: center;">
        <div class="message-loading">
          <div class="message-loading-spinner"></div>
          <p style="margin-top: 16px; color: var(--neutral-600, #6b7280);">Loading messages...</p>
        </div>
      </div>
    `;
  }

  /**
   * Get error HTML
   */
  getErrorHTML () {
    return `
      <div class="messaging-container" style="justify-content: center; align-items: center;">
        <div style="text-align: center; padding: 48px;">
          <div style="font-size: 64px; margin-bottom: 16px;">⚠️</div>
          <h3 style="margin-bottom: 8px;">Failed to load messages</h3>
          <p style="color: var(--neutral-600, #6b7280); margin-bottom: 20px;">Please try again later</p>
          <button onclick="messageManager.render()" class="message-seller-btn">Try Again</button>
        </div>
      </div>
    `;
  }

  /**
   * Get main messaging interface HTML
   */
  getMessagingHTML () {
    return `
      <div class="messaging-container">
        <!-- Sidebar: Conversation List -->
        <aside class="messaging-sidebar" id="messaging-sidebar">
          <div class="messaging-sidebar-header">
            <h2 class="messaging-sidebar-title">Messages</h2>
            <div class="messaging-search-box">
              <span class="messaging-search-icon">🔍</span>
              <input 
                type="text" 
                class="messaging-search-input" 
                id="conversation-search" 
                placeholder="Search conversations..."
              />
            </div>
          </div>
          <div class="conversation-list" id="conversation-list">
            ${this.getConversationsListHTML()}
          </div>
        </aside>

        <!-- Main Chat Area -->
        <main class="messaging-chat" id="messaging-chat">
          ${this.currentConversation ? this.getChatAreaHTML() : this.getEmptyChatHTML()}
        </main>
      </div>
    `;
  }

  /**
   * Get conversations list HTML
   */
  getConversationsListHTML () {
    if (!this.conversations.conversations || this.conversations.conversations.length === 0) {
      return `
        <div class="empty-conversations">
          <div class="empty-conversations-icon">💬</div>
          <h3>No messages yet</h3>
          <p>Start a conversation by messaging a seller from any product listing</p>
        </div>
      `;
    }

    return this.conversations.conversations
      .map(conv => {
        const otherUser = this.getOtherUser(conv);
        const unread = conv.unreadCount?.get?.(this.getCurrentUserId()) || 0;
        const isActive = this.currentConversation && this.currentConversation._id === conv._id;

        return `
        <div class="conversation-item ${isActive ? 'active' : ''} ${unread > 0 ? 'unread' : ''}" 
             data-conversation-id="${conv._id}"
             onclick="messagesPage.loadConversation('${conv._id}')">
          <div class="conversation-avatar">
            ${otherUser?.avatar ? `<img src="${otherUser.avatar}" alt="${otherUser.fullName}" />` : otherUser?.fullName?.charAt(0) || '?'}
            <div class="online-indicator" style="display: none;"></div>
          </div>
          <div class="conversation-info">
            <div class="conversation-header">
              <h4 class="conversation-name">${otherUser?.fullName || 'Unknown User'}</h4>
              <span class="conversation-time">${this.formatTime(conv.lastActivity)}</span>
            </div>
            <p class="conversation-preview">
              ${conv.lastMessage?.content || 'Start a conversation...'}
            </p>
            ${
  conv.product
    ? `
              <div class="conversation-product">
                <img src="${conv.product.images?.[0] || ''}" alt="" />
                <span>${conv.product.title}</span>
              </div>
            `
    : ''
}
          </div>
          ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
        </div>
      `;
      })
      .join('');
  }

  /**
   * Get chat area HTML
   */
  getChatAreaHTML () {
    if (!this.currentConversation) {
      return '';
    }

    const otherUser = this.getOtherUser(this.currentConversation);

    return `
      <!-- Chat Header -->
      <div class="chat-header">
        <button class="chat-header-back" onclick="messagesPage.goBack()">←</button>
        <div class="chat-header-user">
          <div class="chat-header-avatar">
            ${otherUser?.avatar ? `<img src="${otherUser.avatar}" alt="${otherUser.fullName}" />` : otherUser?.fullName?.charAt(0) || '?'}
          </div>
          <div class="chat-header-info">
            <h3>${otherUser?.fullName || 'Unknown User'}</h3>
            <p class="chat-header-status" id="chat-status">Offline</p>
          </div>
        </div>
        <div class="chat-header-actions">
          <button title="View Product" onclick="messagesPage.viewProduct()">📦</button>
          <button title="More Options">⋮</button>
        </div>
      </div>

      <!-- Messages Container -->
      <div class="messages-container" id="messages-container">
        <div class="message-loading" id="messages-loading">
          <div class="message-loading-spinner"></div>
        </div>
      </div>

      <!-- Message Input -->
      <div class="message-input-container">
        <div class="message-input-wrapper">
          <textarea 
            class="message-input" 
            id="message-input" 
            placeholder="Type a message..." 
            rows="1"
          ></textarea>
          <div class="message-input-actions">
            <button class="message-input-btn" title="Attach File">📎</button>
            <button class="message-input-btn message-send-btn" id="message-send-btn" title="Send Message">
              ➤
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get empty chat HTML
   */
  getEmptyChatHTML () {
    return `
      <div class="empty-chat">
        <div class="empty-chat-icon">💬</div>
        <h3>Select a conversation</h3>
        <p>Choose a conversation from the sidebar to start messaging</p>
      </div>
    `;
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners () {
    // Message input
    this.messageInput = document.getElementById('message-input');
    this.messagesContainer = document.getElementById('messages-container');

    if (this.messageInput) {
      // Auto-resize textarea
      this.messageInput.addEventListener('input', () => {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';

        // Typing indicator
        this.handleTyping();
      });

      // Send on Enter (Shift+Enter for new line)
      this.messageInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // Send button
    const sendBtn = document.getElementById('message-send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }

    // Search conversations
    const searchInput = document.getElementById('conversation-search');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        this.filterConversations(e.target.value);
      });
    }

    // Socket.io event listeners
    messageManager.on('newMessage', data => {
      this.handleNewMessage(data);
    });

    messageManager.on('typing', data => {
      this.handleTypingIndicator(data);
    });
  }

  /**
   * Load a specific conversation
   */
  async loadConversation (conversationId) {
    try {
      // Leave previous conversation
      if (this.currentConversation) {
        messageManager.leaveConversation(this.currentConversation._id);
      }

      // Load conversation details
      const conv = await messageManager.getConversation(conversationId);
      this.currentConversation = conv;

      // Update UI
      document.getElementById('messaging-chat').innerHTML = this.getChatAreaHTML();
      this.setupEventListeners();

      // Join conversation room
      messageManager.joinConversation(conversationId);

      // Load messages
      await this.loadMessages(conversationId);

      // Update sidebar active state
      this.updateSidebarActive(conversationId);

      // Mobile: show chat
      if (window.innerWidth <= 768) {
        document.getElementById('messaging-sidebar').classList.remove('active');
        document.getElementById('messaging-chat').classList.add('active');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load conversation:', error);
      if (toastManager) {
        toastManager.show('Failed to load conversation', 'error');
      }
    }
  }

  /**
   * Start a new conversation
   */
  async startConversation (userId, productId = null) {
    try {
      // Find or create conversation
      const response = await messageManager.sendMessage({
        receiverId: userId,
        content: 'Hi! Is this item still available?',
        productId,
      });

      if (response.data?.conversationId) {
        await this.loadConversation(response.data.conversationId);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to start conversation:', error);
      if (toastManager) {
        toastManager.show('Failed to start conversation', 'error');
      }
    }
  }

  /**
   * Load messages for a conversation
   */
  async loadMessages (conversationId) {
    try {
      const container = document.getElementById('messages-container');
      if (!container) {
        return;
      }

      const result = await messageManager.getMessages(conversationId, { limit: 50 });

      if (result.messages.length === 0) {
        container.innerHTML = `
          <div class="empty-chat" style="padding: 32px;">
            <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.2;">💬</div>
            <p style="color: var(--neutral-500, #6b7280);">No messages yet. Say hello!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = result.messages.map(msg => this.getMessageHTML(msg)).join('');

      // Scroll to bottom
      container.scrollTop = container.scrollHeight;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load messages:', error);
    }
  }

  /**
   * Get message bubble HTML
   */
  getMessageHTML (msg) {
    const isSent = msg.sender._id === this.getCurrentUserId();
    const time = new Date(msg.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Read receipt status icons
    let statusIcon = '';
    if (isSent) {
      statusIcon = msg.isRead
        ? '<span class="message-status read">✓✓</span>'
        : '<span class="message-status">✓</span>';
    }

    return `
      <div class="message-group ${isSent ? 'sent' : 'received'}">
        <div class="message-bubble">
          ${msg.content}
        </div>
        <div class="message-time">
          ${time}
          ${statusIcon}
        </div>
      </div>
    `;
  }

  // ==========================================
  // TYPING INDICATORS & STATUS
  // ==========================================

  showTypingIndicator () {
    const container = document.getElementById('messages-container');
    if (!container || container.querySelector('.typing-indicator')) {
      return;
    }

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;
  }

  hideTypingIndicator () {
    const indicator = document.getElementById('typing-indicator') || document.querySelector('.typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  updateOnlineStatus (userId, isOnline) {
    const statusEl = document.getElementById('chat-status');
    if (statusEl) {
      statusEl.textContent = isOnline ? 'Online' : 'Offline';
      statusEl.style.color = isOnline ? '#10b981' : '#6b7280';
    }
  }

  /**
   * Send a message
   */
  async sendMessage () {
    if (!this.messageInput || !this.currentConversation) {
      return;
    }

    const content = this.messageInput.value.trim();
    if (!content) {
      return;
    }

    const sendBtn = document.getElementById('message-send-btn');
    sendBtn.disabled = true;

    try {
      // Optimistic UI update
      const tempMsg = {
        sender: { _id: this.getCurrentUserId() },
        content,
        createdAt: new Date(),
        isRead: false,
      };

      const container = document.getElementById('messages-container');
      container.insertAdjacentHTML('beforeend', this.getMessageHTML(tempMsg));
      container.scrollTop = container.scrollHeight;

      // Clear input
      this.messageInput.value = '';
      this.messageInput.style.height = 'auto';

      // Send message
      await messageManager.sendMessage({
        conversationId: this.currentConversation._id,
        receiverId: this.getOtherUser(this.currentConversation)._id,
        content,
      });

      // Update conversation list
      await this.refreshConversations();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to send message:', error);
      if (toastManager) {
        toastManager.show('Failed to send message', 'error');
      }
    } finally {
      sendBtn.disabled = false;
      this.messageInput.focus();
    }
  }

  /**
   * Handle typing indicator
   */
  handleTyping () {
    if (!this.currentConversation) {
      return;
    }

    messageManager.startTyping(this.currentConversation._id);

    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      messageManager.stopTyping(this.currentConversation._id);
    }, 2000);
  }

  /**
   * Handle typing indicator display
   */
  handleTypingIndicator (data) {
    if (!this.currentConversation || data.userId === this.getCurrentUserId()) {
      return;
    }

    const container = document.getElementById('messages-container');
    if (!container) {
      return;
    }

    // Remove existing typing indicator
    const existing = container.querySelector('.typing-indicator');
    if (existing) {
      existing.remove();
    }

    // Add typing indicator
    if (data.isTyping) {
      container.insertAdjacentHTML(
        'beforeend',
        `
        <div class="typing-indicator" id="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      `,
      );
      container.scrollTop = container.scrollHeight;
    }
  }

  /**
   * Handle new message
   */
  handleNewMessage (data) {
    if (!this.currentConversation || data.conversationId !== this.currentConversation._id) {
      // Update conversation list
      this.refreshConversations();
      return;
    }

    // Add message to chat
    const container = document.getElementById('messages-container');
    if (container && data.message) {
      container.insertAdjacentHTML('beforeend', this.getMessageHTML(data.message));
      container.scrollTop = container.scrollHeight;

      // Mark as read
      messageManager.markAsRead(data.message._id);
    }
  }

  /**
   * Filter conversations
   */
  filterConversations (query) {
    const items = document.querySelectorAll('.conversation-item');
    const lowerQuery = query.toLowerCase();

    items.forEach(item => {
      const name = item.querySelector('.conversation-name')?.textContent.toLowerCase() || '';
      const preview = item.querySelector('.conversation-preview')?.textContent.toLowerCase() || '';

      if (name.includes(lowerQuery) || preview.includes(lowerQuery)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }

  /**
   * Update sidebar active state
   */
  updateSidebarActive (conversationId) {
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.conversationId === conversationId) {
        item.classList.add('active');
      }
    });
  }

  /**
   * Refresh conversations list
   */
  async refreshConversations () {
    try {
      this.conversations = await messageManager.getConversations({ limit: 100 });
      const list = document.getElementById('conversation-list');
      if (list) {
        list.innerHTML = this.getConversationsListHTML();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to refresh conversations:', error);
    }
  }

  /**
   * Update unread count badge
   */
  updateUnreadCount () {
    if (messageManager.unreadCount > 0) {
      const badge = document.getElementById('message-badge');
      if (badge) {
        badge.textContent = messageManager.unreadCount > 99 ? '99+' : messageManager.unreadCount;
        badge.style.display = 'flex';
      }
    }
  }

  /**
   * Go back to conversation list (mobile)
   */
  goBack () {
    document.getElementById('messaging-sidebar').classList.add('active');
    document.getElementById('messaging-chat').classList.remove('active');
  }

  /**
   * View product (from chat header)
   */
  viewProduct () {
    if (this.currentConversation?.product?._id) {
      window.location.hash = `#/product/${this.currentConversation.product._id}`;
    }
  }

  /**
   * Helper: Get other user in conversation
   */
  getOtherUser (conv) {
    if (!conv.participants) {
      return null;
    }
    return conv.participants.find(p => p._id !== this.getCurrentUserId());
  }

  /**
   * Helper: Get current user ID
   */
  getCurrentUserId () {
    const token = StorageManager.get(StorageManager.keys?.authToken || 'authToken');
    if (!token) {
      return null;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id;
    } catch {
      return null;
    }
  }

  /**
   * Helper: Format time
   */
  formatTime (date) {
    if (!date) {
      return '';
    }
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) {
      return 'Now';
    }
    if (diff < 3600000) {
      return Math.floor(diff / 60000) + 'm';
    }
    if (diff < 86400000) {
      return Math.floor(diff / 3600000) + 'h';
    }
    if (diff < 604800000) {
      return Math.floor(diff / 86400000) + 'd';
    }

    return d.toLocaleDateString();
  }
}

// Initialize and export
const messagesPage = new MessagesPage();
