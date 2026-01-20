// SMS utility functions for PackFlow
// Client-side helper to send SMS via the server API

/**
 * Get the current auth token for API requests
 * @returns {Promise<string|null>} The JWT token or null if not authenticated
 */
async function getAuthToken() {
    try {
        // Get session from Supabase client (assumes auth-utils.js is loaded)
        if (typeof getSupabaseSession === 'function') {
            const session = await getSupabaseSession();
            if (session && session.access_token) {
                return session.access_token;
            }
        }
        
        // Fallback: try to get from Supabase storage directly
        const storageKey = 'sb-' + window.location.hostname + '-auth-token';
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.access_token) {
                return parsed.access_token;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
}

/**
 * Send an SMS message via the PackFlow API
 * @param {string} recipient - The phone number to send to (UK format: 07... or +44...)
 * @param {string} message - The message content (max 1600 characters)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendSMS(recipient, message) {
    if (!recipient || !message) {
        return { success: false, error: 'Recipient and message are required' };
    }

    // Get auth token
    const token = await getAuthToken();
    if (!token) {
        return { success: false, error: 'Authentication required. Please log in.' };
    }

    try {
        const response = await fetch('/api/send-sms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                recipient: recipient,
                message: message
            })
        });

        const result = await response.json();

        if (!response.ok) {
            return { 
                success: false, 
                error: result.error || 'Failed to send SMS' 
            };
        }

        return { 
            success: true, 
            messageId: result.messageId,
            status: result.status,
            credits: result.credits
        };

    } catch (error) {
        console.error('Error sending SMS:', error);
        return { 
            success: false, 
            error: 'Network error. Please check your connection and try again.' 
        };
    }
}

/**
 * Validate a UK phone number format
 * @param {string} phoneNumber - The phone number to validate
 * @returns {boolean} - True if valid UK mobile format
 */
function isValidUKMobile(phoneNumber) {
    const cleaned = phoneNumber.replace(/\s+/g, '');
    const phoneRegex = /^(\+44|0044|0)7\d{9}$/;
    return phoneRegex.test(cleaned);
}

/**
 * Format a phone number for display
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - Formatted phone number
 */
function formatPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\s+/g, '');
    
    // Convert to 07xxx format for display
    if (cleaned.startsWith('+44')) {
        return '0' + cleaned.substring(3);
    }
    if (cleaned.startsWith('0044')) {
        return '0' + cleaned.substring(4);
    }
    
    // Format as 07xxx xxx xxx
    if (cleaned.startsWith('07') && cleaned.length === 11) {
        return cleaned.substring(0, 5) + ' ' + cleaned.substring(5, 8) + ' ' + cleaned.substring(8);
    }
    
    return phoneNumber;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { sendSMS, isValidUKMobile, formatPhoneNumber };
}
