// Authentication utility functions
const AUTH_STORAGE_KEY = 'packflow_isAuthenticated';
const VALID_USERNAME = 'qwerty';
const VALID_PASSWORD = 'password';

// Check if user is authenticated
function isAuthed() {
    try {
        const authStatus = localStorage.getItem(AUTH_STORAGE_KEY);
        return authStatus === 'true';
    } catch (error) {
        console.error('Error checking authentication:', error);
        return false;
    }
}

// Login with username and password
function login(username, password) {
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        return true;
    }
    return false;
}

// Logout - clear authentication
function logout() {
    try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Error during logout:', error);
        return false;
    }
}

// Check authentication on page load and redirect if needed
function requireAuth() {
    if (!isAuthed()) {
        // Redirect to login if not authenticated
        if (window.location.pathname.includes('app.html') || 
            window.location.pathname.endsWith('/')) {
            window.location.href = 'index.html';
        }
    }
}

// Export for use in other modules (if using modules, otherwise it's global)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isAuthed,
        login,
        logout,
        requireAuth
    };
}
