// Login form handling - always redirects to main app
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Always redirect to main app, no validation needed
            window.location.href = 'app.html';
        });
    }
});
