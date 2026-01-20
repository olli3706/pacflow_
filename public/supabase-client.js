// Supabase client initialization for browser (vanilla JS)
// This loads Supabase configuration from the server API endpoint
// Configuration is fetched from /api/public-config to avoid exposing secrets in client code

let supabaseConfig = null;
let supabaseClient = null;
let configFetchPromise = null;

/**
 * Fetch Supabase public config from server API
 * @returns {Promise<{supabaseUrl: string, supabaseAnonKey: string}>}
 */
async function fetchSupabaseConfig() {
    if (configFetchPromise) {
        return configFetchPromise;
    }

    configFetchPromise = fetch('/api/public-config')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch Supabase config');
            }
            return response.json();
        })
        .then(config => {
            supabaseConfig = config;
            return config;
        })
        .catch(error => {
            console.error('Error fetching Supabase config:', error);
            configFetchPromise = null;
            throw error;
        });

    return configFetchPromise;
}

/**
 * Initialize Supabase client for browser use
 * @returns {Promise<Object|null>}
 */
async function getSupabaseClient() {
    if (supabaseClient) {
        return supabaseClient;
    }

    if (typeof window === 'undefined') {
        return null;
    }

    try {
        // Fetch config from server if not already loaded
        if (!supabaseConfig) {
            await fetchSupabaseConfig();
        }

        if (!supabaseConfig || !supabaseConfig.supabaseUrl || !supabaseConfig.supabaseAnonKey) {
            console.error('Supabase config not available');
            return null;
        }

        // Use CDN or check if Supabase is available
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            supabaseClient = window.supabase.createClient(
                supabaseConfig.supabaseUrl,
                supabaseConfig.supabaseAnonKey
            );
            return supabaseClient;
        } else {
            console.error('Supabase library not loaded. Make sure @supabase/supabase-js is available.');
        }
    } catch (error) {
        console.error('Error initializing Supabase client:', error);
    }

    return null;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getSupabaseClient, fetchSupabaseConfig };
}
