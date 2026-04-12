/**
 * ============================================
 * Reviews Module
 * Handles seller ratings and reviews
 * ============================================
 */

/* global API_URL, StorageManager, toastManager */

class ReviewManager {
  constructor() {
    this.currentSellerId = null;
  }

  /**
   * Submit a review for a seller
   * @param {Object} data - { sellerId, rating, comment, productId?, orderId?, detailedRatings? }
   * @returns {Promise}
   */
  async submitReview(data) {
    try {
      const { sellerId, rating, comment, productId, orderId, detailedRatings } = data;

      if (!sellerId || !rating) {
        throw new Error('Seller ID and rating are required');
      }

      const response = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${StorageManager.get(StorageManager.keys?.authToken || 'authToken')}`,
        },
        body: JSON.stringify({
          sellerId,
          rating,
          comment,
          productId,
          orderId,
          detailedRatings,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit review');
      }

      if (toastManager) {
        toastManager.show('Review submitted successfully!', 'success');
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get reviews for a seller
   * @param {string} sellerId
   * @param {Object} options - { page?, limit?, sortBy?, sortOrder? }
   * @returns {Promise}
   */
  async getSellerReviews(sellerId, options = {}) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = -1 } = options;
      const params = new URLSearchParams({ page, limit, sortBy, sortOrder });

      const response = await fetch(`${API_URL}/reviews/seller/${sellerId}?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch reviews');
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get seller rating summary
   * @param {string} sellerId
   * @returns {Promise}
   */
  async getRatingSummary(sellerId) {
    try {
      const response = await fetch(`${API_URL}/reviews/seller/${sellerId}/summary`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch rating summary');
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's reviews
   * @param {Object} options
   * @returns {Promise}
   */
  async getMyReviews(options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const params = new URLSearchParams({ page, limit });

      const response = await fetch(`${API_URL}/reviews/my-reviews?${params}`, {
        headers: {
          Authorization: `Bearer ${StorageManager.get(StorageManager.keys?.authToken || 'authToken')}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch reviews');
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a review
   * @param {string} reviewId
   * @param {Object} data
   * @returns {Promise}
   */
  async updateReview(reviewId, data) {
    try {
      const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${StorageManager.get(StorageManager.keys?.authToken || 'authToken')}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update review');
      }

      if (toastManager) {
        toastManager.show('Review updated successfully!', 'success');
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a review
   * @param {string} reviewId
   * @returns {Promise}
   */
  async deleteReview(reviewId) {
    try {
      const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${StorageManager.get(StorageManager.keys?.authToken || 'authToken')}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete review');
      }

      if (toastManager) {
        toastManager.show('Review deleted', 'info');
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark review as helpful
   * @param {string} reviewId
   * @returns {Promise}
   */
  async markHelpful(reviewId) {
    try {
      const response = await fetch(`${API_URL}/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${StorageManager.get(StorageManager.keys?.authToken || 'authToken')}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to mark as helpful');
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Report a review
   * @param {string} reviewId
   * @returns {Promise}
   */
  async reportReview(reviewId) {
    try {
      const response = await fetch(`${API_URL}/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${StorageManager.get(StorageManager.keys?.authToken || 'authToken')}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to report review');
      }

      if (toastManager) {
        toastManager.show('Review reported', 'info');
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Seller respond to review
   * @param {string} reviewId
   * @param {string} comment
   * @returns {Promise}
   */
  async respondToReview(reviewId, comment) {
    try {
      const response = await fetch(`${API_URL}/reviews/${reviewId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${StorageManager.get(StorageManager.keys?.authToken || 'authToken')}`,
        },
        body: JSON.stringify({ comment }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to respond');
      }

      if (toastManager) {
        toastManager.show('Response added', 'success');
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate star rating HTML
   * @param {number} rating - 0 to 5
   * @param {number} size - Font size in px
   * @returns {string}
   */
  generateStars(rating, size = 16) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    let html = '<div class="star-rating" style="font-size: ${size}px; display: inline-flex; gap: 2px;">';

    for (let i = 0; i < fullStars; i++) {
      html += '<span class="star full">★</span>';
    }

    if (hasHalf) {
      html += '<span class="star half">★</span>';
    }

    for (let i = 0; i < emptyStars; i++) {
      html += '<span class="star empty">☆</span>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Generate interactive star rating input
   * @param {number} currentRating
   * @param {Function} onChange
   * @returns {string}
   */
  generateStarInput(currentRating = 0, onChange) {
    const containerId = `star-input-${Date.now()}`;

    setTimeout(() => {
      const container = document.getElementById(containerId);
      if (!container) {
        return;
      }

      const stars = container.querySelectorAll('.star-input');
      stars.forEach((star, index) => {
        star.addEventListener('click', () => {
          const rating = index + 1;
          stars.forEach((s, i) => {
            s.classList.toggle('active', i < rating);
          });
          if (onChange) {
            onChange(rating);
          }
        });

        star.addEventListener('mouseenter', () => {
          stars.forEach((s, i) => {
            s.classList.toggle('hover', i <= index);
          });
        });
      });

      container.addEventListener('mouseleave', () => {
        stars.forEach((s, i) => {
          s.classList.remove('hover');
          s.classList.toggle('active', i < currentRating);
        });
      });
    }, 0);

    let html = `<div id="${containerId}" class="star-input-container" style="display: inline-flex; gap: 4px; font-size: 24px; cursor: pointer;">`;

    for (let i = 0; i < 5; i++) {
      const isActive = i < currentRating;
      html += `<span class="star-input ${isActive ? 'active' : ''}" data-rating="${i + 1}">★</span>`;
    }

    html += '</div>';
    return html;
  }
}

// Initialize and export
const reviewManager = new ReviewManager();
