// Payments Page - Display and manage payment requests
async function loadPaymentsPage() {
    // #region agent log
    console.log('[DEBUG] loadPaymentsPage called, getPayments type:', typeof getPayments);
    // #endregion
    const paymentsList = document.getElementById('payments-list');
    if (!paymentsList) {
        console.error('[DEBUG] payments-list element not found');
        return;
    }

    try {
        if (typeof getPayments !== 'function') {
            throw new Error('getPayments function is not available');
        }

        const payments = await getPayments();
        // #region agent log
        console.log('[DEBUG] payments:', {type: typeof payments, isArray: Array.isArray(payments), length: payments?.length, value: payments});
        // #endregion
        
        if (!payments || !Array.isArray(payments)) {
            console.error('[DEBUG] payments is not an array:', payments);
            paymentsList.innerHTML = '<p class="empty-state error">Error: Invalid payment data received.</p>';
            return;
        }
        
        if (payments.length === 0) {
            paymentsList.innerHTML = '<p class="empty-state">No payment requests yet. Create a payment request from the Create Statement of Work page.</p>';
            return;
        }

    // Sort by creation date (newest first)
    const sortedPayments = [...payments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    paymentsList.innerHTML = sortedPayments.map(payment => {
        const statusClass = `payment-status-${payment.status}`;
        const statusBadge = payment.status.charAt(0).toUpperCase() + payment.status.slice(1);
        const createdDate = new Date(payment.createdAt).toLocaleDateString();
        const acceptedDate = payment.acceptedAt ? new Date(payment.acceptedAt).toLocaleDateString() : 'N/A';
        const paidDate = payment.status === 'paid' && payment.updatedAt ? new Date(payment.updatedAt).toLocaleDateString() : null;

        return `
            <div class="payment-card ${statusClass}">
                <div class="payment-header">
                    <div class="payment-info">
                        <h4 class="payment-project">${payment.projectName || 'Untitled Project'}</h4>
                        <p class="payment-client">${payment.clientName} (${payment.clientEmail})</p>
                    </div>
                    <div class="payment-status-badge ${statusClass}">${statusBadge}</div>
                </div>
                <div class="payment-details">
                    <div class="payment-detail-item">
                        <span class="detail-label">Hours Worked:</span>
                        <span class="detail-value">${payment.hoursWorked}</span>
                    </div>
                    <div class="payment-detail-item">
                        <span class="detail-label">Rate:</span>
                        <span class="detail-value">$${payment.rate.toFixed(2)}/hr</span>
                    </div>
                    <div class="payment-detail-item">
                        <span class="detail-label">Additional Fees:</span>
                        <span class="detail-value">$${payment.additionalFees.toFixed(2)}</span>
                    </div>
                    <div class="payment-detail-item payment-total">
                        <span class="detail-label">Total:</span>
                        <span class="detail-value">$${payment.total.toFixed(2)}</span>
                    </div>
                    <div class="payment-detail-item">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${createdDate}</span>
                    </div>
                    ${payment.acceptedAt ? `
                    <div class="payment-detail-item">
                        <span class="detail-label">Accepted:</span>
                        <span class="detail-value">${acceptedDate}</span>
                    </div>
                    ` : ''}
                    ${paidDate ? `
                    <div class="payment-detail-item">
                        <span class="detail-label">Paid:</span>
                        <span class="detail-value">${paidDate}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="payment-actions">
                    ${payment.status === 'pending' ? `
                        <button class="payment-action-btn accept-btn" onclick="acceptPayment('${payment.id}')">Confirm Paid</button>
                        ${payment.clientPhone ? `<button class="payment-action-btn sms-btn" onclick="resendPaymentSMS('${payment.id}', this)">Resend SMS</button>` : ''}
                        <button class="payment-action-btn reject-btn" onclick="rejectPayment('${payment.id}')">Reject</button>
                    ` : ''}
                    ${payment.status === 'rejected' ? `
                        <button class="payment-action-btn accept-btn" onclick="acceptPayment('${payment.id}')">Confirm Paid</button>
                        ${payment.clientPhone ? `<button class="payment-action-btn sms-btn" onclick="resendPaymentSMS('${payment.id}', this)">Resend SMS</button>` : ''}
                    ` : ''}
                    ${payment.status === 'accepted' ? `
                        <button class="payment-action-btn paid-btn" onclick="markPaymentAsPaid('${payment.id}')">Mark as Paid</button>
                        ${payment.clientPhone ? `<button class="payment-action-btn sms-btn" onclick="resendPaymentSMS('${payment.id}', this)">Resend SMS</button>` : ''}
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    } catch (error) {
        console.error('[DEBUG] Error loading payments page:', error);
        paymentsList.innerHTML = `<p class="empty-state error">Error loading payments: ${error.message}. Check the browser console for details.</p>`;
    }
}

async function acceptPayment(paymentId) {
    if (!confirm('Confirm that the client has paid? This will add the payment to your metrics.')) {
        return;
    }
    const result = await updatePaymentStatus(paymentId, 'accepted');
    if (result && result.success) {
        await loadPaymentsPage();
        if (document.getElementById('metrics-page')?.classList.contains('active')) {
            await loadMetricsPage();
        }
    } else {
        alert('Error updating payment status: ' + (result?.error || 'Unknown error'));
    }
}

async function rejectPayment(paymentId) {
    const result = await updatePaymentStatus(paymentId, 'rejected');
    if (result && result.success) {
        await loadPaymentsPage();
        if (document.getElementById('metrics-page')?.classList.contains('active')) {
            await loadMetricsPage();
        }
    } else {
        alert('Error updating payment status: ' + (result?.error || 'Unknown error'));
    }
}

async function markPaymentAsPaid(paymentId) {
    if (!confirm('Mark this payment as paid (money received)?')) {
        return;
    }
    const result = await updatePaymentStatus(paymentId, 'paid');
    if (result && result.success) {
        await loadPaymentsPage();
        if (document.getElementById('metrics-page')?.classList.contains('active')) {
            await loadMetricsPage();
        }
    } else {
        alert('Error updating payment status: ' + (result?.error || 'Unknown error'));
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

async function resendPaymentSMS(paymentId, buttonElement) {
    try {
        // Get all payments to find the one we need
        const payments = await getPayments();
        const payment = payments.find(p => p.id === paymentId);
        
        if (!payment) {
            alert('Payment not found');
            return;
        }
        
        if (!payment.clientPhone || !payment.clientPhone.trim()) {
            alert('No phone number available for this payment');
            return;
        }
        
        // Fetch bank details to include in SMS
        let bankDetails = null;
        try {
            bankDetails = await getBankDetails();
        } catch (error) {
            console.warn('Could not fetch bank details:', error);
        }
        
        // Build SMS message with bank details if available
        let smsMessage = `Hi ${payment.clientName}, you have a payment request from PackFlow for $${payment.total.toFixed(2)} for "${payment.projectName || 'your project'}".`;
        
        if (bankDetails) {
            const formattedSortCode = formatSortCode(bankDetails.sort_code);
            smsMessage += ` Please pay to: ${bankDetails.account_name}, Sort Code: ${formattedSortCode}, Account: ${bankDetails.account_number}.`;
        }
        
        smsMessage += ' Please review and approve.';
        
        // Show loading state
        if (buttonElement) {
            const originalText = buttonElement.textContent;
            buttonElement.disabled = true;
            buttonElement.textContent = 'Sending...';
            
            try {
                const smsResult = await sendSMS(payment.clientPhone, smsMessage);
                
                if (smsResult.success) {
                    alert(`SMS sent successfully to ${payment.clientPhone}${!bankDetails ? '\n\nNote: Bank details not found in settings. Please add them to include payment information in SMS.' : ''}`);
                } else {
                    alert('Failed to send SMS: ' + (smsResult.error || 'Unknown error'));
                }
            } finally {
                buttonElement.disabled = false;
                buttonElement.textContent = originalText;
            }
        } else {
            // Fallback if button reference not available
            const smsResult = await sendSMS(payment.clientPhone, smsMessage);
            
            if (smsResult.success) {
                alert(`SMS sent successfully to ${payment.clientPhone}${!bankDetails ? '\n\nNote: Bank details not found in settings. Please add them to include payment information in SMS.' : ''}`);
            } else {
                alert('Failed to send SMS: ' + (smsResult.error || 'Unknown error'));
            }
        }
    } catch (error) {
        console.error('Error resending SMS:', error);
        alert('Error resending SMS: ' + error.message);
        // Re-enable button if it was disabled
        if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.textContent = 'Resend SMS';
        }
    }
}

// Initialize payments page when it becomes active
let paymentsPageInitialized = false;
document.addEventListener('DOMContentLoaded', () => {
    // Watch for navigation to payments page
    const paymentsPage = document.getElementById('payments-page');
    const observer = new MutationObserver((mutations) => {
        if (paymentsPage.classList.contains('active') && !paymentsPageInitialized) {
            loadPaymentsPage();
            paymentsPageInitialized = true;
        } else if (paymentsPage.classList.contains('active')) {
            loadPaymentsPage();
        }
    });
    
    observer.observe(paymentsPage, { attributes: true, attributeFilter: ['class'] });
});
