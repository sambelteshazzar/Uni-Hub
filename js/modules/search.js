/* exported searchManager */
// ============================================
// SEARCH MODULE - Advanced Search & Filtering
// ============================================

class SearchManager {
  constructor () {
    this.searchHistory = [];
    this.recentSearches = [];
    this.autocompleteTimeout = null;
    this.autocompleteVisible = false;
    if (typeof StorageManager !== 'undefined' && typeof StorageManager.get === 'function') {
      this.loadHistory();
    }
  }

  handleAutocomplete (query) {
    clearTimeout(this.autocompleteTimeout);
    if (!query || query.length < 2) {
      this.hideAutocomplete();
      return;
    }
    this.autocompleteTimeout = setTimeout(() => {
      this.fetchAndShowSuggestions(query);
    }, 250);
  }

  async fetchAndShowSuggestions (query) {
    try {
      const suggestions = await this.getSuggestions(query);
      const historyMatches = this.searchHistory
        .filter(h => h.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map(h => ({ type: 'history', text: h }));

      const suggestionItems = suggestions.map(s => ({
        type: typeof s === 'object' && s.title ? 'product' : 'suggestion',
        text: typeof s === 'object' ? s.title : s,
        image: typeof s === 'object' ? s.image : null,
        price: typeof s === 'object' ? s.price : null,
      }));

      const allItems = [...historyMatches, ...suggestionItems];
      this.renderAutocomplete(allItems, query);
    } catch (error) {
      // Autocomplete failure is non-critical
    }
  }

  renderAutocomplete (items, query) {
    const container = document.getElementById('search-autocomplete');
    if (!container) return;

    if (items.length === 0) {
      this.hideAutocomplete();
      return;
    }

    const highlighted = (text, q) => {
      const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<strong>$1</strong>');
    };

    let html = '';
    items.forEach(item => {
      const icon = item.type === 'history'
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>';

      html += `<div class="autocomplete-item" data-type="${item.type}" data-value="${item.text}" onmousedown="if(typeof searchManager!=='undefined')searchManager.selectSuggestion('${item.text.replace(/'/g, "\\'")}')">`;
      html += `<span class="autocomplete-icon">${icon}</span>`;
      if (item.image) {
        html += `<img class="autocomplete-thumb" src="${item.image}" alt="" />`;
      }
      html += `<span class="autocomplete-text">${highlighted(item.text, query)}</span>`;
      if (item.price) {
        html += `<span class="autocomplete-price">GHS ${item.price}</span>`;
      }
      if (item.type === 'history') {
        html += `<button class="autocomplete-remove" onmousedown="event.stopPropagation(); if(typeof searchManager!=='undefined')searchManager.removeSuggestion('${item.text.replace(/'/g, "\\'")}')">&times;</button>`;
      }
      html += '</div>';
    });

    container.innerHTML = html;
    container.style.display = 'block';
    this.autocompleteVisible = true;
  }

  showAutocomplete () {
    const input = document.getElementById('navbar-search-input');
    if (input && input.value && input.value.length >= 2 && this.autocompleteVisible) {
      const container = document.getElementById('search-autocomplete');
      if (container && container.innerHTML) {
        container.style.display = 'block';
      }
    } else if (input && input.value.length < 2) {
      const container = document.getElementById('search-autocomplete');
      if (container && this.searchHistory.length > 0) {
        const recentItems = this.searchHistory.slice(0, 5).map(h => ({
          type: 'history',
          text: h,
        }));
        this.renderAutocomplete(recentItems, '');
      }
    }
  }

  hideAutocomplete () {
    const container = document.getElementById('search-autocomplete');
    if (container) {
      container.style.display = 'none';
    }
    this.autocompleteVisible = false;
  }

  selectSuggestion (text) {
    const input = document.getElementById('navbar-search-input');
    if (input) {
      input.value = text;
    }
    this.hideAutocomplete();
    if (typeof Pages !== 'undefined') {
      Pages.handleSearch();
    }
  }

  removeSuggestion (text) {
    this.removeFromHistory(text);
    this.handleAutocomplete(document.getElementById('navbar-search-input')?.value || '');
  }

  /**
   * Load search history from localStorage
   */
  loadHistory () {
    const history = StorageManager.get(STORAGE_KEYS.SEARCH_HISTORY, true);
    this.searchHistory = history || [];
  }

  /**
   * Save search history
   */
  saveHistory () {
    StorageManager.set(STORAGE_KEYS.SEARCH_HISTORY, this.searchHistory);
  }

  /**
   * Perform search
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Array} - Search results
   */
  search (query, filters = {}) {
    if (!query || query.trim() === '') {
      return productsManager.getAll();
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Add to search history
    this.addToHistory(query);

    // Search through products
    const results = productsManager.getAll().filter(product => {
      const titleMatch = product.title.toLowerCase().includes(normalizedQuery);
      const descriptionMatch = product.description.toLowerCase().includes(normalizedQuery);
      const categoryMatch = product.category.toLowerCase().includes(normalizedQuery);

      return titleMatch || descriptionMatch || categoryMatch;
    });

    // Apply additional filters
    return this.applyFilters(results, filters);
  }

  /**
   * Apply filters to search results
   * @param {Array} results - Search results
   * @param {Object} filters - Filters to apply
   * @returns {Array}
   */
  applyFilters (results, filters) {
    let filtered = [...results];

    // Filter by university
    if (filters.university) {
      filtered = filtered.filter(p => p.university === filters.university);
    }

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }

    // Filter by condition
    if (filters.conditions && filters.conditions.length > 0) {
      filtered = filtered.filter(p => filters.conditions.includes(p.condition));
    }

    // Filter by price range
    if (filters.priceRange) {
      const { min = 0, max = Infinity } = filters.priceRange;
      filtered = filtered.filter(p => p.price >= min && p.price <= max);
    }

    // Sort results
    if (filters.sortBy) {
      filtered = this.sortResults(filtered, filters.sortBy);
    }

    return filtered;
  }

  /**
   * Sort search results
   * @param {Array} results - Results to sort
   * @param {string} sortBy - Sort criteria
   * @returns {Array}
   */
  sortResults (results, sortBy) {
    const sorted = [...results];

    switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    case 'price-low':
      return sorted.sort((a, b) => a.price - b.price);

    case 'price-high':
      return sorted.sort((a, b) => b.price - a.price);

    case 'rating':
      return sorted.sort((a, b) => b.seller.rating - a.seller.rating);

    case 'popular':
      return sorted.sort((a, b) => (b.views || 0) - (a.views || 0));

    default:
      return sorted;
    }
  }

