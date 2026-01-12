# Deployment Fix for Vercel

The error `Command "npm run build" exited with 126` on Vercel is a common issue when deploying from Windows to a Linux-based environment (like Vercel).

## The Cause
The most likely cause is that you have uploaded the `node_modules` folder to GitHub. 
- On Windows, the executable files inside `node_modules/.bin` are created as Windows Batch files (`.cmd`) or PowerShell scripts (`.ps1`).
- Vercel tries to run these on a Linux server, which doesn't know how to execute Windows files, leading to the `126` error (Permission Denied/Exec Format Error).

## The Solution

### 1. Create a `.gitignore` file
I have already created a `.gitignore` file in your project directory to prevent this from happening in the future. It and tells Git to ignore `node_modules`, `dist`, and other temporary files.

### 2. Remove existing `node_modules` from Git
You need to tell Git to stop tracking these folders and remove them from your GitHub repository. Run these commands in your terminal (inside the project folder):

```bash
# Remove node_modules from Git tracking
git rm -r --cached node_modules

# Remove dist folder from Git tracking
git rm -r --cached dist

# Add the new .gitignore file
git add .gitignore

# Commit the changes
git commit -m "fix: remove node_modules and dist from tracking"

# Push to GitHub
git push
```

### 3. Redeploy on Vercel
After you push these changes, Vercel should automatically start a new build. This time, it will run its own `npm install`, install the correct Linux-compatible binaries, and the build should succeed.

### Additional Tip
If you uploaded your files to GitHub **manually** through the website (dragging and dropping):
1. Go to your repository on GitHub.com.
2. Manually delete the `node_modules` and `dist` folders.
3. Upload the `.gitignore` file I created.
4. Vercel will then trigger a clean build.
