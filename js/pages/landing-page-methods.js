// Landing Page Methods

const LandingPageMethods = {
    hideOriginalNavFooter () {
    const navbar = document.getElementById('navbar');
    const footer = document.getElementById('footer');
    if (navbar) {
      navbar.style.display = 'none';
      navbar.setAttribute('data-hidden', 'true');
    }
    if (footer) {
      footer.style.display = 'none';
      footer.setAttribute('data-hidden', 'true');
    }
  },

    showOriginalNavFooter () {
    const navbar = document.getElementById('navbar');
    const footer = document.getElementById('footer');
    if (navbar && navbar.getAttribute('data-hidden') === 'true') {
      navbar.style.display = '';
      navbar.removeAttribute('data-hidden');
    }
    if (footer && footer.getAttribute('data-hidden') === 'true') {
      footer.style.display = 'block';
      footer.removeAttribute('data-hidden');
    }
    Pages.updateNavbar();
  },


  async renderLanding () {
    if (typeof window.renderBestBuyLanding === 'function') {
      return window.renderBestBuyLanding();
    }
    Pages.hideOriginalNavFooter();
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0046be;color:#fff;text-align:center;padding:2rem;"><div><h2>Loading JERTS CART...</h2><p>Please wait.</p></div></div>';
    }
    const check = setInterval(() => {
      if (typeof window.renderBestBuyLanding === 'function') {
        clearInterval(check);
        window.renderBestBuyLanding();
      }
    }, 50);
  },


    selectUniversity (universityId) {
    StorageManager.set(STORAGE_KEYS.SELECTED_UNIVERSITY, universityId);
    Pages.renderStudentVerification();
  },

  showUniversityComingSoon (universityName) {
    if (typeof Toast !== 'undefined') {
      showToast(`${universityName} is coming soon! We're currently available at Accra Technical University (ATU).`, 'info');
    } else {
      alert(`${universityName} is coming soon! We're currently available at Accra Technical University (ATU).`);
    }
  },

    filterCategoryTab (category, button) {
    // Update tab buttons
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.style.background = 'transparent';
      tab.style.color = '#a3a3a3';
      tab.style.borderColor = 'rgba(63,63,70,1)';
    });

    // Update clicked button
    button.style.background = 'rgba(0,70,190,0.2)';
    button.style.color = '#93c5fd';
    button.style.borderColor = 'rgba(0,70,190,0.3)';

    // Navigate to browse with category filter
    if (category === 'all') {
      Pages.renderBrowse();
    } else {
      Pages.renderBrowse({ category: category });
    }
  },
};

window.LandingPageMethods = LandingPageMethods;
