# Appwrite Storage Setup Guide

This guide will help you set up Appwrite Storage for image uploads in your application.

## Step 1: Create Appwrite Account & Project

1. **Sign up for Appwrite Cloud** (or use self-hosted):
   - Go to: https://cloud.appwrite.io
   - Click "Create Account" or "Sign In"
   - Create a new project (or use existing)

2. **Get your Project ID**:
   - In Appwrite Console, click **Settings** (gear icon at bottom left)
   - Click **General** tab
   - Find **"Project ID"** - it looks like: `67a1b2c3d4e5f6g7h8i9j0k`
   - Copy this value - this is your `VITE_APPWRITE_PROJECT_ID`
   
   **Visual Guide**: Settings (left sidebar) → General → Project ID

## Step 2: Create Storage Bucket

1. **Navigate to Storage**:
   - In Appwrite Console, click **Storage** in the left sidebar (folder icon)
   - Click **Create Bucket** button

2. **Configure Bucket**:
   - **Bucket ID**: `product-images` (this becomes your `VITE_APPWRITE_BUCKET_ID`)
   - **Name**: `Product Images` (display name, can be different)
   - **File size limit**: `5 MB` (or adjust as needed)
   - **Allowed file extensions**: `jpg, jpeg, png, gif, webp`
   - **Encryption**: Enabled (recommended)
   - **Antivirus**: Enabled (recommended)

3. **Set Permissions**:
   - **Read Access**: 
     - Select **"Any"** (so customers can view product images publicly)
   - **Write Access**:
     - Select **"Users"** (only authenticated users can upload)
     - Or create custom role for farmers

4. **Click Create**

5. **Find Your Bucket ID**:
   - After creation, the **Bucket ID** is shown at the top of the bucket page
   - It's the ID you entered when creating (e.g., `product-images`)
   - This is your `VITE_APPWRITE_BUCKET_ID`
   
   **Visual Guide**: Storage → [Your Bucket] → Bucket ID (shown at top of page)

## Step 3: Configure Environment Variables

1. **Create/Update `.env` file** in your project root (same folder as `package.json`):

```env
# Appwrite Configuration
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=67a1b2c3d4e5f6g7h8i9j0k
VITE_APPWRITE_BUCKET_ID=product-images

# Keep existing Firebase config for Auth and Firestore
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

2. **Replace the values** with your actual values:
   - `VITE_APPWRITE_PROJECT_ID`: Copy from **Settings → General → Project ID**
   - `VITE_APPWRITE_BUCKET_ID`: The Bucket ID you entered when creating the bucket (e.g., `product-images`)
   - `VITE_APPWRITE_ENDPOINT`: Usually `https://cloud.appwrite.io/v1` (only change if using self-hosted)

**📋 Quick Reference - Where to Find Each Value:**
- **Project ID**: Settings (gear icon) → General → Project ID
- **Bucket ID**: Storage → [Your Bucket] → Bucket ID (shown at top)
- **Endpoint**: Usually `https://cloud.appwrite.io/v1` (verify in Settings → General)

## Step 4: Set Up Authentication (Optional but Recommended)

If you want to use Appwrite Auth instead of Firebase Auth:

1. **Enable Authentication**:
   - Go to **Auth** in Appwrite Console
   - Enable **Email/Password** provider

2. **Update code** to use Appwrite Auth (if needed)

**Note**: Currently, the app uses Firebase Auth. Appwrite Storage will work with Firebase Auth users as long as you set the session properly.

## Step 5: Test the Setup

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Log in to your app** (using Firebase Auth)

3. **Try uploading an image**:
   - Go to Admin Panel → Product Listing
   - Click "Add Product"
   - Select an image
   - Click "Add Product"

4. **Check Appwrite Console**:
   - Go to **Storage** → Your Bucket
   - You should see the uploaded file

## Step 6: Configure File Permissions (Important)

To ensure images are publicly accessible:

1. **Go to Storage** → Your Bucket → **Settings**

2. **Update Permissions**:
   - **Read Access**: Set to "Any" or "All users" (for public product images)
   - **Write Access**: Set to "Users" (only authenticated users can upload)

3. **Save Changes**

## Troubleshooting

### Error: "Storage not available"
- Check that `VITE_APPWRITE_PROJECT_ID` and `VITE_APPWRITE_BUCKET_ID` are set in `.env`
- Restart your dev server after adding environment variables

### Error: "Upload unauthorized"
- Check bucket permissions in Appwrite Console
- Ensure "Write Access" includes authenticated users
- Verify user is logged in

### Error: "File too large"
- Check bucket file size limit
- Increase limit in bucket settings if needed
- Or reduce image size before upload

### Images not displaying
- Check bucket "Read Access" is set to "Any" or "All users"
- Verify the file URL is correct
- Check browser console for errors

### Self-Hosted Appwrite

If using self-hosted Appwrite:

1. Update `VITE_APPWRITE_ENDPOINT` to your server URL:
   ```env
   VITE_APPWRITE_ENDPOINT=http://localhost/v1
   # or
   VITE_APPWRITE_ENDPOINT=https://appwrite.yourdomain.com/v1
   ```

2. Ensure CORS is configured on your Appwrite server for your frontend domain

## Benefits of Appwrite Storage

✅ **No CORS Issues**: Appwrite handles CORS automatically  
✅ **Built-in Security**: File validation, antivirus scanning  
✅ **Easy Permissions**: Simple permission system  
✅ **Image Processing**: Built-in image resizing and optimization  
✅ **CDN Support**: Fast global delivery  
✅ **Free Tier**: Generous free tier for development  

## Next Steps

- Configure image transformations (resize, crop, etc.)
- Set up CDN for faster image delivery
- Configure file lifecycle rules (auto-delete old files)
- Set up webhooks for file processing

## Resources

- Appwrite Docs: https://appwrite.io/docs
- Storage Docs: https://appwrite.io/docs/products/storage
- Community: https://appwrite.io/discord

