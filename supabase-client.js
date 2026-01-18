// Supabase client initialization for browser (vanilla JS)
// This loads Supabase and initializes it with environment variables
// In production, these should come from a config endpoint or be injected at build time

// Get Supabase URL and anon key from environment configuration
// For vanilla JS, we'll store these in a config object
// In a real Next.js app, these would come from process.env.NEXT_PUBLIC_*

// TEMPORARY: Inline configuration (should be loaded from server/config in production)
// In Next.js, these would be process.env.NEXT_PUBLIC_SUPABASE_URL and process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_CONFIG = {
    url: 'https://hyfqhbzcjqqzmwxodkmv.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5ZnFoYnpjanFxem13eG9ka212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MzMzMDYsImV4cCI6MjA4NDMwOTMwNn0.8tB1vca1zv3ChiN9ZEtTmUyadvoiBzBcli84ve11kFs'
};

// Initialize Supabase client for browser use
let supabaseClient = null;

function getSupabaseClient() {
    if (!supabaseClient && typeof window !== 'undefined') {
        // Use CDN or check if Supabase is available
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        } else {
            console.error('Supabase library not loaded. Make sure @supabase/supabase-js is available.');
        }
    }
    return supabaseClient;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getSupabaseClient, SUPABASE_CONFIG };
}
