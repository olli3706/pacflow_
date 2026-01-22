// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SMSWORKS_JWT',
    'SMSWORKS_SENDER'
];

const missingVars = [];
const placeholderVars = [];

requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
        missingVars.push(varName);
    } else if (value.includes('PASTE_YOUR_') || value.includes('PLACEHOLDER_')) {
        placeholderVars.push(varName);
    }
});

if (missingVars.length > 0 || placeholderVars.length > 0) {
    console.error('\n⚠️  ⚠️  ⚠️  ENVIRONMENT VARIABLE WARNING ⚠️  ⚠️  ⚠️');
    console.error('═══════════════════════════════════════════════════════');
    if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:');
        missingVars.forEach(v => console.error(`   - ${v}`));
    }
    if (placeholderVars.length > 0) {
        console.error('❌ Environment variables still contain placeholders:');
        placeholderVars.forEach(v => console.error(`   - ${v}`));
    }
    console.error('═══════════════════════════════════════════════════════');
    console.error('📝 Please update your .env file with the correct values.');
    console.error('📝 See .env.example for the required variables.\n');
}

// =============================================================================
// SUPABASE CLIENT (SERVER-SIDE WITH SERVICE ROLE KEY)
// =============================================================================

let supabaseAdmin = null;

function getSupabaseAdmin() {
    if (!supabaseAdmin && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        supabaseAdmin = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );
    }
    return supabaseAdmin;
}

// =============================================================================
// EXPRESS APP
// =============================================================================

const app = express();

// =============================================================================
// CORS CONFIGURATION
// =============================================================================

const allowedOrigins = [
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

if (process.env.PRODUCTION_URL) {
    allowedOrigins.push(process.env.PRODUCTION_URL);
}

if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}
allowedOrigins.push(/^https:\/\/.*\.vercel\.app$/);

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) {
            if (process.env.VERCEL || process.env.VERCEL_URL) {
                return callback(null, true);
            }
            if (process.env.NODE_ENV === 'production') {
                return callback(new Error('Origin required'), false);
            }
            return callback(null, true);
        }
        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed instanceof RegExp) {
                return allowed.test(origin);
            }
            return allowed === origin;
        });
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// =============================================================================
// RATE LIMITING
// =============================================================================

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const smsLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: 'SMS rate limit exceeded. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', apiLimiter);

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(express.json({ limit: '10kb' }));

app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
});

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.substring(7);
    try {
        const supabase = getSupabaseAdmin();
        if (!supabase) {
            console.error('Supabase admin client not initialized');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth verification error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
}

async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    const token = authHeader.substring(7);
    try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) req.user = user;
        }
    } catch (error) { /* ignore */ }
    next();
}

// =============================================================================
// API ROUTES
// =============================================================================

app.get('/api/public-config', (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ error: 'Server configuration incomplete' });
    }
    if (supabaseUrl.includes('PLACEHOLDER') || supabaseAnonKey.includes('PLACEHOLDER')) {
        return res.status(500).json({ error: 'Server configuration incomplete' });
    }
    res.json({ supabaseUrl, supabaseAnonKey });
});

