# Converting SPLAYED to Mobile App (APK) - Complete Guide

## 🎯 **Goal:** Create an Android APK for Google Play Store

---

## ⚠️ **Current Issue:**
Your Node.js version (18.18.2) is too old for Capacitor CLI.
Capacitor requires Node.js 20.0.0 or higher.

---

## ✅ **Solution: Two Options**

### **Option 1: Update Node.js (Recommended)**

1. **Download Node.js 20 LTS:**
   - Go to: https://nodejs.org/
   - Download "20.x LTS" version
   - Install it (will replace Node 18)

2. **Verify installation:**
   ```bash
   node -v
   ```
   Should show: `v20.x.x`

3. **Then run these commands:**
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init "SPLAYED" "com.splayed.game" --web-dir=dist
   npm run build
   npx cap add android
   npx cap sync
   npx cap open android
   ```

4. **Build APK in Android Studio:**
   - Android Studio will open
   - Click "Build" → "Build Bundle(s) / APK(s)" → "Build APK(s)"
   - APK will be in: `android/app/build/outputs/apk/debug/app-debug.apk`

---

### **Option 2: Use Online Service (Easier, No Node Update)**

Use **PWABuilder** to convert your web app to APK:

1. **Push your latest code to GitHub**
2. **Deploy to Vercel** (make sure it's working)
3. **Go to:** https://www.pwabuilder.com/
4. **Enter your Vercel URL:** `https://splayd-5wt1ano2h-yaminagns-projects.vercel.app/`
5. **Click "Start"**
6. **Click "Package For Stores"**
7. **Select "Android"**
8. **Download APK**

**Pros:**
- ✅ No Node.js update needed
- ✅ Quick and easy
- ✅ Works immediately
- ✅ Can upload to Google Play

**Cons:**
- ❌ Less customization
- ❌ Requires internet service

---

## 📱 **What You Need for Google Play:**

1. **Google Play Developer Account** ($25 one-time fee)
2. **Signed APK** (not debug APK)
3. **App Icon** (512x512 PNG)
4. **Screenshots** (at least 2)
5. **Privacy Policy** (required)
6. **App Description**

---

## 🎨 **App Configuration (Already Created):**

I've created `capacitor.config.json` with:
- **App ID:** `com.splayed.game`
- **App Name:** SPLAYED
- **Web Directory:** dist

---

## 🚀 **Recommended Next Steps:**

### **If you want full control:**
1. Update Node.js to version 20
2. Follow Option 1 commands above
3. Build APK in Android Studio

### **If you want quick results:**
1. Push all changes to GitHub
2. Make sure Vercel is working
3. Use PWABuilder (Option 2)
4. Download APK and test on your phone

---

## 💡 **My Recommendation:**

**Use PWABuilder first** to get a working APK quickly and test on your phone.
Then later, if you need more features, update Node.js and use Capacitor.

---

## 📋 **Files I Created:**

- ✅ `capacitor.config.json` - Ready for when you update Node.js

**Would you like to:**
A) Update Node.js and continue with Capacitor?
B) Use PWABuilder to get APK quickly?
