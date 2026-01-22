// Payment utility functions for PackFlow
// Uses server API with Supabase database (with localStorage fallback for offline/dev)

const PAYMENT_STORAGE_KEY = 'packflow_payments_cache';

/**
 * Get the current auth token for API requests
 * @returns {Promise<string|null>} The JWT token or null if not authenticated
 */
async function getPaymentAuthToken() {
    try {
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
 * Make an authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
    const token = await getPaymentAuthToken();
    
    if (!token) {
        throw new Error('Authentication required');
    }
    
    const response = await fetch(endpoint, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }
    
    return data;
}

/**
 * Get all payments from the API
 * Falls back to localStorage cache if API fails
 */
async function getPayments() {
    // #region agent log
    console.log('[DEBUG] getPayments() called');
    // #endregion
    try {
        const data = await apiRequest('/api/payments');
        
        // Cache to localStorage for offline access
        if (data.payments) {
            localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(data.payments));
        }
        
        // #region agent log
        console.log('[DEBUG] getPayments API success:', {length: data.payments?.length, isArray: Array.isArray(data.payments)});
        // #endregion
        return data.payments || [];
        
    } catch (error) {
        console.warn('[DEBUG] getPayments API failed, using cache:', error.message);
        
        // Fall back to localStorage cache
        try {
            const stored = localStorage.getItem(PAYMENT_STORAGE_KEY);
            const result = stored ? JSON.parse(stored) : [];
            // #region agent log
            console.log('[DEBUG] getPayments fallback:', {hasStored: !!stored, resultLength: result?.length, isArray: Array.isArray(result)});
            // #endregion
            return result;
        } catch (e) {
            console.error('[DEBUG] getPayments cache error:', e);
            return [];
        }
    }
}

/**
 * Save a new payment via the API
 */
async function savePayment(payment) {
    try {
        const data = await apiRequest('/api/payments', {
            method: 'POST',
            body: JSON.stringify(payment)
        });
        
        // Refresh cache
        await getPayments();
        
        return { success: true, payment: data.payment };
        
    } catch (error) {
        console.error('Error saving payment:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update payment status via the API
 */
async function updatePaymentStatus(paymentId, status) {
    try {
        const data = await apiRequest(`/api/payments/${paymentId}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        
        // Refresh cache
        await getPayments();
        
        return { success: true, payment: data.payment };
        
    } catch (error) {
        console.error('Error updating payment status:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a payment via the API
 */
async function deletePayment(paymentId) {
    try {
        await apiRequest(`/api/payments/${paymentId}`, {
            method: 'DELETE'
        });
        
        // Refresh cache
        await getPayments();
        
        return { success: true };
        
    } catch (error) {
        console.error('Error deleting payment:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get payments filtered by status
 */
async function getPaymentsByStatus(status) {
    const payments = await getPayments();
    return payments.filter(p => p.status === status);
}

/**
 * Get accepted payments only
 */
async function getAcceptedPayments() {
    return getPaymentsByStatus('accepted');
}

/**
 * Get confirmed-paid payments (accepted or paid).
 * Used for metrics: contractor has confirmed client paid and/or money received.
 */
async function getConfirmedPayments() {
    const payments = await getPayments();
    return payments.filter(p => p.status === 'accepted' || p.status === 'paid');
}

/**
 * Get bank details from the API
 */
async function getBankDetails() {
    try {
        const data = await apiRequest('/api/bank-details');
        return data.bankDetails;
    } catch (error) {
        console.error('Error fetching bank details:', error);
        return null;
    }
}

/**
 * Create a payment record from SOW state
 * Note: This returns the payment object but doesn't save it automatically
 */
function createPaymentFromSOW(sowState) {
    const hoursWorked = parseFloat(sowState.hoursWorked) || 0;
    const rate = parseFloat(sowState.rate) || 0;
    const additionalFees = parseFloat(sowState.additionalFees) || 0;
    
    const subtotal = hoursWorked * rate;
    const total = subtotal + additionalFees;
    
    return {
        projectName: sowState.projectName || '',
        clientName: sowState.clientName || '',
        clientEmail: sowState.clientEmail || '',
        clientPhone: sowState.clientPhone || '',
        workPeriodStart: sowState.startDate || null,
        workPeriodEnd: sowState.endDate || null,
        hoursWorked: hoursWorked,
        rate: rate,
        additionalFees: additionalFees,
        subtotal: subtotal,
        total: total
    };
}

/**
 * Create and save a payment from SOW state in one step
 */
async function createAndSavePaymentFromSOW(sowState) {
    const payment = createPaymentFromSOW(sowState);
    return savePayment(payment);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getPayments,
        savePayment,
        updatePaymentStatus,
        deletePayment,
        getPaymentsByStatus,
        getAcceptedPayments,
        getConfirmedPayments,
        getBankDetails,
        createPaymentFromSOW,
        createAndSavePaymentFromSOW
    };
}
