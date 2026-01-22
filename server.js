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
// EXPRESS APP SETUP
// =============================================================================

const PORT = process.env.PORT || 3002;
const app = express();

// =============================================================================
// CORS CONFIGURATION
// =============================================================================

// Define allowed origins
const allowedOrigins = [
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

// Add production domain if configured
if (process.env.PRODUCTION_URL) {
    allowedOrigins.push(process.env.PRODUCTION_URL);
}

// Add Vercel domains (for deployment)
if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}
// Also allow any *.vercel.app subdomain
allowedOrigins.push(/^https:\/\/.*\.vercel\.app$/);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, Postman in dev)
        if (!origin) {
            // In production on Vercel, allow requests without origin (serverless functions)
            if (process.env.VERCEL || process.env.VERCEL_URL) {
                return callback(null, true);
            }
            // In production, you might want to reject requests without origin
            if (process.env.NODE_ENV === 'production') {
                return callback(new Error('Origin required'), false);
            }
            return callback(null, true);
        }
        
        // Check if origin matches any allowed origin (including regex patterns)
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

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Stricter rate limiter for SMS (expensive operations)
const smsLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 SMS requests per hour
    message: { error: 'SMS rate limit exceeded. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Auth rate limiter (prevent brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 auth attempts per 15 minutes
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Parse JSON with size limit
app.use(express.json({ limit: '10kb' }));

// Request logging (redacted for security)
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
});

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Middleware to verify Supabase JWT token
 * Protects routes that require authentication
 */
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
        const supabase = getSupabaseAdmin();
        if (!supabase) {
            console.error('Supabase admin client not initialized');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        
        // Verify the JWT token
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        // Attach user to request for use in route handlers
        req.user = user;
        next();
        
    } catch (error) {
        console.error('Auth verification error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
}

/**
 * Optional auth middleware - doesn't fail if no token, but attaches user if valid
 */
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
            if (user) {
                req.user = user;
            }
        }
    } catch (error) {
        // Ignore errors for optional auth
    }
    
    next();
}

// =============================================================================
// API ROUTES
// =============================================================================

// Public config endpoint - returns only safe-to-expose Supabase config
app.get('/api/public-config', (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ 
            error: 'Server configuration incomplete' 
        });
    }

    if (supabaseUrl.includes('PLACEHOLDER') || supabaseAnonKey.includes('PLACEHOLDER')) {
        return res.status(500).json({ 
            error: 'Server configuration incomplete' 
        });
    }

    res.json({
        supabaseUrl: supabaseUrl,
        supabaseAnonKey: supabaseAnonKey
    });
});

// SMS sending endpoint - PROTECTED with authentication and rate limiting
app.post('/api/send-sms', smsLimiter, requireAuth, async (req, res) => {
    const { recipient, message } = req.body;

    // Validate required fields
    if (!recipient || !message) {
        return res.status(400).json({ 
            error: 'Missing required fields: recipient and message are required' 
        });
    }

    // Validate phone number format (UK format: starts with 07 or +44)
    const phoneRegex = /^(\+44|0044|0)7\d{9}$/;
    const cleanedRecipient = recipient.replace(/\s+/g, '');
    
    if (!phoneRegex.test(cleanedRecipient)) {
        return res.status(400).json({ 
            error: 'Invalid phone number format. Please use UK mobile format (e.g., 07123456789 or +447123456789)' 
        });
    }

    // Validate message length
    if (message.length > 1600) {
        return res.status(400).json({ 
            error: 'Message too long. Maximum 1600 characters allowed.' 
        });
    }

    const smsWorksJwt = process.env.SMSWORKS_JWT;
    const smsWorksSender = process.env.SMSWORKS_SENDER || 'PackFlow';

    if (!smsWorksJwt) {
        console.error('SMSWORKS_JWT not configured');
        return res.status(500).json({ 
            error: 'SMS service not configured' 
        });
    }

    try {
        // Format phone number for SMS Works API
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
            return res.status(smsResponse.status).json({ 
                error: smsResult.message || 'Failed to send SMS',
                details: smsResult.errors || null
            });
        }

        // Log SMS sent (for audit purposes)
        console.log(`SMS sent by user ${req.user.id} to ${formattedNumber.substring(0, 5)}***`);

        res.json({ 
            success: true, 
            messageId: smsResult.messageid,
            status: smsResult.status,
            credits: smsResult.credits
        });

    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ 
            error: 'Failed to send SMS. Please try again later.' 
        });
    }
});

// =============================================================================
// PAYMENT API ROUTES (Supabase Database)
// =============================================================================

// Helper function to convert payment object from snake_case to camelCase
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

