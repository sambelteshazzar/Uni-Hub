/**
 * ============================================
 * Reviews Module
 * Handles seller ratings and reviews
 * Works offline via localStorage fallback
 * ============================================
 */

class ReviewManager {
  constructor () {
    this.currentSellerId = null;
    this._storageKey = (typeof STORAGE_KEY_PREFIX !== 'undefined' ? STORAGE_KEY_PREFIX : 'unihub_') + 'reviews';
    this._myReviewsKey = (typeof STORAGE_KEY_PREFIX !== 'undefined' ? STORAGE_KEY_PREFIX : 'unihub_') + 'my_reviews';
  }

  _isOffline () {
    return (typeof api !== 'undefined' && api.isStaticDeploy) ||
           !window._backendAvailable;
  }

  _getLocalReviews () {
    try { return StorageManager.get(this._storageKey) || []; } catch (_e) { return []; }
  }

  _saveLocalReviews (reviews) {
    try { StorageManager.set(this._storageKey, reviews); } catch (_e) { console.warn('reviews: saveLocalReviews failed:', _e); }
  }

  _getMyLocalReviews () {
    try { return StorageManager.get(this._myReviewsKey) || []; } catch (_e) { return []; }
  }

  _saveMyLocalReviews (reviews) {
    try { StorageManager.set(this._myReviewsKey, reviews); } catch (_e) { console.warn('reviews: saveMyLocalReviews failed:', _e); }
  }