app.post('/api/send-sms', smsLimiter, requireAuth, async (req, res) => {
    const { recipient, message } = req.body;
    if (!recipient || !message) {
        return res.status(400).json({ error: 'Missing required fields: recipient and message are required' });
    }
    const phoneRegex = /^(\+44|0044|0)7\d{9}$/;
    const cleanedRecipient = recipient.replace(/\s+/g, '');
    if (!phoneRegex.test(cleanedRecipient)) {
        return res.status(400).json({ error: 'Invalid phone number format. Please use UK mobile format (e.g., 07123456789 or +447123456789)' });
    }
    if (message.length > 1600) {
        return res.status(400).json({ error: 'Message too long. Maximum 1600 characters allowed.' });
    }
    const smsWorksJwt = process.env.SMSWORKS_JWT;
    const smsWorksSender = process.env.SMSWORKS_SENDER || 'PackFlow';
    if (!smsWorksJwt) {
        console.error('SMSWORKS_JWT not configured');
        return res.status(500).json({ error: 'SMS service not configured' });
    }
    try {
        let formattedNumber = cleanedRecipient;
        if (formattedNumber.startsWith('0')) {
            formattedNumber = '44' + formattedNumber.substring(1);
        } else if (formattedNumber.startsWith('+')) {
            formattedNumber = formattedNumber.substring(1);
        }
        const smsResponse = await fetch('https://api.thesmsworks.co.uk/v1/message/send', {
            method: 'POST',
            headers: {
                'Authorization': smsWorksJwt,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender: smsWorksSender,
                destination: formattedNumber,
                content: message,
                schedule: ''
            })
        });
        const smsResult = await smsResponse.json();
        if (!smsResponse.ok) {
            console.error('SMS Works API error:', smsResult);
            return res.status(smsResponse.status).json({ error: smsResult.message || 'Failed to send SMS', details: smsResult.errors || null });
        }
        console.log(`SMS sent by user ${req.user.id} to ${formattedNumber.substring(0, 5)}***`);
        res.json({ success: true, messageId: smsResult.messageid, status: smsResult.status, credits: smsResult.credits });
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ error: 'Failed to send SMS. Please try again later.' });
    }
});

// =============================================================================
// PAYMENT API ROUTES
// =============================================================================

function convertPaymentToCamelCase(payment) {
    if (!payment) return null;
    return {
        id: payment.id,
        userId: payment.user_id,
        projectName: payment.project_name || null,
        clientName: payment.client_name || '',
        clientEmail: payment.client_email || null,
        clientPhone: payment.client_phone || null,
        workPeriodStart: payment.work_period_start || null,
        workPeriodEnd: payment.work_period_end || null,
        hoursWorked: payment.hours_worked || 0,
        rate: payment.rate || 0,
        additionalFees: payment.additional_fees || 0,
        subtotal: payment.subtotal || 0,
        total: payment.total || 0,
        status: payment.status || 'pending',
        createdAt: payment.created_at || null,
        acceptedAt: payment.accepted_at || null,
        updatedAt: payment.updated_at || null
    };
}

