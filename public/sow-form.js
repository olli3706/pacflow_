// Statement of Work Form - Controlled inputs with vanilla JS state management
document.addEventListener('DOMContentLoaded', () => {
    // Initial state with defaults
    let sowState = {
        projectName: 'electrical work',
        clientName: 'nathan hanson',
        clientEmail: 'billing@acme.com',
        clientPhone: '',
        startDate: '2026-01-17',
        endDate: '2026-01-29',
        rate: 30,
        maxHours: 400,
        scopeOfWork: 'redoing lighting in the kitchen',
        deliverables: '- make the kitchen parallel lighting',
        hoursWorked: 0,
        additionalFees: 0,
        workDescription: ''
    };

    // Get all input elements
    const inputs = {
        projectName: document.getElementById('projectName'),
        clientName: document.getElementById('clientName'),
        clientEmail: document.getElementById('clientEmail'),
        clientPhone: document.getElementById('clientPhone'),
        startDate: document.getElementById('startDate'),
        endDate: document.getElementById('endDate'),
        rate: document.getElementById('rate'),
        maxHours: document.getElementById('maxHours'),
        scopeOfWork: document.getElementById('scopeOfWork'),
        deliverables: document.getElementById('deliverables'),
        hoursWorked: document.getElementById('hoursWorked'),
        additionalFees: document.getElementById('additionalFees'),
        workDescription: document.getElementById('workDescription')
    };

    // Initialize input values from state
    function initializeInputs() {
        inputs.projectName.value = sowState.projectName;
        inputs.clientName.value = sowState.clientName;
        inputs.clientEmail.value = sowState.clientEmail;
        inputs.clientPhone.value = sowState.clientPhone;
        inputs.startDate.value = sowState.startDate;
        inputs.endDate.value = sowState.endDate;
        inputs.rate.value = sowState.rate;
        inputs.maxHours.value = sowState.maxHours;
        inputs.scopeOfWork.value = sowState.scopeOfWork;
        inputs.deliverables.value = sowState.deliverables;
        inputs.hoursWorked.value = sowState.hoursWorked;
        inputs.additionalFees.value = sowState.additionalFees;
        inputs.workDescription.value = sowState.workDescription;
    }

    // Update state from input value
    function updateState(field, value) {
        // Convert number fields
        if (['rate', 'maxHours', 'hoursWorked', 'additionalFees'].includes(field)) {
            sowState[field] = parseFloat(value) || 0;
        } else {
            sowState[field] = value;
        }
        
        // Update calculated summary
        updateSummary();
    }

    // Calculate and update summary values
    function updateSummary() {
        const hoursRateTotal = sowState.hoursWorked * sowState.rate;
        const subtotal = hoursRateTotal;
        const fees = sowState.additionalFees;
        const total = subtotal + fees;

        document.getElementById('hoursRateTotal').textContent = `$${hoursRateTotal.toFixed(2)}`;
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('feesDisplay').textContent = `$${fees.toFixed(2)}`;
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;
    }

    // Clear all error messages
    function clearErrors() {
        document.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
        });
        document.querySelectorAll('.sow-input').forEach(el => {
            el.classList.remove('error');
        });
    }

    // Show error message for a field
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

    // Validate form
    function validateForm() {
        clearErrors();
        let isValid = true;

        if (!sowState.projectName || sowState.projectName.trim() === '') {
            showError('projectName', 'Project Name is required');
            isValid = false;
        }

        if (!sowState.clientName || sowState.clientName.trim() === '') {
            showError('clientName', 'Client Name is required');
            isValid = false;
        }

        if (!sowState.clientEmail || sowState.clientEmail.trim() === '') {
            showError('clientEmail', 'Client Email is required');
            isValid = false;
        } else {
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sowState.clientEmail)) {
                showError('clientEmail', 'Please enter a valid email address');
                isValid = false;
            }
        }

        return isValid;
    }

    // Save SOW (placeholder)
    function saveSOW() {
        if (validateForm()) {
            console.log('Statement of Work saved:', sowState);
            alert('Statement of Work saved (placeholder)');
        }
    }

    // Set up event listeners for all inputs (controlled inputs)
    Object.keys(inputs).forEach(field => {
        const input = inputs[field];
        if (input) {
            input.addEventListener('input', (e) => {
                updateState(field, e.target.value);
            });
            input.addEventListener('change', (e) => {
                updateState(field, e.target.value);
            });
        }
    });

    // Create Payment Request and send SMS notification
    async function createPaymentRequest() {
        if (!validateForm()) {
            return;
        }
        
        const payment = createPaymentFromSOW(sowState);
        const result = await savePayment(payment);
        
        if (!result.success) {
            alert('Error creating payment request: ' + (result.error || 'Unknown error'));
            return;
        }
        
        // Payment created successfully
        let message = 'Payment request created successfully!';
        
        // Send SMS if client phone is provided
        if (sowState.clientPhone && sowState.clientPhone.trim()) {
            const smsMessage = `Hi ${sowState.clientName}, you have a new payment request from PackFlow for $${payment.total.toFixed(2)} for "${sowState.projectName}". Please review and approve.`;
            
            try {
                const smsResult = await sendSMS(sowState.clientPhone, smsMessage);
                
                if (smsResult.success) {
                    message += '\n\nSMS notification sent to ' + sowState.clientPhone;
                } else {
                    message += '\n\nNote: SMS notification failed - ' + (smsResult.error || 'Unknown error');
                    console.warn('SMS send failed:', smsResult.error);
                }
            } catch (smsError) {
                message += '\n\nNote: SMS notification failed - ' + smsError.message;
                console.error('SMS error:', smsError);
            }
        } else {
            message += '\n\nNo phone number provided - SMS notification not sent.';
        }
        
        alert(message);
    }

    // Set up save button
    const saveBtn = document.getElementById('saveSowBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSOW);
    }

    // Set up create payment request button
    const createPaymentBtn = document.getElementById('createPaymentRequestBtn');
    if (createPaymentBtn) {
        createPaymentBtn.addEventListener('click', createPaymentRequest);
    }

    // Initialize form with default values
    initializeInputs();
    
    // Calculate initial summary
    updateSummary();
});
