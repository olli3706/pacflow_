# Debugging Guide for Login Issues

This guide helps you diagnose login problems in the PackFlow application.

## Quick Diagnostics

### Step 1: Open Browser Console
Press **F12** or right-click → "Inspect" → go to **Console** tab.

### Step 2: Look for Debug Messages

All debug messages are prefixed with emojis and `[DEBUG]`:
- 🔵 = Login form / UI handling
- 🟢 = Authentication / login function
- ⚠️ = Warnings
- ❌ = Errors

### Step 3: Test Login Flow

1. **Check if scripts loaded:**
   ```javascript
   // In console, run:
   typeof login
   typeof isAuthed
   typeof handleLogin
   ```
   - Should return: `"function"` for all
   - If `"undefined"`, scripts didn't load properly

2. **Check Supabase client:**
   ```javascript
   // In console, run:
   typeof window.supabase
   initSupabaseClient()
   ```
   - First should show `"object"` or `"function"`
   - Second should return a client object or null

3. **Test backdoor directly:**
   ```javascript
   // In console, run:
   login('testing@testing.com', 'testingtesting12').then(result => {
       console.log('Result:', result);
   });
   ```
   - Should return `{success: true}` for backdoor
   - Check console logs to see where it failed

4. **Check development mode:**
   ```javascript
   // In console, run:
   console.log('Hostname:', window.location.hostname);
   console.log('Is localhost?', window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
   ```
   - Hostname should be `"localhost"` or `"127.0.0.1"`
   - Is localhost should be `true`

## Common Issues and Solutions

### Issue: "handleLogin() called" never appears
**Problem:** Form submit handler not firing
**Check:**
- Look for `🔵 [DEBUG] DOMContentLoaded fired` in console
- Check if `🔵 [DEBUG] Submit event listener attached to form` appears
- If missing, JavaScript error is preventing script from running

**Fix:**
- Check for red errors in console
- Verify all script files loaded (Network tab)
- Check script order in index.html

### Issue: Backdoor not working
**Problem:** Backdoor check failing
**Check console for:**
```
🟢 [DEBUG] Development mode check: { isDevelopment: true/false }
🟢 [DEBUG] Backdoor check: { willUseBackdoor: true/false }
```

**If `isDevelopment` is false:**
- Hostname might not be localhost
- Check `window.location.hostname` value

**If `willUseBackdoor` is false:**
- Email or password mismatch
- Check exact credentials: `testing@testing.com` / `testingtesting12`
- Check console log shows what was received vs expected

### Issue: "Supabase client not initialized"
**Problem:** Supabase library not loading
**Check:**
- Network tab → Look for `supabase.min.js` request
- Console → Check for `❌ Supabase library not properly loaded` warning
- Run in console: `window.supabase`

**Fix:**
- CDN might be blocked
- Try different CDN: `https://unpkg.com/@supabase/supabase-js@2`
- Check internet connection

### Issue: Form still submits (URL changes)
**Problem:** preventDefault() not working
**Check console for:**
- `🔵 [DEBUG] handleLogin() called` - if missing, handler not attached
- `🔵 [DEBUG] preventDefault() called` - should appear if handler fires

**Fix:**
- Ensure `onsubmit="return false;"` is in form tag
- Check for JavaScript errors preventing handler attachment

## Diagnostic Commands (Copy/Paste into Console)

### Full System Check
```javascript
console.log('=== PACKFLOW DIAGNOSTICS ===');
console.log('1. Functions available:', {
    login: typeof login,
    isAuthed: typeof isAuthed,
    initSupabaseClient: typeof initSupabaseClient
});
console.log('2. Supabase:', {
    windowSupabase: typeof window.supabase,
    client: initSupabaseClient() ? 'OK' : 'NULL'
});
console.log('3. Environment:', {
    hostname: window.location.hostname,
    isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
});
console.log('4. localStorage:', {
    dev_backdoor: localStorage.getItem('dev_backdoor'),
    isAuthenticated: localStorage.getItem('packflow_isAuthenticated')
});
console.log('5. Form element:', {
    form: !!document.getElementById('loginForm'),
    button: !!document.getElementById('signInButton')
});
```

### Test Backdoor Manually
```javascript
// Test backdoor credentials
login('testing@testing.com', 'testingtesting12').then(result => {
    console.log('Backdoor test result:', result);
    if (result.success) {
        console.log('✅ Backdoor works! Now test form submission.');
    } else {
        console.error('❌ Backdoor failed:', result.error);
    }
});
```

### Test Form Handler
```javascript
// Manually trigger form submission
const form = document.getElementById('loginForm');
if (form) {
    document.getElementById('username').value = 'testing@testing.com';
    document.getElementById('password').value = 'testingtesting12';
    form.dispatchEvent(new Event('submit'));
} else {
    console.error('Form not found!');
}
```

## Removing Debug Code

When login is working, you can remove all debug code marked with:

```javascript
// DEBUG: ... (remove this line)
console.log('🔵 [DEBUG] ...'); // Remove debug logs
console.log('🟢 [DEBUG] ...'); // Remove debug logs
```

**Search for:** `[DEBUG]` in files:
- `app.js`
- `auth-utils.js`

**Remove:**
- All `console.log('🔵 [DEBUG] ...')` lines
- All `console.log('🟢 [DEBUG] ...')` lines
- Keep error logs: `console.error()` and `console.warn()` are fine

## Log Sequence (Normal Flow)

When login works correctly, you should see in console:

```
🔵 [DEBUG] DOMContentLoaded fired - login form initializing
🔵 [DEBUG] Elements found: {...}
🔵 [DEBUG] Checking authentication status...
🔵 [DEBUG] Authentication status: false
🔵 [DEBUG] Submit event listener attached to form
🔵 [DEBUG] Click event listener attached to button
🔵 [DEBUG] Login form initialization complete

[User clicks Sign In]

🔵 [DEBUG] handleLogin() called {...}
🔵 [DEBUG] preventDefault() and stopPropagation() called
🔵 [DEBUG] Form inputs: { email: "...", passwordLength: ... }
🔵 [DEBUG] Calling login() function...
🟢 [DEBUG] login() function called {...}
🟢 [DEBUG] Development mode check: { isDevelopment: true }
🟢 [DEBUG] Backdoor check: { willUseBackdoor: true }
🟢 [DEBUG] BACKDOOR PATH TAKEN - setting localStorage flags
⚠️ BACKDOOR LOGIN ACTIVATED - DEV ONLY
🔵 [DEBUG] Login result received: { success: true }
🔵 [DEBUG] Login successful! Redirecting to app.html...
```

If any step is missing, that's where the problem is!
