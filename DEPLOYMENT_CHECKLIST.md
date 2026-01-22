# PackFlow Vercel Deployment Checklist

Use this checklist to track your deployment progress.

## ✅ Pre-Deployment (Automated - Already Done)

- [x] Created `vercel.json` configuration file
- [x] Created `api/index.js` serverless function wrapper
- [x] Updated CORS to allow Vercel domains
- [x] Updated server.js to work in serverless mode
- [x] Updated package.json with vercel-build script
- [x] Fixed Express route syntax for Vercel compatibility

## 📋 Your Action Items

### Step 1: Push to GitHub
- [ ] Initialize git (if not done): `git init`
- [ ] Add all files: `git add .`
- [ ] Commit: `git commit -m "Ready for Vercel deployment"`
- [ ] Create GitHub repository at https://github.com/new
- [ ] Push code: `git remote add origin <your-repo-url>` then `git push -u origin main`

**Tell me when this is done!**

---

### Step 2: Vercel Account Setup
- [ ] Go to https://vercel.com
- [ ] Sign up / Log in (use GitHub for easiest integration)
- [ ] Authorize Vercel to access GitHub

**Tell me when this is done!**

---

### Step 3: Import Project
- [ ] Click "Add New Project" in Vercel
- [ ] Select your `pacflow` repository
- [ ] Click "Import"

**Tell me when this is done!**

---

### Step 4: Configure Environment Variables
In Vercel project settings, add these environment variables:

- [ ] `SUPABASE_URL` = (your Supabase project URL)
- [ ] `SUPABASE_ANON_KEY` = (your Supabase anon key)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (your Supabase service role key)
- [ ] `SMSWORKS_JWT` = (your SMS Works JWT token)
- [ ] `SMSWORKS_SENDER` = `PackFlow` (or your sender name)
- [ ] `NODE_ENV` = `production`

**Tell me when this is done!**

---

### Step 5: Deploy
- [ ] Click "Deploy" button
- [ ] Wait for build to complete (1-2 minutes)
- [ ] Copy your deployment URL (e.g., `https://pacflow.vercel.app`)

**Tell me the URL when deployment is complete!**

---

### Step 6: Update Supabase
- [ ] Go to Supabase Dashboard → Authentication → URL Configuration
- [ ] Add your Vercel URL to "Site URL"
- [ ] Add `https://your-app.vercel.app/**` to "Redirect URLs"

**Tell me when this is done!**

---

### Step 7: Test
- [ ] Visit your Vercel URL
- [ ] Test sign up / login
- [ ] Test creating a payment request
- [ ] Test sending SMS
- [ ] Test all features

**Tell me if everything works or if you encounter any issues!**

---

## 🎉 You're Done!

Once all steps are complete, your app will be live on the internet!