  /**
   * Add search to history
   * @param {string} query - Search query
   */
  addToHistory (query) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return;
    }

    // Remove if already exists
    this.searchHistory = this.searchHistory.filter(q => q !== normalizedQuery);

    // Add to beginning
    this.searchHistory.unshift(normalizedQuery);

    // Keep only last 10 searches
    if (this.searchHistory.length > 10) {
      this.searchHistory = this.searchHistory.slice(0, 10);
    }

    this.saveHistory();
  }

  /**
   * Get search history
   * @returns {Array}
   */
  getHistory () {
    return this.searchHistory;
  }

  /**
   * Clear search history
   */
  clearHistory () {
    this.searchHistory = [];
    this.saveHistory();
  }

  /**
   * Remove search from history
   * @param {string} query - Search query to remove
   */
  removeFromHistory (query) {
    this.searchHistory = this.searchHistory.filter(q => q !== query);
    this.saveHistory();
  }

  /**
   * Get search suggestions
   * @param {string} query - Partial query
   * @returns {Array}
   */
  async getSuggestions (query) {
    if (!query || query.length < 2) {
      return [];
    }

    if (typeof api !== 'undefined') {
      try {
        const response = await api.search.suggestions(query);
        if (response.success && response.data) {
          return response.data;
        }
      } catch (error) {
        // Backend unavailable — fall through to local
      }
    }

    const normalizedQuery = query.toLowerCase();
    const allProducts = productsManager.getAll();
    const suggestions = new Set();

    allProducts.forEach(product => {
      const titleWords = product.title.toLowerCase().split(' ');
      titleWords.forEach(word => {
        if (word.startsWith(normalizedQuery) && word.length > 2) {
          suggestions.add(word);
        }
      });

      if (product.title.toLowerCase().includes(normalizedQuery)) {
        suggestions.add(product.title);
      }
    });

    return Array.from(suggestions).slice(0, 5);
  }

  /**
   * Get trending searches (placeholder)
   * @returns {Array}
   */
  async getTrendingSearches () {
    if (typeof api !== 'undefined') {
      try {
        const response = await api.search.trending();
        if (response.success && response.data) {
          return response.data;
        }
      } catch (error) {
        // Backend unavailable — fall through to defaults
      }
    }
    return ['laptop', 'textbooks', 'phone', 'bed', 'blender'];
  }

  /**
   * Advanced search with multiple criteria
   * @param {Object} criteria - Search criteria
   * @returns {Object} - Search results with metadata
   */
  advancedSearch (criteria) {
    const {
      query = '',
      university = null,
      category = null,
      conditions = [],
      priceRange = {},
      sortBy = 'newest',
      page = 1,
      pageSize = 12,
    } = criteria;

    // Perform search
    const results = this.search(query, {
      university,
      category,
      conditions,
      priceRange,
      sortBy,
    });

    // Calculate pagination
    const totalResults = results.length;
    const totalPages = Math.ceil(totalResults / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = results.slice(startIndex, endIndex);

    return {
      results: paginatedResults,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalResults: totalResults,
        pageSize: pageSize,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        university,
        category,
        conditions,
        priceRange,
        sortBy,
      },
    };
  }

  /**
   * Get search result count
   * @param {string} query - Search query
   * @param {Object} filters - Filters
   * @returns {number}
   */
  getResultCount (query, filters = {}) {
    return this.search(query, filters).length;
  }

  /**
   * Highlight search terms in text
   * @param {string} text - Text to highlight
   * @param {string} query - Search query
   * @returns {string}
   */
  highlightTerms (text, query) {
    if (!query) {
      return text;
    }

    const terms = query.split(' ').filter(t => t.trim());
    let highlighted = text;

    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark class="search-highlight">$1</mark>');
    });

    return highlighted;
  }

  /**
   * Debounce search
   * @param {Function} func - Search function
   * @param {number} wait - Wait time in ms
   * @returns {Function}
   */
  debounce (func, wait) {
    let timeout;
    return function executedFunction (...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Create singleton instance
const searchManager = new SearchManager();

if (typeof window !== 'undefined') {
  window.searchManager = searchManager;
}

export { SearchManager, searchManager };
