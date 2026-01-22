// Settings Page - Bank Details Management
// Handles loading, displaying, and saving bank details

/**
 * Get the current auth token for API requests
 * @returns {Promise<string|null>} The JWT token or null if not authenticated
 */
async function getSettingsAuthToken() {
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
async function settingsApiRequest(endpoint, options = {}) {
    const token = await getSettingsAuthToken();
    
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
 * Get bank details from the API
 */
async function getBankDetails() {
    try {
        const data = await settingsApiRequest('/api/bank-details');
        return data.bankDetails;
    } catch (error) {
        console.error('Error fetching bank details:', error);
        return null;
    }
}

/**
 * Save bank details via the API
 */
async function saveBankDetails(bankDetails) {
    try {
        const data = await settingsApiRequest('/api/bank-details', {
            method: 'POST',
            body: JSON.stringify({
                accountName: bankDetails.accountName,
                accountNumber: bankDetails.accountNumber,
                sortCode: bankDetails.sortCode
            })
        });
        return { success: true, bankDetails: data.bankDetails };
    } catch (error) {
        console.error('Error saving bank details:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Format sort code for display (XX-XX-XX)
 */
function formatSortCode(sortCode) {
    if (!sortCode) return '';
    // Remove any existing dashes or spaces
    const cleaned = sortCode.replace(/[-\s]/g, '');
    // Add dashes if it's 6 digits
    if (cleaned.length === 6 && /^\d{6}$/.test(cleaned)) {
        return cleaned.substring(0, 2) + '-' + cleaned.substring(2, 4) + '-' + cleaned.substring(4, 6);
    }
    return sortCode;
}

/**
 * Clear all error messages
 */
function clearErrors() {
    document.querySelectorAll('#bankDetailsForm .error-message').forEach(el => {
        el.textContent = '';
    });
    document.querySelectorAll('#bankDetailsForm .settings-input').forEach(el => {
        el.classList.remove('error');
    });
}

/**
 * Show error message for a field
 */
function showError(fieldId, message) {
    const errorEl = document.getElementById(fieldId + '-error');
    const inputEl = document.getElementById(fieldId);
    if (errorEl) {
        errorEl.textContent = message;
    }
    if (inputEl) {
        inputEl.classList.add('error');
    }
}

/**
 * Show status message
 */
function showStatus(message, isError = false) {
    const statusEl = document.getElementById('bankDetailsStatus');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = isError ? 'settings-status error' : 'settings-status success';
        statusEl.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}

/**
 * Validate bank details form
 */
function validateBankDetailsForm() {
    clearErrors();
    let isValid = true;

    const accountName = document.getElementById('bankAccountName').value.trim();
    const accountNumber = document.getElementById('bankAccountNumber').value.trim();
    const sortCode = document.getElementById('bankSortCode').value.trim();

    // Validate account name
    if (!accountName || accountName.length === 0) {
        showError('bankAccountName', 'Account name is required');
        isValid = false;
    } else if (accountName.length > 100) {
        showError('bankAccountName', 'Account name must be 100 characters or less');
        isValid = false;
    }

    // Validate account number (exactly 8 digits)
    const cleanedAccountNumber = accountNumber.replace(/\s+/g, '');
    if (!cleanedAccountNumber || cleanedAccountNumber.length === 0) {
        showError('bankAccountNumber', 'Account number is required');
        isValid = false;
    } else if (!/^\d{8}$/.test(cleanedAccountNumber)) {
        showError('bankAccountNumber', 'Account number must be exactly 8 digits');
        isValid = false;
    }

    // Validate sort code (exactly 6 digits, can be formatted as XX-XX-XX)
    const cleanedSortCode = sortCode.replace(/[-\s]/g, '');
    if (!cleanedSortCode || cleanedSortCode.length === 0) {
        showError('bankSortCode', 'Sort code is required');
        isValid = false;
    } else if (!/^\d{6}$/.test(cleanedSortCode)) {
        showError('bankSortCode', 'Sort code must be exactly 6 digits (format: XX-XX-XX)');
        isValid = false;
    }

    return isValid;
}

/**
 * Load and display bank details
 */
async function loadSettingsPage() {
    const accountNameInput = document.getElementById('bankAccountName');
    const accountNumberInput = document.getElementById('bankAccountNumber');
    const sortCodeInput = document.getElementById('bankSortCode');
    
    if (!accountNameInput || !accountNumberInput || !sortCodeInput) {
        return; // Settings page not loaded yet
    }

    try {
        const bankDetails = await getBankDetails();
        
        if (bankDetails) {
            // Populate form with existing bank details
            accountNameInput.value = bankDetails.account_name || '';
            accountNumberInput.value = bankDetails.account_number || '';
            sortCodeInput.value = formatSortCode(bankDetails.sort_code) || '';
        } else {
            // Clear form if no bank details found
            accountNameInput.value = '';
            accountNumberInput.value = '';
            sortCodeInput.value = '';
        }
    } catch (error) {
        console.error('Error loading bank details:', error);
        showStatus('Error loading bank details. Please try again.', true);
    }
}

/**
 * Handle form submission
 */
async function handleSaveBankDetails(e) {
    if (e) {
        e.preventDefault();
    }

    if (!validateBankDetailsForm()) {
        return;
    }

    const accountName = document.getElementById('bankAccountName').value.trim();
    const accountNumber = document.getElementById('bankAccountNumber').value.trim();
    const sortCode = document.getElementById('bankSortCode').value.trim();

    // Format sort code (remove dashes for storage)
    const cleanedSortCode = sortCode.replace(/[-\s]/g, '');

    const result = await saveBankDetails({
        accountName: accountName,
        accountNumber: accountNumber,
        sortCode: cleanedSortCode
    });

    if (result.success) {
        showStatus('Bank details saved successfully!');
        // Reload to ensure we have the latest data
        await loadSettingsPage();
    } else {
        showStatus('Error saving bank details: ' + (result.error || 'Unknown error'), true);
    }
}

/**
 * Auto-format sort code as user types
 */
function setupSortCodeFormatting() {
    const sortCodeInput = document.getElementById('bankSortCode');
    if (sortCodeInput) {
        sortCodeInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, ''); // Remove non-digits
            
            // Limit to 6 digits
            if (value.length > 6) {
                value = value.substring(0, 6);
            }
            
            // Format as XX-XX-XX
            if (value.length > 4) {
                value = value.substring(0, 2) + '-' + value.substring(2, 4) + '-' + value.substring(4);
            } else if (value.length > 2) {
                value = value.substring(0, 2) + '-' + value.substring(2);
            }
            
            e.target.value = value;
        });
    }
}

/**
 * Auto-format account number (digits only, max 8)
 */
function setupAccountNumberFormatting() {
    const accountNumberInput = document.getElementById('bankAccountNumber');
    if (accountNumberInput) {
        accountNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, ''); // Remove non-digits
            // Limit to 8 digits
            if (value.length > 8) {
                value = value.substring(0, 8);
            }
            e.target.value = value;
        });
    }
}

// Initialize settings page when it becomes active
let settingsPageInitialized = false;
document.addEventListener('DOMContentLoaded', () => {
    // Watch for navigation to settings page
    const settingsPage = document.getElementById('settings-page');
    if (settingsPage) {
        const observer = new MutationObserver((mutations) => {
            if (settingsPage.classList.contains('active') && !settingsPageInitialized) {
                loadSettingsPage();
                settingsPageInitialized = true;
            } else if (settingsPage.classList.contains('active')) {
                loadSettingsPage();
            }
        });
        
        observer.observe(settingsPage, { attributes: true, attributeFilter: ['class'] });
    }

    // Set up form submission handler
    const bankDetailsForm = document.getElementById('bankDetailsForm');
    if (bankDetailsForm) {
        bankDetailsForm.addEventListener('submit', handleSaveBankDetails);
    }

    // Set up input formatting
    setupSortCodeFormatting();
    setupAccountNumberFormatting();
});
