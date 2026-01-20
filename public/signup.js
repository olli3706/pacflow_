// Signup form handling with Supabase Auth
document.addEventListener('DOMContentLoaded', async () => {
    const signupForm = document.getElementById('signupForm');
    const errorMessage = document.getElementById('signup-error');
    const successMessage = document.getElementById('signup-success');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    // Check if already authenticated, redirect to app
    const authenticated = await isAuthed();
    if (authenticated) {
        window.location.href = 'app.html';
        return;
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Hide previous messages
            if (errorMessage) {
                errorMessage.style.display = 'none';
                errorMessage.textContent = '';
            }
            if (successMessage) {
                successMessage.style.display = 'none';
                successMessage.textContent = '';
            }

            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Validation
            if (!email || !password || !confirmPassword) {
                if (errorMessage) {
                    errorMessage.textContent = 'Please fill in all fields.';
                    errorMessage.style.display = 'block';
                }
                return;
            }

            if (password !== confirmPassword) {
                if (errorMessage) {
                    errorMessage.textContent = 'Passwords do not match.';
                    errorMessage.style.display = 'block';
                }
                passwordInput.value = '';
                confirmPasswordInput.value = '';
                passwordInput.focus();
                return;
            }

            if (password.length < 6) {
                if (errorMessage) {
                    errorMessage.textContent = 'Password must be at least 6 characters long.';
                    errorMessage.style.display = 'block';
                }
                return;
            }

            // Attempt signup
            const result = await signUp(email, password);

            if (result.success) {
                if (result.autoLogin) {
                    // Auto-login successful, redirect to app
                    window.location.href = 'app.html';
                } else {
                    // Show success message
                    if (successMessage) {
                        successMessage.textContent = result.message || 'Sign up successful! Redirecting to login...';
                        successMessage.style.display = 'block';
                    }
                    // Redirect to login after a delay
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                }
            } else {
                // Show error message
                if (errorMessage) {
                    errorMessage.textContent = result.error || 'Sign up failed. Please try again.';
                    errorMessage.style.display = 'block';
                }
            }
        });
    }
});