// Get all payments for the authenticated user
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
        
        console.log('[DEBUG] Raw payments from Supabase:', JSON.stringify(data, null, 2));
        
        // Convert snake_case to camelCase
        const convertedPayments = (data || []).map(convertPaymentToCamelCase).filter(p => p !== null);
        console.log('[DEBUG] Converted payments:', JSON.stringify(convertedPayments, null, 2));
        
        res.json({ payments: convertedPayments });
        
    } catch (error) {
        console.error('Error in GET /api/payments:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create a new payment
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
        
        // Validate required fields
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
        
        // Convert snake_case to camelCase
        const convertedPayment = convertPaymentToCamelCase(data);
        res.status(201).json({ payment: convertedPayment });
        
    } catch (error) {
        console.error('Error in POST /api/payments:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update payment status
app.put('/api/payments/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['pending', 'accepted', 'rejected', 'paid'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const supabase = getSupabaseAdmin();
        
        // First verify the payment belongs to this user
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
        
        // Convert snake_case to camelCase
        const convertedPayment = convertPaymentToCamelCase(data);
        res.json({ payment: convertedPayment });
        
    } catch (error) {
        console.error('Error in PUT /api/payments/:id:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a payment
app.delete('/api/payments/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseAdmin();
        
        // Verify the payment belongs to this user before deleting
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
// BANK DETAILS API ROUTES (Supabase Database)
// =============================================================================

// Get bank details for the authenticated user
app.get('/api/bank-details', requireAuth, async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        
        const { data, error } = await supabase
            .from('user_bank_details')
            .select('*')
            .eq('user_id', req.user.id)
            .single();
        
        if (error) {
            // If no record found, return null (not an error)
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

// Create or update bank details for the authenticated user (upsert)
app.post('/api/bank-details', requireAuth, async (req, res) => {
    try {
        const { accountName, accountNumber, sortCode } = req.body;
        
        // Validate required fields
        if (!accountName || !accountNumber || !sortCode) {
            return res.status(400).json({ 
                error: 'Account name, account number, and sort code are required' 
            });
        }
        
        // Validate account name (max 100 characters)
        if (accountName.trim().length === 0 || accountName.length > 100) {
            return res.status(400).json({ 
                error: 'Account name must be between 1 and 100 characters' 
            });
        }
        
        // Validate account number (exactly 8 digits)
        const cleanedAccountNumber = accountNumber.replace(/\s+/g, '');
        if (!/^\d{8}$/.test(cleanedAccountNumber)) {
            return res.status(400).json({ 
                error: 'Account number must be exactly 8 digits' 
            });
        }
        
        // Validate sort code (exactly 6 digits, can be formatted as XX-XX-XX)
        const cleanedSortCode = sortCode.replace(/[-\s]/g, '');
        if (!/^\d{6}$/.test(cleanedSortCode)) {
            return res.status(400).json({ 
                error: 'Sort code must be exactly 6 digits (format: XX-XX-XX or XXXXXX)' 
            });
        }
        
        const supabase = getSupabaseAdmin();
        
        // Check if bank details already exist for this user
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
            // Update existing record
            const { data: updated, error: updateError } = await supabase
                .from('user_bank_details')
                .update(bankDetailsData)
                .eq('user_id', req.user.id)
                .select()
                .single();
            
            data = updated;
            error = updateError;
        } else {
            // Insert new record
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
// STATIC FILE SERVING (from public folder)
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

// Serve index.html for SPA routes (client-side routing)
// Use regex catch-all for Vercel compatibility (avoids PathError with '*' route)
app.get(/.*/, (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return next();
    }
    // Skip static file requests (Vercel handles these, but this is a fallback)
    if (req.path.includes('.')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =============================================================================
// 404 HANDLER FOR API ROUTES
// =============================================================================

app.use(/\/api\/.*/, (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// =============================================================================
// GLOBAL ERROR HANDLER
// =============================================================================

app.use((err, req, res, next) => {
    // Log the error (but not in production to avoid exposing details)
    console.error('Unhandled error:', err.message);
    
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }
    
    // Handle CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS policy violation' });
    }
    
    // Handle JSON parsing errors
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
    }
    
    // Default error response
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'An unexpected error occurred' 
            : err.message
    });
});

// =============================================================================
// START SERVER (only if not running on Vercel)
// =============================================================================

// Only start the server if not running on Vercel
// Vercel handles the serverless function invocation
if (process.env.VERCEL !== '1' && !process.env.VERCEL_URL) {
    app.listen(PORT, () => {
        console.log(`\n🚀 PackFlow server running at http://localhost:${PORT}/`);
        console.log('📁 Serving static files from: ./public');
        console.log('🔒 Authentication: Enabled');
        console.log('⏱️  Rate limiting: Enabled');
        console.log('\nPress Ctrl+C to stop the server\n');
    });
} else {
    // Running on Vercel - export the app for serverless function
    console.log('Running on Vercel - serverless mode');
}
