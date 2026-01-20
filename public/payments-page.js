// Payments Page - Display and manage payment requests
async function loadPaymentsPage() {
    // #region agent log
    console.log('[DEBUG] loadPaymentsPage called, getPayments type:', typeof getPayments);
    // #endregion
    const paymentsList = document.getElementById('payments-list');
    if (!paymentsList) return;

    const payments = await getPayments();
    // #region agent log
    console.log('[DEBUG] payments:', {type: typeof payments, isArray: Array.isArray(payments), length: payments?.length, value: payments});
    // #endregion
    
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
                </div>
                <div class="payment-actions">
                    ${payment.status === 'pending' ? `
                        <button class="payment-action-btn accept-btn" onclick="acceptPayment('${payment.id}')">Mark as Accepted</button>
                        <button class="payment-action-btn reject-btn" onclick="rejectPayment('${payment.id}')">Mark as Rejected</button>
                    ` : ''}
                    ${payment.status === 'rejected' ? `
                        <button class="payment-action-btn accept-btn" onclick="acceptPayment('${payment.id}')">Mark as Accepted</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function acceptPayment(paymentId) {
    const result = await updatePaymentStatus(paymentId, 'accepted');
    if (result && result.success) {
        await loadPaymentsPage();
        // If metrics page is active, reload it too
        if (document.getElementById('metrics-page').classList.contains('active')) {
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
        // If metrics page is active, reload it too
        if (document.getElementById('metrics-page').classList.contains('active')) {
            await loadMetricsPage();
        }
    } else {
        alert('Error updating payment status: ' + (result?.error || 'Unknown error'));
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
