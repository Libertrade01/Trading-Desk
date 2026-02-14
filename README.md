# Mental Game Framework

Schema Awareness Trading Framework — a personal tool for identifying and interrupting psychological patterns that interfere with trading execution.

## Deployment Guide

### Step 1: Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase-setup.sql` into the editor
5. Click **Run** — you should see "Success. No rows returned"
6. Done — your database is ready

### Step 2: Push to GitHub

1. Create a new repository on GitHub called `mental-game-framework`
2. Do NOT initialise it with a README (leave it empty)
3. In your terminal, run:

```bash
cd mental-game-framework
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mental-game-framework.git
git push -u origin main
```

### Step 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and click **Add New Project**
2. Import your `mental-game-framework` GitHub repository
3. Before clicking Deploy, add **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://uzbsuyknfnzqwdpzspfs.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon/publishable key
4. Click **Deploy**
5. Wait ~60 seconds — your app will be live at `mental-game-framework.vercel.app`

### Step 4: Add to iPad Home Screen

1. Open Safari on your iPad
2. Navigate to your Vercel URL
3. Tap the **Share** button (box with arrow)
4. Tap **Add to Home Screen**
5. Name it "Mental Game" and tap **Add**
6. The app will now open full-screen like a native app

## Making Updates

Any changes pushed to the `main` branch on GitHub will automatically redeploy on Vercel within ~60 seconds.

For small text changes (rewording a non-negotiable, adjusting thresholds), you can edit `src/app/page.js` directly on GitHub.

## Project Structure

```
src/
  app/
    globals.css    — Global styles
    layout.js      — Root layout with PWA metadata
    page.js        — The entire app (single component)
  lib/
    supabase.js    — Supabase client & storage helpers
public/
  manifest.json    — PWA manifest for Add to Home Screen
```
