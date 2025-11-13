# Firebase Storage Setup Guide

## CORS Error Fix

If you're getting CORS errors when uploading images, you need to configure Firebase Storage CORS rules and security rules.

## Step 1: Configure Firebase Storage CORS Rules

1. Install Google Cloud SDK (if not already installed):
   ```bash
   # Windows (using Chocolatey)
   choco install gcloudsdk
   
   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. Authenticate with Google Cloud:
   ```bash
   gcloud auth login
   ```

3. Set your Firebase project:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   # Replace YOUR_PROJECT_ID with your Firebase project ID (e.g., flatcom-5f631)
   ```

4. Create a CORS configuration file (`cors.json`):
   ```json
   [
     {
       "origin": ["http://localhost:8080", "http://localhost:5173", "https://yourdomain.com"],
       "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
       "maxAgeSeconds": 3600,
       "responseHeader": ["Content-Type", "Authorization"]
     }
   ]
   ```

5. Apply CORS rules to your storage bucket:
   ```bash
   gsutil cors set cors.json gs://YOUR_STORAGE_BUCKET
   # Replace YOUR_STORAGE_BUCKET with your storage bucket (e.g., flatcom-5f631.firebasestorage.app)
   ```

   Or if using the new Firebase Storage format:
   ```bash
   gsutil cors set cors.json gs://flatcom-5f631.firebasestorage.app
   ```

## Step 2: Configure Firebase Storage Security Rules

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Go to **Storage** → **Rules**
4. Update the rules to allow authenticated uploads:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload to their own folder
    match /products/{userId}/{allPaths=**} {
      allow read: if true; // Anyone can read
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Default: deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

5. Click **Publish**

## Step 3: Verify Authentication

Make sure users are logged in before uploading. The app should automatically use the Firebase Auth token.

## Step 4: Test Upload

After configuring CORS and security rules:
1. Restart your development server
2. Log in to the app
3. Try uploading an image again

## Alternative: Quick CORS Fix (Temporary)

If you can't configure CORS immediately, you can temporarily allow all origins (NOT recommended for production):

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["*"]
  }
]
```

**Warning**: Only use this for development. Never use `"origin": ["*"]` in production.

## Troubleshooting

### Error: "gsutil: command not found"
- Install Google Cloud SDK
- Or use Firebase CLI: `firebase storage:rules:deploy`

### Error: "Permission denied"
- Make sure you're authenticated: `gcloud auth login`
- Check you have Storage Admin permissions in Firebase Console

### Still getting CORS errors?
1. Clear browser cache
2. Check browser console for specific error messages
3. Verify your origin URL matches exactly (including http/https and port)
4. Wait a few minutes after applying CORS rules (they may take time to propagate)

## Need Help?

Check Firebase Storage documentation:
- https://firebase.google.com/docs/storage/web/upload-files
- https://firebase.google.com/docs/storage/security


