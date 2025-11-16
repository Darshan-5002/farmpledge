# Appwrite Database Setup Guide

This guide will help you set up Appwrite Database to store orders and user wallet addresses for your FarmPledge application.

## Step 1: Create Database in Appwrite

1. **Go to Appwrite Console**:
   - Visit: https://cloud.appwrite.io (or your self-hosted instance)
   - Log in to your account
   - Select your project

2. **Create Database**:
   - Click **Databases** in the left sidebar
   - Click **Create Database** button
   - **Database ID**: `farmpledge` (or use your custom ID)
   - **Name**: `FarmPledge Database`
   - Click **Create**

## Step 2: Create Users Table (for Wallet Addresses)

1. **Create Table**:
   - Inside your database, click **Create Table**
   - **Table ID**: `users`
   - **Name**: `Users`
   - Click **Create**

2. **Add Columns to Users Table**:

   Click **+ Create column** for each of the following:

   - **walletAddress** (String, 255) - ⚠️ **NOT Required** (optional, for farmers to store blockchain wallet address)
   - **email** (String, 255) - Optional (for reference)
   - **role** (String, 50) - Optional (for reference: "farmer", "consumer", "admin")
   - **farmName** (String, 255) - Optional (for farmers)
   - **ownerName** (String, 255) - Optional (for farmers)
   - **location** (String, 255) - Optional (for farmers)

   **Important**: The `walletAddress` field should **NOT be marked as Required** since it's optional and farmers will add it later.

3. **Set Permissions for Users Table**:

   Since this app uses Firebase Auth (not Appwrite Auth), use the same permission setup as orders:

   **For Development (Option A)**:
   - Go to **Settings Tab** in the users table
   - **Read Permissions**: Add **Any** role
   - **Create Permissions**: Add **Any** role
   - **Update Permissions**: Add **Any** role
   - ⚠️ **Warning**: This allows public access. Only use for development!

   **For Production (Option B)**:
   - Use Appwrite Anonymous Authentication (same as orders table)

## Step 3: Create Orders Table

1. **Create Table**:
   - Inside your database, click **Create Table**
   - **Table ID**: `orders`
   - **Name**: `Orders`
   - Click **Create**

2. **Add Columns to Orders Table**:

   Click **+ Create column** for each of the following:

   - **orderId** (String, 255, Required)
   - **productId** (String, 255, Required)
   - **productName** (String, 255, Required)
   - **customerId** (String, 255, Required) - Index this!
   - **customerEmail** (String, 255)
   - **farmerId** (String, 255, Required) - Index this!
   - **farmerName** (String, 255)
   - **farmerWalletAddress** (String, 255)
   - **amount** (String, 255, Required)
   - **currency** (String, 10, Required)
   - **paymentMethod** (String, 50, Required)
   - **paymentId** (String, 255) - Optional (only for Razorpay/mock payments)
   - **txHash** (String, 255) - Optional (only for blockchain payments)
   - **orderHash** (String, 255) - Optional (only for blockchain payments)
   - **status** (String, 50, Required)
   - **paymentStatus** (String, 50, Required)
   - **deliveryStatus** (String, 50, Required)
   - **razorpayOrderId** (String, 255) - ⚠️ **NOT Required** (only for Razorpay payments)
   - **razorpaySignature** (String, 255) - ⚠️ **NOT Required** (only for Razorpay payments)

**Important**: Make sure `razorpayOrderId` and `razorpaySignature` are **NOT marked as Required** in Appwrite, as they're only used for Razorpay payments. For blockchain and mock payments, these fields will be empty strings.

## Step 4: Create Indexes

1. **Create Index for Customer Orders**:
   - Go to **Indexes** tab in the orders table
   - Click **Create Index**
   - **Index ID**: `customerId`
   - **Type**: Key
   - **Attributes**: `customerId`
   - Click **Create**

2. **Create Index for Farmer Orders**:
   - Click **Create Index**
   - **Index ID**: `farmerId`
   - **Type**: Key
   - **Attributes**: `farmerId`
   - Click **Create**

## Step 5: Set Permissions

**Important**: Since this app uses Firebase Auth (not Appwrite Auth), Appwrite won't recognize your Firebase users. You have two options:

### Option A: Allow Public Access (Development Only - NOT for Production)

1. **Go to Settings Tab** in the orders table
2. **Set Read Permissions**:
   - Click **Add Role**
   - Select **Any** (allows anyone to read)
   - ⚠️ **Warning**: This allows public read access. Only use for development!

