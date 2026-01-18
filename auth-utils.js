// Authentication utility functions with Supabase Auth + temporary dev backdoor

// Supabase client configuration
const SUPABASE_URL = 'https://hyfqhbzcjqqzmwxodkmv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5ZnFoYnpjanFxem13eG9ka212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MzMzMDYsImV4cCI6MjA4NDMwOTMwNn0.8tB1vca1zv3ChiN9ZEtTmUyadvoiBzBcli84ve11kFs';

// Initialize Supabase client
// CDN version: window.supabase.createClient()
// NPM version: createClient() from @supabase/supabase-js
let supabaseClientInstance = null;

function initSupabaseClient() {
    if (supabaseClientInstance) return supabaseClientInstance;
    
    if (typeof window !== 'undefined') {
        // Try CDN UMD version (exposed as window.supabase.createClient)
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            try {
                supabaseClientInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('Supabase client initialized via CDN');
                return supabaseClientInstance;
            } catch (error) {
                console.error('Error creating Supabase client:', error);
            }
        }
        
        // Try direct createClient function (if available)
        if (typeof createClient === 'function') {
            try {
                supabaseClientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('Supabase client initialized via createClient');
                return supabaseClientInstance;
            } catch (error) {
                console.error('Error creating Supabase client via createClient:', error);
            }
        }
        
        // Debug: Log what's available
        console.warn('Supabase library not properly loaded. Available:', {
            hasWindowSupabase: !!window.supabase,
            hasCreateClient: typeof createClient !== 'undefined',
            windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('supabase'))
        });
    }
    
    return null;
}

// Initialize on load
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSupabaseClient);
    } else {
        initSupabaseClient();
    }
}

// Storage keys
const AUTH_STORAGE_KEY = 'packflow_isAuthenticated';
const BACKDOOR_AUTH_KEY = 'packflow_backdoorAuth'; // Temporary dev backdoor flag
const DEV_BACKDOOR_KEY = 'dev_backdoor'; // Temporary dev backdoor flag (as per requirements)
const SUPABASE_SESSION_KEY = 'supabase.auth.token'; // Supabase stores session here

// Backdoor credentials (TEMPORARY / DEV ONLY)
const BACKDOOR_EMAIL = 'testing@testing.com';
const BACKDOOR_PASSWORD = 'testingtesting12';

/**
 * Check if user is authenticated (either via Supabase or backdoor)
 */
async function isAuthed() {
    // Check for Supabase session
    const client = initSupabaseClient();
    if (client) {
        try {
            const { data: { session } } = await client.auth.getSession();
            if (session) {
                return true;
            }
        } catch (error) {
            console.error('Error checking Supabase session:', error);
        }
    }

    // Check for backdoor auth (TEMPORARY / DEV ONLY)
    const backdoorAuth = localStorage.getItem(BACKDOOR_AUTH_KEY) === 'true';
    const devBackdoorAuth = localStorage.getItem(DEV_BACKDOOR_KEY) === 'true';
    if (backdoorAuth || devBackdoorAuth) {
        return true;
    }

    // Legacy check (remove after migration)
    const legacyAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    return legacyAuth === 'true';
}

/**
 * Login with Supabase Auth or backdoor (TEMPORARY / DEV ONLY)
 * @param {string} email - User email (username field treated as email)
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function login(email, password) {
    // ============================================
    // TEMPORARY BACKDOOR LOGIN (DEV ONLY)
    // ============================================
    // This is a development-only backdoor that bypasses Supabase Auth
    // It does NOT use the service role key and does NOT write to the database
    // This must be removed before production deployment
    // Guard: Only active in development environment
    // Check process.env.NODE_ENV if available (Next.js), otherwise check hostname
    const isDevelopment = (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ||
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    const emailMatch = email === BACKDOOR_EMAIL;
    const passwordMatch = password === BACKDOOR_PASSWORD;
    const willUseBackdoor = isDevelopment && emailMatch && passwordMatch;
    
    // TEMPORARY BACKDOOR LOGIN (DEV ONLY) - Check before Supabase Auth
    if (willUseBackdoor) {
        // Set backdoor flags (localStorage only - no database writes)
        localStorage.setItem(DEV_BACKDOOR_KEY, 'true'); // As per requirements
        localStorage.setItem(BACKDOOR_AUTH_KEY, 'true'); // Legacy compatibility
        localStorage.setItem(AUTH_STORAGE_KEY, 'true'); // Legacy compatibility
        
        console.warn('⚠️ BACKDOOR LOGIN ACTIVATED - DEV ONLY - REMOVE BEFORE PRODUCTION');
        return { success: true };
    }
    // ============================================
    // END TEMPORARY BACKDOOR
    // ============================================

    // Primary authentication: Supabase Auth
    const client = initSupabaseClient();
    
    if (!client) {
        return { success: false, error: 'Supabase client not initialized. Please refresh the page.' };
    }

    try {
        const { data, error } = await client.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });

        if (error) {
            return { success: false, error: error.message || 'Invalid email or password.' };
        }

        if (data.session) {
            // Set legacy auth flag for compatibility
            localStorage.setItem(AUTH_STORAGE_KEY, 'true');
            return { success: true };
        }

        return { success: false, error: 'Authentication failed. Please try again.' };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'An error occurred during login. Please try again.' };
    }
}

/**
 * Sign up with Supabase Auth
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function signUp(email, password) {
    const client = initSupabaseClient();
    if (!client) {
        return { success: false, error: 'Supabase client not initialized. Please refresh the page.' };
    }

    try {
        const { data, error } = await client.auth.signUp({
            email: email.trim(),
            password: password
        });

        if (error) {
            return { success: false, error: error.message || 'Sign up failed. Please try again.' };
        }

        // If no email confirmation required, auto-login
        if (data.session) {
            localStorage.setItem(AUTH_STORAGE_KEY, 'true');
            return { success: true, autoLogin: true };
        }

        // Sign up successful but email confirmation required
        return { success: true, autoLogin: false, message: 'Please check your email to confirm your account.' };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: 'An error occurred during sign up. Please try again.' };
    }
}

/**
 * Logout - handles both Supabase Auth and backdoor auth
 */
async function logout() {
    // Logout from Supabase Auth if session exists
    const client = initSupabaseClient();
    if (client) {
        try {
            await client.auth.signOut();
        } catch (error) {
            console.error('Supabase logout error:', error);
        }
    }

    // Clear backdoor auth (TEMPORARY / DEV ONLY)
    localStorage.removeItem(DEV_BACKDOOR_KEY); // As per requirements
    localStorage.removeItem(BACKDOOR_AUTH_KEY); // Legacy compatibility
    
    // Clear legacy auth flags
    localStorage.removeItem(AUTH_STORAGE_KEY);

    return true;
}

/**
 * Get current Supabase session (if authenticated via Supabase)
 */
async function getSupabaseSession() {
    const client = initSupabaseClient();
    if (!client) return null;
    
    try {
        const { data: { session } } = await client.auth.getSession();
        return session;
    } catch (error) {
        console.error('Error getting Supabase session:', error);
        return null;
    }
}

/**
 * Check authentication on page load and redirect if needed
 */
function requireAuth() {
    // This will be checked async in app.html
}

// Export for use in other modules (if using modules, otherwise it's global)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isAuthed,
        login,
        signUp,
        logout,
        getSupabaseSession,
        requireAuth
    };
}
