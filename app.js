// Login form handling with authentication
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('login-error');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    // Check if already authenticated, redirect to app
    if (isAuthed()) {
        window.location.href = 'app.html';
        return;
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Hide previous error
            if (errorMessage) {
                errorMessage.style.display = 'none';
                errorMessage.textContent = '';
            }

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            // Attempt login
            if (login(username, password)) {
                // Success - redirect to main app
                window.location.href = 'app.html';
            } else {
                // Show error message
                if (errorMessage) {
                    errorMessage.textContent = 'Invalid username or password. Please try again.';
                    errorMessage.style.display = 'block';
                }
                // Clear password field
                passwordInput.value = '';
                passwordInput.focus();
            }
        });
    }
});