  async _fetchWithCsrf (url, options = {}) {
    if (typeof api !== 'undefined' && api.isStaticDeploy) {
      const offlineBody = JSON.stringify({ success: false, error: 'Not available in offline mode' });
      return new Response(offlineBody, { status: 503, statusText: 'Offline' });
    }
    const token = typeof StorageManager !== 'undefined' ? StorageManager.getAuthToken() : null;
    const isMutating = options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase());
    let csrfHeaders = {};
    if (isMutating && typeof api !== 'undefined' && api.fetchCsrfToken) {
      const csrfToken = await api.fetchCsrfToken();
      if (csrfToken) { csrfHeaders = { 'X-CSRF-Token': csrfToken }; }
    }
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...csrfHeaders,
        ...options.headers,
      },
      ...(isMutating ? { credentials: 'include' } : {}),
    });
  }

  async submitReview (data) {
    try {
      const { sellerId, rating, comment, productId, orderId, detailedRatings } = data;
      if (!sellerId || !rating) { throw new Error('Seller ID and rating are required'); }

      if (this._isOffline()) {
        const user = typeof authManager !== 'undefined' ? authManager.getCurrentUser() : null;
        const review = {
          id: `rev-${Date.now()}`,
          sellerId, rating, comment: comment || '', productId, orderId,
          detailedRatings: detailedRatings || {},
          reviewerId: user?.id || 'offline-user',
          reviewerName: user?.fullName || user?.name || 'Anonymous',
          reviewerAvatar: user?.avatar || null,
          helpful: 0,
          reported: false,
          sellerResponse: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const reviews = this._getLocalReviews();
        reviews.push(review);
        this._saveLocalReviews(reviews);
        const myReviews = this._getMyLocalReviews();
        myReviews.push(review);
        this._saveMyLocalReviews(myReviews);
showToast('Review submitted locally!', 'success');
        return review;
      }

      const response = await this._fetchWithCsrf(`${window.API_URL || ''}/api/reviews`, {
        method: 'POST',
        body: JSON.stringify({ sellerId, rating, comment, productId, orderId, detailedRatings }),
      });
      const result = await response.json();
      if (!response.ok) { throw new Error(result.error || 'Failed to submit review'); }
      showToast('Review submitted successfully!', 'success');
      return result.data;
    } catch (error) {
      if (this._isOffline()) {
        return this.submitReview(data);
      }
      throw error;
    }
  }

  async getSellerReviews (sellerId, options = {}) {
    try {
      if (this._isOffline()) {
        const reviews = this._getLocalReviews().filter(r => r.sellerId === sellerId);
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = -1 } = options;
        const sorted = [...reviews].sort((a, b) => {
          const valA = a[sortBy], valB = b[sortBy];
          if (typeof valA === 'string') return sortOrder * valA.localeCompare(valB);
          return sortOrder * ((valA || 0) - (valB || 0));
        });
        const start = (page - 1) * limit;
        return {
          reviews: sorted.slice(start, start + limit),
          pagination: { page, limit, total: reviews.length, pages: Math.ceil(reviews.length / limit) },
        };
      }

      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = -1 } = options;
      const params = new URLSearchParams({ page, limit, sortBy, sortOrder });
      const response = await this._fetchWithCsrf(`${window.API_URL || 'http://localhost:5000/api'}/reviews/seller/${sellerId}?${params}`);
      const result = await response.json();
      if (!response.ok) { throw new Error(result.error || 'Failed to fetch reviews'); }
      return result.data;
    } catch (error) {
      if (this._isOffline()) { return this.getSellerReviews(sellerId, options); }
      throw error;
    }
  }

  async getRatingSummary (sellerId) {
    try {
      if (this._isOffline()) {
        const reviews = this._getLocalReviews().filter(r => r.sellerId === sellerId);
        const total = reviews.length;
        const avgRating = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });
        return { averageRating: Math.round(avgRating * 10) / 10, totalReviews: total, distribution };
      }

      const response = await this._fetchWithCsrf(`${window.API_URL || 'http://localhost:5000/api'}/reviews/seller/${sellerId}/summary`);
      const result = await response.json();
      if (!response.ok) { throw new Error(result.error || 'Failed to fetch rating summary'); }
      return result.data;
    } catch (error) {
      if (this._isOffline()) { return this.getRatingSummary(sellerId); }
      throw error;
    }
  }

  async getMyReviews (options = {}) {
    try {
      if (this._isOffline()) {
        const reviews = this._getMyLocalReviews();
        const { page = 1, limit = 10 } = options;
        const start = (page - 1) * limit;
        return {
          reviews: reviews.slice(start, start + limit),
          pagination: { page, limit, total: reviews.length, pages: Math.ceil(reviews.length / limit) },
        };
      }

      const { page = 1, limit = 10 } = options;
      const params = new URLSearchParams({ page, limit });
      const response = await this._fetchWithCsrf(`${window.API_URL || 'http://localhost:5000/api'}/reviews/my-reviews?${params}`);
      const result = await response.json();
      if (!response.ok) { throw new Error(result.error || 'Failed to fetch reviews'); }
      return result.data;
    } catch (error) {
      if (this._isOffline()) { return this.getMyReviews(options); }
      throw error;
    }
  }

  async updateReview (reviewId, data) {
    try {
      if (this._isOffline()) {
        const reviews = this._getLocalReviews();
        const idx = reviews.findIndex(r => r.id === reviewId);
        if (idx === -1) throw new Error('Review not found');
        Object.assign(reviews[idx], data, { updatedAt: new Date().toISOString() });
        this._saveLocalReviews(reviews);
        const myReviews = this._getMyLocalReviews();
        const myIdx = myReviews.findIndex(r => r.id === reviewId);
        if (myIdx !== -1) { Object.assign(myReviews[myIdx], data, { updatedAt: new Date().toISOString() }); this._saveMyLocalReviews(myReviews); }
showToast('Review updated locally!', 'success');
        return reviews[idx];
      }

      const response = await this._fetchWithCsrf(`${window.API_URL || 'http://localhost:5000/api'}/reviews/${reviewId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) { throw new Error(result.error || 'Failed to update review'); }
      showToast('Review updated successfully!', 'success');
      return result.data;
    } catch (error) {
      if (this._isOffline()) { return this.updateReview(reviewId, data); }
      throw error;
    }
  }

  async deleteReview (reviewId) {
    try {
      if (this._isOffline()) {
        let reviews = this._getLocalReviews().filter(r => r.id !== reviewId);
        this._saveLocalReviews(reviews);
        let myReviews = this._getMyLocalReviews().filter(r => r.id !== reviewId);
        this._saveMyLocalReviews(myReviews);
showToast('Review deleted', 'info');
        return { success: true };
      }

      const response = await this._fetchWithCsrf(`${window.API_URL || 'http://localhost:5000/api'}/reviews/${reviewId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) { throw new Error(result.error || 'Failed to delete review'); }
      showToast('Review deleted', 'info');
      return result;
    } catch (error) {
      if (this._isOffline()) { return this.deleteReview(reviewId); }
      throw error;
    }
  }

  async markHelpful (reviewId) {
    try {
      if (this._isOffline()) {
        const reviews = this._getLocalReviews();
        const review = reviews.find(r => r.id === reviewId);
        if (review) { review.helpful = (review.helpful || 0) + 1; this._saveLocalReviews(reviews); }
        return { helpful: review?.helpful || 0 };
      }

      const response = await this._fetchWithCsrf(`${window.API_URL || 'http://localhost:5000/api'}/reviews/${reviewId}/helpful`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) { throw new Error(result.error || 'Failed to mark as helpful'); }
      return result.data;
    } catch (error) {
      if (this._isOffline()) { return this.markHelpful(reviewId); }
      throw error;
    }
  }

  async reportReview (reviewId) {
    try {
      if (this._isOffline()) {
        const reviews = this._getLocalReviews();
        const review = reviews.find(r => r.id === reviewId);
        if (review) { review.reported = true; this._saveLocalReviews(reviews); }
showToast('Review reported', 'info');
        return { success: true };
      }

      const response = await this._fetchWithCsrf(`${window.API_URL || 'http://localhost:5000/api'}/reviews/${reviewId}/report`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) { throw new Error(result.error || 'Failed to report review'); }
      showToast('Review reported', 'info');
      return result;
    } catch (error) {
      if (this._isOffline()) { return this.reportReview(reviewId); }
      throw error;
    }
  }

  async respondToReview (reviewId, comment) {
    try {
      if (this._isOffline()) {
        const reviews = this._getLocalReviews();
        const review = reviews.find(r => r.id === reviewId);
        if (review) {
          review.sellerResponse = { comment, createdAt: new Date().toISOString() };
          this._saveLocalReviews(reviews);
        }
showToast('Response added', 'success');
        return review;
      }

      const response = await this._fetchWithCsrf(`${window.API_URL || 'http://localhost:5000/api'}/reviews/${reviewId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      });
      const result = await response.json();
      if (!response.ok) { throw new Error(result.error || 'Failed to respond'); }
      showToast('Response added', 'success');
      return result.data;
    } catch (error) {
      if (this._isOffline()) { return this.respondToReview(reviewId, comment); }
      throw error;
    }
  }

  generateStars (rating, _size = 16) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    let html = `<div class="star-rating" style="font-size: ${_size}px; display: inline-flex; gap: 2px;">`;
    for (let i = 0; i < fullStars; i++) { html += '<span class="star full">★</span>'; }
    if (hasHalf) { html += '<span class="star half">★</span>'; }
    for (let i = 0; i < emptyStars; i++) { html += '<span class="star empty">☆</span>'; }
    html += '</div>';
    return html;
  }

  generateStarInput (currentRating = 0, onChange) {
    const containerId = `star-input-${Date.now()}`;
    setTimeout(() => {
      const container = document.getElementById(containerId);
      if (!container) return;
      const stars = container.querySelectorAll('.star-input');
      stars.forEach((star, index) => {
        star.addEventListener('click', () => {
          const rating = index + 1;
          stars.forEach((s, i) => { s.classList.toggle('active', i < rating); });
          if (onChange) onChange(rating);
        });
        star.addEventListener('mouseenter', () => {
          stars.forEach((s, i) => { s.classList.toggle('hover', i <= index); });
        });
      });
      container.addEventListener('mouseleave', () => {
        stars.forEach((s, i) => { s.classList.remove('hover'); s.classList.toggle('active', i < currentRating); });
      });
    }, 0);
    let html = `<div id="${containerId}" class="star-input-container" style="display: inline-flex; gap: 4px; font-size: 24px; cursor: pointer;">`;
    for (let i = 0; i < 5; i++) {
      html += `<span class="star-input ${i < currentRating ? 'active' : ''}" data-rating="${i + 1}">★</span>`;
    }
    html += '</div>';
    return html;
  }
}

const reviewManager = new ReviewManager();

export { ReviewManager, reviewManager };

window.reviewManager = reviewManager;
if (typeof dispatchEvent !== 'undefined') {
  dispatchEvent(new Event('module-loaded', { detail: 'ReviewManager' }));
}