app.get('/api/payments', requireAuth, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching payments:', error);
            return res.status(500).json({ error: 'Failed to fetch payments' });
        }
        const convertedPayments = (data || []).map(convertPaymentToCamelCase).filter(p => p !== null);
        res.json({ payments: convertedPayments });
    } catch (error) {
        console.error('Error in GET /api/payments:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/payments', requireAuth, async (req, res) => {
    try {
        const {
            projectName,
            clientName,
            clientEmail,
            clientPhone,
            workPeriodStart,
            workPeriodEnd,
            hoursWorked,
            rate,
            additionalFees,
            subtotal,
            total
        } = req.body;
        if (!clientName || !total) {
            return res.status(400).json({ error: 'Client name and total are required' });
        }
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('payments')
            .insert({
                user_id: req.user.id,
                project_name: projectName || null,
                client_name: clientName,
                client_email: clientEmail || null,
                client_phone: clientPhone || null,
                work_period_start: workPeriodStart || null,
                work_period_end: workPeriodEnd || null,
                hours_worked: hoursWorked || 0,
                rate: rate || 0,
                additional_fees: additionalFees || 0,
                subtotal: subtotal || 0,
                total: total,
                status: 'pending'
            })
            .select()
            .single();
        if (error) {
            console.error('Error creating payment:', error);
            return res.status(500).json({ error: 'Failed to create payment' });
        }
        res.status(201).json({ payment: convertPaymentToCamelCase(data) });
    } catch (error) {
        console.error('Error in POST /api/payments:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/payments/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['pending', 'accepted', 'rejected', 'paid'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const supabase = getSupabaseAdmin();
        const { data: existing, error: fetchError } = await supabase
            .from('payments')
            .select('id')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();
        if (fetchError || !existing) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        const updateData = { status };
        if (status === 'accepted') {
            updateData.accepted_at = new Date().toISOString();
        }
        const { data, error } = await supabase
            .from('payments')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('Error updating payment:', error);
            return res.status(500).json({ error: 'Failed to update payment' });
        }
        res.json({ payment: convertPaymentToCamelCase(data) });
    } catch (error) {
        console.error('Error in PUT /api/payments/:id:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/payments/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseAdmin();
        const { error } = await supabase
            .from('payments')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);
        if (error) {
            console.error('Error deleting payment:', error);
            return res.status(500).json({ error: 'Failed to delete payment' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error in DELETE /api/payments/:id:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// =============================================================================
// BANK DETAILS API ROUTES
// =============================================================================

app.get('/api/bank-details', requireAuth, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('user_bank_details')
            .select('*')
            .eq('user_id', req.user.id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.json({ bankDetails: null });
            }
            console.error('Error fetching bank details:', error);
            return res.status(500).json({ error: 'Failed to fetch bank details' });
        }
        res.json({ bankDetails: data });
    } catch (error) {
        console.error('Error in GET /api/bank-details:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/bank-details', requireAuth, async (req, res) => {
    try {
        const { accountName, accountNumber, sortCode } = req.body;
        if (!accountName || !accountNumber || !sortCode) {
            return res.status(400).json({ error: 'Account name, account number, and sort code are required' });
        }
        if (accountName.trim().length === 0 || accountName.length > 100) {
            return res.status(400).json({ error: 'Account name must be between 1 and 100 characters' });
        }
        const cleanedAccountNumber = accountNumber.replace(/\s+/g, '');
        if (!/^\d{8}$/.test(cleanedAccountNumber)) {
            return res.status(400).json({ error: 'Account number must be exactly 8 digits' });
        }
        const cleanedSortCode = sortCode.replace(/[-\s]/g, '');
        if (!/^\d{6}$/.test(cleanedSortCode)) {
            return res.status(400).json({ error: 'Sort code must be exactly 6 digits (format: XX-XX-XX or XXXXXX)' });
        }
        const supabase = getSupabaseAdmin();
        const { data: existing } = await supabase
            .from('user_bank_details')
            .select('id')
            .eq('user_id', req.user.id)
            .single();
        const bankDetailsData = {
            user_id: req.user.id,
            account_name: accountName.trim(),
            account_number: cleanedAccountNumber,
            sort_code: cleanedSortCode
        };
        let data, error;
        if (existing) {
            const { data: updated, error: updateError } = await supabase
                .from('user_bank_details')
                .update(bankDetailsData)
                .eq('user_id', req.user.id)
                .select()
                .single();
            data = updated;
            error = updateError;
        } else {
            const { data: inserted, error: insertError } = await supabase
                .from('user_bank_details')
                .insert(bankDetailsData)
                .select()
                .single();
            data = inserted;
            error = insertError;
        }
        if (error) {
            console.error('Error saving bank details:', error);
            return res.status(500).json({ error: 'Failed to save bank details' });
        }
        res.json({ bankDetails: data });
    } catch (error) {
        console.error('Error in POST /api/bank-details:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// =============================================================================
// STATIC FILE SERVING
// =============================================================================

app.use(express.static(path.join(__dirname, 'public'), {
    index: 'index.html',
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath);
        const mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2'
        };
        if (mimeTypes[ext]) {
            res.setHeader('Content-Type', mimeTypes[ext]);
        }
    }
}));

// =============================================================================
// SPA CATCH-ALL (Vercel-safe: regex, not '*')
// =============================================================================

app.get(/^(?:\/.*)?$/, (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }
    if (req.path.includes('.')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =============================================================================
// 404 HANDLER FOR API ROUTES
// =============================================================================

app.use(/^\/api\/.+/, (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// =============================================================================
// GLOBAL ERROR HANDLER
// =============================================================================

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS policy violation' });
    }
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
    }
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
    });
});

// =============================================================================
// EXPORT APP (for Vercel serverless + local server.js)
// =============================================================================

module.exports = app;
