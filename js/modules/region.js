/* exported regionManager */
// ============================================
// REGION MODULE - Regional Management
// ============================================

class RegionManager {
  constructor () {
    this.regions = [];
    this.selectedRegion = null;
  }

  /**
   * Initialize regions from JSON
   */
  async init () {
    try {
      const data = await api.loadJSON('data/regions.json');
      this.regions = data.regions || [];
    } catch (error) {
      console.error('Error loading regions:', error);
      this.regions = [];
    }
  }

  /**
   * Get all regions
   * @returns {Array}
   */
  getAllRegions () {
    return this.regions;
  }

  /**
   * Get region by ID
   * @param {string} regionId - Region ID
   * @returns {Object|null}
   */
  getRegionById (regionId) {
    return this.regions.find(r => r.id === regionId) || null;
  }

  /**
   * Get region by university ID
   * @param {string} universityId - University ID
   * @returns {Object|null}
   */
  getRegionByUniversity (universityId) {
    return this.regions.find(r => r.universities.includes(universityId)) || null;
  }

  /**
   * Get universities in a region
   * @param {string} regionId - Region ID
   * @returns {Array}
   */
  getUniversitiesInRegion (regionId) {
    const region = this.getRegionById(regionId);
    return region ? region.universities : [];
  }

  /**
   * Get regions with universities
   * @returns {Array}
   */
  getRegionsWithUniversities () {
    return this.regions.filter(r => r.universities.length > 0);
  }

  /**
   * Set selected region
   * @param {string} regionId - Region ID
   */
  setSelectedRegion (regionId) {
    this.selectedRegion = regionId;
    StorageManager.set(`${STORAGE_KEY_PREFIX}selected_region`, regionId);
  }

  /**
   * Get selected region
   * @returns {string|null}
   */
  getSelectedRegion () {
    return this.selectedRegion || StorageManager.get(`${STORAGE_KEY_PREFIX}selected_region`);
  }

  /**
   * Clear selected region
   */
  clearSelectedRegion () {
    this.selectedRegion = null;
    StorageManager.remove(`${STORAGE_KEY_PREFIX}selected_region`);
  }

  /**
   * Get region statistics
   * @param {string} regionId - Region ID
   * @returns {Object}
   */
  getRegionStats (regionId) {
    const region = this.getRegionById(regionId);
    if (!region) {
      return null;
    }

    const universityCount = region.universities.length;

    // Get products count for this region (placeholder)
    const productsCount = 0; // Will be calculated from products

    return {
      id: region.id,
      name: region.name,
      capital: region.capital,
      universityCount: universityCount,
      productsCount: productsCount,
    };
  }

  /**
   * Search regions
   * @param {string} query - Search query
   * @returns {Array}
   */
  searchRegions (query) {
    const lowercaseQuery = query.toLowerCase();
    return this.regions.filter(
      r =>
        r.name.toLowerCase().includes(lowercaseQuery) ||
        r.capital.toLowerCase().includes(lowercaseQuery),
    );
  }

  /**
   * Get regions by name pattern
   * @param {string} pattern - Pattern to match
   * @returns {Array}
   */
  getRegionsByPattern (pattern) {
    return this.regions.filter(r => r.name.toLowerCase().includes(pattern.toLowerCase()));
  }

  /**
   * Format region name
   * @param {string} regionId - Region ID
   * @returns {string}
   */
  formatRegionName (regionId) {
    const region = this.getRegionById(regionId);
    return region ? region.name : regionId;
  }

  /**
   * Get all regions formatted for dropdown
   * @returns {Array}
   */
  getDropdownOptions () {
    return this.regions.map(r => ({
      value: r.id,
      label: r.name,
      capital: r.capital,
      universityCount: r.universities.length,
    }));
  }

  /**
   * Check if region has universities
   * @param {string} regionId - Region ID
   * @returns {boolean}
   */
  hasUniversities (regionId) {
    const region = this.getRegionById(regionId);
    return region && region.universities.length > 0;
  }

  /**
   * Get university count for region
   * @param {string} regionId - Region ID
   * @returns {number}
   */
  getUniversityCount (regionId) {
    const region = this.getRegionById(regionId);
    return region ? region.universities.length : 0;
  }
}

// Create singleton instance
const _regionManager = new RegionManager();
