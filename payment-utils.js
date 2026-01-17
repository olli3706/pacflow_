// Payment utility functions for localStorage operations
const PAYMENT_STORAGE_KEY = 'packflow_payments';

// Generate unique ID
function generatePaymentId() {
    return 'payment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Get all payments from localStorage
function getPayments() {
    try {
        const stored = localStorage.getItem(PAYMENT_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error reading payments from localStorage:', error);
        return [];
    }
}

// Save payment to localStorage
function savePayment(payment) {
    try {
        const payments = getPayments();
        payments.push(payment);
        localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(payments));
        return true;
    } catch (error) {
        console.error('Error saving payment to localStorage:', error);
        return false;
    }
}

// Update payment status in localStorage
function updatePaymentStatus(paymentId, status) {
    try {
        const payments = getPayments();
        const paymentIndex = payments.findIndex(p => p.id === paymentId);
        
        if (paymentIndex === -1) {
            return false;
        }
        
        payments[paymentIndex].status = status;
        
        if (status === 'accepted') {
            payments[paymentIndex].acceptedAt = new Date().toISOString();
        }
        
        localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(payments));
        return true;
    } catch (error) {
        console.error('Error updating payment status:', error);
        return false;
    }
}

// Get payments by status
function getPaymentsByStatus(status) {
    const payments = getPayments();
    return payments.filter(p => p.status === status);
}

// Get accepted payments only
function getAcceptedPayments() {
    return getPaymentsByStatus('accepted');
}

// Create a payment record from SOW state
function createPaymentFromSOW(sowState) {
    const subtotal = sowState.hoursWorked * sowState.rate;
    const total = subtotal + sowState.additionalFees;
    
    return {
        id: generatePaymentId(),
        sowId: 'sow_' + Date.now(),
        projectName: sowState.projectName || '',
        clientName: sowState.clientName || '',
        clientEmail: sowState.clientEmail || '',
        workPeriodStart: sowState.startDate || null,
        workPeriodEnd: sowState.endDate || null,
        hoursWorked: sowState.hoursWorked || 0,
        rate: sowState.rate || 0,
        additionalFees: sowState.additionalFees || 0,
        subtotal: subtotal,
        total: total,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
}

// Export for use in other modules (if using modules, otherwise it's global)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getPayments,
        savePayment,
        updatePaymentStatus,
        getPaymentsByStatus,
        getAcceptedPayments,
        createPaymentFromSOW
    };
}
