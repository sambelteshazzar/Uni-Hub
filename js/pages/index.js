/**
 * Pages Module Exports
 * Central export point for all page components
 */
export { BasePage } from './BasePage.js';
export { LandingPage } from './LandingPage.js';
export { AuthPage } from './AuthPage.js';

// Re-export legacy Pages class for backward compatibility during migration
// This will be phased out as all pages are converted to the new module system
export { Pages } from './PagesLegacy.js';
