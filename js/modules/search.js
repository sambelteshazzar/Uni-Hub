/* exported searchManager */
// ============================================
// SEARCH MODULE - Advanced Search & Filtering
// ============================================

export class SearchManager {
  constructor () {
    this.searchHistory = [];
    this.recentSearches = [];
    this.loadHistory();
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
  getSuggestions (query) {
    if (!query || query.length < 2) {
      return [];
    }

    const normalizedQuery = query.toLowerCase();
    const allProducts = productsManager.getAll();

    // Get unique suggestions from product titles
    const suggestions = new Set();

    allProducts.forEach(product => {
      const titleWords = product.title.toLowerCase().split(' ');
      titleWords.forEach(word => {
        if (word.startsWith(normalizedQuery) && word.length > 2) {
          suggestions.add(word);
        }
      });

      // Also add full titles that match
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
  getTrendingSearches () {
    // This would be populated from analytics data
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
export default new SearchManager();
