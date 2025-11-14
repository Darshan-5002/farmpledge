# Environment Variables Setup Guide

## Quick Fix for "Unconfigured Name" Error

If you're seeing an error like:
```
unconfigured name (value="0xYourAdminWallet", code=UNCONFIGURED_NAME, version=6.15.0)
```

This means you have placeholder values in your environment variables. Follow the steps below to fix it.

## Step 1: Create `.env.local` File

Create a file named `.env.local` in the root directory of your project (same level as `package.json`).

## Step 2: Add Required Environment Variables

Copy the following template and replace the placeholder values:

```env
# ============================================
# BLOCKCHAIN CONFIGURATION (Required for blockchain payments)
# ============================================

# Escrow Smart Contract Address
# Get this after deploying the contract (see DEPLOYMENT.md)
# Example: VITE_ESCROW_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
VITE_ESCROW_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Admin Wallet Address
# This is used as a fallback when farmer wallet is not set
# Use your MetaMask wallet address
# Example: VITE_ADMIN_WALLET_ADDRESS=0x1234567890123456789012345678901234567890
VITE_ADMIN_WALLET_ADDRESS=0x0000000000000000000000000000000000000000

# ============================================
# FIREBASE CONFIGURATION (Required for authentication)
# ============================================

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# ============================================
# RAZORPAY CONFIGURATION (Optional - for GPay/PhonePe)
# ============================================

VITE_RAZORPAY_KEY_ID=your_razorpay_key_id

# ============================================
# APPWRITE CONFIGURATION (Optional - for file storage)
# ============================================

VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_appwrite_project_id
VITE_APPWRITE_BUCKET_ID=your_appwrite_bucket_id

# ============================================
# EXTERNAL WEBHOOK (Optional)
# ============================================

VITE_EXTERNAL_APPLICATION_WEBHOOK=https://your-webhook-url.com/api/application
```

## Step 3: Get Your Wallet Address

1. Open MetaMask
2. Click on your account name at the top
3. Copy your wallet address (it starts with `0x`)
4. Paste it as the value for `VITE_ADMIN_WALLET_ADDRESS`

Example:
```env
VITE_ADMIN_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

## Step 4: Deploy Smart Contract (If Using Blockchain Payments)

If you want to use blockchain payments, you need to deploy the escrow contract first:

1. See `DEPLOYMENT.md` for detailed instructions
2. After deployment, copy the contract address
3. Set it as `VITE_ESCROW_CONTRACT_ADDRESS`

Example:
```env
VITE_ESCROW_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
```

## Step 5: Restart Development Server

After creating/updating `.env.local`:

1. Stop your development server (Ctrl+C)
2. Restart it: `npm run dev`

**Important:** Vite only reads environment variables on startup, so you must restart the server after changing `.env.local`.

## Troubleshooting

### Error: "Unconfigured name"
- Make sure `.env.local` exists in the project root
- Check that variable names start with `VITE_`
- Ensure there are no spaces around the `=` sign
- Remove any placeholder text like "0xYourAdminWallet"

### Error: "Escrow contract address not configured"
- Set `VITE_ESCROW_CONTRACT_ADDRESS` in `.env.local`
- Or deploy the contract first (see `DEPLOYMENT.md`)

### Error: "Farmer wallet address not configured"

This happens when:
1. `VITE_ADMIN_WALLET_ADDRESS` is not set in `.env.local`, OR
2. The farmer hasn't set their wallet address in their profile

**Quick Fix:**
1. Open your `.env.local` file
2. Add your MetaMask wallet address:
   ```env
   VITE_ADMIN_WALLET_ADDRESS=0xYourActualWalletAddress
   ```
3. Get your wallet address:
   - Open MetaMask
   - Click on your account name
   - Copy the address (starts with `0x`)
4. Restart your dev server: `npm run dev`

**Example:**
```env
VITE_ADMIN_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

**Note:** This address is used as a fallback when farmers haven't set their own wallet address. In production, each farmer should set their own wallet address in their profile.

### Wallet Address Format
- Must start with `0x`
- Must be exactly 42 characters (including `0x`)
- Example: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`

## Quick Start (Minimum Configuration)

For testing without blockchain payments, you only need Firebase:

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

For blockchain payments, also add:

```env
VITE_ESCROW_CONTRACT_ADDRESS=your_contract_address
VITE_ADMIN_WALLET_ADDRESS=your_wallet_address
```

## Security Notes

- **Never commit `.env.local` to git** - it's already in `.gitignore`
- Use testnet addresses for development
- Use a separate wallet for production
- Keep your private keys secure

## Need Help?

- Check `DEPLOYMENT.md` for contract deployment
- Check `FIREBASE_STORAGE_SETUP.md` for Firebase setup
- Check `APPWRITE_SETUP.md` for Appwrite setup

