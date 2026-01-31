# 🚀 Render.com Deployment Setup

## Quick Setup for Real-Time Sync

### Step 1: Prepare for Render
1. Push your code to GitHub
2. Sign up at render.com
3. Connect your GitHub account

### Step 2: Deploy Backend
1. Click "New +" → "Web Service"
2. Select your repository
3. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free
4. Add Environment Variable:
   - **NODE_VERSION**: 18

### Step 3: Update Frontend
Update your frontend API URL to point to your Render backend.

### Step 4: Real-Time Sync!
Your app will now sync data across all devices automatically!

---

## Alternative: Vercel Functions

If you prefer serverless, we can convert your backend to Vercel Functions for free hosting.
