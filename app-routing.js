// Simple client-side routing for the main app
document.addEventListener('DOMContentLoaded', () => {
    const navTabs = document.querySelectorAll('.nav-tab');
    const pages = document.querySelectorAll('.page');
    const signOutBtn = document.getElementById('signOutBtn');
    const settingsBtn = document.getElementById('settingsBtn');

    // Handle tab navigation
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPage = tab.getAttribute('data-page');
            navigateToPage(targetPage);
        });
    });

    // Navigate to a specific page
    function navigateToPage(pageId) {
        // Hide all pages
        pages.forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPageElement = document.getElementById(pageId + '-page');
        if (targetPageElement) {
            targetPageElement.classList.add('active');
        }

        // Update active tab
        navTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-page') === pageId) {
                tab.classList.add('active');
            }
        });
    }

    // Handle Sign Out - redirect to login page
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    // Handle Settings (placeholder for future functionality)
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            alert('Settings page coming soon!');
        });
    }

    // Initialize: show Create Statement of Work page by default
    navigateToPage('create-sow');
});
