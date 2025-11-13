# Where to Find Appwrite Configuration Values

This guide shows you exactly where to find each configuration value in the Appwrite Console.

## Step 1: Find Your Project ID

1. **Go to Appwrite Cloud**: https://cloud.appwrite.io
2. **Sign in** to your account
3. **Select your project** (or create a new one if you haven't)
4. **Click on "Settings"** in the left sidebar (gear icon at the bottom)
5. **Click on "General"** tab
6. **Find "Project ID"** - This is your `VITE_APPWRITE_PROJECT_ID`
   - It looks like: `67a1b2c3d4e5f6g7h8i9j0k`
   - Copy this value

**Location**: Settings → General → Project ID

---

## Step 2: Find Your Bucket ID

1. **In the Appwrite Console**, click on **"Storage"** in the left sidebar (folder icon)
2. **You'll see your buckets listed** (or create one if you haven't)
3. **Click on your bucket** (e.g., "Product Images" or "product-images")
4. **The Bucket ID** is shown at the top of the page
   - It's usually the same as the name you gave it (e.g., `product-images`)
   - Or you can see it in the URL: `https://cloud.appwrite.io/console/project-xxx/storage/bucket-xxx`
   - The part after `bucket-` is your Bucket ID

**Location**: Storage → [Your Bucket] → Bucket ID (shown at top)

**If you need to create a bucket:**
1. Click **"Create Bucket"** button
2. **Bucket ID**: Enter `product-images` (or any name you prefer)
3. **Name**: Enter `Product Images` (display name)
4. **File size limit**: `5 MB`
5. **Allowed file extensions**: `jpg, jpeg, png, gif, webp`
6. **Encryption**: Enable (recommended)
7. **Antivirus**: Enable (recommended)
8. **Read Access**: Select **"Any"** (so customers can view product images)
9. **Write Access**: Select **"Users"** (only authenticated users can upload)
10. Click **"Create"**
11. The Bucket ID you entered is your `VITE_APPWRITE_BUCKET_ID`

---

## Step 3: Endpoint (Usually Standard)

The endpoint is usually the same for everyone using Appwrite Cloud:

**`VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1`**

You can verify this:
1. Go to **Settings** → **General**
2. Look for **"API Endpoint"** or **"Endpoint"**
3. It should be: `https://cloud.appwrite.io/v1`

**Note**: Only change this if you're using a self-hosted Appwrite server.

---

## Step 4: Create Your .env File

1. **In your project root** (same folder as `package.json`), create or edit `.env` file
2. **Add these lines** (replace with your actual values):

```env
# Appwrite Configuration
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=67a1b2c3d4e5f6g7h8i9j0k
VITE_APPWRITE_BUCKET_ID=product-images
```

**Replace**:
- `67a1b2c3d4e5f6g7h8i9j0k` with your actual Project ID from Step 1
- `product-images` with your actual Bucket ID from Step 2

---

## Visual Guide

### Finding Project ID:
```
Appwrite Console
├── [Your Project Name] (top left)
├── Settings (bottom left, gear icon)
│   └── General
│       └── Project ID ← Copy this
```

### Finding Bucket ID:
```
Appwrite Console
├── Storage (left sidebar)
│   ├── [List of Buckets]
│   └── [Click on your bucket]
│       └── Bucket ID ← Shown at top of page
```

---

## Quick Checklist

- [ ] Logged into Appwrite Cloud
- [ ] Selected/Created a project
- [ ] Found Project ID in Settings → General
- [ ] Created a Storage Bucket (or found existing one)
- [ ] Copied Bucket ID
- [ ] Created/Updated `.env` file with all three values
- [ ] Restarted dev server (`npm run dev`)

---

## Example .env File

```env
# Appwrite Configuration
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=67a1b2c3d4e5f6g7h8i9j0k
VITE_APPWRITE_BUCKET_ID=product-images

# Keep your existing Firebase config
VITE_FIREBASE_API_KEY=your-firebase-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
# ... etc
```

---

## Troubleshooting

### "Project ID not found"
- Make sure you're logged in
- Make sure you've selected a project (or created one)
- Check Settings → General

### "Bucket ID not found"
- Go to Storage section
- Create a new bucket if you don't have one
- The Bucket ID is the ID you entered when creating the bucket

### "Storage not available" error
- Check that all three environment variables are set
- Make sure there are no typos
- Restart your dev server after adding/changing `.env` file
- Check browser console for specific error messages

---

## Need Help?

- Appwrite Docs: https://appwrite.io/docs
- Appwrite Console: https://cloud.appwrite.io
- Storage Docs: https://appwrite.io/docs/products/storage


