/**
 * Pages Module - DECOMPOSED
 *
 * MIGRATION STATUS: In Progress
 *
 * This folder previously exported ES6 modules (BasePage, AuthPage, LandingPage)
 * but they were never imported/used - they were loaded as globals in index.html instead.
 *
 * NEW COMPONENT MODULES (not used yet):
 * - BasePage.js - Base class for page components (fixed TypeScript syntax)
 * - AuthPage.js - Login/registration (fixed TypeScript syntax)
 * - LandingPage.js - Landing page (fixed TypeScript syntax)
 *
 * CURRENT ACTIVE MODULE:
 * - pages.js - Main Pages singleton with all page renderers (4,513 lines)
 *   Location: index.html loads directly via <script src="js/pages/pages.js">
 *
 * TODO: Gradually refactor pages.js into smaller component files
 * and use proper module imports when build tool is configured.
 *
 * For now, the new page components (BasePage, AuthPage, LandingPage)
 * are available for reference/partial migration but not actively used.
 */
