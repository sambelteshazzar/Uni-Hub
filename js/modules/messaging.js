/**
 * ============================================
 * Messaging Module
 * Handles in-app messaging between users
 * ============================================
 */

class MessageManager {
  constructor () {
    this.socket = null;
    this.currentConversation = null;
    this.listeners = {
      newMessage: [],
      messageRead: [],
      typing: [],
      conversationUpdate: [],
      userOnline: [],
      userOffline: [],
      error: [],
    };
    this.unreadCount = 0;
    this.isConnected = false;

    this.init();
  }

  /**
   * Initialize the messaging system
   */
  async init () {
    try {
      // Load Socket.IO client
      if (typeof io === 'undefined') {
        await this.loadSocketIO();
      }

      // Connect to Socket.IO server
      this.connect();

      // Setup event listeners
      this.setupListeners();

      // eslint-disable-next-line no-console
      console.log('✓ Messaging system initialized');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Messaging system init failed:', error);
    }
  }

  /**
   * Load Socket.IO client library dynamically
   */
  loadSocketIO () {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${API_URL.replace('/api', '')}/socket.io/socket.io.js`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Connect to Socket.IO server
   */
  connect () {
    const token = StorageManager.get(StorageManager.keys?.authToken || 'authToken');

    if (!token) {
      return;
    }

    try {
      const serverUrl = API_URL.replace('/api', '');

      this.socket = io(serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.notifyListeners('userOnline', { userId: this.socket.id });
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        this.notifyListeners('userOffline', { userId: this.socket.id });
      });

      this.socket.on('connect_error', error => {
        // eslint-disable-next-line no-console
        console.error('Socket.IO connection error:', error);
        this.isConnected = false;
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to connect to Socket.IO:', error);
    }
  }

  /**
   * Setup Socket.IO event listeners
   */
  setupListeners () {
    if (!this.socket) {
      return;
    }

    // New message received
    this.socket.on('new_message', data => {
      this.notifyListeners('newMessage', data);

      // Show notification if not in current conversation
      if (this.currentConversation !== data.conversationId) {
        this.unreadCount++;
        this.updateMessageBadge();

        if (toastManager && typeof toastManager.show === 'function') {
          const senderName = data.message?.sender?.fullName || 'Someone';
          toastManager.show(`New message from ${senderName}`, 'info', 3000);
        }
      }
    });

    // Message read
    this.socket.on('message_read', data => {
      this.notifyListeners('messageRead', data);
    });

    // User typing
    this.socket.on('user_typing', data => {
      this.notifyListeners('typing', data);
    });

    // User online/offline
    this.socket.on('user_offline', data => {
      this.notifyListeners('userOffline', data);
    });

    // Error
    this.socket.on('error', data => {
      this.notifyListeners('error', data);
    });
  }

  /**
   * Join a conversation room
   * @param {string} conversationId
   */
  joinConversation (conversationId) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.currentConversation = conversationId;
    this.socket.emit('join_conversation', conversationId);
  }

  /**
   * Leave a conversation room
   * @param {string} conversationId
   */
  leaveConversation (conversationId) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    if (this.currentConversation === conversationId) {
      this.currentConversation = null;
    }

    this.socket.emit('leave_conversation', conversationId);
  }

  /**
   * Send a message via Socket.IO
   * @param {Object} data - Message data
   * @returns {Promise}
   */
  sendMessageViaSocket (data) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        // Fallback to HTTP
        this.sendMessageHTTP(data).then(resolve).catch(reject);
        return;
      }

      this.socket.emit('send_message', data, response => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Send a message via HTTP (fallback)
   * @param {Object} data
   * @returns {Promise}
   */
  async sendMessageHTTP (data) {
    try {
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${StorageManager.get(StorageManager.keys?.authToken || 'authToken')}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send a message
   * @param {Object} data - { conversationId?, receiverId, content, type?, imageUrl?, productId? }
   * @returns {Promise}
   */
  async sendMessage (data) {
    try {
      // Try Socket.IO first
      if (this.socket && this.isConnected) {
        // For simplicity, we'll use HTTP for sending messages
        // and Socket.IO for receiving them
        return await this.sendMessageHTTP(data);
      }

      // Fallback to HTTP
      return await this.sendMessageHTTP(data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Indicate user is typing
   * @param {string} conversationId
   */
  startTyping (conversationId) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('typing_start', { conversationId });
  }

  /**
   * Indicate user stopped typing
   * @param {string} conversationId
   */
  stopTyping (conversationId) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('typing_stop', { conversationId });
  }

  /**
   * Mark message as read
   * @param {string} messageId
   */
  markAsRead (messageId) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('message_read', { messageId });
  }

  /**
   * Get user's conversations
   * @param {Object} options - { page?, limit?, status? }
   * @returns {Promise}
   */
  async getConversations (options = {}) {
    try {
      const { page = 1, limit = 20, status = 'active' } = options;
      const params = new URLSearchParams({ page, limit, status });

      const response = await fetch(`${API_URL}/messages/conversations?${params}`, {
        headers: {
          Authorization: `Bearer ${StorageManager.get(StorageManager.keys?.authToken || 'authToken')}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch conversations');
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get conversation details
   * @param {string} conversationId
   * @returns {Promise}
   */
  async getConversation (conversationId) {
    try {
      const response = await fetch(`${API_URL}/messages/conversation/${conversationId}`, {
        headers: {
          Authorization: `Bearer ${StorageManager.get(StorageManager.keys?.authToken || 'authToken')}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch conversation');
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   * @param {string} conversationId
   * @param {Object} options - { page?, limit? }
   * @returns {Promise}
   */
  async getMessages (conversationId, options = {}) {
    try {
      const { page = 1, limit = 50 } = options;
      const params = new URLSearchParams({ page, limit });

      const response = await fetch(
        `${API_URL}/messages/conversation/${conversationId}/messages?${params}`,
        {
          headers: {
            Authorization: `Bearer ${StorageManager.get(StorageManager.keys?.authToken || 'authToken')}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch messages');
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get unread message count
   * @returns {Promise}
   */
  async getUnreadCount () {
    try {
      const response = await fetch(`${API_URL}/messages/unread-count`, {
        headers: {
          Authorization: `Bearer ${StorageManager.get(StorageManager.keys?.authToken || 'authToken')}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch unread count');
      }

      this.unreadCount = result.data.count;
      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a message
   * @param {string} messageId
   * @returns {Promise}
   */
  async deleteMessage (messageId) {
    try {
      const response = await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${StorageManager.get(StorageManager.keys?.authToken || 'authToken')}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete message');
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search messages
   * @param {string} query
   * @param {Object} options
   * @returns {Promise}
   */
  async searchMessages (query, options = {}) {
    try {
      const { conversationId, page = 1, limit = 20 } = options;
      const params = new URLSearchParams({ query, page, limit });
      if (conversationId) {
        params.append('conversationId', conversationId);
      }

      const response = await fetch(`${API_URL}/messages/search?${params}`, {
        headers: {
          Authorization: `Bearer ${StorageManager.get(StorageManager.keys?.authToken || 'authToken')}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to search messages');
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add event listener
   * @param {string} event
   * @param {Function} callback
   */
  on (event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * Remove event listener
   * @param {string} event
   * @param {Function} callback
   */
  off (event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Notify all listeners for an event
   * @param {string} event
   * @param {*} data
   */
  notifyListeners (event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Update message badge in UI
   */
  updateMessageBadge () {
    const badge = document.getElementById('message-badge');
    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect () {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Initialize and export
const messageManager = new MessageManager();