3. **Set Create Permissions**:
   - Click **Add Role**
   - Select **Any** (allows anyone to create)
   - ⚠️ **Warning**: This allows public write access. Only use for development!

4. **Set Update Permissions**:
   - Click **Add Role**
   - Select **Any** (allows anyone to update)
   - ⚠️ **Warning**: This allows public update access. Only use for development!

### Option B: Use Appwrite Anonymous Authentication (Recommended for Production)

1. **Set up Appwrite Anonymous Auth**:
   - In Appwrite Console, go to **Auth** → **Settings**
   - Enable **Anonymous** authentication
   - Save settings

2. **Update your code** to create anonymous sessions in Appwrite when users log in with Firebase
   - This requires code changes to call Appwrite's anonymous auth API

**For now, use Option A to get your app working, then migrate to Option B for production.**

## Step 6: Configure Environment Variables

Add to your `.env.local` file:

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=farmpledge
```

**Note**: `VITE_APPWRITE_DATABASE_ID` is optional - defaults to `"farmpledge"` if not set.

## Step 7: Test the Setup

1. **Make a test order**:
   - Log in as a customer
   - Go to Products page
   - Buy a product
   - Complete payment

2. **Check Appwrite Console**:
   - Go to Databases → farmpledge → orders
   - You should see the new order document

3. **Check Customer Dashboard**:
   - Log in as the customer
   - Go to Dashboard → View My Orders
   - Order should appear

4. **Check Farmer Dashboard**:
   - Log in as the farmer (owner of the product)
   - Go to Admin Panel → Orders tab
   - Order should appear

## Troubleshooting

### Wallet Address Not Saving

1. **Check Console Logs**:
   - Open browser console (F12)
   - Look for "Failed to save wallet address" errors
   - Check for permission errors (401 Unauthorized)

2. **Verify Users Table**:
   - Make sure `users` table exists in Appwrite
   - Check that `walletAddress` column exists and is **NOT Required**
   - Verify table ID is exactly `"users"` (lowercase)

3. **Check Permissions**:
   - Go to Appwrite Console → Databases → farmpledge → users → Settings
   - Make sure **Update** permission has **Any** role (for development)
   - Or set up proper Appwrite Anonymous Auth for production

4. **Verify User Document Exists**:
   - The code tries to update an existing user document
   - If the document doesn't exist, it will fail
   - You may need to create the user document first (or the code should handle creation)

### Orders Not Showing

1. **Check Console Logs**:
   - Open browser console (F12)
   - Look for "Fetching orders" messages
   - Check for any error messages

2. **Verify Database ID**:
   - Make sure `VITE_APPWRITE_DATABASE_ID` matches your database ID
   - Or it defaults to `"farmpledge"`

3. **Check Table ID**:
   - Make sure table ID is exactly `"orders"` (lowercase)

4. **Verify Permissions**:
   - Make sure user is authenticated
   - Check that read permissions allow users to read orders

5. **Check farmerId**:
   - Verify products have `ownerId` set
   - Check console for "⚠️ WARNING: farmerId is missing" messages

### Permission Errors (401 Unauthorized)

If you get `401 Unauthorized` errors:

**The Problem**: Your app uses Firebase Auth, but Appwrite doesn't recognize Firebase users. Appwrite has its own authentication system.

**Quick Fix (Development Only)**:
1. Go to Appwrite Console → Databases → farmpledge → orders → Settings
2. Under **Permissions**, add **Any** role for:
   - **Read** permission
   - **Create** permission  
   - **Update** permission
3. Save the settings
4. ⚠️ **Warning**: This allows public access. Only use for development/testing!

**Production Solution**:
- Set up Appwrite Anonymous Authentication
- Create anonymous sessions when Firebase users log in
- Use Appwrite's permission system with anonymous users
- Or migrate to Appwrite Auth instead of Firebase Auth

### Query Errors

If queries fail:
- Make sure indexes are created for `customerId` and `farmerId`
- Check that attribute names match exactly (case-sensitive)

## Advanced: Custom Permissions

For production, you may want to restrict permissions so users can only read their own orders:

1. Use Appwrite Functions to add custom permission logic
2. Or use Appwrite's permission system with custom roles
3. Or validate in your application code before displaying orders

## Need Help?

- Appwrite Database Docs: https://appwrite.io/docs/products/databases
- Appwrite Console: https://cloud.appwrite.io



