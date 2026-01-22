# Vercel Deployment Guide for PackFlow

This guide will walk you through deploying PackFlow to Vercel.

## Prerequisites

- ✅ Code is ready (Vercel config files created)
- ✅ GitHub account (or GitLab/Bitbucket)
- ✅ Vercel account (free tier works)

---

## Step 1: Push Your Code to GitHub

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - ready for Vercel deployment"
   ```

2. **Create a new repository on GitHub**:
   - Go to https://github.com/new
   - Name it `pacflow` (or any name you prefer)
   - Don't initialize with README, .gitignore, or license
   - Click "Create repository"

3. **Push your code**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/pacflow.git
   git branch -M main
   git push -u origin main
   ```
   (Replace `YOUR_USERNAME` with your GitHub username)

---

## Step 2: Sign Up / Log In to Vercel

1. Go to https://vercel.com
2. Click **"Sign Up"** (or **"Log In"** if you already have an account)
3. Choose **"Continue with GitHub"** (recommended - easiest integration)
4. Authorize Vercel to access your GitHub account

---

## Step 3: Import Your Project

1. In Vercel dashboard, click **"Add New Project"**
2. Find your `pacflow` repository and click **"Import"**
3. You'll see the project configuration screen

---

## Step 4: Configure Project Settings

On the configuration screen:

1. **Framework Preset**: Select **"Other"** (or leave as "Other")
2. **Root Directory**: Leave as `./` (default)
3. **Build Command**: Leave empty (or `npm install` if you want to be explicit)
4. **Output Directory**: Leave empty
5. **Install Command**: Leave as `npm install` (default)

---

## Step 5: Add Environment Variables

This is **CRITICAL** - your app won't work without these!

Click **"Environment Variables"** and add each of these:

### Required Environment Variables:

1. **SUPABASE_URL**
   - Value: Your Supabase project URL (from Supabase dashboard)
   - Example: `https://xxxxxxxxxxxxx.supabase.co`

2. **SUPABASE_ANON_KEY**
   - Value: Your Supabase anon/public key
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Value: Your Supabase service role key (keep this secret!)
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

4. **SMSWORKS_JWT**
   - Value: Your SMS Works API JWT token
   - Example: `Bearer xxxxxxxxxxxxxx`

5. **SMSWORKS_SENDER**
   - Value: Your SMS sender name (optional, defaults to "PackFlow")
   - Example: `PackFlow`

6. **NODE_ENV**
   - Value: `production`
   - (This helps with production optimizations)

### How to Add Each Variable:

1. Click **"Add"** next to Environment Variables
2. Enter the **Name** (e.g., `SUPABASE_URL`)
3. Enter the **Value** (paste from your `.env` file)
4. Select **"Production"**, **"Preview"**, and **"Development"** (or just Production)
5. Click **"Save"**
6. Repeat for all variables above

---

## Step 6: Deploy!

1. Click **"Deploy"** button at the bottom
2. Wait 1-2 minutes for the build to complete
3. You'll see a success message with your deployment URL!

Your app will be live at: `https://pacflow.vercel.app` (or similar)

---

## Step 7: Update Supabase Settings

After deployment, you need to tell Supabase about your new domain:

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **URL Configuration**
3. Add your Vercel URL to:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: Add `https://your-app.vercel.app/**` (with the `/**` wildcard)

This allows Supabase Auth to work with your deployed app.

---

## Step 8: Test Your Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Try signing up/logging in
3. Test creating a payment request
4. Test sending SMS
5. Check that everything works!

---

## Troubleshooting

### Build Fails
- Check the build logs in Vercel dashboard
- Make sure all dependencies are in `package.json`
- Verify environment variables are set correctly

### App Works But Auth Fails
- Double-check Supabase URL configuration (Step 7)
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct in Vercel

### CORS Errors
- The code already handles Vercel domains automatically
- If you see CORS errors, check that your Vercel URL is correct

### SMS Not Working
- Verify `SMSWORKS_JWT` and `SMSWORKS_SENDER` are set correctly
- Check Vercel function logs for SMS API errors

### Static Files Not Loading
- Make sure your `public/` folder structure is correct
- Check that files are committed to Git

---

## Updating Your Deployment

Every time you push to GitHub:
1. Vercel automatically detects the push
2. Creates a new deployment
3. If successful, updates your production URL

You can also manually trigger deployments from the Vercel dashboard.

---

## Custom Domain (Optional - Later)

If you want to use your own domain later:
1. Go to your project in Vercel
2. Click **Settings** → **Domains**
3. Add your domain
4. Follow Vercel's DNS configuration instructions

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- Check deployment logs in Vercel dashboard for specific errors

---

**You're all set! 🚀**

Once you complete Steps 1-7, your app will be live on the internet!
