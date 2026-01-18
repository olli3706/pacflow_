// Login form handling with Supabase Auth + temporary dev backdoor
document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('login-error');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const signInButton = document.getElementById('signInButton');

    // Check if already authenticated, redirect to app
    const authenticated = await isAuthed();
    
    if (authenticated) {
        window.location.href = 'app.html';
        return;
    }

    // Handle form submission - prevent default native form behavior
    async function handleLogin(e) {
        // CRITICAL: Prevent default form submission FIRST
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // Prevent any default form action
        if (loginForm) {
            loginForm.setAttribute('action', 'javascript:void(0);');
        }
        
        // Hide previous error
        if (errorMessage) {
            errorMessage.style.display = 'none';
            errorMessage.textContent = '';
        }

        const email = usernameInput ? usernameInput.value.trim() : ''; // Username input treated as email
        const password = passwordInput ? passwordInput.value : '';

        if (!email || !password) {
            if (errorMessage) {
                errorMessage.textContent = 'Please enter both email and password.';
                errorMessage.style.display = 'block';
            }
            return false;
        }

        // Attempt login (handles both Supabase Auth and backdoor)
        const result = await login(email, password);
        
        if (result.success) {
            // Success - redirect to main app (default tab: Create Statement of Work)
            // Use window.location.replace to avoid adding to history
            window.location.replace('app.html');
        } else {
            // Show error message - DO NOT redirect on error
            if (errorMessage) {
                errorMessage.textContent = result.error || 'Invalid email or password. Please try again.';
                errorMessage.style.display = 'block';
            }
            // Clear password field
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
        }
        
        return false; // Ensure no default behavior
    }
    
    // Attach submit handler to form
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin, false);
    }
    
    // Also attach click handler to button as backup
    if (signInButton) {
        signInButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleLogin(e);
        }, false);
    }
});
