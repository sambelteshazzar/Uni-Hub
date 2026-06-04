// ============================================
// BEST BUY LANDING PAGE RENDERER
// Replaces the default renderLanding with Best Buy-style layout
// ============================================

(function () {
  // eslint-disable-next-line no-console
  console.log('🔧 bestbuy-landing.js module loaded');

  // Define the Best Buy landing page renderer function
  window.renderBestBuyLanding = async function () {
    // eslint-disable-next-line no-console
    console.log('🎨 Best Buy renderLanding called');

    const mainContent = document.getElementById('main-content');
    let config = { universities: [], categories: [] };

    try {
      config = await window.api.loadJSON('data/config.json');
    } catch (error) {
      console.error('Error loading config:', error);
    }

    // Build universities HTML
    let universitiesHTML = '';
    if (config.universities && config.universities.length > 0) {
      universitiesHTML = config.universities
        .map(function (uni, i) {
          const isActive = uni.active !== false;
          const clickHandler = isActive
            ? 'Pages.selectUniversity(\'' + uni.id + '\'); return false;'
            : 'Pages.showUniversityComingSoon(\'' + uni.name + '\'); return false;';
          const comingSoonBadge = isActive ? '' : '<span style="position:absolute;top:0.5rem;right:0.5rem;background:#eab308;color:#000;font-size:0.65rem;font-weight:600;padding:0.2rem 0.4rem;border-radius:0.25rem;text-transform:uppercase;letter-spacing:0.05em;">Coming Soon</span>';
          const countText = isActive ? (100 + i * 50) + '+ items' : 'Not yet available';
const uniColors = ['#0046be', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#ef4444', '#6b7280'];
const uniColor = uniColors[i % uniColors.length];
const uniIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="' + uniColor + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5"/></svg>';
const uniBg = uniColor.replace('#', '');
const r = parseInt(uniBg.substring(0,2),16);
const g = parseInt(uniBg.substring(2,4),16);
const b = parseInt(uniBg.substring(4,6),16);
return (
'<div class="bb-category-card" style="position:relative;' + (isActive ? '' : 'opacity:0.7;cursor:default;') + '" onclick="' + clickHandler + '">' +
comingSoonBadge +
'<div class="bb-category-icon" style="background:rgba(' + r + ',' + g + ',' + b + ',0.1)">' + uniIcon + '</div>' +
            '<p class="bb-category-name">' +
            uni.name +
            '</p>' +
            '<p class="bb-category-count">' +
            countText +
            '</p>' +
            '</div>'
          );
        })
        .join('');
    }

    // Build categories HTML
    let categoriesHTML = '';
    if (config.categories && config.categories.length > 0) {
const icons = {
textbooks: '<svg viewBox="0 0 24 24" fill="none" stroke="#0046be" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
electronics: '<svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
dorm: '<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>',
clothing: '<svg viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>',
sports: '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
furniture: '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0z"/><path d="M5 18v2"/><path d="M19 18v2"/></svg>',
other: '<svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>'
};
categoriesHTML = config.categories
.map(function (cat) {
const icon = icons[cat.id] || icons.other;
const iconBgs = {
textbooks: 'rgba(0,70,190,0.1)',
electronics: 'rgba(139,92,246,0.1)',
dorm: 'rgba(245,158,11,0.1)',
clothing: 'rgba(236,72,153,0.1)',
sports: 'rgba(239,68,68,0.1)',
furniture: 'rgba(16,185,129,0.1)',
other: 'rgba(107,114,128,0.1)'
};
const iconBg = iconBgs[cat.id] || iconBgs.other;
return (
'<a href="#/browse?category=' +
cat.id +
'" class="bb-category-card">' +
'<div class="bb-category-icon" style="background:' + iconBg + '">' +
icon +
'</div>' +
'<p class="bb-category-name">' +
cat.name +
'</p>' +
'<p class="bb-category-count">' +
(cat.count || '50+') +
' items</p>' +
'</a>'
);
})
.join('');
    }

    mainContent.innerHTML =
      '<div class="bb-landing">' +
      '<!-- Hero Section -->' +
      '<section class="bb-hero" style="min-height: 85vh; display: flex; align-items: center; padding: 6rem 2rem 4rem; position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(0, 70, 190, 0.92), rgba(0, 51, 153, 0.95)), url(\'/assets/images/hero-students.jpg\') center/cover no-repeat;">' +
      '<div style="position: absolute; top: -50%; right: -10%; width: 600px; height: 600px; background: rgba(255, 206, 0, 0.1); border-radius: 50%; filter: blur(100px); pointer-events: none;"></div>' +
      '<div class="bb-hero-container" style="max-width: 80rem; margin: 0 auto; width: 100%; position: relative; z-index: 10;">' +
      '<div style="display: grid; grid-template-columns: 1fr; gap: 3rem; align-items: center;">' +
      '<div>' +
      '<div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.875rem; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); border-radius: 9999px; margin-bottom: 1.5rem;">' +
      '<span style="position: relative; display: flex; width: 8px; height: 8px;">' +
      '<span style="position: absolute; inset: 0; border-radius: 50%; background: #ffce00; animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;"></span>' +
      '<span style="position: relative; display: block; width: 8px; height: 8px; border-radius: 50%; background: #ffce00;"></span>' +
      '</span>' +
      '<span style="font-size: 0.875rem; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em;">Global University Marketplace</span>' +
      '</div>' +
      '<h1 id="hero-animated-text" style="font-size: clamp(2.5rem, 6vw, 4rem); font-weight: 800; color: #ffffff; line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 1.5rem;">' +
      'MADE FOR <span style="color: #ffce00;">CAMPUS LIFE</span>' +
      '</h1>' +
      '<p style="font-size: 1.125rem; line-height: 1.8; color: rgba(255,255,255,0.9); max-width: 42rem; margin-bottom: 2rem;">' +
      'Uni-Hub is a global university marketplace app that connects students to easily buy and sell essential academic items. Textbooks, electronics, accommodation listings, and other campus essentials — all within your university community and beyond.' +
      '</p>' +
      '<div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 3rem;">' +
      '<button onclick="Pages.renderBrowse(); return false;" style="display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem 2rem; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #ffce00; color: #1a1a1a; border: none; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background=\'#e6b800\'; this.style.transform=\'translateY(-2px)\'; this.style.boxShadow=\'0 8px 20px rgba(255, 206, 0, 0.3)\'" onmouseout="this.style.background=\'#ffce00\'; this.style.transform=\'translateY(0)\'; this.style.boxShadow=\'none\'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="display:inline-block;vertical-align:middle;margin-right:0.25rem;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Browse Items</button>' +
      '</div>' +
      '<div style="display: flex; flex-wrap: wrap; gap: 2.5rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.15);">' +
      '<div style="text-align: left;"><div style="font-size: 1.75rem; font-weight: 800; color: #ffce00; margin-bottom: 0.25rem;">7+</div><div style="color: rgba(255,255,255,0.7); font-size: 0.875rem;">Universities</div></div>' +
      '<div style="text-align: left;"><div style="font-size: 1.75rem; font-weight: 800; color: #ffce00; margin-bottom: 0.25rem;">2,000+</div><div style="color: rgba(255,255,255,0.7); font-size: 0.875rem;">Verified Students</div></div>' +
      '<div style="text-align: left;"><div style="font-size: 1.75rem; font-weight: 800; color: #ffce00; margin-bottom: 0.25rem;">5,000+</div><div style="color: rgba(255,255,255,0.7); font-size: 0.875rem;">Items Listed</div></div>' +
      '<div style="text-align: left;"><div style="font-size: 1.75rem; font-weight: 800; color: #ffce00; margin-bottom: 0.25rem;">GH₵500K+</div><div style="color: rgba(255,255,255,0.7); font-size: 0.875rem;">In Sales</div></div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '<!-- Mission Statement Section -->' +
      '<section style="padding: 5rem 2rem; background: #f8f9fa; border-top: 1px solid #e5e7eb;">' +
      '<div style="max-width: 56rem; margin: 0 auto;">' +
      '<div style="text-align: center; margin-bottom: 2rem;">' +
      '<h2 style="font-size: 1.875rem; font-weight: 800; color: #1a1a1a; margin-bottom: 0.5rem;">Our Mission</h2>' +
      '<p style="color: #6b7280; font-size: 1rem;">Making student essentials affordable and accessible</p>' +
      '</div>' +
      '<div style="padding: 2rem; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 0.75rem; border-left: 4px solid #0046be;">' +
      '<p style="color: #374151; font-size: 1.125rem; line-height: 1.8;">' +
      'At Uni-Hub, our mission is to make student essentials affordable and accessible, ensuring that every student can get what they need without financial stress.' +
      '</p>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '<!-- Shop by Category -->' +
      '<section class="bb-categories" id="browse">' +
      '<div class="bb-container">' +
      '<div class="bb-section-header">' +
      '<h2 class="bb-section-title">Shop by Category</h2>' +
      '<p class="bb-section-subtitle">Find exactly what you need for campus life</p>' +
      '</div>' +
      '<div class="bb-categories-grid">' +
(categoriesHTML ||
'<a href="#/browse?category=textbooks" class="bb-category-card"><div class="bb-category-icon" style="background:rgba(0,70,190,0.1)"><svg viewBox="0 0 24 24" fill="none" stroke="#0046be" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div><p class="bb-category-name">Textbooks</p><p class="bb-category-count">120+ items</p></a>' +
'<a href="#/browse?category=electronics" class="bb-category-card"><div class="bb-category-icon" style="background:rgba(139,92,246,0.1)"><svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div><p class="bb-category-name">Electronics</p><p class="bb-category-count">85+ items</p></a>' +
'<a href="#/browse?category=hostel-items" class="bb-category-card"><div class="bb-category-icon" style="background:rgba(245,158,11,0.1)"><svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg></div><p class="bb-category-name">Hostel Items</p><p class="bb-category-count">95+ items</p></a>' +
'<a href="#/browse?category=accessories" class="bb-category-card"><div class="bb-category-icon" style="background:rgba(16,185,129,0.1)"><svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg></div><p class="bb-category-name">Accessories</p><p class="bb-category-count">45+ items</p></a>' +
'<a href="#/browse?category=fashion" class="bb-category-card"><div class="bb-category-icon" style="background:rgba(236,72,153,0.1)"><svg viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg></div><p class="bb-category-name">Fashion</p><p class="bb-category-count">60+ items</p></a>' +
'<a href="#/browse?category=appliances" class="bb-category-card"><div class="bb-category-icon" style="background:rgba(239,68,68,0.1)"><svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></div><p class="bb-category-name">Appliances</p><p class="bb-category-count">35+ items</p></a>') +
      '</div>' +
      '</div>' +
      '</section>' +
      '<!-- We\'ve Got You Covered -->' +
      '<section class="bb-covered" id="bb-covered-section">' +
      '<div class="bb-covered-inner">' +
      '<div class="bb-covered-text-col">' +
      '<span class="bb-covered-eyebrow">Community First</span>' +
      '<h2 class="bb-covered-headline">WE\'VE GOT<br>YOU<br><em class="bb-covered-accent">COVERED</em></h2>' +
      '<p class="bb-covered-body">From textbooks to accommodation, electronics to everyday essentials — Uni-Hub connects you with students who\'ve got exactly what you need. Buy, sell, and thrive together on campus.</p>' +
      '<div class="bb-covered-pills">' +
      '<span class="bb-covered-pill">Textbooks</span>' +
      '<span class="bb-covered-pill">Electronics</span>' +
      '<span class="bb-covered-pill">Hostel Items</span>' +
      '<span class="bb-covered-pill">Accessories</span>' +
      '<span class="bb-covered-pill">Fashion</span>' +
      '<span class="bb-covered-pill">Appliances</span>' +
      '</div>' +
      '<a href="#/browse" onclick="Pages.renderBrowse(); return false;" class="bb-covered-cta">Explore the marketplace <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg></a>' +
      '</div>' +
      '<div class="bb-covered-gallery">' +
      '<div class="bb-covered-photo bb-covered-photo--main">' +
      '<img src="https://files.catbox.moe/xpkc3o.png" alt="Students meeting and collaborating on campus" loading="lazy">' +
      '<div class="bb-covered-photo-label">Connect on campus</div>' +
      '</div>' +
      '<div class="bb-covered-photo bb-covered-photo--top">' +
      '<img src="https://files.catbox.moe/pesd3z.jpg" alt="Students studying together and laughing" loading="lazy">' +
      '<div class="bb-covered-photo-label">Study together</div>' +
      '</div>' +
      '<div class="bb-covered-photo bb-covered-photo--bottom">' +
      '<img src="https://files.catbox.moe/dlg1s2.jpg" alt="Friends teaming up after a successful deal" loading="lazy">' +
      '<div class="bb-covered-photo-label">Deal done!</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="bb-covered-marquee">' +
      '<div class="bb-covered-marquee-track">' +
      '<span>Textbooks</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '<span>Electronics</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '<span>Accommodation</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '<span>Furniture</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '<span>Clothing</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '<span>Sports Gear</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '<span>Kitchen Essentials</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '<span>Stationery</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '<span>Textbooks</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '<span>Electronics</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '<span>Accommodation</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '<span>Furniture</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '<span>Clothing</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '<span>Sports Gear</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '<span>Kitchen Essentials</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '<span>Stationery</span><span class="bb-covered-marquee-dot">&#10038;</span>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '<!-- University Selection -->' +
      '<section class="bb-categories" id="universities">' +
      '<div class="bb-container">' +
      '<div class="bb-section-header">' +
      '<h2 class="bb-section-title">Choose Your University</h2>' +
      '<p class="bb-section-subtitle">Browse items from verified students at your campus</p>' +
      '</div>' +
      '<div class="bb-categories-grid">' +
(universitiesHTML ||
'<div class="bb-category-card" onclick="Pages.renderBrowse(); return false;"><div class="bb-category-icon" style="background:rgba(0,70,190,0.1)"><svg viewBox="0 0 24 24" fill="none" stroke="#0046be" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5"/></svg></div><p class="bb-category-name">University of Ghana</p><p class="bb-category-count">350+ items</p></div>' +
'<div class="bb-category-card" onclick="Pages.renderBrowse(); return false;"><div class="bb-category-icon" style="background:rgba(139,92,246,0.1)"><svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6"/><path d="M10 9h4"/><path d="M10 13h4"/></svg></div><p class="bb-category-name">KNUST</p><p class="bb-category-count">220+ items</p></div>' +
'<div class="bb-category-card" onclick="Pages.renderBrowse(); return false;"><div class="bb-category-icon" style="background:rgba(16,185,129,0.1)"><svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div><p class="bb-category-name">University of Cape Coast</p><p class="bb-category-count">180+ items</p></div>' +
'<div class="bb-category-card" onclick="Pages.renderBrowse(); return false;"><div class="bb-category-icon" style="background:rgba(245,158,11,0.1)"><svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M12 2L2 8l10 6 10-6-10-6z"/><path d="M2 17l10 6 10-6"/><path d="M2 12l10 6 10-6"/></svg></div><p class="bb-category-name">Ashesi University</p><p class="bb-category-count">95+ items</p></div>') +
'<div class="bb-category-card" onclick="Pages.renderBrowse(); return false;" style="border: 2px dashed #0046be;">' +
'<div class="bb-category-icon" style="background:rgba(0,70,190,0.08);font-size:var(--text-xl);color:#0046be;font-weight:700;">+</div>' +
      '<p class="bb-category-name" style="color: #0046be;">View All Universities</p>' +
      '<p class="bb-category-count">7 total</p>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '<!-- How It Works -->' +
      '<section class="bb-how-it-works">' +
      '<div class="bb-container">' +
      '<div class="bb-section-header" style="text-align: center;">' +
      '<h2 class="bb-section-title">How Uni-Hub Works</h2>' +
      '<p class="bb-section-subtitle">Buy and sell in 3 simple steps</p>' +
      '</div>' +
      '<div class="bb-steps-grid">' +
      '<div class="bb-step"><div class="bb-step-number">1</div><h3 class="bb-step-title">Sign Up &amp; Verify</h3><p class="bb-step-desc">Create your account with your university email and get verified as a student. Only verified students can buy and sell.</p></div>' +
      '<div class="bb-step"><div class="bb-step-number">2</div><h3 class="bb-step-title">Browse or List Items</h3><p class="bb-step-desc">Search through hundreds of items from students at your university, or list your own items for sale in minutes.</p></div>' +
      '<div class="bb-step"><div class="bb-step-number">3</div><h3 class="bb-step-title">Connect &amp; Complete</h3><p class="bb-step-desc">Message the seller or buyer directly through our secure messaging system. Meet on campus to exchange items safely.</p></div>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '<!-- CTA Section -->' +
      '<section class="bb-cta">' +
      '<div class="bb-container">' +
      '<div class="bb-cta-content">' +
      '<h2 class="bb-cta-title">Ready to Start Saving?</h2>' +
      '<p class="bb-cta-desc">Join thousands of students already buying and selling on Uni-Hub. It\'s free to sign up.</p>' +
      '<div class="bb-hero-buttons" style="justify-content: center;">' +
      '<button onclick="Pages.renderRegister(); return false;" class="bb-btn bb-btn-primary" style="background: #ffce00; color: #1a1a1a;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="display:inline-block;vertical-align:middle;margin-right:0.25rem;"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg> Create Free Account</button>' +
      '<button onclick="Pages.renderBrowse(); return false;" class="bb-btn bb-btn-outline"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="display:inline-block;vertical-align:middle;margin-right:0.25rem;"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Browse Items</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '</div>';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Initialize text animation after render
    setTimeout(function () {
      initTextAnimation();
    }, 100);
  };

  // Signal that BestBuy landing renderer is ready
  window._bestBuyLandingReady = true;
  window.dispatchEvent(new CustomEvent('module-loaded', { detail: 'BestBuyLandingReady' }));
})();

/**
 * Scale-In Text Animation
 * Animates each character with a spring effect
 */
function initTextAnimation () {
  // eslint-disable-next-line no-console
  console.log('initTextAnimation called');

  const heroText = document.getElementById('hero-animated-text');
  if (!heroText) {
    console.error('Hero text element not found');
    return;
  }

  const textBefore = 'MADE FOR ';
  const textYellow = 'CAMPUS LIFE';

  let html = '';
  let delay = 0;

  for (let i = 0; i < textBefore.length; i++) {
    const char = textBefore[i];
    html += '<span class="hero-char" style="display:inline-block;opacity:0;transform:scale(0);transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);transition-delay:' + (delay * 0.05).toFixed(3) + 's;">' + (char === ' ' ? '&nbsp;' : char) + '</span>';
    delay++;
  }

  html += '<span style="color:#ffce00;">';
  for (let j = 0; j < textYellow.length; j++) {
    const char2 = textYellow[j];
    html += '<span class="hero-char" style="display:inline-block;opacity:0;transform:scale(0);transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);transition-delay:' + (delay * 0.05).toFixed(3) + 's;">' + (char2 === ' ' ? '&nbsp;' : char2) + '</span>';
    delay++;
  }
  html += '</span>';

  heroText.innerHTML = html;

  setTimeout(function () {
    const chars = heroText.querySelectorAll('.hero-char');
    chars.forEach(function (c) {
      c.style.opacity = '1';
      c.style.transform = 'scale(1)';
    });
  }, 50);
}
